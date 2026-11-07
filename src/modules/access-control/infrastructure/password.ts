import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto'
const N = 2 ** 17
const r = 8
const p = 1
const keyLength = 64
const maxmem = 256 * 1024 * 1024

function scrypt(
  password: string,
  salt: Buffer,
  length: number,
  options: { N: number; r: number; p: number; maxmem: number },
) {
  return new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(password, salt, length, options, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey)
    })
  })
}

export function validatePassword(password: string) {
  const length = [...password].length
  if (length < 15)
    throw new Error('Password must contain at least 15 characters')
  if (length > 128)
    throw new Error('Password must contain at most 128 characters')
}

export async function hashPassword(password: string) {
  validatePassword(password)
  const salt = randomBytes(16)
  const derived = await scrypt(password.normalize('NFC'), salt, keyLength, {
    N,
    r,
    p,
    maxmem,
  })
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64url')}$${derived.toString('base64url')}`
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, n, blockSize, parallelism, saltValue, hashValue] =
    encoded.split('$')
  if (
    algorithm !== 'scrypt' ||
    !n ||
    !blockSize ||
    !parallelism ||
    !saltValue ||
    !hashValue ||
    Number(n) !== N ||
    Number(blockSize) !== r ||
    Number(parallelism) !== p
  ) {
    return false
  }
  const expected = Buffer.from(hashValue, 'base64url')
  const salt = Buffer.from(saltValue, 'base64url')
  if (expected.length !== keyLength || salt.length !== 16) return false
  const derived = await scrypt(
    password.normalize('NFC'),
    salt,
    expected.length,
    {
      N: Number(n),
      r: Number(blockSize),
      p: Number(parallelism),
      maxmem,
    },
  )
  return (
    expected.length === derived.length && timingSafeEqual(expected, derived)
  )
}

let dummyHashPromise: Promise<string> | undefined

export function getDummyPasswordHash() {
  dummyHashPromise ??= hashPassword('not-a-real-password-value')
  return dummyHashPromise
}
