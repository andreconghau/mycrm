/**
 * Weight, packaging and unit rules for M07 Product Specifications.
 *
 * Every calculation goes through `src/lib/decimal.ts` so no commercial number
 * is ever produced by IEEE-754 arithmetic. No unit conversion is performed
 * anywhere: the owner decided (2026-11-11) that mixed-unit arithmetic is
 * rejected rather than converted, because no rounding or conversion policy has
 * been approved. KG <-> MT <-> LB are therefore all refused.
 */

import {
  DecimalFormatError,
  type Decimal,
  compare,
  fromInteger,
  fromString,
  isPositive,
  multiply,
  toString,
} from '@/lib/decimal'

export const weightUnits = ['KG', 'MT', 'LB'] as const
export type WeightUnit = (typeof weightUnits)[number]

export const measurementUnits = ['KG', 'MT', 'CTN', 'PCS', 'LB'] as const
export type MeasurementUnit = (typeof measurementUnits)[number]

export class UnsupportedUnitConversionError extends Error {
  readonly from: string
  readonly to: string

  constructor(from: string, to: string) {
    super(
      `Converting ${from} to ${to} is not supported; no approved conversion rule exists`,
    )
    this.name = 'UnsupportedUnitConversionError'
    this.from = from
    this.to = to
  }
}

export class MeasurementValidationError extends Error {
  readonly field: string

  constructor(field: string, message: string) {
    super(message)
    this.name = 'MeasurementValidationError'
    this.field = field
  }
}

function decimalField(field: string, value: string): Decimal {
  try {
    return fromString(value)
  } catch (error) {
    if (error instanceof DecimalFormatError) {
      throw new MeasurementValidationError(field, `${field}: ${error.message}`)
    }
    throw error
  }
}

function requirePositive(field: string, value: string): Decimal {
  const parsed = decimalField(field, value)
  if (!isPositive(parsed)) {
    throw new MeasurementValidationError(
      field,
      `${field} must be greater than zero`,
    )
  }
  return parsed
}

export type WeightAmount = {
  /** Exact decimal string; never a JavaScript number. */
  readonly amount: string
  readonly unit: WeightUnit
}

/**
 * Total net weight of a quantity of cartons.
 *
 * `10 cartons x 10 kg net per carton` yields exactly `100 kg` (AC-12). When a
 * caller asks for a different output unit the request is refused instead of
 * converted (AC-15).
 */
export function totalNetWeight(input: {
  cartons: number
  cartonNetWeight: string
  weightUnit: string
  /** Optional requested output unit; must equal `weightUnit`. */
  requestedUnit?: string
}): WeightAmount {
  if (!Number.isSafeInteger(input.cartons) || input.cartons <= 0) {
    throw new MeasurementValidationError(
      'cartons',
      'Carton quantity must be a positive whole number',
    )
  }
  if (!isWeightUnit(input.weightUnit)) {
    throw new MeasurementValidationError(
      'weightUnit',
      `Unknown weight unit: ${input.weightUnit}`,
    )
  }
  if (input.requestedUnit && input.requestedUnit !== input.weightUnit) {
    throw new UnsupportedUnitConversionError(
      input.weightUnit,
      input.requestedUnit,
    )
  }
  const perCarton = requirePositive('cartonNetWeight', input.cartonNetWeight)
  const total = multiply(perCarton, fromInteger(input.cartons))
  return { amount: toString(total), unit: input.weightUnit }
}

/** Total net weight derived from packs rather than a carton net weight. */
export function totalNetWeightFromPacks(input: {
  cartons: number
  packsPerCarton: number
  netWeightPerPack: string
  weightUnit: string
}): WeightAmount {
  if (!Number.isSafeInteger(input.packsPerCarton) || input.packsPerCarton <= 0) {
    throw new MeasurementValidationError(
      'packsPerCarton',
      'Packs per carton must be a positive whole number',
    )
  }
  const perPack = requirePositive('netWeightPerPack', input.netWeightPerPack)
  const perCarton = multiply(perPack, fromInteger(input.packsPerCarton))
  return totalNetWeight({
    cartons: input.cartons,
    cartonNetWeight: toString(perCarton),
    weightUnit: input.weightUnit,
  })
}

export function isWeightUnit(value: string): value is WeightUnit {
  return (weightUnits as readonly string[]).includes(value)
}

export function isMeasurementUnit(value: string): value is MeasurementUnit {
  return (measurementUnits as readonly string[]).includes(value)
}

export type MeasurementFields = {
  netWeightPerPack?: string | null
  grossWeightPerPack?: string | null
  cartonNetWeight?: string | null
  weightUnit?: string | null
  packsPerCarton?: number | null
  glazingPercent?: string | null
  moq?: string | null
  moqUnit?: string | null
  uom?: string | null
  shelfLifeMonths?: number | null
  storageTempC?: string | null
}

/**
 * Rejects physically or commercially impossible measurements (AC-13).
 *
 * The storage-temperature bounds are a plausibility guard only. No universal
 * freezing temperature or shelf life is assumed, defaulted or inferred.
 */
export function assertPlausibleMeasurements(fields: MeasurementFields): void {
  const net =
    fields.netWeightPerPack != null
      ? requirePositive('netWeightPerPack', fields.netWeightPerPack)
      : undefined
  const gross =
    fields.grossWeightPerPack != null
      ? requirePositive('grossWeightPerPack', fields.grossWeightPerPack)
      : undefined
  const carton =
    fields.cartonNetWeight != null
      ? requirePositive('cartonNetWeight', fields.cartonNetWeight)
      : undefined

  if (fields.weightUnit != null && !isWeightUnit(fields.weightUnit)) {
    throw new MeasurementValidationError(
      'weightUnit',
      `Unknown weight unit: ${fields.weightUnit}`,
    )
  }
  if (fields.uom != null && !isMeasurementUnit(fields.uom)) {
    throw new MeasurementValidationError(
      'uom',
      `Unknown unit of measurement: ${fields.uom}`,
    )
  }
  if (fields.moqUnit != null && !isMeasurementUnit(fields.moqUnit)) {
    throw new MeasurementValidationError(
      'moqUnit',
      `Unknown minimum-order unit: ${fields.moqUnit}`,
    )
  }

  // Net and gross share the same weight unit, so they are directly comparable.
  if (net && gross && compare(gross, net) < 0) {
    throw new MeasurementValidationError(
      'grossWeightPerPack',
      'Gross weight per pack cannot be less than net weight per pack',
    )
  }

  if (fields.packsPerCarton != null) {
    if (
      !Number.isSafeInteger(fields.packsPerCarton) ||
      fields.packsPerCarton <= 0
    ) {
      throw new MeasurementValidationError(
        'packsPerCarton',
        'Packs per carton must be a positive whole number',
      )
    }
  }

  // A carton net weight that contradicts packs x net weight per pack is an
  // impossible weight, not a rounding preference.
  if (net && carton && fields.packsPerCarton != null) {
    const expected = multiply(net, fromInteger(fields.packsPerCarton))
    if (compare(expected, carton) !== 0) {
      throw new MeasurementValidationError(
        'cartonNetWeight',
        `Carton net weight ${toString(carton)} does not equal ${fields.packsPerCarton} packs x ${toString(net)}`,
      )
    }
  }

  if (fields.glazingPercent != null) {
    const glazing = decimalField('glazingPercent', fields.glazingPercent)
    if (
      compare(glazing, fromInteger(0)) < 0 ||
      compare(glazing, fromInteger(100)) > 0
    ) {
      throw new MeasurementValidationError(
        'glazingPercent',
        'Glazing percentage must be between 0 and 100',
      )
    }
  }

  if (fields.moq != null) requirePositive('moq', fields.moq)

  if (fields.shelfLifeMonths != null) {
    if (
      !Number.isSafeInteger(fields.shelfLifeMonths) ||
      fields.shelfLifeMonths <= 0
    ) {
      throw new MeasurementValidationError(
        'shelfLifeMonths',
        'Shelf life in months must be a positive whole number',
      )
    }
  }

  if (fields.storageTempC != null) {
    const temperature = decimalField('storageTempC', fields.storageTempC)
    if (
      compare(temperature, fromInteger(-80)) < 0 ||
      compare(temperature, fromInteger(60)) > 0
    ) {
      throw new MeasurementValidationError(
        'storageTempC',
        'Storage temperature is outside the physically plausible range (-80..60 C)',
      )
    }
  }
}
