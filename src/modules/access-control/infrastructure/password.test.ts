import { describe, expect, it } from 'vitest'
import { hashPassword, validatePassword, verifyPassword } from './password'

describe('password verifier', () => {
  it('uses a salted scrypt verifier and verifies the complete password', async () => {
    const password = 'correct horse battery staple'
    const encoded = await hashPassword(password)
    expect(encoded).toMatch(/^scrypt\$131072\$8\$1\$/)
    await expect(verifyPassword(password, encoded)).resolves.toBe(true)
    await expect(verifyPassword(`${password}!`, encoded)).resolves.toBe(false)
  })

  it('requires 15 Unicode code points without composition rules', () => {
    expect(() => validatePassword('short password')).toThrow()
    expect(() => validatePassword('một mật khẩu đủ dài')).not.toThrow()
  })
})
