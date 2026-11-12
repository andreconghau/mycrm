'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Item = { id: number; productId: number; productSku: string; productName: string; unit: string; priceBasis: string; unitPrice: string; minQuantity: string | null; maxQuantity: string | null; validFrom: string; validTo: string | null }
type PriceList = { id: number; code: string; tier: string; currency: string; customerId: number | null; status: string; effectiveState: string; version: number; validFrom: string; validTo: string | null; items: Item[] }
type History = { id: number; selectionType: string; selectedAmount: string; listedAmount: string | null; reason: string | null; selectedBy: number; selectedAt: string; currency: string; unit: string }
type Product = { id: number; sku: string; displayName: string }

function csrfToken() {
  return document.cookie.split('; ').find((value) => value.startsWith('crm_csrf='))?.split('=').slice(1).join('=') ?? ''
}

export function PriceListDetail({ id, locale, marketCode, canManage, onClose }: Readonly<{ id: number; locale: 'en' | 'vi'; marketCode: string; canManage: boolean; onClose: () => void }>) {
  const vi = locale === 'vi'
  const [list, setList] = useState<PriceList | null>(null)
  const [history, setHistory] = useState<History[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productQuery, setProductQuery] = useState('')
  const [productId, setProductId] = useState('')
  const [itemError, setItemError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [archiveReason, setArchiveReason] = useState('')
  const [reason, setReason] = useState('')
  const [dirty, setDirty] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const panel = useRef<HTMLElement>(null)

  const requestClose = useCallback(() => {
    if (busy) return
    if (dirty) setConfirmDiscard(true)
    else onClose()
  }, [busy, dirty, onClose])

  const load = useCallback(async () => {
    const [listResponse, historyResponse] = await Promise.all([
      fetch(`/api/v1/price-lists/${id}?market=${encodeURIComponent(marketCode)}`, { cache: 'no-store' }),
      fetch(`/api/v1/price-selections?market=${encodeURIComponent(marketCode)}&priceListId=${id}&limit=100`, { cache: 'no-store' }),
    ])
    const [listBody, historyBody] = await Promise.all([listResponse.json(), historyResponse.json()])
    if (!listResponse.ok) throw new Error(listBody.error?.message ?? 'Price List could not be loaded')
    setList(listBody.data)
    setHistory(historyResponse.ok ? historyBody.data ?? [] : [])
  }, [id, marketCode])

  useEffect(() => {
    void Promise.resolve().then(load).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load Price List'))
  }, [load])

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const element = panel.current
    element?.querySelector<HTMLElement>('button, input, select, textarea')?.focus()
    function trap(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); requestClose() }
      if (event.key !== 'Tab' || !element) return
      const controls = Array.from(element.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)'))
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus() }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus() }
    }
    document.addEventListener('keydown', trap)
    return () => { document.removeEventListener('keydown', trap); previous?.focus() }
  }, [onClose, requestClose])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams({ status: 'ACTIVE', limit: '8' })
      if (productQuery.trim()) params.set('q', productQuery.trim())
      try {
        const response = await fetch(`/api/v1/products?${params}`, { cache: 'no-store', signal: controller.signal })
        const body = await response.json()
        if (response.ok) setProducts(body.data.items ?? [])
      } catch (cause) { if ((cause as Error).name !== 'AbortError') setItemError('Product search failed') }
    }, 200)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [productQuery])

  async function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!list) return
    setBusy(true); setItemError('')
    const form = new FormData(event.currentTarget)
    const validFrom = String(form.get('validFrom') ?? '')
    const validTo = String(form.get('validTo') ?? '')
    const payload = {
      productId: Number(productId), specificationVersionId: null,
      unit: String(form.get('unit')), priceBasis: String(form.get('priceBasis')),
      priceBasisNote: String(form.get('priceBasisNote') ?? '').trim() || null,
      unitPrice: String(form.get('unitPrice')).trim(),
      minQuantity: String(form.get('minQuantity') ?? '').trim() || null,
      maxQuantity: String(form.get('maxQuantity') ?? '').trim() || null,
      validFrom: new Date(validFrom).toISOString(), validTo: validTo ? new Date(validTo).toISOString() : null,
    }
    const formElement = event.currentTarget
    try {
      const response = await fetch(`/api/v1/price-lists/${id}/items?market=${encodeURIComponent(marketCode)}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken() }, body: JSON.stringify(payload) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error?.message ?? 'Could not add item')
      setReason(body.data.overlaps?.length ? (vi ? `Có ${body.data.overlaps.length} mức giá có thời gian giao nhau.` : `${body.data.overlaps.length} overlapping price tier(s).`) : '')
      setProductId(''); setProductQuery(''); formElement.reset(); setDirty(false); await load()
    } catch (cause) { setItemError(cause instanceof Error ? cause.message : 'Could not add item') }
    finally { setBusy(false) }
  }

  async function transition(action: 'approve' | 'archive') {
    if (!list) return
    setBusy(true); setError('')
    try {
      const response = await fetch(`/api/v1/price-lists/${id}/${action}?market=${encodeURIComponent(marketCode)}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken() }, body: JSON.stringify(action === 'approve' ? { version: list.version } : { version: list.version, reason: archiveReason }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error?.message ?? `Could not ${action} Price List`)
      setShowArchive(false); setArchiveReason(''); setDirty(false); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Price List update failed') }
    finally { setBusy(false) }
  }

  return <div className="fixed inset-0 z-40 bg-slate-950/35" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose() }}><section ref={panel} role="dialog" aria-modal="true" aria-labelledby="price-list-detail-title" className="ml-auto flex h-full w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl">
    <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{list?.effectiveState ?? '…'}</p><h2 id="price-list-detail-title" className="mt-1 text-xl font-semibold">{list?.code ?? (vi ? 'Bảng giá' : 'Price List')}</h2><p className="mt-1 text-sm text-slate-600">{list?.tier} · {list?.currency}</p></div><button type="button" onClick={requestClose} className="min-h-11 min-w-11 rounded-full text-2xl" aria-label={vi ? 'Đóng' : 'Close'}>×</button></header>
    <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {canManage && list?.status === 'DRAFT' && <div className="flex flex-wrap gap-3"><button type="button" disabled={busy || !list.items.length} onClick={() => void transition('approve')} className="min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white disabled:opacity-50">{vi ? 'Phê duyệt' : 'Approve'}</button><button type="button" disabled={busy} onClick={() => setShowArchive(true)} className="min-h-11 rounded-lg border border-slate-300 px-4">{vi ? 'Lưu trữ' : 'Archive'}</button></div>}
      {canManage && list?.status === 'APPROVED' && <div className="flex gap-3"><button type="button" disabled={busy} onClick={() => setShowArchive(true)} className="min-h-11 rounded-lg border border-slate-300 px-4">{vi ? 'Lưu trữ' : 'Archive'}</button></div>}
      <section><h3 className="mb-3 font-semibold">{vi ? 'Mức giá' : 'Price items'}</h3>{!list ? <p role="status">{vi ? 'Đang tải…' : 'Loading…'}</p> : list.items.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">{vi ? 'Chưa có mức giá.' : 'No price items yet.'}</p> : <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-3">SKU</th><th className="p-3">{vi ? 'Đơn vị' : 'Unit'}</th><th className="p-3">{vi ? 'Cơ sở' : 'Basis'}</th><th className="p-3">{vi ? 'Giá tham chiếu' : 'Reference price'}</th><th className="p-3">{vi ? 'Số lượng' : 'Quantity tier'}</th></tr></thead><tbody>{list.items.map((item) => <tr key={item.id} className="border-t"><td className="p-3">{item.productSku} · {item.productName}</td><td className="p-3">{item.unit}</td><td className="p-3">{item.priceBasis}</td><td className="p-3">{item.unitPrice} {list.currency}</td><td className="p-3">{item.minQuantity ?? '−'} – {item.maxQuantity ?? '∞'}</td></tr>)}</tbody></table></div>}</section>
      {canManage && list?.status === 'DRAFT' && <form onSubmit={addItem} onChange={() => setDirty(true)} className="space-y-3 rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">{vi ? 'Thêm mức giá' : 'Add a price item'}</h3><label className="block text-sm">{vi ? 'Tìm sản phẩm' : 'Search product'}<input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3" /><select required value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border px-3"><option value="">{vi ? 'Chọn sản phẩm' : 'Select product'}</option>{products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.displayName}</option>)}</select></label><div className="grid gap-3 md:grid-cols-2"><label className="text-sm">{vi ? 'Đơn vị' : 'Unit'}<select name="unit" className="mt-1 min-h-11 w-full rounded-lg border px-3">{['KG', 'MT', 'CTN', 'PCS', 'LB'].map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-sm">{vi ? 'Cơ sở giá' : 'Price basis'}<select name="priceBasis" className="mt-1 min-h-11 w-full rounded-lg border px-3"><option>NET</option><option>GROSS</option><option>OTHER</option></select></label><label className="text-sm">{vi ? 'Giá' : 'Unit price'}<input name="unitPrice" required inputMode="decimal" className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label><label className="text-sm">{vi ? 'Ghi chú cơ sở khác' : 'Other basis note'}<input name="priceBasisNote" className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label><label className="text-sm">{vi ? 'SL tối thiểu' : 'Min quantity'}<input name="minQuantity" inputMode="decimal" className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label><label className="text-sm">{vi ? 'SL tối đa' : 'Max quantity'}<input name="maxQuantity" inputMode="decimal" className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label><label className="text-sm">{vi ? 'Bắt đầu' : 'Valid from'}<input name="validFrom" type="datetime-local" required defaultValue={new Date().toISOString().slice(0, 16)} className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label><label className="text-sm">{vi ? 'Kết thúc' : 'Valid to'}<input name="validTo" type="datetime-local" className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label></div>{itemError && <p role="alert" className="text-sm text-red-800">{itemError}</p>}{reason && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{reason}</p>}<button type="submit" disabled={busy || !productId} className="min-h-11 rounded-lg bg-slate-900 px-4 font-semibold text-white disabled:opacity-50">{busy ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Thêm mức giá' : 'Add price item')}</button></form>}
      <section><h3 className="mb-3 font-semibold">{vi ? 'Lịch sử lựa chọn' : 'Selection history'}</h3>{history.length === 0 ? <p className="text-sm text-slate-500">{vi ? 'Chưa có lựa chọn nào.' : 'No selections recorded.'}</p> : <div className="space-y-2">{history.map((selection) => <article key={selection.id} className="rounded-lg border border-slate-200 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{selection.selectionType}</strong><span>{selection.selectedAmount} {selection.currency}/{selection.unit}</span></div>{selection.reason && <p className="mt-1 text-slate-700">{selection.reason}</p>}<p className="mt-1 text-xs text-slate-500">{new Date(selection.selectedAt).toLocaleString(locale)} · {vi ? 'Người chọn' : 'Selected by'} #{selection.selectedBy}</p></article>)}</div>}</section>
      {confirmDiscard && <div role="alertdialog" aria-label={vi ? 'Bỏ thay đổi?' : 'Discard changes?'} className="rounded-xl border border-amber-300 bg-amber-50 p-4"><p>{vi ? 'Bỏ các thay đổi chưa lưu?' : 'Discard unsaved changes?'}</p><div className="mt-3 flex gap-2"><button type="button" onClick={onClose} className="min-h-11 rounded-lg bg-slate-900 px-4 text-white">{vi ? 'Bỏ thay đổi' : 'Discard'}</button><button type="button" onClick={() => setConfirmDiscard(false)} className="min-h-11 rounded-lg border px-4">{vi ? 'Tiếp tục sửa' : 'Keep editing'}</button></div></div>}
      {showArchive && <div role="alertdialog" aria-labelledby="archive-title" className="rounded-xl border border-amber-300 bg-amber-50 p-4"><h3 id="archive-title" className="font-semibold">{vi ? 'Lưu trữ bảng giá' : 'Archive Price List'}</h3><label className="mt-2 block text-sm">{vi ? 'Lý do' : 'Reason'}<textarea value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-amber-400 bg-white p-3" /></label><div className="mt-3 flex gap-2"><button type="button" disabled={archiveReason.trim().length < 3 || busy} onClick={() => void transition('archive')} className="min-h-11 rounded-lg bg-slate-900 px-4 text-white disabled:opacity-50">{vi ? 'Xác nhận lưu trữ' : 'Confirm archive'}</button><button type="button" onClick={() => setShowArchive(false)} className="min-h-11 rounded-lg border px-4">{vi ? 'Hủy' : 'Cancel'}</button></div></div>}
    </div>
  </section></div>
}
