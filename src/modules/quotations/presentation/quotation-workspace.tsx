'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMarket } from '@/modules/markets/market-context'

type Rfq = { id: number; number: string; customerCode: string; customerName: string | null; customerLegalName: string }
type Quote = { id: number; number: string; rfqId: number; rfqNumber: string; customerId: number; customerCode: string; customerName: string | null; customerLegalName: string; version: number; latestVersion: Version | null }
type Line = { id: number; lineNo: number; productId: number | null; specificationVersionId: number | null; quantity: string | null; unit: string | null; inputCurrency: string | null; inputUnitPrice: string | null; originalLineAmount: string | null; convertedUsdAmount: string | null; priceListItemId: number | null; referencePrice: string | null; priceBasis: string | null; priceBasisNote: string | null; priceReason: string | null; productSnapshot: { sku?: string; displayName?: string } | null; specificationSnapshot: { revisionNo?: number } | null }
type Version = { id: number; revisionNo: number; version: number; state: string; vndPerUsd: string | null; roundedUsdTotal: string | null; originalUsdTotal: string | null; originalVndTotal: string | null; incoterm: string | null; paymentTerms: string | null; validUntil: string | null; lines?: Line[]; adjustments?: Array<{ kind: string; originalAmount: string; inputCurrency: string }> }
type Product = { id: number; sku: string; displayName: string }
type Specification = { id: number; code: string; revisions?: Array<{ id: number; revisionNo: number; status: string }> }
type PriceOption = { id: number; code: string; unitPrice: string; currency: string; unit: string; priceBasis: string; priceBasisNote?: string | null; tier: string; suggested: boolean }

function csrfToken() {
  return document.cookie.split('; ').find((value) => value.startsWith('crm_csrf='))?.split('=').slice(1).join('=') ?? ''
}

export function QuotationWorkspace({ locale }: Readonly<{ locale: 'en' | 'vi' }>) {
  const vi = locale === 'vi'
  const { marketId, markets } = useMarket()
  const marketCode = markets.find((market) => market.id === marketId)?.code ?? ''
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [rfqs, setRfqs] = useState<Rfq[]>([])
  const [quoteQuery, setQuoteQuery] = useState('')
  const [rfqQuery, setRfqQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [createRfq, setCreateRfq] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [productId, setProductId] = useState('')
  const [specifications, setSpecifications] = useState<Specification[]>([])
  const [specificationVersionId, setSpecificationVersionId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('KG')
  const [currency, setCurrency] = useState('USD')
  const [unitPrice, setUnitPrice] = useState('')
  const [priceReason, setPriceReason] = useState('')
  const [priceBasis, setPriceBasis] = useState('NET')
  const [priceBasisNote, setPriceBasisNote] = useState('')
  const [referenceAmount, setReferenceAmount] = useState('')
  const [priceOptions, setPriceOptions] = useState<PriceOption[]>([])
  const [priceListItemId, setPriceListItemId] = useState('')
  const [editingLineId, setEditingLineId] = useState<number | null>(null)
  const [fx, setFx] = useState('')
  const [freight, setFreight] = useState('')
  const [freightCurrency, setFreightCurrency] = useState('USD')
  const [insurance, setInsurance] = useState('')
  const [insuranceCurrency, setInsuranceCurrency] = useState('USD')
  const [readiness, setReadiness] = useState<{ ready: boolean; issues: Array<{ code: string; message: string; lineNo: number | null }> } | null>(null)
  const activeVersion = useMemo(() => selected?.latestVersion ?? null, [selected])

  function applySelected(data: Record<string, unknown>) {
    const versions = Array.isArray(data.versions) ? data.versions as Version[] : []
    const latest = versions[0] ?? null
    setSelected({ ...data, latestVersion: latest } as Quote)
    setFx(latest?.vndPerUsd ?? '')
    const freightValue = latest?.adjustments?.find((item) => item.kind === 'FREIGHT')
    const insuranceValue = latest?.adjustments?.find((item) => item.kind === 'INSURANCE')
    setFreight(freightValue?.originalAmount ?? '')
    setFreightCurrency(freightValue?.inputCurrency ?? 'USD')
    setInsurance(insuranceValue?.originalAmount ?? '')
    setInsuranceCurrency(insuranceValue?.inputCurrency ?? 'USD')
  }

  const load = useCallback(async () => {
    if (!marketCode) return
    setLoading(true); setError(''); setAccessDenied(false)
    try {
      const params = new URLSearchParams({ market: marketCode, limit: '100' })
      if (quoteQuery.trim()) params.set('q', quoteQuery.trim())
      const response = await fetch(`/api/v1/quotations?${params}`, { cache: 'no-store' })
      const body = await response.json()
      if (response.status === 403) { setAccessDenied(true); return }
      if (!response.ok) throw new Error(body.error?.message ?? 'Could not load quotations')
      setQuotes(body.data.items ?? [])
      const rfqParams = new URLSearchParams({ market: marketCode, resource: 'rfqs', limit: '20' })
      if (rfqQuery.trim()) rfqParams.set('q', rfqQuery.trim())
      const rfqResponse = await fetch(`/api/v1/quotations?${rfqParams}`, { cache: 'no-store' })
      const rfqBody = await rfqResponse.json()
      if (rfqResponse.ok) setRfqs(rfqBody.data ?? [])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Connection error') }
    finally { setLoading(false) }
  }, [marketCode, quoteQuery, rfqQuery])

  useEffect(() => { void Promise.resolve().then(load) }, [load])
  useEffect(() => {
    if (!selectedId || !marketCode) return
    const controller = new AbortController()
    void fetch(`/api/v1/quotations/${selectedId}?market=${encodeURIComponent(marketCode)}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error?.message ?? 'Could not load quotation'); applySelected(body.data) })
      .catch((cause) => { if (cause.name !== 'AbortError') setError(cause instanceof Error ? cause.message : 'Could not load quotation') })
    return () => controller.abort()
  }, [selectedId, marketCode])
  useEffect(() => {
    if (!selectedId || accessDenied) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ status: 'ACTIVE', limit: '8' })
      if (productQuery.trim()) params.set('q', productQuery.trim())
      void fetch(`/api/v1/products?${params}`, { cache: 'no-store', signal: controller.signal })
        .then((response) => response.json()).then((body) => setProducts(body.data?.items ?? []))
        .catch((cause) => { if (cause.name !== 'AbortError') setError(vi ? 'Không tải được SKU.' : 'SKU search failed') })
    }, 180)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [productQuery, selectedId, accessDenied, vi])
  useEffect(() => {
    if (!productId || !marketCode) return
    const controller = new AbortController()
    void fetch(`/api/v1/products/${productId}/specifications?market=${encodeURIComponent(marketCode)}&limit=50`, { cache: 'no-store', signal: controller.signal })
      .then((response) => response.json()).then((body) => setSpecifications((body.data?.items ?? []).filter((item: Specification) => item.revisions?.some((version) => version.status === 'APPROVED'))))
      .catch((cause) => { if (cause.name !== 'AbortError') setError(vi ? 'Không tải được quy cách.' : 'Specification search failed') })
    return () => controller.abort()
  }, [productId, marketCode, vi])

  async function request(path: string, method: string, payload?: Record<string, unknown>) {
    const response = await fetch(`${path}${path.includes('?') ? '&' : '?'}market=${encodeURIComponent(marketCode)}`, {
      method, headers: { ...(payload ? { 'Content-Type': 'application/json' } : {}), 'X-CSRF-Token': csrfToken() },
      body: payload ? JSON.stringify(payload) : undefined, cache: 'no-store',
    })
    const body = await response.json()
    if (!response.ok) throw new Error(body.error?.message ?? 'Quotation request failed')
    return body.data
  }

  async function create() {
    if (!createRfq) return
    setBusy(true); setError(''); setNotice('')
    try { const value = await request('/api/v1/quotations', 'POST', { rfqId: Number(createRfq) }); setNotice(vi ? 'Đã tạo phương án báo giá.' : 'Quotation alternative created.'); setSelectedId(value.id); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create quotation') }
    finally { setBusy(false) }
  }

  async function cloneRevision() {
    if (!selected || !activeVersion) return
    setBusy(true); setError('')
    try { await request(`/api/v1/quotations/${selected.id}/revisions`, 'POST', { version: selected.version }); setNotice(vi ? 'Đã tạo bản nháp mới.' : 'New draft revision created.'); await refreshSelected() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not clone revision') }
    finally { setBusy(false) }
  }

  async function refreshSelected() {
    if (!selectedId || !marketCode) return
    const response = await fetch(`/api/v1/quotations/${selectedId}?market=${encodeURIComponent(marketCode)}`, { cache: 'no-store' })
    const body = await response.json()
    if (response.ok) applySelected(body.data)
  }

  async function saveFx() {
    if (!activeVersion) return
    await saveOperation(async () => { await request(`/api/v1/quotation-versions/${activeVersion.id}`, 'PATCH', { version: activeVersion.version, vndPerUsd: fx || null }); await refreshSelected() })
  }

  async function addLine() {
    if (!activeVersion) return
    await saveOperation(async () => {
      await request(editingLineId ? `/api/v1/quotation-versions/${activeVersion.id}/lines/${editingLineId}` : `/api/v1/quotation-versions/${activeVersion.id}/lines`, editingLineId ? 'PATCH' : 'POST', {
        version: activeVersion.version,
        ...(editingLineId ? {
          productId: productId ? Number(productId) : null,
          specificationVersionId: specificationVersionId ? Number(specificationVersionId) : null,
          quantity: quantity || null, unit,
          inputCurrency: unitPrice ? currency : null,
          inputUnitPrice: unitPrice || null,
          priceBasis: unitPrice ? priceBasis : null,
          priceBasisNote: unitPrice ? priceBasisNote : null,
          priceListItemId: unitPrice && priceListItemId ? Number(priceListItemId) : null,
          priceReason: unitPrice && (!priceListItemId || !amountMatchesReference()) ? priceReason : null,
        } : {
          ...(productId ? { productId: Number(productId) } : {}),
          ...(specificationVersionId ? { specificationVersionId: Number(specificationVersionId) } : {}),
          ...(quantity ? { quantity } : {}), ...(unit ? { unit } : {}),
          ...(unitPrice ? { inputCurrency: currency, inputUnitPrice: unitPrice, priceBasis, priceBasisNote, priceListItemId: priceListItemId ? Number(priceListItemId) : null, priceReason: priceListItemId && amountMatchesReference() ? null : priceReason } : {}),
        }),
      })
      setProductId(''); setSpecificationVersionId(''); setQuantity(''); setUnitPrice(''); setPriceReason(''); setPriceListItemId(''); setReferenceAmount(''); setEditingLineId(null); await refreshSelected()
    })
  }

  async function saveAdjustment(kind: 'freight' | 'insurance') {
    if (!activeVersion) return
    const amount = kind === 'freight' ? freight : insurance
    const adjustmentCurrency = kind === 'freight' ? freightCurrency : insuranceCurrency
    await saveOperation(async () => {
      await request(`/api/v1/quotation-versions/${activeVersion.id}/adjustments/${kind}`, 'PUT', { version: activeVersion.version, amount: amount || null, ...(amount ? { currency: adjustmentCurrency } : {}) })
      await refreshSelected()
    })
  }

  function editLine(line: Line) {
    setEditingLineId(line.id); setProductId(line.productId ? String(line.productId) : '')
    setSpecificationVersionId(line.specificationVersionId ? String(line.specificationVersionId) : '')
    setQuantity(line.quantity ?? ''); setUnit(line.unit ?? 'KG'); setCurrency(line.inputCurrency ?? 'USD')
    setUnitPrice(line.inputUnitPrice ?? ''); setPriceReason(line.priceReason ?? ''); setPriceListItemId(line.priceListItemId ? String(line.priceListItemId) : ''); setReferenceAmount(line.referencePrice ?? ''); setPriceBasis(line.priceBasis ?? 'NET'); setPriceBasisNote(line.priceBasisNote ?? '')
  }

  function amountMatchesReference() {
    if (!referenceAmount) return false
    const normalize = (value: string) => {
      const [whole, fraction = ''] = value.split('.')
      return `${whole}.${fraction.replace(/0+$/, '') || '0'}`
    }
    return normalize(referenceAmount) === normalize(unitPrice)
  }

  async function findPrices() {
    setError('')
    const params = new URLSearchParams({ market: marketCode, productId, quantity: quantity || '1', unit, currency })
    if (specificationVersionId) params.set('specificationVersionId', specificationVersionId)
    if (selected?.customerId) params.set('customerId', String(selected.customerId))
    try {
      const response = await fetch(`/api/v1/price-lists/applicable?${params}`, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error?.message ?? 'Eligible prices could not be loaded')
      setPriceOptions(body.data.options ?? [])
      setPriceListItemId(body.data.suggestedItemId ? String(body.data.suggestedItemId) : '')
      const suggested = (body.data.options as PriceOption[]).find((option) => option.id === body.data.suggestedItemId)
      setReferenceAmount(suggested?.unitPrice ?? '')
      if (suggested) { setUnitPrice(suggested.unitPrice); setCurrency(suggested.currency); setPriceBasis(suggested.priceBasis); setPriceBasisNote(suggested.priceBasisNote ?? '') }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Eligible prices could not be loaded') }
  }

  async function calculate() {
    if (!activeVersion) return
    await saveOperation(async () => { await request(`/api/v1/quotation-versions/${activeVersion.id}/calculate`, 'POST', { version: activeVersion.version }); await refreshSelected() })
  }

  async function checkReadiness() {
    if (!activeVersion) return
    try {
      const response = await fetch(`/api/v1/quotation-versions/${activeVersion.id}/readiness?market=${encodeURIComponent(marketCode)}`, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error?.message ?? 'Readiness check failed')
      setReadiness(body.data)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Readiness check failed') }
  }

  async function saveOperation(operation: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('')
    try { await operation(); setNotice(vi ? 'Đã lưu bản nháp và tính lại tổng.' : 'Draft saved and totals recalculated.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save quotation') }
    finally { setBusy(false) }
  }

  const needsPriceReason = unitPrice !== '' && (!priceListItemId || !amountMatchesReference())

  return <main className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight text-slate-950">{vi ? 'Báo giá' : 'Quotations'}</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">{vi ? 'Tạo các phương án độc lập, quản lý bản nháp và tính tổng USD từ nguồn USD/VND.' : 'Create independent alternatives, manage draft revisions, and calculate USD totals from USD and VND inputs.'}</p></div></header>
    {!accessDenied && notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}{!accessDenied && error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
    {accessDenied ? <section role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900"><h2 className="font-semibold">{vi ? 'Bạn chưa được cấp quyền xem báo giá.' : 'You cannot view quotations.'}</h2><p className="mt-2 text-sm">{vi ? 'Tài khoản hiện tại chưa có quyền truy cập khu vực này. Vui lòng liên hệ người quản lý CRM nếu bạn cần quyền xem báo giá.' : 'Your current account does not have access to this area. Contact your CRM administrator if you need quotation access.'}</p></section> : <>
    <section className="space-y-4 border-b border-slate-200 pb-6" aria-labelledby="quotation-list-heading">
      <h2 id="quotation-list-heading" className="text-xl font-semibold">{vi ? 'Phương án báo giá' : 'Quotation alternatives'}</h2>
      <div className="flex flex-wrap gap-3"><label className="sr-only" htmlFor="quotation-search">{vi ? 'Tìm báo giá' : 'Search quotations'}</label><input id="quotation-search" value={quoteQuery} onChange={(event) => setQuoteQuery(event.target.value)} placeholder={vi ? 'Tìm mã báo giá, RFQ hoặc khách hàng' : 'Search quotation, RFQ or customer'} className="min-h-11 w-full max-w-sm rounded-lg border border-slate-300 px-3" /><label className="sr-only" htmlFor="rfq-search">{vi ? 'Tìm RFQ để tạo phương án' : 'Search RFQ for a new alternative'}</label><input id="rfq-search" value={rfqQuery} onChange={(event) => setRfqQuery(event.target.value)} placeholder={vi ? 'Tìm RFQ để tạo phương án' : 'Search RFQ for a new alternative'} className="min-h-11 w-full max-w-sm rounded-lg border border-slate-300 px-3" /><select aria-label={vi ? 'RFQ' : 'RFQ'} value={createRfq} onChange={(event) => setCreateRfq(event.target.value)} className="min-h-11 min-w-64 rounded-lg border border-slate-300 px-3"><option value="">{vi ? 'Chọn RFQ đang mở' : 'Select an open RFQ'}</option>{rfqs.map((rfq) => <option key={rfq.id} value={rfq.id}>{rfq.number} · {rfq.customerCode} · {rfq.customerName || rfq.customerLegalName}</option>)}</select><button type="button" onClick={create} disabled={!createRfq || busy} className="min-h-11 rounded-lg bg-slate-900 px-4 font-semibold text-white disabled:opacity-50">{vi ? 'Tạo phương án' : 'Create alternative'}</button></div>
      {loading ? <p role="status" className="p-5 text-slate-600">{vi ? 'Đang tải báo giá…' : 'Loading quotations…'}</p> : quotes.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 p-6 text-slate-600">{vi ? 'Chưa có phương án báo giá.' : 'No quotation alternatives yet.'}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-xs uppercase text-slate-600"><tr><th className="px-3 py-2">{vi ? 'Báo giá' : 'Quotation'}</th><th className="px-3 py-2">RFQ</th><th className="px-3 py-2">{vi ? 'Khách hàng' : 'Customer'}</th><th className="px-3 py-2">{vi ? 'Bản nháp mới nhất' : 'Latest revision'}</th><th className="px-3 py-2">USD</th></tr></thead><tbody>{quotes.map((quote) => <tr key={quote.id} className="border-t border-slate-200"><td className="px-3 py-3"><button type="button" onClick={() => { setSelected(null); setSelectedId(quote.id); setReadiness(null) }} className="font-semibold text-blue-800 underline underline-offset-4">{quote.number}</button></td><td className="px-3 py-3">{quote.rfqNumber}</td><td className="px-3 py-3">{quote.customerCode} · {quote.customerName || quote.customerLegalName}</td><td className="px-3 py-3">{quote.latestVersion ? `R${quote.latestVersion.revisionNo} · ${quote.latestVersion.state}` : '—'}</td><td className="px-3 py-3 tabular-nums">{quote.latestVersion?.roundedUsdTotal ?? '—'}</td></tr>)}</tbody></table></div>}
    </section>
    {selected && activeVersion && <section className="space-y-5" aria-labelledby="draft-heading">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="draft-heading" className="text-xl font-semibold">{selected.number} · {selected.rfqNumber}</h2><p className="text-sm text-slate-600">{selected.customerCode} · {selected.customerName || selected.customerLegalName} · {vi ? 'Bản' : 'Revision'} {activeVersion.revisionNo} ({activeVersion.state})</p></div><button type="button" onClick={cloneRevision} disabled={busy} className="min-h-11 rounded-lg border border-slate-300 px-4 font-semibold">{vi ? 'Tạo bản nháp kế tiếp' : 'Clone as next draft'}</button></div>
      <fieldset className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-3"><legend className="px-1 font-semibold">{vi ? 'Tỷ giá và tổng hợp' : 'FX and totals'}</legend><label className="text-sm">{vi ? 'VND cho 1 USD' : 'VND per USD'}<input inputMode="decimal" value={fx} onChange={(event) => setFx(event.target.value)} placeholder={activeVersion.vndPerUsd ?? (vi ? 'Chưa thiết lập' : 'Not set')} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label><div className="self-end text-sm text-slate-700">USD: {activeVersion.originalUsdTotal ?? '0'} · VND: {activeVersion.originalVndTotal ?? '0'}</div><div className="self-end text-lg font-semibold tabular-nums">{vi ? 'Tổng nháp USD' : 'Draft USD total'}: {activeVersion.roundedUsdTotal ?? '0.00'} USD<span className="block text-xs font-normal text-slate-600">{vi ? 'Chỉ gồm dòng có đủ số lượng và đơn giá.' : 'Includes lines with complete quantity and unit price only.'}</span></div><button type="button" onClick={saveFx} disabled={busy} className="min-h-11 rounded-lg bg-blue-800 px-4 font-semibold text-white">{vi ? 'Lưu tỷ giá' : 'Save FX rate'}</button><button type="button" onClick={calculate} disabled={busy} className="min-h-11 rounded-lg border border-slate-300 px-4 font-semibold">{vi ? 'Tính lại' : 'Recalculate'}</button></fieldset>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase text-slate-600"><tr><th className="px-3 py-2">#</th><th className="px-3 py-2">SKU / {vi ? 'Quy cách' : 'Specification'}</th><th className="px-3 py-2">{vi ? 'Số lượng' : 'Quantity'}</th><th className="px-3 py-2">{vi ? 'Giá gốc' : 'Source price'}</th><th className="px-3 py-2">USD</th><th className="px-3 py-2">{vi ? 'Thao tác' : 'Actions'}</th></tr></thead><tbody>{activeVersion.lines?.map((line) => <tr key={line.id} className="border-t border-slate-200"><td className="px-3 py-3">{line.lineNo}</td><td className="px-3 py-3">{line.productSnapshot?.sku ?? (vi ? 'Thiếu SKU' : 'SKU required')} · {line.productSnapshot?.displayName ?? ''}<span className="block text-xs text-slate-500">{line.specificationVersionId ? `Spec revision ${line.specificationSnapshot?.revisionNo ?? line.specificationVersionId}` : (vi ? 'Thiếu bản quy cách được duyệt' : 'Approved specification revision required')}</span></td><td className="px-3 py-3">{line.quantity ?? '—'} {line.unit ?? ''}</td><td className="px-3 py-3">{line.inputUnitPrice ?? '—'} {line.inputCurrency ?? ''}</td><td className="px-3 py-3 tabular-nums">{line.convertedUsdAmount ?? '—'}</td><td className="px-3 py-3"><button type="button" onClick={() => editLine(line)} className="min-h-10 underline underline-offset-4">{vi ? 'Sửa dòng' : 'Edit line'}</button></td></tr>)}</tbody></table></div>
      <fieldset className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4"><legend className="px-1 font-semibold">{editingLineId ? (vi ? 'Sửa dòng thương mại' : 'Edit commercial line') : (vi ? 'Thêm dòng thương mại' : 'Add commercial line')}</legend><label className="text-sm">{vi ? 'Tìm SKU' : 'Search SKU'}<input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" placeholder="SKU" /><select aria-label={vi ? 'SKU' : 'SKU'} value={productId} onChange={(event) => { setProductId(event.target.value); setSpecifications([]); setSpecificationVersionId('') }} className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3"><option value="">{vi ? 'Chọn SKU' : 'Select SKU'}</option>{products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.displayName}</option>)}</select></label><label className="text-sm">{vi ? 'Bản quy cách được duyệt' : 'Approved specification revision'}<select value={specificationVersionId} onChange={(event) => setSpecificationVersionId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"><option value="">{vi ? 'Chưa chọn' : 'Not selected'}</option>{specifications.flatMap((specification) => (specification.revisions ?? []).filter((version) => version.status === 'APPROVED').map((version) => <option key={version.id} value={version.id}>{specification.code} · R{version.revisionNo}</option>))}</select></label><label className="text-sm">{vi ? 'Số lượng' : 'Quantity'}<input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label><label className="text-sm">{vi ? 'Đơn vị' : 'Unit'}<select value={unit} onChange={(event) => setUnit(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3">{['KG', 'MT', 'CTN', 'PCS', 'LB'].map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-sm">{vi ? 'Giá đơn vị (để trống để lưu chưa hoàn chỉnh)' : 'Unit price (leave blank to save incomplete)'}<input value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} inputMode="decimal" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label><label className="text-sm">{vi ? 'Tiền tệ' : 'Currency'}<select value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"><option>USD</option><option>VND</option></select></label><button type="button" onClick={findPrices} disabled={!productId} className="min-h-11 self-end rounded-lg border border-slate-300 px-4 font-semibold">{vi ? 'Tra giá tham chiếu' : 'Find reference prices'}</button>{priceOptions.length > 0 && <label className="text-sm">{vi ? 'Chọn giá hợp lệ' : 'Eligible reference'}<select value={priceListItemId} onChange={(event) => { setPriceListItemId(event.target.value); const option = priceOptions.find((value) => String(value.id) === event.target.value); setReferenceAmount(option?.unitPrice ?? ''); if (option) { setUnitPrice(option.unitPrice); setCurrency(option.currency); setPriceBasis(option.priceBasis); setPriceBasisNote(option.priceBasisNote ?? '') } }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"><option value="">{vi ? 'Giá thủ công' : 'Manual price'}</option>{priceOptions.map((option) => <option key={option.id} value={option.id}>{option.code} · {option.unitPrice} {option.currency}/{option.unit} · {option.tier}{option.suggested ? (vi ? ' · Đề xuất' : ' · Suggested') : ''}</option>)}</select></label>}{needsPriceReason && <label className="text-sm">{vi ? 'Lý do giá thủ công hoặc điều chỉnh' : 'Manual price or override reason'}<input value={priceReason} onChange={(event) => setPriceReason(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>}<button type="button" onClick={addLine} disabled={busy || (needsPriceReason && priceReason.trim().length < 10)} className="min-h-11 self-end rounded-lg bg-blue-800 px-4 font-semibold text-white disabled:opacity-50">{editingLineId ? (vi ? 'Lưu dòng' : 'Save line') : (vi ? 'Thêm dòng' : 'Add line')}</button></fieldset>
      <fieldset className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2"><legend className="px-1 font-semibold">{vi ? 'Cước và bảo hiểm' : 'Freight and insurance'}</legend><label className="text-sm">{vi ? 'Cước' : 'Freight'}<div className="mt-1 flex gap-2"><input value={freight} onChange={(event) => setFreight(event.target.value)} inputMode="decimal" className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3" /><select value={freightCurrency} onChange={(event) => setFreightCurrency(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 px-3"><option>USD</option><option>VND</option></select><button type="button" onClick={() => saveAdjustment('freight')} disabled={busy} className="rounded-lg border px-3">{vi ? 'Lưu' : 'Save'}</button></div></label><label className="text-sm">{vi ? 'Bảo hiểm' : 'Insurance'}<div className="mt-1 flex gap-2"><input value={insurance} onChange={(event) => setInsurance(event.target.value)} inputMode="decimal" className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3" /><select value={insuranceCurrency} onChange={(event) => setInsuranceCurrency(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 px-3"><option>USD</option><option>VND</option></select><button type="button" onClick={() => saveAdjustment('insurance')} disabled={busy} className="rounded-lg border px-3">{vi ? 'Lưu' : 'Save'}</button></div></label></fieldset>
      <div className="flex flex-wrap gap-3"><button type="button" onClick={checkReadiness} className="min-h-11 rounded-lg border border-slate-300 px-4 font-semibold">{vi ? 'Kiểm tra sẵn sàng gửi' : 'Check submission readiness'}</button>{readiness && <p role="status" className="self-center text-sm">{readiness.ready ? (vi ? 'Đủ SKU và bản quy cách được duyệt cho mọi dòng.' : 'Every line has an eligible SKU and approved specification revision.') : (vi ? 'Còn thiếu:' : 'Still needed:')} {readiness.issues.map((issue) => `${issue.lineNo ? `#${issue.lineNo}: ` : ''}${issue.message}`).join(' · ')}</p>}</div>
    </section>}
    {selected && !activeVersion && <p role="status">{vi ? 'Báo giá chưa có bản nháp.' : 'This quotation has no revision.'}</p>}
    </>}
  </main>
}
