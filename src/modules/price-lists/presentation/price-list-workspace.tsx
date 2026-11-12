'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { useMarket } from '@/modules/markets/market-context'
import { PriceListDetail } from './price-list-detail'
import { EligiblePricesPanel } from './eligible-prices-panel'

type PriceList = {
  id: number
  code: string
  customerId: number | null
  tier: 'CUSTOMER' | 'MARKET' | 'GENERAL'
  currency: string
  validFrom: string
  validTo: string | null
  status: string
  effectiveState: string
  version: number
}
type Customer = { id: number; code: string; legalName: string; tradeName: string | null }

function csrfToken() {
  return document.cookie.split('; ').find((value) => value.startsWith('crm_csrf='))?.split('=').slice(1).join('=') ?? ''
}

function localDateTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function PriceListWorkspace({ locale, roles }: Readonly<{ locale: 'en' | 'vi'; roles: string[] }>) {
  const vi = locale === 'vi'
  const { marketId, markets } = useMarket()
  const marketCode = markets.find((market) => market.id === marketId)?.code ?? ''
  const [items, setItems] = useState<PriceList[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [drawer, setDrawer] = useState(false)
  const [editing, setEditing] = useState<PriceList | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [dirty, setDirty] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState('')
  const [customerQuery, setCustomerQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [tier, setTier] = useState<PriceList['tier']>('GENERAL')
  const panel = useRef<HTMLElement>(null)
  const canManage = roles.includes('admin') || roles.includes('manager')

  const load = useCallback(async () => {
    if (!marketCode) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ market: marketCode, limit: '100' })
      if (query.trim()) params.set('q', query.trim())
      const response = await fetch(`/api/v1/price-lists?${params}`, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(response.status === 403 ? (vi ? 'Bạn chưa được cấp quyền xem bảng giá.' : 'You cannot view Price Lists.') : (body.error?.message ?? 'Price Lists could not be loaded.'))
      setItems(body.data.items ?? [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (vi ? 'Lỗi kết nối.' : 'Connection error.'))
    } finally { setLoading(false) }
  }, [marketCode, query, vi])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  useEffect(() => {
    if (!drawer || !marketCode || tier !== 'CUSTOMER') return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ market: marketCode, limit: '8' })
        if (customerQuery.trim()) params.set('q', customerQuery.trim())
        const response = await fetch(`/api/v1/customers?${params}`, { cache: 'no-store', signal: controller.signal })
        const body = await response.json()
        if (!response.ok) throw new Error(vi ? 'Không tải được khách hàng.' : 'Customer search failed.')
        setCustomers(body.data.items ?? [])
      } catch (cause) {
        if ((cause as Error).name !== 'AbortError') setFormError(cause instanceof Error ? cause.message : 'Customer search failed')
      }
    }, 200)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [customerQuery, drawer, marketCode, tier, vi])

  const finishClose = useCallback(() => { setDrawer(false); setEditing(null); setDirty(false); setConfirmDiscard(false); setFormError(''); setCustomerQuery(''); setCustomers([]); setCustomerId(null); setTier('GENERAL') }, [])
  const requestClose = useCallback(() => { if (pending) return; if (dirty) setConfirmDiscard(true); else finishClose() }, [dirty, finishClose, pending])

  useEffect(() => {
    if (!drawer) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const element = panel.current
    element?.querySelector<HTMLElement>('input, select, button')?.focus()
    function trap(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); requestClose() }
      if (event.key !== 'Tab' || !element) return
      const controls = Array.from(element.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)'))
      const first = controls[0]
      const last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', trap)
    return () => { document.removeEventListener('keydown', trap); previous?.focus() }
  }, [drawer, requestClose])

  function openCreate() { setEditing(null); setCustomerId(null); setTier('GENERAL'); setDirty(false); setDrawer(true) }
  function openEdit(item: PriceList) { setEditing(item); setCustomerId(item.customerId); setTier(item.tier); setDirty(false); setDrawer(true) }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!marketCode) return
    setPending(true); setFormError('')
    const form = new FormData(event.currentTarget)
    const value = {
      code: String(form.get('code') ?? '').trim(), tier, customerId: tier === 'CUSTOMER' ? customerId : null,
      currency: String(form.get('currency') ?? 'USD'), validFrom: new Date(String(form.get('validFrom'))).toISOString(),
      validTo: String(form.get('validTo') ?? '') ? new Date(String(form.get('validTo') as string)).toISOString() : null,
    }
    if (editing) Object.assign(value, { version: editing.version })
    try {
      const response = await fetch(`${editing ? `/api/v1/price-lists/${editing.id}` : '/api/v1/price-lists'}?market=${encodeURIComponent(marketCode)}`, {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken() }, body: JSON.stringify(value),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error?.message ?? 'Could not save Price List')
      const id = body.data.id as number
      finishClose(); setDetailId(id); await load()
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : 'Could not save Price List') }
    finally { setPending(false) }
  }

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">R1 · M08</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{vi ? 'Bảng giá' : 'Price Lists'}</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">{vi ? 'Quản lý giá tham chiếu theo thị trường và ghi lại từng lựa chọn.' : 'Manage market reference prices and preserve each price selection.'}</p></div>
      {canManage && <button type="button" onClick={openCreate} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 font-semibold text-white"><Plus size={18} />{vi ? 'Tạo bảng giá' : 'New Price List'}</button>}
    </header>
    <div className="flex flex-wrap items-center gap-3"><label className="sr-only" htmlFor="price-list-search">{vi ? 'Tìm bảng giá' : 'Search Price Lists'}</label><input id="price-list-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={vi ? 'Tìm theo mã…' : 'Search by code…'} className="min-h-11 w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3" /></div>
    {loading ? <p role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-slate-600">{vi ? 'Đang tải bảng giá…' : 'Loading Price Lists…'}</p> : error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">{error}</div> : items.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">{vi ? 'Chưa có bảng giá trong thị trường này.' : 'No Price Lists in this market yet.'}</div> : <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600"><tr><th className="px-4 py-3">{vi ? 'Mã' : 'Code'}</th><th className="px-4 py-3">{vi ? 'Phạm vi' : 'Tier'}</th><th className="px-4 py-3">{vi ? 'Tiền tệ' : 'Currency'}</th><th className="px-4 py-3">{vi ? 'Hiệu lực' : 'Effective'}</th><th className="px-4 py-3">{vi ? 'Trạng thái' : 'Status'}</th><th className="px-4 py-3"><span className="sr-only">{vi ? 'Thao tác' : 'Actions'}</span></th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold"><button type="button" onClick={() => setDetailId(item.id)} className="underline decoration-slate-300 underline-offset-4">{item.code}</button></td><td className="px-4 py-3">{item.tier}</td><td className="px-4 py-3">{item.currency}</td><td className="px-4 py-3">{new Date(item.validFrom).toLocaleDateString(locale)} – {item.validTo ? new Date(item.validTo).toLocaleDateString(locale) : '∞'}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium">{item.effectiveState}</span></td><td className="px-4 py-3 text-right">{canManage && item.status === 'DRAFT' && <button type="button" onClick={() => openEdit(item)} className="min-h-10 rounded-md px-3 font-medium text-emerald-800 hover:bg-emerald-50">{vi ? 'Sửa' : 'Edit'}</button>}</td></tr>)}</tbody></table></div>}
    <EligiblePricesPanel locale={locale} marketCode={marketCode} canOverride={canManage} />
    {drawer && <div className="fixed inset-0 z-50 bg-slate-950/35" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose() }}><section ref={panel} role="dialog" aria-modal="true" aria-labelledby="price-list-drawer-title" className="ml-auto flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl"><header className="border-b border-slate-200 px-6 py-5"><h2 id="price-list-drawer-title" className="text-xl font-semibold">{editing ? (vi ? 'Sửa bảng giá' : 'Edit Price List') : (vi ? 'Tạo bảng giá' : 'Create Price List')}</h2><button type="button" onClick={requestClose} className="absolute right-4 top-4 min-h-11 min-w-11 rounded-full" aria-label={vi ? 'Đóng' : 'Close'}>×</button></header><form onSubmit={save} onChange={() => setDirty(true)} className="flex min-h-0 flex-1 flex-col"><div className="flex-1 space-y-5 overflow-y-auto px-6 py-5"><fieldset className="space-y-3"><legend className="font-semibold">{vi ? 'Thông tin và phạm vi' : 'Identity & scope'}</legend><label className="block text-sm">{vi ? 'Mã bảng giá' : 'Price List code'}<input name="code" required maxLength={64} defaultValue={editing?.code ?? ''} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label><label className="block text-sm">{vi ? 'Phạm vi' : 'Tier'}<select value={tier} onChange={(event) => { setTier(event.target.value as PriceList['tier']); setCustomerId(null); setDirty(true) }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3">{['CUSTOMER', 'MARKET', 'GENERAL'].map((value) => <option key={value}>{value}</option>)}</select></label>{tier === 'CUSTOMER' && <div><label htmlFor="customer-search" className="block text-sm">{vi ? 'Tìm khách hàng' : 'Search customers'}</label><input id="customer-search" value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /><select required aria-label={vi ? 'Khách hàng' : 'Customer'} value={customerId ?? ''} onChange={(event) => { setCustomerId(Number(event.target.value) || null); setDirty(true) }} className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3"><option value="">{vi ? 'Chọn khách hàng' : 'Select customer'}</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.code} · {customer.tradeName || customer.legalName}</option>)}</select></div>}</fieldset><fieldset className="space-y-3"><legend className="font-semibold">{vi ? 'Tiền tệ và hiệu lực' : 'Currency & validity'}</legend><label className="block text-sm">{vi ? 'Tiền tệ' : 'Currency'}<select name="currency" defaultValue={editing?.currency ?? 'USD'} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"><option>USD</option><option>VND</option></select></label><label className="block text-sm">{vi ? 'Bắt đầu' : 'Valid from'}<input name="validFrom" type="datetime-local" required defaultValue={localDateTime(editing?.validFrom)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label><label className="block text-sm">{vi ? 'Kết thúc (không bắt buộc)' : 'Valid to (optional)'}<input name="validTo" type="datetime-local" defaultValue={localDateTime(editing?.validTo)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label></fieldset>{formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{formError}</p>}{confirmDiscard && <div role="alertdialog" aria-label={vi ? 'Bỏ thay đổi?' : 'Discard changes?'} className="rounded-lg border border-amber-300 bg-amber-50 p-4"><p>{vi ? 'Bỏ các thay đổi chưa lưu?' : 'Discard unsaved changes?'}</p><div className="mt-3 flex gap-2"><button type="button" onClick={finishClose} className="min-h-10 rounded-md bg-slate-900 px-3 text-white">{vi ? 'Bỏ thay đổi' : 'Discard'}</button><button type="button" onClick={() => setConfirmDiscard(false)} className="min-h-10 rounded-md border px-3">{vi ? 'Tiếp tục sửa' : 'Keep editing'}</button></div></div>}</div><footer className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4"><button type="button" onClick={requestClose} className="min-h-11 rounded-lg border border-slate-300 px-4">{vi ? 'Hủy' : 'Cancel'}</button><button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-emerald-700 px-5 font-semibold text-white disabled:opacity-60">{pending ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Lưu bảng giá' : 'Save Price List')}</button></footer></form></section></div>}
    {detailId !== null && <PriceListDetail id={detailId} locale={locale} marketCode={marketCode} canManage={canManage} onClose={() => { setDetailId(null); void load() }} />}
  </div>
}
