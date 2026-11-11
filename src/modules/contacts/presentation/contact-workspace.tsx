'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { ContactCreateDrawer } from './contact-create-drawer'

type Contact = {
  id: number
  customerId?: number
  customerLegalName?: string
  displayName?: string
  jobTitle?: string | null
  department?: string | null
  active?: boolean
  version?: number
  historical?: boolean
  transferredAt?: string
}

type AuthorizedMarket = {
  id: number
  code: string
  nameEn: string
  nameVi: string
}

export function csrfToken() {
  const cookie = document.cookie
    .split('; ')
    .find(
      (value) =>
        value.startsWith('crm_csrf=') || value.startsWith('__Host-crm_csrf='),
    )
  return cookie ? decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1)) : ''
}

export function ContactWorkspace({
  locale,
  roles,
}: Readonly<{ locale: 'en' | 'vi'; roles: string[] }>) {
  const vi = locale === 'vi'
  const [markets, setMarkets] = useState<AuthorizedMarket[]>([])
  const [marketCode, setMarketCode] = useState('')
  const [items, setItems] = useState<Contact[]>([])
  const [history, setHistory] = useState<Contact[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [denied, setDenied] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const canCreate =
    roles.includes('sale') ||
    roles.includes('manager') ||
    roles.includes('admin')

  useEffect(() => {
    let active = true
    void fetch('/api/v1/me/markets', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error('MARKETS_FAILED')
        return body.data as AuthorizedMarket[]
      })
      .then((result) => {
        if (!active) return
        setMarkets(result)
        setMarketCode((current) => current || result[0]?.code || '')
      })
      .catch(() => {
        if (active)
          setError(
            vi
              ? 'Không tải được danh sách market được cấp.'
              : 'Authorized markets could not be loaded.',
          )
      })
    return () => {
      active = false
    }
  }, [vi])

  const load = useCallback(
    async (cursor?: string) => {
      if (!marketCode) {
        setLoading(false)
        setItems([])
        setHistory([])
        return
      }
      setLoading(true)
      setError('')
      setDenied(false)
      try {
        const params = new URLSearchParams({ market: marketCode })
        if (query) params.set('q', query)
        if (customerFilter) params.set('customerId', customerFilter)
        if (activeFilter) params.set('active', activeFilter)
        if (cursor) params.set('cursor', cursor)
        const response = await fetch(`/api/v1/contacts?${params}`, {
          cache: 'no-store',
        })
        const body = await response.json()
        if (!response.ok) {
          if (response.status === 403) setDenied(true)
          else
            setError(
              vi ? 'Không thể tải liên hệ.' : 'Contacts could not be loaded.',
            )
          if (!cursor) {
            setItems([])
            setHistory([])
          }
          return
        }
        setItems((current) =>
          cursor ? [...current, ...body.data.items] : body.data.items,
        )
        setHistory(body.data.historyItems)
        setNextCursor(body.data.nextCursor)
      } catch {
        setError(vi ? 'Lỗi kết nối.' : 'Connection error.')
      } finally {
        setLoading(false)
      }
    },
    [marketCode, query, customerFilter, activeFilter, vi],
  )

  useEffect(() => {
    void Promise.resolve().then(() => load())
  }, [load])

  return (
    <section aria-labelledby="contact-title" className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
            R1 · M02
          </p>
          <h1
            className="mt-2 text-3xl font-semibold tracking-tight"
            id="contact-title"
          >
            {vi ? 'Liên hệ' : 'Contacts'}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {vi
              ? 'Quản lý người liên hệ tại buyer theo quyền trên khách hàng chủ quản.'
              : 'Manage people at buyer companies within the parent customer scope.'}
          </p>
        </div>
        <label className="text-sm">
          <span className="text-muted-foreground mr-2">Market</span>
          <select
            className="bg-card min-h-10 rounded-md border px-3"
            onChange={(event) => setMarketCode(event.target.value)}
            value={marketCode}
          >
            {markets.map((market) => (
              <option key={market.id} value={market.code}>
                {vi ? market.nameVi : market.nameEn} · {market.code}
              </option>
            ))}
          </select>
        </label>
      </header>

      {!marketCode && !loading ? (
        <p className="text-muted-foreground rounded-xl border p-6 text-sm">
          {vi
            ? 'Chưa có market đang hoạt động được cấp cho tài khoản này.'
            : 'No active market membership is assigned to this account.'}
        </p>
      ) : (
        canCreate && (
          <div className="flex justify-end">
            <button
              className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!marketCode}
              onClick={() => setCreateOpen(true)}
              type="button"
            >
              <Plus aria-hidden size={17} />
              {vi ? 'Tạo liên hệ' : 'Create contact'}
            </button>
          </div>
        )
      )}

      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold">
            {vi ? 'Danh sách liên hệ' : 'Contact list'}
          </h2>
          <div className="flex flex-wrap gap-2">
            <label className="text-muted-foreground text-sm">
              <span className="sr-only">
                {vi ? 'Lọc theo khách hàng' : 'Filter by customer'}
              </span>
              <input
                className="text-foreground min-h-10 w-full rounded-md border px-3 sm:w-40"
                inputMode="numeric"
                onChange={(event) => setCustomerFilter(event.target.value)}
                placeholder={vi ? 'ID khách hàng' : 'Customer ID'}
                value={customerFilter}
              />
            </label>
            <label className="text-muted-foreground text-sm">
              <span className="sr-only">{vi ? 'Trạng thái' : 'Status'}</span>
              <select
                className="text-foreground bg-card min-h-10 rounded-md border px-3"
                onChange={(event) => setActiveFilter(event.target.value)}
                value={activeFilter}
              >
                <option value="">{vi ? 'Tất cả' : 'All'}</option>
                <option value="true">{vi ? 'Đang hoạt động' : 'Active'}</option>
                <option value="false">
                  {vi ? 'Đã vô hiệu hóa' : 'Inactive'}
                </option>
              </select>
            </label>
            <label className="text-muted-foreground text-sm">
              <span className="sr-only">
                {vi ? 'Tìm liên hệ' : 'Search contacts'}
              </span>
              <input
                className="text-foreground min-h-10 w-full rounded-md border px-3 sm:w-56"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={vi ? 'Tìm tên…' : 'Search name…'}
                value={query}
              />
            </label>
          </div>
        </div>
        {denied ? (
          <p className="p-6 text-sm" role="alert">
            {vi
              ? 'Bạn chưa được cấp quyền liên hệ trong market này.'
              : 'You do not have contact access in this market.'}
          </p>
        ) : error ? (
          <p className="text-destructive p-6 text-sm" role="alert">
            {error}
          </p>
        ) : loading ? (
          <p className="text-muted-foreground p-6 text-sm" role="status">
            {vi ? 'Đang tải…' : 'Loading…'}
          </p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground p-6 text-sm">
            {vi
              ? 'Chưa có liên hệ trong phạm vi truy cập.'
              : 'No contacts in your authorized scope.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    {vi ? 'Tên' : 'Name'}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {vi ? 'Buyer' : 'Buyer'}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {vi ? 'Chức danh' : 'Job title'}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {vi ? 'Trạng thái' : 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr className="border-t" key={item.id}>
                    <td className="px-4 py-3">
                      <Link
                        className="text-primary font-medium hover:underline"
                        href={`/${locale}/contacts/${item.id}?market=${marketCode}`}
                      >
                        {item.displayName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{item.customerLegalName}</td>
                    <td className="px-4 py-3">{item.jobTitle ?? '—'}</td>
                    <td className="px-4 py-3">
                      {item.active
                        ? vi
                          ? 'Đang hoạt động'
                          : 'ACTIVE'
                        : vi
                          ? 'Đã vô hiệu hóa'
                          : 'INACTIVE'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {nextCursor && !loading && (
          <div className="border-t p-4">
            <button
              className="min-h-10 rounded-md border px-4 text-sm"
              onClick={() => void load(nextCursor)}
              type="button"
            >
              {vi ? 'Tải thêm' : 'Load more'}
            </button>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <section aria-labelledby="contact-history-title" className="space-y-3">
          <h2 className="font-semibold" id="contact-history-title">
            {vi
              ? 'Liên hệ đã bàn giao (chỉ đọc tại thời điểm bàn giao)'
              : 'Transferred contacts (read-only snapshot at handover)'}
          </h2>
          <div className="divide-y rounded-xl border">
            {history.map((item, index) => (
              <Link
                className="hover:bg-muted/50 block p-4 text-sm"
                href={`/${locale}/contacts/${item.id}?market=${marketCode}`}
                key={`${item.id}-${item.transferredAt}-${index}`}
              >
                <strong>{item.displayName}</strong>
                <span className="text-muted-foreground ml-2">
                  {item.transferredAt
                    ? new Date(item.transferredAt).toLocaleString(locale)
                    : ''}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ContactCreateDrawer
        locale={locale}
        marketCode={marketCode}
        onClose={() => setCreateOpen(false)}
        open={createOpen}
      />
    </section>
  )
}
