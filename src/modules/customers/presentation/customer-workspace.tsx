'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

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
type AuthorizedMarket = { id: number; code: string; nameEn: string; nameVi: string }

function csrfToken() {
  const cookie = document.cookie
    .split('; ')
    .find(
      (value) =>
        value.startsWith('crm_csrf=') || value.startsWith('__Host-crm_csrf='),
    )
  return cookie ? decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1)) : ''
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
  const [created, setCreated] = useState(false)
  const [pending, setPending] = useState(false)
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
        if (active) setError(vi ? 'Không tải được danh sách market được cấp.' : 'Authorized markets could not be loaded.')
      })
    return () => { active = false }
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

  async function createCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!marketCode) return
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const identifierKind = String(form.get('identifierKind') ?? '').trim()
    const identifierValue = String(form.get('identifierValue') ?? '').trim()
    const identifiers =
      identifierKind && identifierValue
        ? [{ kind: identifierKind, value: identifierValue }]
        : []
    const addressLines = String(form.get('addressLines') ?? '').trim()
    const addresses = addressLines
      ? [
          {
            kind: String(form.get('addressKind') || 'office'),
            addressLines,
            city: String(form.get('city') ?? '').trim() || null,
            countryCode: String(form.get('addressCountryCode') || form.get('countryCode')),
            isDefault: Boolean(form.get('addressDefault')),
          },
        ]
      : []
    setPending(true)
    setError('')
    try {
      if (identifiers.length) {
        const duplicateResponse = await fetch(
          `/api/v1/customers/duplicate-candidates?market=${marketCode}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': csrfToken(),
            },
            body: JSON.stringify({ identifiers }),
          },
        )
        if (!duplicateResponse.ok) throw new Error('DUPLICATE_CHECK_FAILED')
        const duplicateBody = await duplicateResponse.json()
        const candidates = duplicateBody.data as Array<{
          code?: string
          legalName?: string
          countryCode?: string
        }>
        if (
          candidates.length > 0 &&
          !window.confirm(
            `${vi ? 'Có buyer trùng định danh. Vẫn tạo bản ghi mới?' : 'A matching buyer identifier was found. Create a separate record anyway?'}\n\n${candidates.map((item) => `${item.code ?? ''} · ${item.legalName ?? ''} (${item.countryCode ?? ''})`).join('\n')}`,
          )
        ) {
          setError(vi ? 'Đã dừng để bạn xem lại buyer trùng.' : 'Creation stopped so you can review the duplicate candidate.')
          return
        }
      }
      const response = await fetch(`/api/v1/customers?market=${marketCode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken(),
        },
        body: JSON.stringify({
          code: form.get('code'),
          legalName: form.get('legalName'),
          tradeName: form.get('tradeName') || null,
          countryCode: form.get('countryCode'),
          preferredCurrency: form.get('preferredCurrency') || null,
          status: 'PROSPECT',
          addresses,
          identifiers,
        }),
      })
      if (!response.ok) {
        setError(
          response.status === 409
            ? vi
              ? 'Mã khách hàng đã được sử dụng trong market này.'
              : 'That customer code is already used in this market.'
            : vi
              ? 'Không thể tạo khách hàng. Kiểm tra quyền và dữ liệu.'
              : 'Customer could not be created. Check access and form values.',
        )
        return
      }
      formElement.reset()
      setCreated(true)
      await load()
    } catch {
      setError(vi ? 'Lỗi kết nối.' : 'Connection error.')
    } finally {
      setPending(false)
    }
  }

  const rows = useMemo(() => [...items], [items])

  return (
    <section aria-labelledby="customer-title" className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
            R1 · M01
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight" id="customer-title">
            {vi ? 'Khách hàng' : 'Customers'}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {vi
              ? 'Quản lý buyer B2B theo market và quyền được cấp.'
              : 'Manage B2B buyers within your market and assigned access.'}
          </p>
        </div>
        <label className="text-sm">
          <span className="text-muted-foreground mr-2">Market</span>
          <select className="bg-card min-h-10 rounded-md border px-3" onChange={(event) => setMarketCode(event.target.value)} value={marketCode}>
            {markets.map((market) => <option key={market.id} value={market.code}>{vi ? market.nameVi : market.nameEn} · {market.code}</option>)}
          </select>
        </label>
      </header>

      {!marketCode && !loading ? (
        <p className="text-muted-foreground rounded-xl border p-6 text-sm">{vi ? 'Chưa có market đang hoạt động được cấp cho tài khoản này.' : 'No active market membership is assigned to this account.'}</p>
      ) : canCreate && (
        <details className="bg-card rounded-xl border p-4 shadow-sm" open={created}>
          <summary className="cursor-pointer font-medium">
            {vi ? 'Tạo khách hàng' : 'Create customer'}
          </summary>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={createCustomer}>
            <Field label={vi ? 'Mã khách hàng' : 'Customer code'} name="code" required />
            <Field label={vi ? 'Tên pháp lý' : 'Legal name'} name="legalName" required />
            <Field label={vi ? 'Tên giao dịch' : 'Trading name'} name="tradeName" />
            <Field label={vi ? 'Quốc gia buyer (ISO-2)' : 'Buyer country (ISO-2)'} name="countryCode" maxLength={2} required />
            <Field label={vi ? 'Tiền tệ ưu tiên (ISO-4217)' : 'Preferred currency (ISO-4217)'} name="preferredCurrency" maxLength={3} />
            <Field label={vi ? 'Địa chỉ chính' : 'Primary address'} name="addressLines" />
            <Field label={vi ? 'Thành phố' : 'City'} name="city" />
            <label className="space-y-1 text-sm">
              <span className="font-medium">{vi ? 'Loại địa chỉ' : 'Address type'}</span>
              <select className="bg-background min-h-10 w-full rounded-md border px-3" name="addressKind">
                <option value="office">{vi ? 'Văn phòng' : 'Office'}</option>
                <option value="billing">{vi ? 'Thanh toán' : 'Billing'}</option>
                <option value="shipping">{vi ? 'Giao hàng' : 'Shipping'}</option>
              </select>
            </label>
            <Field label={vi ? 'Quốc gia địa chỉ (ISO-2)' : 'Address country (ISO-2)'} name="addressCountryCode" maxLength={2} />
            <Field label={vi ? 'Loại định danh (tùy chọn)' : 'Identifier type (optional)'} name="identifierKind" />
            <Field label={vi ? 'Mã đăng ký / thuế (tùy chọn)' : 'Registration / tax identifier (optional)'} name="identifierValue" />
            <div className="sm:col-span-2">
              <button className="bg-primary text-primary-foreground min-h-10 rounded-md px-4 text-sm font-medium disabled:opacity-60" disabled={pending}>
                {pending ? (vi ? 'Đang lưu…' : 'Saving…') : vi ? 'Lưu khách hàng' : 'Save customer'}
              </button>
            </div>
          </form>
        </details>
      )}

      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold">{vi ? 'Danh sách khách hàng' : 'Customer list'}</h2>
          <label className="text-muted-foreground text-sm">
            <span className="sr-only">{vi ? 'Tìm khách hàng' : 'Search customers'}</span>
            <input
              className="text-foreground min-h-10 w-full rounded-md border px-3 sm:w-72"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={vi ? 'Tìm tên hoặc mã…' : 'Search name or code…'}
              value={query}
            />
          </label>
        </div>
        {error ? (
          <p className="text-destructive p-6 text-sm" role="alert">{error}</p>
        ) : loading ? (
          <p className="text-muted-foreground p-6 text-sm" role="status">{vi ? 'Đang tải…' : 'Loading…'}</p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground p-6 text-sm">{vi ? 'Chưa có khách hàng trong phạm vi truy cập.' : 'No customers in your authorized scope.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{vi ? 'Mã' : 'Code'}</th>
                  <th className="px-4 py-3 font-medium">{vi ? 'Tên buyer' : 'Buyer'}</th>
                  <th className="px-4 py-3 font-medium">{vi ? 'Quốc gia' : 'Country'}</th>
                  <th className="px-4 py-3 font-medium">{vi ? 'Trạng thái' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr className="border-t" key={item.id}>
                    <td className="px-4 py-3 font-mono text-xs">{item.code}</td>
                    <td className="px-4 py-3">
                      <Link className="text-primary font-medium hover:underline" href={`/${locale}/customers/${item.id}?market=${marketCode}`}>
                        {item.legalName}
                      </Link>
                      {item.tradeName && <span className="text-muted-foreground ml-2">{item.tradeName}</span>}
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
          <h2 className="font-semibold" id="history-title">{vi ? 'Lịch sử khách hàng đã bàn giao' : 'Transferred customer history'}</h2>
          <div className="divide-y rounded-xl border">
            {history.map((item, index) => (
              <Link className="block p-4 text-sm hover:bg-muted/50" href={`/${locale}/customers/${item.id}?market=${marketCode}`} key={`${item.id}-${item.transferredAt}-${index}`}>
                <strong>{item.legalName}</strong>
                <span className="text-muted-foreground ml-2">{vi ? 'Ảnh chụp tại thời điểm bàn giao' : 'Snapshot at transfer'}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </section>
  )
}

function Field({
  label,
  name,
  required,
  maxLength,
}: Readonly<{
  label: string
  name: string
  required?: boolean
  maxLength?: number
}>) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        className="bg-background min-h-10 w-full rounded-md border px-3"
        maxLength={maxLength}
        name={name}
        required={required}
      />
    </label>
  )
}
