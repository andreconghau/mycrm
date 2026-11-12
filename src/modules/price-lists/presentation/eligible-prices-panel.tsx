'use client'

import { useEffect, useState } from 'react'

type Product = { id: number; sku: string; displayName: string }
type Customer = { id: number; code: string; legalName: string; tradeName: string | null }
type Option = {
  id: number
  priceListId: number
  unitPrice: string
  currency: string
  unit: string
  priceBasis: string
  tier: string
  code: string
  minQuantity: string | null
  maxQuantity: string | null
  suggested: boolean
  priceBasisNote?: string | null
}

function csrfToken() {
  return document.cookie.split('; ').find((value) => value.startsWith('crm_csrf='))?.split('=').slice(1).join('=') ?? ''
}

function amountsMatch(left: string, right?: string) {
  if (right === undefined) return false
  const normalize = (value: string) => {
    const [whole, fraction = ''] = value.trim().split('.')
    const digits = fraction.replace(/0+$/, '')
    return `${whole}.${digits || '0'}`
  }
  return normalize(left) === normalize(right)
}

export function EligiblePricesPanel({ locale, marketCode, canOverride }: Readonly<{ locale: 'en' | 'vi'; marketCode: string; canOverride: boolean }>) {
  const vi = locale === 'vi'
  const [products, setProducts] = useState<Product[]>([])
  const [productQuery, setProductQuery] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('KG')
  const [currency, setCurrency] = useState('USD')
  const [customerId, setCustomerId] = useState('')
  const [customerQuery, setCustomerQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [options, setOptions] = useState<Option[]>([])
  const [suggestedId, setSuggestedId] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [selectedAmount, setSelectedAmount] = useState('')
  const [reason, setReason] = useState('')
  const [manual, setManual] = useState(false)
  const [priceBasis, setPriceBasis] = useState('NET')
  const [priceBasisNote, setPriceBasisNote] = useState('')
  const [lookedUp, setLookedUp] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams({ status: 'ACTIVE', limit: '8' })
      if (productQuery.trim()) params.set('q', productQuery.trim())
      try {
        const response = await fetch(`/api/v1/products?${params}`, { cache: 'no-store', signal: controller.signal })
        const body = await response.json()
        if (response.ok) setProducts(body.data?.items ?? [])
      } catch (cause) {
        if ((cause as Error).name !== 'AbortError') setError(vi ? 'Không tìm được sản phẩm.' : 'Product search failed.')
      }
    }, 200)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [productQuery, vi])

  useEffect(() => {
    if (!customerQuery.trim()) {
      const timer = window.setTimeout(() => setCustomers([]), 0)
      return () => window.clearTimeout(timer)
    }
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams({ market: marketCode, q: customerQuery.trim(), limit: '8' })
      try {
        const response = await fetch(`/api/v1/customers?${params}`, { cache: 'no-store', signal: controller.signal })
        const body = await response.json()
        if (response.ok) setCustomers(body.data?.items ?? [])
      } catch (cause) {
        if ((cause as Error).name !== 'AbortError') setError(vi ? 'Không tìm được khách hàng.' : 'Customer search failed.')
      }
    }, 200)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [customerQuery, marketCode, vi])

  async function search() {
    setError('')
    setMessage('')
    const params = new URLSearchParams({ market: marketCode, productId, quantity, unit, currency })
    if (customerId) params.set('customerId', customerId)
    try {
      const response = await fetch(`/api/v1/price-lists/applicable?${params}`, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error?.message ?? 'Price lookup failed')
      setOptions(body.data.options ?? [])
      setLookedUp(true)
      setSuggestedId(body.data.suggestedItemId ?? null)
      setSelectedId(body.data.suggestedItemId ? String(body.data.suggestedItemId) : '')
      const selected = (body.data.options as Option[]).find((item) => item.id === body.data.suggestedItemId)
      setSelectedAmount(selected?.unitPrice ?? '')
      setPriceBasis(selected?.priceBasis ?? 'NET')
      setPriceBasisNote(selected?.priceBasisNote ?? '')
      setManual(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (vi ? 'Không thể tra giá.' : 'Price lookup failed.'))
    }
  }

  async function record() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const selected = options.find((item) => String(item.id) === selectedId)
      const response = await fetch(`/api/v1/price-selections?market=${encodeURIComponent(marketCode)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken() },
        body: JSON.stringify({
          productId: Number(productId), customerId: customerId ? Number(customerId) : null,
          priceListItemId: manual ? null : selected?.id ?? null,
          selectedAmount, currency, unit, quantity, priceBasis: manual ? priceBasis : selected?.priceBasis ?? priceBasis,
          priceBasisNote: manual ? priceBasisNote : selected?.priceBasisNote ?? null,
          reason: manual || !amountsMatch(selectedAmount, selected?.unitPrice) ? reason : null,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error?.message ?? 'Selection failed')
      setMessage(vi ? 'Đã ghi nhận lựa chọn giá.' : 'Price selection recorded.')
      setReason('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (vi ? 'Không thể ghi nhận lựa chọn.' : 'Could not record selection.'))
    } finally {
      setBusy(false)
    }
  }

  const chosen = options.find((item) => String(item.id) === selectedId)
  const needsReason = manual || Boolean(chosen && !amountsMatch(selectedAmount, chosen.unitPrice))
  const unitLabel: Record<string, string> = { KG: 'kg', MT: 'mt', CTN: 'ctn', PCS: 'pcs', LB: 'lb' }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="eligible-prices-title">
      <div className="mb-4">
        <h2 id="eligible-prices-title" className="text-lg font-semibold text-slate-950">{vi ? 'Tra cứu giá áp dụng' : 'Eligible prices'}</h2>
        <p className="mt-1 text-sm text-slate-600">{vi ? 'Xem mọi mức giá hợp lệ; hệ thống đề xuất theo thứ tự khách hàng, thị trường, chung.' : 'See every eligible reference. Recommendation priority is customer, market, then general.'}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">{vi ? 'Tìm sản phẩm' : 'Search products'}
          <input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" placeholder="SKU" />
          <select aria-label={vi ? 'Sản phẩm' : 'Product'} value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3">
            <option value="">{vi ? 'Chọn sản phẩm' : 'Select product'}</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.displayName}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">{vi ? 'Số lượng' : 'Quantity'}<input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
        <label className="text-sm font-medium text-slate-700">{vi ? 'Tìm khách hàng (không bắt buộc)' : 'Search customer (optional)'}<input value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" placeholder={vi ? 'Tên hoặc mã…' : 'Name or code…'} /><select aria-label={vi ? 'Khách hàng' : 'Customer'} value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3"><option value="">{vi ? 'Tất cả khách hàng' : 'No customer filter'}</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.code} · {customer.tradeName || customer.legalName}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700">{vi ? 'Đơn vị' : 'Unit'}<select value={unit} onChange={(event) => setUnit(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3">{['KG', 'MT', 'CTN', 'PCS', 'LB'].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700">{vi ? 'Tiền tệ' : 'Currency'}<select value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3">{['USD', 'VND'].map((value) => <option key={value}>{value}</option>)}</select></label>
        <button type="button" onClick={search} disabled={!productId} className="min-h-11 self-end rounded-lg bg-slate-900 px-4 font-semibold text-white disabled:opacity-50">{vi ? 'Tìm giá' : 'Find prices'}</button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {lookedUp && (options.length > 0 || canOverride) && <div className="mt-5 space-y-3">
        {(['CUSTOMER', 'MARKET', 'GENERAL'] as const).map((tier) => {
          const group = options.filter((item) => item.tier === tier)
          if (!group.length) return null
          return <fieldset key={tier} className="rounded-lg border border-slate-200 p-3"><legend className="px-1 text-sm font-semibold text-slate-700">{tier}</legend>
            {group.map((item) => <label key={item.id} className="flex min-h-11 items-center gap-3 border-b border-slate-100 py-2 last:border-0">
              <input type="radio" name="priceReference" value={item.id} checked={!manual && selectedId === String(item.id)} onChange={() => { setManual(false); setSelectedId(String(item.id)); setSelectedAmount(item.unitPrice); setPriceBasis(item.priceBasis); setPriceBasisNote(item.priceBasisNote ?? '') }} />
              <span className="flex-1 text-sm">{item.code} · {item.unitPrice} {item.currency}/{unitLabel[item.unit]} {item.suggested && item.id === suggestedId && <strong className="ml-2 rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800">{vi ? 'Đề xuất' : 'Recommended'}</strong>}</span>
            </label>)}
          </fieldset>
        })}
        {canOverride && <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={manual} onChange={(event) => { setManual(event.target.checked); if (event.target.checked) { setSelectedId(''); setSelectedAmount(''); setPriceBasis('NET') } }} /><span>{vi ? 'Nhập giá thủ công' : 'Enter a manual price'}</span></label>}
        {manual && <label className="block text-sm font-medium text-slate-700">{vi ? 'Cơ sở giá' : 'Price basis'}<select value={priceBasis} onChange={(event) => setPriceBasis(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3">{['NET', 'GROSS', 'OTHER'].map((value) => <option key={value}>{value}</option>)}</select></label>}
        {(manual && priceBasis === 'OTHER') && <label className="block text-sm font-medium text-slate-700">{vi ? 'Ghi chú cơ sở giá' : 'Price basis note'}<input value={priceBasisNote} onChange={(event) => setPriceBasisNote(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>}
        {(manual || canOverride) && <label className="block text-sm font-medium text-slate-700">{vi ? 'Giá đã chọn' : 'Selected amount'}<input inputMode="decimal" value={selectedAmount} onChange={(event) => setSelectedAmount(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>}
        {needsReason && <label className="block text-sm font-medium text-slate-700">{vi ? 'Lý do (ít nhất 10 ký tự)' : 'Reason (at least 10 characters)'}<textarea value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 p-3" /></label>}
        <button type="button" onClick={record} disabled={busy || !selectedAmount || (needsReason && reason.trim().length < 10) || (manual && priceBasis === 'OTHER' && !priceBasisNote.trim())} className="min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white disabled:opacity-50">{busy ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Ghi nhận lựa chọn' : 'Record selection')}</button>
      </div>}
      {lookedUp && options.length === 0 && <p className="mt-4 text-sm text-slate-500">{vi ? 'Không có giá tham chiếu hợp lệ.' : 'No eligible reference prices.'}</p>}
      {!lookedUp && <p className="mt-4 text-sm text-slate-500">{vi ? 'Chưa có kết quả tra cứu.' : 'No lookup results yet.'}</p>}
    </section>
  )
}
