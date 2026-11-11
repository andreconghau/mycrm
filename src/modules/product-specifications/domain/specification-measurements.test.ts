import { describe, expect, it } from 'vitest'
import {
  MeasurementValidationError,
  UnsupportedUnitConversionError,
  assertPlausibleMeasurements,
  totalNetWeight,
  totalNetWeightFromPacks,
} from './specification-measurements'

describe('totalNetWeight (AC-12)', () => {
  it('computes 10 cartons x 10 kg net per carton as exactly 100 kg', () => {
    expect(
      totalNetWeight({
        cartons: 10,
        cartonNetWeight: '10',
        weightUnit: 'KG',
      }),
    ).toEqual({ amount: '100', unit: 'KG' })
  })

  it('keeps fractional carton weights exact', () => {
    // 3 x 10.005 is 30.015 exactly; a float would give 30.014999999999997.
    expect(
      totalNetWeight({
        cartons: 3,
        cartonNetWeight: '10.005',
        weightUnit: 'KG',
      }),
    ).toEqual({ amount: '30.015', unit: 'KG' })
  })

  it('derives the total from packs per carton', () => {
    expect(
      totalNetWeightFromPacks({
        cartons: 10,
        packsPerCarton: 10,
        netWeightPerPack: '1',
        weightUnit: 'KG',
      }),
    ).toEqual({ amount: '100', unit: 'KG' })
  })

  it('rejects a non-positive or fractional carton count', () => {
    for (const cartons of [0, -1, 1.5]) {
      expect(() =>
        totalNetWeight({ cartons, cartonNetWeight: '10', weightUnit: 'KG' }),
      ).toThrow(MeasurementValidationError)
    }
  })

  it('rejects a non-positive carton weight', () => {
    expect(() =>
      totalNetWeight({ cartons: 10, cartonNetWeight: '0', weightUnit: 'KG' }),
    ).toThrow(MeasurementValidationError)
  })

  it('rejects an unknown weight unit', () => {
    expect(() =>
      totalNetWeight({ cartons: 10, cartonNetWeight: '10', weightUnit: 'TON' }),
    ).toThrow(MeasurementValidationError)
  })
})

describe('unit conversion policy (AC-15)', () => {
  it('refuses to convert instead of guessing a factor', () => {
    for (const requestedUnit of ['MT', 'LB']) {
      expect(() =>
        totalNetWeight({
          cartons: 10,
          cartonNetWeight: '10',
          weightUnit: 'KG',
          requestedUnit,
        }),
      ).toThrow(UnsupportedUnitConversionError)
    }
  })

  it('allows a request that already matches the stored unit', () => {
    expect(
      totalNetWeight({
        cartons: 2,
        cartonNetWeight: '5',
        weightUnit: 'MT',
        requestedUnit: 'MT',
      }),
    ).toEqual({ amount: '10', unit: 'MT' })
  })

  it('names both units in the error so the caller can explain it', () => {
    try {
      totalNetWeight({
        cartons: 1,
        cartonNetWeight: '1',
        weightUnit: 'KG',
        requestedUnit: 'MT',
      })
      expect.unreachable('conversion should have been refused')
    } catch (error) {
      expect(error).toBeInstanceOf(UnsupportedUnitConversionError)
      expect((error as UnsupportedUnitConversionError).from).toBe('KG')
      expect((error as UnsupportedUnitConversionError).to).toBe('MT')
    }
  })
})

describe('assertPlausibleMeasurements (AC-13)', () => {
  it('accepts a consistent set of measurements', () => {
    expect(() =>
      assertPlausibleMeasurements({
        netWeightPerPack: '1.000',
        grossWeightPerPack: '1.100',
        cartonNetWeight: '10.000',
        weightUnit: 'KG',
        packsPerCarton: 10,
        glazingPercent: '12.5',
        moq: '500',
        moqUnit: 'KG',
        uom: 'CTN',
        shelfLifeMonths: 24,
        storageTempC: '-18',
      }),
    ).not.toThrow()
  })

  it('rejects gross weight below net weight on the same basis', () => {
    expect(() =>
      assertPlausibleMeasurements({
        netWeightPerPack: '10',
        grossWeightPerPack: '9.9',
        weightUnit: 'KG',
      }),
    ).toThrow(/Gross weight per pack cannot be less than net/)
  })

  it('accepts gross weight exactly equal to net weight', () => {
    expect(() =>
      assertPlausibleMeasurements({
        netWeightPerPack: '10.00',
        grossWeightPerPack: '10',
        weightUnit: 'KG',
      }),
    ).not.toThrow()
  })

  it('rejects a carton net weight that contradicts packs x net weight', () => {
    expect(() =>
      assertPlausibleMeasurements({
        netWeightPerPack: '1',
        packsPerCarton: 10,
        cartonNetWeight: '12',
        weightUnit: 'KG',
      }),
    ).toThrow(/does not equal 10 packs/)
  })

  it('rejects zero and negative weights', () => {
    expect(() =>
      assertPlausibleMeasurements({ netWeightPerPack: '0' }),
    ).toThrow(MeasurementValidationError)
    expect(() =>
      assertPlausibleMeasurements({ cartonNetWeight: '-1' }),
    ).toThrow(MeasurementValidationError)
  })

  it('rejects glazing outside 0..100', () => {
    for (const glazingPercent of ['-0.1', '100.1', '150']) {
      expect(() => assertPlausibleMeasurements({ glazingPercent })).toThrow(
        /Glazing percentage must be between 0 and 100/,
      )
    }
  })

  it('accepts glazing at both boundaries', () => {
    for (const glazingPercent of ['0', '100']) {
      expect(() =>
        assertPlausibleMeasurements({ glazingPercent }),
      ).not.toThrow()
    }
  })

  it('rejects a non-positive packs-per-carton or shelf life', () => {
    expect(() => assertPlausibleMeasurements({ packsPerCarton: 0 })).toThrow(
      MeasurementValidationError,
    )
    expect(() => assertPlausibleMeasurements({ shelfLifeMonths: 0 })).toThrow(
      MeasurementValidationError,
    )
  })

  it('rejects a physically implausible storage temperature', () => {
    for (const storageTempC of ['-100', '200']) {
      expect(() => assertPlausibleMeasurements({ storageTempC })).toThrow(
        /physically plausible range/,
      )
    }
  })

  it('does not assume any default freezing temperature or shelf life', () => {
    // Omitting them is valid; nothing is filled in on the owner's behalf.
    expect(() => assertPlausibleMeasurements({})).not.toThrow()
  })

  it('rejects unknown units', () => {
    expect(() => assertPlausibleMeasurements({ uom: 'BOX' })).toThrow(
      /Unknown unit of measurement/,
    )
    expect(() => assertPlausibleMeasurements({ moqUnit: 'BOX' })).toThrow(
      /Unknown minimum-order unit/,
    )
    expect(() => assertPlausibleMeasurements({ weightUnit: 'TON' })).toThrow(
      /Unknown weight unit/,
    )
  })

  it('reports which field failed', () => {
    try {
      assertPlausibleMeasurements({ glazingPercent: '120' })
      expect.unreachable('implausible glazing should have been rejected')
    } catch (error) {
      expect((error as MeasurementValidationError).field).toBe('glazingPercent')
    }
  })
})
