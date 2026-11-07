import { type NextResponse } from 'next/server'
import { getAuthConfig } from './auth-config'

export function cookieNames() {
  const prefix = process.env.APP_ORIGIN?.startsWith('https://') ? '__Host-' : ''
  return {
    access: `${prefix}crm_access`,
    refresh: `${prefix}crm_refresh`,
    csrf: `${prefix}crm_csrf`,
  }
}

const base = () => ({
  path: '/',
  secure: getAuthConfig().secureCookies,
  sameSite: 'lax' as const,
})

export function setAuthCookies(
  response: NextResponse,
  values: { accessToken: string; refreshToken: string; csrfToken: string },
) {
  const names = cookieNames()
  const config = getAuthConfig()
  response.cookies.set(names.access, values.accessToken, {
    ...base(),
    httpOnly: true,
    maxAge: config.accessTtlSeconds,
  })
  response.cookies.set(names.refresh, values.refreshToken, {
    ...base(),
    httpOnly: true,
    maxAge: config.absoluteTtlSeconds,
  })
  response.cookies.set(names.csrf, values.csrfToken, {
    ...base(),
    httpOnly: false,
    maxAge: config.absoluteTtlSeconds,
  })
}

export function clearAuthCookies(response: NextResponse) {
  for (const name of Object.values(cookieNames())) {
    response.cookies.set(name, '', {
      ...base(),
      httpOnly: name !== cookieNames().csrf,
      maxAge: 0,
    })
  }
}
