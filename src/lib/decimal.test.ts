import { describe, expect, it } from 'vitest'
import {
  DecimalFormatError,
  add,
  compare,
  fromInteger,
  fromString,
  isNegative,
  isZero,
  multiply,
  multiplyByInteger,
  rescale,
  roundHalfEven,
  subtract,
  sum,
  toFixed,
  toString,
} from './decimal'

describe('decimal parsing', () => {
  it('keeps the declared scale including trailing zeros', () => {
    expect(toString(fromString('10.00'))).toBe('10.00')
    expect(toString(fromString('0.100'))).toBe('0.100')
    expect(toString(fromString('-3.5'))).toBe('-3.5')
    expect(toString(fromString('7'))).toBe('7')
  })

  it('rejects malformed commercial values instead of coercing them', () => {
    for (const value of [
      '',
      ' ',
      'abc',
      '1e3',
      '1,000',
      '1.',
      '.5',
      '--1',
      '1.2.3',
      `1.${'0'.repeat(19)}`,
    ]) {
      expect(() => fromString(value), value).toThrow(DecimalFormatError)
    }
  })

  it('rejects unsafe integer input', () => {
    expect(() => fromInteger(1.5)).toThrow(DecimalFormatError)
    expect(() => fromInteger(Number.MAX_SAFE_INTEGER + 2)).toThrow(
      DecimalFormatError,
    )
  })

  it('refuses to narrow scale through rescale', () => {
    expect(() => rescale(fromString('1.234'), 2)).toThrow(DecimalFormatError)
    expect(toString(rescale(fromString('1.2'), 4))).toBe('1.2000')
  })
})

describe('exact arithmetic', () => {
  it('adds without floating-point drift', () => {
    // 0.1 + 0.2 === 0.30000000000000004 in IEEE-754.
    expect(toString(add(fromString('0.1'), fromString('0.2')))).toBe('0.3')
    // 1.005 * 100 loses precision as a float.
    expect(toString(multiplyByInteger(fromString('1.005'), 100))).toBe(
      '100.500',
    )
  })

  it('aligns operands of different scale', () => {
    expect(toString(add(fromString('1.5'), fromString('2.250')))).toBe('3.750')
    expect(toString(subtract(fromString('10'), fromString('0.01')))).toBe(
      '9.99',
    )
  })

  it('multiplies at the sum of the operand scales without rounding', () => {
    const result = multiply(fromString('1.25'), fromString('0.4'))
    expect(result.scale).toBe(3)
    expect(toString(result)).toBe('0.500')
  })

  it('sums an empty list to zero', () => {
    expect(toString(sum([]))).toBe('0')
    expect(isZero(sum([]))).toBe(true)
  })

  it('compares across scales', () => {
    expect(compare(fromString('1.10'), fromString('1.1'))).toBe(0)
    expect(compare(fromString('1.09'), fromString('1.1'))).toBe(-1)
    expect(compare(fromString('1.11'), fromString('1.1'))).toBe(1)
    expect(isNegative(subtract(fromString('1'), fromString('2')))).toBe(true)
  })
})

describe('ROUND_HALF_EVEN (r1-decisions.md §6)', () => {
  it('rounds the approved reference cases', () => {
    expect(toFixed(fromString('20.005'), 2)).toBe('20.00')
    expect(toFixed(fromString('20.015'), 2)).toBe('20.02')
    expect(
      toFixed(add(fromString('10.004'), fromString('10.004')), 2),
    ).toBe('20.01')
  })

  it('rounds exact halves toward the even digit', () => {
    expect(toFixed(fromString('0.125'), 2)).toBe('0.12')
    expect(toFixed(fromString('0.135'), 2)).toBe('0.14')
    expect(toFixed(fromString('2.5'), 0)).toBe('2')
    expect(toFixed(fromString('3.5'), 0)).toBe('4')
  })

  it('rounds away from zero when past the half', () => {
    expect(toFixed(fromString('0.126'), 2)).toBe('0.13')
    expect(toFixed(fromString('0.124'), 2)).toBe('0.12')
  })

  it('is symmetric for negative values', () => {
    expect(toFixed(fromString('-20.005'), 2)).toBe('-20.00')
    expect(toFixed(fromString('-20.015'), 2)).toBe('-20.02')
    expect(toFixed(fromString('-0.126'), 2)).toBe('-0.13')
  })

  it('widens rather than truncates when the scale already fits', () => {
    expect(toString(roundHalfEven(fromString('1.5'), 3))).toBe('1.500')
  })

  it('rejects an invalid target scale', () => {
    expect(() => roundHalfEven(fromString('1.5'), -1)).toThrow(
      DecimalFormatError,
    )
    expect(() => roundHalfEven(fromString('1.5'), 19)).toThrow(
      DecimalFormatError,
    )
  })

  it('never rounds intermediate sums', () => {
    const lines = ['10.004', '10.004', '10.004'].map(fromString)
    const total = sum(lines)
    expect(toString(total)).toBe('30.012')
    expect(toFixed(total, 2)).toBe('30.01')
  })
})
