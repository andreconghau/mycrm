'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { useMarket } from '@/modules/markets/market-context'
import { SpecificationDetail } from './specification-detail'

type Spec = {
  id: number
  code: string
  productId: number
  productSku: string
  currentRevision: {
    revisionNo: number
    status: string
    nameEn?: string | null
    grade?: string | null
    packaging?: string | null
  } | null
}
type Product = { id: number; sku: string; displayName: string }
type Customer = {
  id: number
  code: string
  legalName?: string
  tradeName?: string | null
}

export function SpecificationWorkspace({
  locale,
  roles,
}: Readonly<{ locale: 'en' | 'vi'; roles: string[] }>) {
  const vi = locale === 'vi'
  const { marketId, markets, selectMarket } = useMarket()
  const marketCode =
    markets.find((market) => market.id === marketId)?.code ?? ''
  const [items, setItems] = useState<Spec[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState('')
  const [customerQuery, setCustomerQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  )
  const customerId = selectedCustomer?.id ?? null
  const [dirty, setDirty] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const createPanel = useRef<HTMLElement>(null)
  const canCreate = roles.includes('admin') || roles.includes('manager')

  const load = useCallback(async () => {
    if (!marketCode) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ market: marketCode, q: query })
      if (status) params.set('status', status)
      const [specResponse, productResponse] = await Promise.all([
        fetch(`/api/v1/specifications?${params}`, { cache: 'no-store' }),
        fetch('/api/v1/products?status=ACTIVE', { cache: 'no-store' }),
      ])
      const [specBody, productBody] = await Promise.all([
        specResponse.json(),
        productResponse.json(),
      ])
      if (!specResponse.ok)
        throw new Error(
          specResponse.status === 403
            ? vi
              ? 'Bạn chưa được cấp quyền xem thông số.'
              : 'You cannot view specifications.'
            : vi
              ? 'Không thể tải thông số.'
              : 'Specifications could not be loaded.',
        )
      setItems(specBody.data.items ?? [])
      setProducts(productResponse.ok ? (productBody.data.items ?? []) : [])
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : vi
            ? 'Lỗi kết nối.'
            : 'Connection error.',
      )
    } finally {
      setLoading(false)
    }
  }, [marketCode, query, status, vi])

  const finishClose = useCallback(() => {
    setOpen(false)
    setDirty(false)
    setConfirmDiscard(false)
    setFormError('')
    setSelectedCustomer(null)
    setCustomerQuery('')
    setCustomers([])
  }, [])

  const requestClose = useCallback(() => {
    if (pending) return
    if (dirty) setConfirmDiscard(true)
    else finishClose()
  }, [dirty, finishClose, pending])

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  useEffect(() => {
    if (!open) return
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const panel = createPanel.current
    panel?.querySelector<HTMLElement>('select, input, button')?.focus()
    function trap(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
      }
      if (event.key !== 'Tab' || !panel) return
      const controls = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (controls.length === 0) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', trap)
    return () => {
      document.removeEventListener('keydown', trap)
      previous?.focus()
    }
  }, [open, requestClose])

  useEffect(() => {
    if (!open || !marketCode) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setCustomersLoading(true)
      try {
        const params = new URLSearchParams({ market: marketCode, limit: '8' })
        if (customerQuery.trim()) params.set('q', customerQuery.trim())
        const response = await fetch(`/api/v1/customers?${params}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const body = await response.json()
        if (!response.ok)
          throw new Error(
            vi
              ? 'Không tải được buyer được cấp quyền.'
              : 'Authorized buyers could not be loaded.',
          )
        setCustomers(body.data?.items ?? [])
      } catch (cause) {
        if ((cause as Error).name !== 'AbortError')
          setFormError(
            cause instanceof Error ? cause.message : 'Customer lookup failed',
          )
      } finally {
        if (!controller.signal.aborted) setCustomersLoading(false)
      }
    }, 250)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [customerQuery, marketCode, open, vi])

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setFormError('')
    const form = new FormData(event.currentTarget)
    const productId = String(form.get('productId') ?? '')
    const body: Record<string, unknown> = Object.fromEntries(
      [
        'nameEn',
        'nameVi',
        'nameKo',
        'grade',
        'processing',
        'netWeightPerPack',
        'weightUnit',
        'packsPerCarton',
        'uom',
        'packaging',
      ].map((key) => [key, String(form.get(key) ?? '').trim()]),
    )
    body.packsPerCarton = Number(body.packsPerCarton)
    body.customerId = customerId
    const moqUnit = String(form.get('moqUnit') ?? '').trim()
    body.moqUnit = moqUnit || null
    for (const key of [
      'grossWeightPerPack',
      'cartonNetWeight',
      'glazingPercent',
      'moq',
      'storageTempC',
    ]) {
      const value = String(form.get(key) ?? '').trim()
      body[key] = value || null
    }
    for (const key of [
      'sizeBand',
      'sizeUnit',
      'treatment',
      'frozenForm',
      'packagingMaterial',
      'originCountry',
      'buyerRequirements',
      'notes',
      'descriptionEn',
      'descriptionVi',
      'descriptionKo',
    ]) {
      const value = String(form.get(key) ?? '').trim()
      body[key] = value || null
    }
    body.shelfLifeMonths = String(form.get('shelfLifeMonths') ?? '').trim()
      ? Number(form.get('shelfLifeMonths'))
      : null
    body.certifications = String(form.get('certifications') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    body.labelLanguages = String(form.get('labelLanguages') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    try {
      const response = await fetch(
        `/api/v1/products/${productId}/specifications?market=${encodeURIComponent(marketCode)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken(),
          },
          body: JSON.stringify(body),
        },
      )
      const result = await response.json()
      if (!response.ok)
        throw new Error(
          result.error?.message ??
            (vi ? 'Không thể tạo bản nháp.' : 'Could not create draft.'),
        )
      setOpen(false)
      setDirty(false)
      setConfirmDiscard(false)
      await load()
      if (typeof result.data?.id === 'number') setSelectedId(result.data.id)
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Request failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="space-y-6" aria-labelledby="spec-title">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
            R1 · M07
          </p>
          <h1
            id="spec-title"
            className="mt-2 text-3xl font-semibold tracking-tight"
          >
            {vi ? 'Thông số sản phẩm' : 'Product Specifications'}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {vi
              ? 'Quản lý revision kỹ thuật theo SKU và market.'
              : 'Manage technical revisions by SKU and market.'}
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => {
              setSelectedCustomer(null)
              setCustomerQuery('')
              setCustomers([])
              setOpen(true)
            }}
            disabled={!marketId}
            className="bg-primary text-primary-foreground inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-sm font-medium"
          >
            <Plus aria-hidden size={17} />
            {vi ? 'Tạo thông số' : 'Create specification'}
          </button>
        )}
      </header>
      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <h2 className="mr-auto font-semibold">
            {vi ? 'Danh sách thông số' : 'Specifications'}
          </h2>
          <label className="text-sm">
            <span className="sr-only">Market</span>
            <select
              className="bg-background min-h-10 rounded-md border px-3"
              value={marketId ?? ''}
              onChange={(e) => selectMarket(e.target.value)}
            >
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {vi ? m.name_vi : m.name_en}
                </option>
              ))}
            </select>
          </label>
          <input
            aria-label={vi ? 'Tìm kiếm' : 'Search'}
            className="bg-background min-h-10 rounded-md border px-3"
            placeholder={vi ? 'Tìm SKU hoặc mã…' : 'Search SKU or code…'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label={vi ? 'Trạng thái' : 'Status'}
            className="bg-background min-h-10 rounded-md border px-3"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">{vi ? 'Mọi trạng thái' : 'All statuses'}</option>
            {['DRAFT', 'APPROVED', 'ARCHIVED'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        {error ? (
          <p role="alert" className="text-destructive p-6 text-sm">
            {error}
          </p>
        ) : loading ? (
          <p role="status" className="text-muted-foreground p-6 text-sm">
            {vi ? 'Đang tải…' : 'Loading…'}
          </p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground p-6 text-sm">
            {vi
              ? 'Chưa có thông số trong market này.'
              : 'No specifications in this market yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  {[
                    vi ? 'Mã' : 'Code',
                    'SKU',
                    vi ? 'Revision' : 'Revision',
                    vi ? 'Tên' : 'Name',
                    vi ? 'Grade' : 'Grade',
                    vi ? 'Trạng thái' : 'Status',
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-4 py-3 font-mono text-xs">
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => setSelectedId(item.id)}
                      >
                        {item.code}
                      </button>
                    </td>
                    <td className="px-4 py-3">{item.productSku}</td>
                    <td className="px-4 py-3">
                      {item.currentRevision?.revisionNo ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {item.currentRevision?.nameEn ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {item.currentRevision?.grade ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {item.currentRevision?.status ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) requestClose()
          }}
        >
          <section
            ref={createPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-title"
            className="bg-background flex h-full w-full max-w-2xl flex-col shadow-xl"
          >
            <header className="border-b p-5">
              <p className="text-primary text-xs font-semibold uppercase">
                R1 · M07
              </p>
              <h2 id="create-title" className="mt-1 text-xl font-semibold">
                {vi ? 'Tạo bản nháp thông số' : 'Create specification draft'}
              </h2>
            </header>
            <form
              onSubmit={create}
              onChange={() => setDirty(true)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-6 overflow-y-auto p-5">
                <fieldset className="grid gap-4 sm:grid-cols-2">
                  <legend className="mb-3 font-semibold">
                    {vi ? 'Định danh & bản dịch' : 'Identity & translations'}
                  </legend>
                  <label className="space-y-1 text-sm">
                    SKU
                    <select
                      required
                      name="productId"
                      className="bg-background min-h-11 w-full rounded-md border px-3"
                    >
                      <option value="">{vi ? 'Chọn SKU' : 'Select SKU'}</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} · {p.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                  {[
                    ['nameEn', 'Name (EN)'],
                    ['nameVi', 'Tên (VI)'],
                    ['nameKo', '이름 (KO)'],
                    ['grade', vi ? 'Grade' : 'Grade'],
                    ['processing', vi ? 'Chế biến' : 'Processing'],
                    [
                      'netWeightPerPack',
                      vi ? 'Khối lượng tịnh/gói' : 'Net weight/pack',
                    ],
                    ['packsPerCarton', vi ? 'Gói/thùng' : 'Packs/carton'],
                    ['packaging', vi ? 'Quy cách đóng gói' : 'Packaging'],
                  ].map(([name, label]) => (
                    <label key={name} className="space-y-1 text-sm">
                      {label}
                      <input
                        required
                        name={name}
                        className="bg-background min-h-11 w-full rounded-md border px-3"
                      />
                    </label>
                  ))}
                  <label className="space-y-1 text-sm">
                    {vi ? 'Đơn vị khối lượng' : 'Weight unit'}
                    <select
                      name="weightUnit"
                      className="bg-background min-h-11 w-full rounded-md border px-3"
                    >
                      {['KG', 'MT', 'LB'].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    UOM
                    <select
                      name="uom"
                      className="bg-background min-h-11 w-full rounded-md border px-3"
                    >
                      {['CTN', 'KG', 'MT', 'PCS', 'LB'].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                </fieldset>
                <fieldset className="space-y-3 rounded-lg border p-4">
                  <legend className="px-1 font-semibold">
                    {vi ? 'Phạm vi buyer' : 'Buyer scope'}
                  </legend>
                  <p className="text-muted-foreground text-sm">
                    {selectedCustomer
                      ? vi
                        ? `Thông số riêng cho ${selectedCustomer.legalName} (${selectedCustomer.code}).`
                        : `Buyer-specific specification for ${selectedCustomer.legalName} (${selectedCustomer.code}).`
                      : vi
                        ? 'Thông số tiêu chuẩn, dùng chung trong market.'
                        : 'Standard specification for this market.'}
                  </p>
                  {selectedCustomer ? (
                    <button
                      type="button"
                      className="text-primary min-h-10 text-sm font-medium hover:underline"
                      onClick={() => setSelectedCustomer(null)}
                    >
                      {vi ? 'Bỏ chọn buyer' : 'Use standard specification'}
                    </button>
                  ) : (
                    <>
                      <label className="block space-y-1 text-sm">
                        {vi
                          ? 'Tìm buyer theo tên hoặc mã'
                          : 'Search buyer by name or code'}
                        <input
                          value={customerQuery}
                          onChange={(event) =>
                            setCustomerQuery(event.target.value)
                          }
                          className="bg-background min-h-11 w-full rounded-md border px-3"
                          placeholder={
                            vi
                              ? 'Tên công ty hoặc mã buyer…'
                              : 'Company name or buyer code…'
                          }
                        />
                      </label>
                      {customersLoading && (
                        <p
                          role="status"
                          className="text-muted-foreground text-sm"
                        >
                          {vi ? 'Đang tìm…' : 'Searching…'}
                        </p>
                      )}
                      {customers.length > 0 && (
                        <ul
                          className="divide-y rounded-md border"
                          aria-label={
                            vi ? 'Buyer khả dụng' : 'Available buyers'
                          }
                        >
                          {customers.map((customer) => (
                            <li key={customer.id}>
                              <button
                                type="button"
                                className="hover:bg-muted min-h-12 w-full px-3 py-2 text-left text-sm"
                                onClick={() => {
                                  setSelectedCustomer(customer)
                                  setDirty(true)
                                }}
                              >
                                <span className="block font-medium">
                                  {customer.legalName}
                                </span>
                                <span className="text-muted-foreground">
                                  {customer.code}
                                  {customer.tradeName
                                    ? ` · ${customer.tradeName}`
                                    : ''}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </fieldset>
                <fieldset className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
                  <legend className="px-1 font-semibold">
                    {vi
                      ? 'Thông số kỹ thuật tùy chọn'
                      : 'Optional technical details'}
                  </legend>
                  {[
                    [
                      'grossWeightPerPack',
                      vi ? 'Khối lượng tổng/gói' : 'Gross weight/pack',
                    ],
                    [
                      'cartonNetWeight',
                      vi ? 'Khối lượng tịnh/thùng' : 'Carton net weight',
                    ],
                    ['glazingPercent', 'Glazing (%)'],
                    ['sizeBand', vi ? 'Size band' : 'Size band'],
                    ['sizeUnit', vi ? 'Đơn vị size' : 'Size unit'],
                    ['treatment', vi ? 'Xử lý' : 'Treatment'],
                    ['frozenForm', vi ? 'Dạng đông' : 'Frozen form'],
                    [
                      'packagingMaterial',
                      vi ? 'Vật liệu bao bì' : 'Packaging material',
                    ],
                    [
                      'storageTempC',
                      vi
                        ? 'Nhiệt độ bảo quản (°C)'
                        : 'Storage temperature (°C)',
                    ],
                    [
                      'shelfLifeMonths',
                      vi ? 'Hạn dùng (tháng)' : 'Shelf life (months)',
                    ],
                    ['moq', 'MOQ'],
                    [
                      'originCountry',
                      vi
                        ? 'Nước xuất xứ (mã ISO)'
                        : 'Origin country (ISO code)',
                    ],
                    [
                      'certifications',
                      vi
                        ? 'Chứng nhận đã xác minh (phân cách dấu phẩy)'
                        : 'Verified certifications (comma-separated)',
                    ],
                    [
                      'labelLanguages',
                      vi
                        ? 'Ngôn ngữ nhãn (phân cách dấu phẩy)'
                        : 'Label languages (comma-separated)',
                    ],
                  ].map(([name, label]) => (
                    <label key={name} className="space-y-1 text-sm">
                      {label}
                      <input
                        name={name}
                        className="bg-background min-h-11 w-full rounded-md border px-3"
                      />
                    </label>
                  ))}
                  <label className="space-y-1 text-sm">
                    {vi ? 'Đơn vị MOQ' : 'MOQ unit'}
                    <select
                      name="moqUnit"
                      className="bg-background min-h-11 w-full rounded-md border px-3"
                    >
                      <option value="">—</option>
                      {['KG', 'MT', 'CTN', 'PCS', 'LB'].map((unit) => (
                        <option key={unit}>{unit}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm sm:col-span-2">
                    {vi ? 'Yêu cầu buyer' : 'Buyer requirements'}
                    <textarea
                      name="buyerRequirements"
                      className="bg-background min-h-20 w-full rounded-md border p-3"
                    />
                  </label>
                  <label className="space-y-1 text-sm sm:col-span-2">
                    {vi ? 'Ghi chú nội bộ' : 'Internal notes'}
                    <textarea
                      name="notes"
                      className="bg-background min-h-20 w-full rounded-md border p-3"
                    />
                  </label>
                </fieldset>
                <fieldset className="grid gap-4 rounded-lg border p-4 sm:grid-cols-3">
                  <legend className="px-1 font-semibold">
                    {vi ? 'Mô tả theo ngôn ngữ' : 'Descriptions by language'}
                  </legend>
                  {(
                    [
                      ['descriptionEn', 'Description (EN)'],
                      ['descriptionVi', 'Mô tả (VI)'],
                      ['descriptionKo', '설명 (KO)'],
                    ] as const
                  ).map(([name, label]) => (
                    <label key={name} className="space-y-1 text-sm">
                      {label}
                      <textarea
                        name={name}
                        className="bg-background min-h-24 w-full rounded-md border p-3"
                      />
                    </label>
                  ))}
                </fieldset>
                {formError && (
                  <p role="alert" className="text-destructive text-sm">
                    {formError}
                  </p>
                )}
              </div>
              <footer className="bg-background flex justify-end gap-2 border-t p-4">
                {confirmDiscard ? (
                  <>
                    <p role="alert" className="mr-auto self-center text-sm">
                      {vi
                        ? 'Bỏ các thay đổi chưa lưu?'
                        : 'Discard unsaved changes?'}
                    </p>
                    <button
                      type="button"
                      className="min-h-10 rounded-md px-3"
                      onClick={() => setConfirmDiscard(false)}
                    >
                      {vi ? 'Tiếp tục nhập' : 'Keep editing'}
                    </button>
                    <button
                      type="button"
                      className="bg-destructive text-destructive-foreground min-h-10 rounded-md px-3"
                      onClick={finishClose}
                    >
                      {vi ? 'Bỏ thay đổi' : 'Discard changes'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      className="min-h-10 rounded-md px-4"
                      onClick={requestClose}
                    >
                      {vi ? 'Đóng' : 'Cancel'}
                    </button>
                    <button
                      disabled={pending}
                      className="bg-primary text-primary-foreground min-h-10 rounded-md px-4"
                    >
                      {pending
                        ? vi
                          ? 'Đang lưu…'
                          : 'Saving…'
                        : vi
                          ? 'Lưu bản nháp'
                          : 'Save draft'}
                    </button>
                  </>
                )}
              </footer>
            </form>
          </section>
        </div>
      )}
      {selectedId !== null && marketCode && (
        <SpecificationDetail
          id={selectedId}
          marketCode={marketCode}
          locale={locale}
          canManage={canCreate}
          onClose={() => setSelectedId(null)}
        />
      )}
    </section>
  )
}

function csrfToken() {
  const cookie = document.cookie
    .split('; ')
    .find(
      (value) =>
        value.startsWith('crm_csrf=') || value.startsWith('__Host-crm_csrf='),
    )
  return cookie ? decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1)) : ''
}
