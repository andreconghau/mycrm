/**
 * Fixed-precision decimal arithmetic (approved R1.0 shared component,
 * `docs/business/r1-decisions.md` §2 and §6).
 *
 * Values are stored as a scaled `bigint` so no commercial calculation ever
 * touches IEEE-754 floating point. Rounding is ROUND_HALF_EVEN (banker's
 * rounding) and is applied only where the caller asks for it — intermediate
 * sums stay exact, matching the approved rule "sum exact (unrounded) line
 * decimals, then round only the final total".
 *
 * This module is intentionally dependency-free and side-effect-free so it can
 * be reused by M07 Specifications, M08 Price Lists and M10 Quotations.
 */

export type Decimal = {
  /** The value multiplied by 10^scale. */
  readonly units: bigint
  /** Number of digits kept after the decimal point. Always >= 0. */
  readonly scale: number
}

export type Rational = {
  readonly numerator: bigint
  readonly denominator: bigint
}

/** Guards against absurd input before any bigint work happens. */
const MAX_INPUT_LENGTH = 64
const MAX_SCALE = 18
const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/

export class DecimalFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DecimalFormatError'
  }
}

function pow10(exponent: number): bigint {
  return BigInt(10) ** BigInt(exponent)
}

function greatestCommonDivisor(left: bigint, right: bigint): bigint {
  let a = left < BigInt(0) ? -left : left
  let b = right < BigInt(0) ? -right : right
  while (b !== BigInt(0)) {
    const remainder = a % b
    a = b
    b = remainder
  }
  return a
}

export function rational(numerator: bigint, denominator = BigInt(1)): Rational {
  if (denominator === BigInt(0)) {
    throw new DecimalFormatError('Rational denominator cannot be zero')
  }
  const sign = denominator < BigInt(0) ? BigInt(-1) : BigInt(1)
  const divisor = greatestCommonDivisor(numerator, denominator)
  return {
    numerator: (numerator / divisor) * sign,
    denominator: (denominator / divisor) * sign,
  }
}

export function toRational(value: Decimal): Rational {
  return rational(value.units, pow10(value.scale))
}

export function addRational(left: Rational, right: Rational): Rational {
  return rational(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  )
}

export function multiplyRational(left: Rational, right: Rational): Rational {
  return rational(left.numerator * right.numerator, left.denominator * right.denominator)
}

export function divideRational(left: Rational, right: Rational): Rational {
  if (right.numerator === BigInt(0)) {
    throw new DecimalFormatError('Cannot divide by zero')
  }
  return rational(left.numerator * right.denominator, left.denominator * right.numerator)
}

export function roundRationalHalfEven(value: Rational, scale: number): Decimal {
  assertScale(scale)
  const negative = value.numerator < BigInt(0)
  const numerator = (negative ? -value.numerator : value.numerator) * pow10(scale)
  const quotient = numerator / value.denominator
  const remainder = numerator % value.denominator
  const doubled = remainder * BigInt(2)
  const rounded = doubled > value.denominator ||
    (doubled === value.denominator && quotient % BigInt(2) === BigInt(1))
    ? quotient + BigInt(1)
    : quotient
  return { units: negative ? -rounded : rounded, scale }
}

export function rationalToRoundedString(value: Rational, scale: number): string {
  return toString(roundRationalHalfEven(value, scale))
}

export function rationalToExactDecimalString(value: Rational): string {
  let denominator = value.denominator
  let twos = 0
  let fives = 0
  while (denominator % BigInt(2) === BigInt(0)) {
    denominator /= BigInt(2)
    twos += 1
  }
  while (denominator % BigInt(5) === BigInt(0)) {
    denominator /= BigInt(5)
    fives += 1
  }
  if (denominator !== BigInt(1)) {
    throw new DecimalFormatError('Rational value has no finite decimal representation')
  }
  const scale = Math.max(twos, fives)
  const units = value.numerator *
    (BigInt(2) ** BigInt(scale - twos)) *
    (BigInt(5) ** BigInt(scale - fives))
  return toString({ units, scale })
}

function assertScale(scale: number) {
  if (!Number.isInteger(scale) || scale < 0 || scale > MAX_SCALE) {
    throw new DecimalFormatError(
      `Scale must be an integer between 0 and ${MAX_SCALE}`,
    )
  }
}

/**
 * Parses a plain decimal string. Exponential notation, thousands separators
 * and whitespace-only values are rejected rather than coerced, so a malformed
 * commercial value fails loudly instead of silently becoming 0.
 */
export function fromString(value: string): Decimal {
  if (typeof value !== 'string') {
    throw new DecimalFormatError('Decimal input must be a string')
  }
  const trimmed = value.trim()
  if (!trimmed.length || trimmed.length > MAX_INPUT_LENGTH) {
    throw new DecimalFormatError('Decimal input length is out of range')
  }
  if (!DECIMAL_PATTERN.test(trimmed)) {
    throw new DecimalFormatError(`Invalid decimal value: ${trimmed}`)
  }
  const negative = trimmed.startsWith('-')
  const unsigned = negative ? trimmed.slice(1) : trimmed
  const [whole, fraction = ''] = unsigned.split('.')
  assertScale(fraction.length)
  const units = BigInt(`${whole}${fraction}`)
  return { units: negative ? -units : units, scale: fraction.length }
}

/** Accepts a safe integer or a bigint; never a float. */
export function fromInteger(value: number | bigint): Decimal {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) {
    throw new DecimalFormatError('Decimal integer input must be a safe integer')
  }
  return { units: BigInt(value), scale: 0 }
}

/** Widens a value to a larger scale without losing information. */
export function rescale(value: Decimal, scale: number): Decimal {
  assertScale(scale)
  if (scale === value.scale) return value
  if (scale < value.scale) {
    throw new DecimalFormatError(
      'rescale cannot reduce scale; use roundHalfEven instead',
    )
  }
  return { units: value.units * pow10(scale - value.scale), scale }
}

function align(left: Decimal, right: Decimal) {
  const scale = Math.max(left.scale, right.scale)
  return { scale, left: rescale(left, scale), right: rescale(right, scale) }
}

export function add(left: Decimal, right: Decimal): Decimal {
  const aligned = align(left, right)
  return {
    units: aligned.left.units + aligned.right.units,
    scale: aligned.scale,
  }
}

export function subtract(left: Decimal, right: Decimal): Decimal {
  const aligned = align(left, right)
  return {
    units: aligned.left.units - aligned.right.units,
    scale: aligned.scale,
  }
}

/**
 * Exact multiplication. The result scale is the sum of the operand scales, so
 * no rounding happens here — the caller decides when to round.
 */
export function multiply(left: Decimal, right: Decimal): Decimal {
  const scale = left.scale + right.scale
  assertScale(scale)
  return { units: left.units * right.units, scale }
}

/** Convenience wrapper for the common "count x unit amount" case. */
export function multiplyByInteger(
  value: Decimal,
  factor: number | bigint,
): Decimal {
  return multiply(value, fromInteger(factor))
}

export function compare(left: Decimal, right: Decimal): -1 | 0 | 1 {
  const aligned = align(left, right)
  if (aligned.left.units < aligned.right.units) return -1
  if (aligned.left.units > aligned.right.units) return 1
  return 0
}

export function isZero(value: Decimal): boolean {
  return value.units === BigInt(0)
}

export function isNegative(value: Decimal): boolean {
  return value.units < BigInt(0)
}

export function isPositive(value: Decimal): boolean {
  return value.units > BigInt(0)
}

/**
 * ROUND_HALF_EVEN to the requested scale. Exact halves round toward the even
 * digit: 20.005 -> 20.00 and 20.015 -> 20.02 at scale 2.
 */
export function roundHalfEven(value: Decimal, scale: number): Decimal {
  assertScale(scale)
  if (value.scale <= scale) return rescale(value, scale)
  const factor = pow10(value.scale - scale)
  const negative = value.units < BigInt(0)
  const absolute = negative ? -value.units : value.units
  const quotient = absolute / factor
  const remainder = absolute % factor
  const doubled = remainder * BigInt(2)
  let rounded = quotient
  if (doubled > factor || (doubled === factor && quotient % BigInt(2) === BigInt(1))) {
    rounded += BigInt(1)
  }
  return { units: negative ? -rounded : rounded, scale }
}

/** Renders the exact stored value, preserving trailing zeros of the scale. */
export function toString(value: Decimal): string {
  const negative = value.units < BigInt(0)
  const digits = (negative ? -value.units : value.units).toString()
  if (value.scale === 0) return `${negative ? '-' : ''}${digits}`
  const padded = digits.padStart(value.scale + 1, '0')
  const boundary = padded.length - value.scale
  return `${negative ? '-' : ''}${padded.slice(0, boundary)}.${padded.slice(boundary)}`
}

/** Renders the value rounded half-even to a fixed number of decimals. */
export function toFixed(value: Decimal, scale: number): string {
  return toString(roundHalfEven(value, scale))
}

/** Sums exactly, without any intermediate rounding. */
export function sum(values: readonly Decimal[]): Decimal {
  return values.reduce<Decimal>((total, value) => add(total, value), {
    units: BigInt(0),
    scale: 0,
  })
}
