'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useMarket } from '@/modules/markets/market-context'
import { CustomerContactsPanel } from '@/modules/contacts/presentation/customer-contacts-panel'

type Customer = {
  id: number
  code?: string
  legalName?: string
  tradeName?: string | null
  countryCode?: string
  preferredLanguage?: string | null
  preferredCurrency?: string | null
  website?: string | null
  status?: string
  ownerId?: number
  teamId?: number | null
  version?: number
  historical?: boolean
  addresses?: Array<Record<string, unknown>>
  identifiers?: Array<Record<string, unknown>>
  history?: Array<{
    legalName?: string
    code?: string
    status?: string
    ownerId?: number
    transferredAt?: string
  }>
}

function csrfToken() {
  const value = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('crm_csrf=') || cookie.startsWith('__Host-crm_csrf='))
  return value ? decodeURIComponent(value.slice(value.indexOf('=') + 1)) : ''
}

export function CustomerDetail({
  id,
  locale,
  roles,
}: Readonly<{ id: number; locale: 'en' | 'vi'; roles: string[] }>) {
  const vi = locale === 'vi'
  const search = useSearchParams()
  const { marketId, markets } = useMarket()
  const marketCode = search.get('market') ?? markets.find((item) => item.id === marketId)?.code ?? ''
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')
  const canEdit = roles.includes('sale') || roles.includes('manager') || roles.includes('admin')
  const canReassign = roles.includes('manager') || roles.includes('admin')
  const archived = customer?.status === 'ARCHIVED'

  useEffect(() => {
    if (!marketCode) return
    let active = true
    void fetch(`/api/v1/customers/${id}?market=${encodeURIComponent(marketCode)}`, { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(response.status === 404 ? 'NOT_FOUND' : 'LOAD_FAILED')
        return body.data as Customer
      })
      .then((value) => {
        if (active) setCustomer(value)
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error && reason.message === 'NOT_FOUND'
          ? vi ? 'Không tìm thấy khách hàng trong phạm vi truy cập.' : 'Customer not found in your authorized scope.'
          : vi ? 'Không thể tải khách hàng.' : 'Customer could not be loaded.')
      })
    return () => { active = false }
  }, [id, marketCode, vi])

  async function update(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!customer?.version) return
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError('')
    try {
      const response = await fetch(`/api/v1/customers/${id}?market=${encodeURIComponent(marketCode)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({
          version: customer.version,
          legalName: form.get('legalName'),
          tradeName: form.get('tradeName') || null,
          countryCode: form.get('countryCode'),
          preferredLanguage: form.get('preferredLanguage') || null,
          preferredCurrency: form.get('preferredCurrency') || null,
          website: form.get('website') || null,
          status: form.get('status'),
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(response.status === 409 ? 'CONFLICT' : 'UPDATE_FAILED')
      setCustomer((current) => ({ ...current, ...body.data }))
      setNotice(vi ? 'Đã lưu thay đổi.' : 'Changes saved.')
    } catch (reason) {
      setError(reason instanceof Error && reason.message === 'CONFLICT'
        ? vi ? 'Bản ghi đã thay đổi. Tải lại trước khi lưu.' : 'This record changed. Reload before saving.'
        : vi ? 'Không thể lưu thay đổi.' : 'Changes could not be saved.')
    } finally {
      setPending(false)
    }
  }

  async function archive() {
    if (!customer?.version) return
    const reason = window.prompt(vi ? 'Lý do lưu trữ' : 'Archive reason')
    if (!reason?.trim()) return
    setPending(true)
    setError('')
    try {
      const response = await fetch(`/api/v1/customers/${id}/archive?market=${encodeURIComponent(marketCode)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({ version: customer.version, reason }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error('ARCHIVE_FAILED')
      setCustomer((current) => ({ ...current, ...body.data }))
      setNotice(vi ? 'Khách hàng đã được lưu trữ.' : 'Customer archived.')
    } catch {
      setError(vi ? 'Không thể lưu trữ khách hàng.' : 'Customer could not be archived.')
    } finally {
      setPending(false)
    }
  }

  async function reassign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!customer?.version) return
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setPending(true)
    setError('')
    try {
      const response = await fetch(`/api/v1/customers/${id}/reassign?market=${encodeURIComponent(marketCode)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({
          version: customer.version,
          ownerId: Number(form.get('ownerId')),
          teamId: customer.teamId ?? null,
          reason: form.get('reason'),
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(response.status === 409 ? 'CONFLICT' : 'REASSIGN_FAILED')
      setCustomer((current) => ({ ...current, ...body.data }))
      setNotice(vi ? 'Đã bàn giao quyền sở hữu.' : 'Ownership transferred.')
      formElement.reset()
    } catch (reason) {
      setError(reason instanceof Error && reason.message === 'CONFLICT'
        ? vi ? 'Bản ghi đã thay đổi. Tải lại trước khi bàn giao.' : 'This record changed. Reload before transferring.'
        : vi ? 'Không thể bàn giao khách hàng.' : 'Customer could not be reassigned.')
    } finally {
      setPending(false)
    }
  }

  if (error && !customer) {
    return <section className="space-y-4"><Link className="text-primary text-sm hover:underline" href={`/${locale}/customers?market=${marketCode}`}>← {vi ? 'Khách hàng' : 'Customers'}</Link><p className="text-destructive" role="alert">{error}</p></section>
  }
  if (!customer) return <p className="text-muted-foreground p-6" role="status">{vi ? 'Đang tải…' : 'Loading…'}</p>

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <Link className="text-primary text-sm hover:underline" href={`/${locale}/customers?market=${marketCode}`}>← {vi ? 'Khách hàng' : 'Customers'}</Link>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground font-mono text-xs">{customer.code}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{customer.legalName}</h1>
          {customer.historical && <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">{vi ? 'Bản lịch sử chỉ đọc tại thời điểm bàn giao.' : 'Read-only history snapshot at transfer time.'}</p>}
        </div>
        <span className="rounded-full border px-3 py-1 text-sm">{customer.status}</span>
      </header>

      {error && <p className="text-destructive text-sm" role="alert">{error}</p>}
      {notice && <p className="text-sm text-emerald-700" role="status">{notice}</p>}

      {canEdit && !customer.historical ? (
        <form className="bg-card grid gap-4 rounded-xl border p-5 shadow-sm sm:grid-cols-2" onSubmit={update}>
          <h2 className="font-semibold sm:col-span-2">{vi ? 'Thông tin buyer' : 'Buyer details'}</h2>
          <DetailField label={vi ? 'Tên pháp lý' : 'Legal name'} name="legalName" defaultValue={customer.legalName ?? ''} required />
          <DetailField label={vi ? 'Tên giao dịch' : 'Trading name'} name="tradeName" defaultValue={customer.tradeName ?? ''} />
          <DetailField label={vi ? 'Quốc gia' : 'Country'} name="countryCode" defaultValue={customer.countryCode ?? ''} required maxLength={2} />
          <DetailField label={vi ? 'Ngôn ngữ ưu tiên' : 'Preferred language'} name="preferredLanguage" defaultValue={customer.preferredLanguage ?? ''} />
          <DetailField label={vi ? 'Tiền tệ ưu tiên' : 'Preferred currency'} name="preferredCurrency" defaultValue={customer.preferredCurrency ?? ''} maxLength={3} />
          <DetailField label="Website" name="website" defaultValue={customer.website ?? ''} type="url" />
          <label className="space-y-1 text-sm"><span className="font-medium">{vi ? 'Trạng thái' : 'Status'}</span><select className="bg-background min-h-10 w-full rounded-md border px-3" defaultValue={customer.status} name="status"><option value="PROSPECT">PROSPECT</option><option value="ACTIVE">ACTIVE</option><option value="ON_HOLD">ON_HOLD</option><option value="INACTIVE">INACTIVE</option></select></label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button className="bg-primary text-primary-foreground min-h-10 rounded-md px-4 text-sm font-medium disabled:opacity-60" disabled={pending}>{vi ? 'Lưu thay đổi' : 'Save changes'}</button>
            {!archived && <button className="min-h-10 rounded-md border px-4 text-sm disabled:opacity-60" disabled={pending} onClick={(event) => { event.preventDefault(); void archive() }} type="button">{vi ? 'Lưu trữ' : 'Archive'}</button>}
          </div>
        </form>
      ) : (
        <div className="bg-card grid gap-4 rounded-xl border p-5 sm:grid-cols-2">
          <DetailValue label={vi ? 'Tên giao dịch' : 'Trading name'} value={customer.tradeName} />
          <DetailValue label={vi ? 'Quốc gia' : 'Country'} value={customer.countryCode} />
          <DetailValue label={vi ? 'Ngôn ngữ ưu tiên' : 'Preferred language'} value={customer.preferredLanguage} />
          <DetailValue label={vi ? 'Tiền tệ ưu tiên' : 'Preferred currency'} value={customer.preferredCurrency} />
          <DetailValue label="Website" value={customer.website} />
          <DetailValue label={vi ? 'Chủ sở hữu' : 'Owner'} value={customer.ownerId ? String(customer.ownerId) : null} />
        </div>
      )}

      {canReassign && !customer.historical && !archived && (
        <form className="bg-card space-y-3 rounded-xl border p-5" onSubmit={reassign}>
          <h2 className="font-semibold">{vi ? 'Bàn giao chủ sở hữu' : 'Reassign owner'}</h2>
          <p className="text-muted-foreground text-sm">{vi ? 'Chỉ chọn nhân viên thuộc cùng market và team được phép. Nhập ID nhân viên; lý do sẽ được ghi vào audit.' : 'Choose an active employee in the authorized market and team. Enter the employee ID; the reason is audited.'}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField label={vi ? 'ID chủ sở hữu mới' : 'New owner ID'} name="ownerId" type="number" required />
            <DetailField label={vi ? 'Lý do bàn giao' : 'Transfer reason'} name="reason" required minLength={3} />
          </div>
          <button className="min-h-10 rounded-md border px-4 text-sm disabled:opacity-60" disabled={pending}>{vi ? 'Bàn giao' : 'Transfer'}</button>
        </form>
      )}

      {Array.isArray(customer.addresses) && customer.addresses.length > 0 && (
        <section className="bg-card space-y-3 rounded-xl border p-5"><h2 className="font-semibold">{vi ? 'Địa chỉ' : 'Addresses'}</h2>{customer.addresses.map((address, index) => <article className="rounded-md border p-3 text-sm" key={String(address.id ?? index)}><p className="font-medium">{String(address.kind)}{address.isDefault ? ` · ${vi ? 'Mặc định' : 'Default'}` : ''}</p><p>{String(address.addressLines)}</p><p className="text-muted-foreground">{[address.city, address.region, address.postalCode, address.countryCode].filter(Boolean).map(String).join(', ')}</p></article>)}</section>
      )}
      {Array.isArray(customer.identifiers) && customer.identifiers.length > 0 && (
        <section className="bg-card space-y-3 rounded-xl border p-5"><h2 className="font-semibold">{vi ? 'Định danh doanh nghiệp' : 'Business identifiers'}</h2>{customer.identifiers.map((identifier, index) => <article className="rounded-md border p-3 text-sm" key={String(identifier.id ?? index)}><span className="text-muted-foreground">{String(identifier.kind)} · </span>{String(identifier.value)}</article>)}</section>
      )}
      {!customer.historical && marketCode && (
        <CustomerContactsPanel
          customerId={id}
          locale={locale}
          marketCode={marketCode}
        />
      )}
      {customer.history && customer.history.length > 0 && (
        <section className="bg-card space-y-3 rounded-xl border p-5" aria-labelledby="customer-history-title">
          <h2 className="font-semibold" id="customer-history-title">{vi ? 'Lịch sử bàn giao' : 'Ownership history'}</h2>
          <ol className="space-y-2">
            {customer.history.map((item, index) => (
              <li className="rounded-md border p-3 text-sm" key={`${item.transferredAt}-${index}`}>
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>{item.legalName ?? item.code ?? (vi ? 'Ảnh chụp buyer' : 'Buyer snapshot')}</strong>
                  <time className="text-muted-foreground" dateTime={item.transferredAt}>{item.transferredAt ? new Date(item.transferredAt).toLocaleString(locale) : '—'}</time>
                </div>
                <p className="text-muted-foreground mt-1">{vi ? 'Chủ trước' : 'Prior owner'}: {item.ownerId ?? '—'} · {item.status ?? ''}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </section>
  )
}

function DetailField({
  label,
  name,
  defaultValue,
  type = 'text',
  required,
  maxLength,
  minLength,
}: Readonly<{ label: string; name: string; defaultValue?: string; type?: string; required?: boolean; maxLength?: number; minLength?: number }>) {
  return <label className="space-y-1 text-sm"><span className="font-medium">{label}</span><input className="bg-background min-h-10 w-full rounded-md border px-3" defaultValue={defaultValue} maxLength={maxLength} minLength={minLength} name={name} required={required} type={type} /></label>
}

function DetailValue({ label, value }: Readonly<{ label: string; value?: string | null }>) {
  return <div><p className="text-muted-foreground text-xs">{label}</p><p className="mt-1 text-sm">{value || '—'}</p></div>
}
