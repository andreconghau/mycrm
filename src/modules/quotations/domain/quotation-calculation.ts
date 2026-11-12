import {
  addRational,
  divideRational,
  fromString,
  multiplyRational,
  rational,
  rationalToExactDecimalString,
  rationalToRoundedString,
  toRational,
  type Rational,
} from '@/lib/decimal'

export type QuotationCurrency = 'USD' | 'VND'

export type QuotationAmountInput = {
  currency: QuotationCurrency
  amount: string
}

export type QuotationLineInput = {
  quantity: string
  unitPrice: string
  currency: QuotationCurrency
}

export type CalculatedLine = {
  originalAmount: string
  convertedUsdAmount: string
}

export type QuotationCalculation = {
  lines: CalculatedLine[]
  originalUsdTotal: string
  originalVndTotal: string
  unroundedUsdTotal: string
  unroundedUsdNumerator: string
  unroundedUsdDenominator: string
  roundedUsdTotal: string
}

export class QuotationCalculationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QuotationCalculationError'
  }
}

function parseNonNegative(value: string, name: string) {
  const parsed = fromString(value)
  if (parsed.units < BigInt(0)) {
    throw new QuotationCalculationError(`${name} must be zero or greater`)
  }
  return toRational(parsed)
}

function parsePositive(value: string, name: string) {
  const parsed = fromString(value)
  if (parsed.units <= BigInt(0)) {
    throw new QuotationCalculationError(`${name} must be greater than zero`)
  }
  return toRational(parsed)
}

function sumCurrency(values: readonly { currency: QuotationCurrency; amount: Rational }[], currency: QuotationCurrency) {
  return values
    .filter((value) => value.currency === currency)
    .reduce<Rational>((total, value) => addRational(total, value.amount), rational(BigInt(0)))
}

function convertAmount(amount: Rational, currency: QuotationCurrency, rate: Rational | null) {
  if (currency === 'USD') return amount
  if (!rate) throw new QuotationCalculationError('A positive VND-per-USD rate is required for VND inputs')
  return divideRational(amount, rate)
}

export function calculateQuotation(input: {
  lines: readonly QuotationLineInput[]
  adjustments: readonly QuotationAmountInput[]
  vndPerUsd: string | null
}): QuotationCalculation {
  const lineAmounts = input.lines.map((line) => ({
    currency: line.currency,
    amount: multiplyRational(
      parsePositive(line.quantity, 'Quantity'),
      parseNonNegative(line.unitPrice, 'Unit price'),
    ),
  }))
  const adjustmentAmounts = input.adjustments.map((adjustment) => ({
    currency: adjustment.currency,
    amount: parseNonNegative(adjustment.amount, 'Adjustment'),
  }))
  const sourceAmounts = [...lineAmounts, ...adjustmentAmounts]
  const hasVnd = sourceAmounts.some((amount) => amount.currency === 'VND')
  const rate = input.vndPerUsd === null ? null : toRational(fromString(input.vndPerUsd))
  if (rate && rate.numerator <= BigInt(0)) {
    throw new QuotationCalculationError('VND-per-USD rate must be positive')
  }
  if (hasVnd && !rate) {
    throw new QuotationCalculationError('A positive VND-per-USD rate is required for VND inputs')
  }

  const originalUsd = sumCurrency(sourceAmounts, 'USD')
  const originalVnd = sumCurrency(sourceAmounts, 'VND')
  let payableUsd = originalUsd
  if (originalVnd.numerator !== BigInt(0)) {
    payableUsd = addRational(payableUsd, convertAmount(originalVnd, 'VND', rate))
  }

  const lines = input.lines.map((line) => {
    const amount = multiplyRational(
      parsePositive(line.quantity, 'Quantity'),
      parseNonNegative(line.unitPrice, 'Unit price'),
    )
    return {
      originalAmount: rationalToExactDecimalString(amount),
      convertedUsdAmount: rationalToRoundedString(
        convertAmount(amount, line.currency, rate),
        18,
      ),
    }
  })

  return {
    lines,
    originalUsdTotal: rationalToExactDecimalString(originalUsd),
    originalVndTotal: rationalToExactDecimalString(originalVnd),
    unroundedUsdTotal: rationalToRoundedString(payableUsd, 18),
    unroundedUsdNumerator: payableUsd.numerator.toString(),
    unroundedUsdDenominator: payableUsd.denominator.toString(),
    roundedUsdTotal: rationalToRoundedString(payableUsd, 2),
  }
}
