'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { CustomerCreateDrawer } from './customer-create-drawer'

type Customer = {
  id: number
  code?: string
  legalName?: string
  tradeName?: string | null
  countryCode?: string
  status?: string
  ownerId?: number
  teamId?: number | null
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

export function CustomerWorkspace({
  locale,
  roles,
}: Readonly<{ locale: 'en' | 'vi'; roles: string[] }>) {
  const vi = locale === 'vi'
  const [markets, setMarkets] = useState<AuthorizedMarket[]>([])
  const [marketCode, setMarketCode] = useState('')
  const [items, setItems] = useState<Customer[]>([])
  const [history, setHistory] = useState<Customer[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const canCreate = roles.includes('sale') || roles.includes('admin')

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

  const load = useCallback(async () => {
    if (!marketCode) {
      setLoading(false)
      setItems([])
      setHistory([])
      return
    }
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ market: marketCode, q: query })
      const response = await fetch(`/api/v1/customers?${params}`, {
        cache: 'no-store',
      })
      const body = await response.json()
      if (!response.ok) {
        setError(
          response.status === 403
            ? vi
              ? 'Bạn chưa được cấp quyền khách hàng trong market này.'
              : 'You do not have customer access in this market.'
            : vi
              ? 'Không thể tải khách hàng.'
              : 'Customers could not be loaded.',
        )
        setItems([])
        setHistory([])
        return
      }
      setItems(body.data.items)
      setHistory(body.data.historyItems)
    } catch {
      setError(vi ? 'Lỗi kết nối.' : 'Connection error.')
    } finally {
      setLoading(false)
    }
  }, [marketCode, query, vi])

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  const rows = useMemo(() => [...items], [items])

  return (
    <section aria-labelledby="customer-title" className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
            R1 · M01
          </p>
          <h1
            className="mt-2 text-3xl font-semibold tracking-tight"
            id="customer-title"
          >
            {vi ? 'Khách hàng' : 'Customers'}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {vi
              ? 'Quản lý buyer B2B theo market và quyền được cấp.'
              : 'Manage B2B buyers within your market and assigned access.'}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
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
          {canCreate && (
            <button
              className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!marketCode || loading}
              onClick={() => setCreateOpen(true)}
              type="button"
            >
              <Plus aria-hidden size={17} />
              {vi ? 'Tạo khách hàng' : 'Create customer'}
            </button>
          )}
        </div>
      </header>

      {!marketCode && !loading ? (
        <p className="text-muted-foreground rounded-xl border p-6 text-sm">
          {vi
            ? 'Chưa có market đang hoạt động được cấp cho tài khoản này.'
            : 'No active market membership is assigned to this account.'}
        </p>
      ) : null}

      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold">
            {vi ? 'Danh sách khách hàng' : 'Customer list'}
          </h2>
          <label className="text-muted-foreground text-sm">
            <span className="sr-only">
              {vi ? 'Tìm khách hàng' : 'Search customers'}
            </span>
            <input
              className="text-foreground min-h-10 w-full rounded-md border px-3 sm:w-72"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={vi ? 'Tìm tên hoặc mã…' : 'Search name or code…'}
              value={query}
            />
          </label>
        </div>
        {error ? (
          <p className="text-destructive p-6 text-sm" role="alert">
            {error}
          </p>
        ) : loading ? (
          <p className="text-muted-foreground p-6 text-sm" role="status">
            {vi ? 'Đang tải…' : 'Loading…'}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground p-6 text-sm">
            {vi
              ? 'Chưa có khách hàng trong phạm vi truy cập.'
              : 'No customers in your authorized scope.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    {vi ? 'Mã' : 'Code'}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {vi ? 'Tên buyer' : 'Buyer'}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {vi ? 'Quốc gia' : 'Country'}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {vi ? 'Trạng thái' : 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr className="border-t" key={item.id}>
                    <td className="px-4 py-3 font-mono text-xs">{item.code}</td>
                    <td className="px-4 py-3">
                      <Link
                        className="text-primary font-medium hover:underline"
                        href={`/${locale}/customers/${item.id}?market=${marketCode}`}
                      >
                        {item.legalName}
                      </Link>
                      {item.tradeName && (
                        <span className="text-muted-foreground ml-2">
                          {item.tradeName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{item.countryCode}</td>
                    <td className="px-4 py-3">{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <section className="space-y-3" aria-labelledby="history-title">
          <h2 className="font-semibold" id="history-title">
            {vi
              ? 'Lịch sử khách hàng đã bàn giao'
              : 'Transferred customer history'}
          </h2>
          <div className="divide-y rounded-xl border">
            {history.map((item, index) => (
              <Link
                className="hover:bg-muted/50 block p-4 text-sm"
                href={`/${locale}/customers/${item.id}?market=${marketCode}`}
                key={`${item.id}-${item.transferredAt}-${index}`}
              >
                <strong>{item.legalName}</strong>
                <span className="text-muted-foreground ml-2">
                  {vi
                    ? 'Ảnh chụp tại thời điểm bàn giao'
                    : 'Snapshot at transfer'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <CustomerCreateDrawer
        locale={locale}
        marketCode={marketCode}
        onClose={() => setCreateOpen(false)}
        open={createOpen}
      />
    </section>
  )
}
