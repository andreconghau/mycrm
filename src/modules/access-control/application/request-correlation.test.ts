import { describe, expect, it } from 'vitest'
import { requestCorrelationId } from './request-correlation'

describe('requestCorrelationId', () => {
  it('preserves a valid caller correlation UUID', () => {
    const id = '123e4567-e89b-42d3-a456-426614174000'
    expect(
      requestCorrelationId(
        new Request('http://localhost', { headers: { 'x-request-id': id } }),
      ),
    ).toBe(id)
  })

  it('replaces malformed correlation values with a UUID', () => {
    const id = requestCorrelationId(
      new Request('http://localhost', {
        headers: { 'x-request-id': 'token=secret' },
      }),
    )
    expect(id).toMatch(/^[0-9a-f-]{36}$/i)
  })
})
