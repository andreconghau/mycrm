'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LoginForm({ locale }: Readonly<{ locale: 'en' | 'vi' }>) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
        }),
      })
      if (!response.ok) {
        setError(
          locale === 'vi'
            ? 'Email hoặc mật khẩu không hợp lệ.'
            : 'Invalid email or password.',
        )
        return
      }
      router.replace(`/${locale}/dashboard`)
      router.refresh()
    } catch {
      setError(
        locale === 'vi'
          ? 'Không thể đăng nhập lúc này.'
          : 'Sign-in is temporarily unavailable.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="mt-7 space-y-5" onSubmit={submit}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          {locale === 'vi' ? 'Email công việc' : 'Work email'}
        </label>
        <input
          autoComplete="username"
          className="bg-muted/40 min-h-11 w-full rounded-md border px-3 text-sm"
          id="email"
          name="email"
          placeholder="name@company.com"
          required
          type="email"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          {locale === 'vi' ? 'Mật khẩu' : 'Password'}
        </label>
        <input
          autoComplete="current-password"
          className="bg-muted/40 min-h-11 w-full rounded-md border px-3 text-sm"
          id="password"
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
        className="bg-primary text-primary-foreground min-h-11 w-full rounded-md px-4 text-sm font-semibold disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending
          ? locale === 'vi'
            ? 'Đang đăng nhập…'
            : 'Signing in…'
          : locale === 'vi'
            ? 'Đăng nhập'
            : 'Sign in'}
      </button>
    </form>
  )
}
