'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

function csrfToken() {
  const cookie = document.cookie
    .split('; ')
    .find(
      (value) =>
        value.startsWith('crm_csrf=') || value.startsWith('__Host-crm_csrf='),
    )
  return cookie ? decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1)) : ''
}

export function LogoutButton({ locale }: Readonly<{ locale: 'en' | 'vi' }>) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function logout() {
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken() },
      })
      if (response.status !== 204 && response.status !== 401) {
        setError(
          locale === 'vi'
            ? 'Không thể đăng xuất. Vui lòng thử lại.'
            : 'Sign out failed. Please try again.',
        )
        return
      }
      router.replace(`/${locale}/login`)
      router.refresh()
    } catch {
      setError(
        locale === 'vi'
          ? 'Không thể kết nối để đăng xuất. Vui lòng thử lại.'
          : 'Could not connect to sign out. Please try again.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        aria-busy={pending}
        className="rounded-md border px-3 py-2 text-sm disabled:opacity-60"
        disabled={pending}
        onClick={() => void logout()}
        type="button"
      >
        {pending
          ? locale === 'vi'
            ? 'Đang đăng xuất…'
            : 'Signing out…'
          : error
            ? locale === 'vi'
              ? 'Thử lại đăng xuất'
              : 'Retry sign out'
            : locale === 'vi'
              ? 'Đăng xuất'
              : 'Sign out'}
      </button>
      {error && (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
