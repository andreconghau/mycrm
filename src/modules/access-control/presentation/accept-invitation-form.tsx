'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export function AcceptInvitationForm({
  locale,
}: Readonly<{ locale: 'en' | 'vi' }>) {
  const token = useSearchParams().get('token') ?? ''
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError('')
    const response = await fetch('/api/v1/auth/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        displayName: form.get('displayName'),
        password: form.get('password'),
      }),
    })
    setPending(false)
    if (!response.ok) {
      setError(
        locale === 'vi'
          ? 'Liên kết mời không hợp lệ hoặc đã hết hạn.'
          : 'The invitation is invalid or expired.',
      )
      return
    }
    router.replace(`/${locale}/login`)
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="displayName">
          {locale === 'vi' ? 'Tên hiển thị' : 'Display name'}
        </label>
        <input
          className="min-h-11 w-full rounded-md border px-3"
          id="displayName"
          name="displayName"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="newPassword">
          {locale === 'vi'
            ? 'Mật khẩu mới (ít nhất 15 ký tự)'
            : 'New password (at least 15 characters)'}
        </label>
        <input
          autoComplete="new-password"
          className="min-h-11 w-full rounded-md border px-3"
          id="newPassword"
          minLength={15}
          name="password"
          required
          type="password"
        />
      </div>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <button
        className="bg-primary text-primary-foreground min-h-11 w-full rounded-md"
        disabled={pending || !token}
        type="submit"
      >
        {locale === 'vi' ? 'Kích hoạt tài khoản' : 'Activate account'}
      </button>
    </form>
  )
}
