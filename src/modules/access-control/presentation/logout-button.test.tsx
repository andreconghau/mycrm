import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LogoutButton } from './logout-button'

const router = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}))

describe('LogoutButton', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    router.refresh.mockReset()
    router.replace.mockReset()
    document.cookie = 'crm_csrf=; Max-Age=0; Path=/'
  })

  it('redirects after a successful logout response', async () => {
    document.cookie = 'crm_csrf=test-csrf; Path=/'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    )

    render(<LogoutButton locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/en/login'),
    )
    expect(router.refresh).toHaveBeenCalledOnce()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('treats an already-revoked session as logged out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    )

    render(<LogoutButton locale="vi" />)
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/vi/login'),
    )
  })

  it('shows a retry state when the request fails', async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)

    render(<LogoutButton locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Could not connect to sign out. Please try again.',
      ),
    )
    expect(router.replace).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Retry sign out' }))
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/en/login'),
    )
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('keeps the session when the server returns an unexpected error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
    )

    render(<LogoutButton locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Sign out failed. Please try again.',
      ),
    )
    expect(router.replace).not.toHaveBeenCalled()
  })
})
