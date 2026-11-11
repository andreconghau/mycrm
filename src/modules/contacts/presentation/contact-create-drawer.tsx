'use client'

import {
  AlertTriangle,
  Check,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Search,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

type CustomerOption = {
  id: number
  code?: string
  legalName?: string
  tradeName?: string | null
}

type DuplicateCandidate = {
  id: number
  displayName?: string
  jobTitle?: string | null
  customerLegalName?: string
  matchedKind?: string
  sameCustomer?: boolean
}

type ContactPayload = {
  customerId: number
  displayName: string
  jobTitle: string | null
  department: string | null
  preferredLanguage: string | null
  channels: Array<{
    kind: 'email' | 'phone'
    handle: string
    isPrimary: boolean
  }>
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

function payloadFrom(form: FormData, customerId: number): ContactPayload {
  const email = String(form.get('email') ?? '').trim()
  const phone = String(form.get('phone') ?? '').trim()
  return {
    customerId,
    displayName: String(form.get('displayName') ?? '').trim(),
    jobTitle: String(form.get('jobTitle') ?? '').trim() || null,
    department: String(form.get('department') ?? '').trim() || null,
    preferredLanguage:
      String(form.get('preferredLanguage') ?? '').trim() || null,
    channels: [
      ...(email
        ? [{ kind: 'email' as const, handle: email, isPrimary: true }]
        : []),
      ...(phone
        ? [{ kind: 'phone' as const, handle: phone, isPrimary: true }]
        : []),
    ],
  }
}

export function ContactCreateDrawer({
  locale,
  marketCode,
  open,
  onClose,
}: Readonly<{
  locale: 'en' | 'vi'
  marketCode: string
  open: boolean
  onClose: () => void
}>) {
  const vi = locale === 'vi'
  const router = useRouter()
  const panelRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [closeConfirm, setCloseConfirm] = useState(false)
  const [customerQuery, setCustomerQuery] = useState('')
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerOption | null>(null)
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([])
  const [pendingPayload, setPendingPayload] = useState<ContactPayload | null>(
    null,
  )

  useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement as HTMLElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('input')?.focus()
    })
    return () => {
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus()
    }
  }, [open])

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
        if (!response.ok) throw new Error('CUSTOMERS_FAILED')
        setCustomers(body.data?.items ?? [])
      } catch (reason) {
        if ((reason as Error).name !== 'AbortError') {
          setCustomers([])
          setError(
            vi
              ? 'Không tải được buyer được cấp quyền. Hãy thử lại.'
              : 'Authorized buyers could not be loaded. Try again.',
          )
        }
      } finally {
        if (!controller.signal.aborted) setCustomersLoading(false)
      }
    }, 250)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [customerQuery, marketCode, open, vi])

  function resetAndClose() {
    setExpanded(false)
    setDirty(false)
    setPending(false)
    setError('')
    setCloseConfirm(false)
    setCustomerQuery('')
    setCustomers([])
    setSelectedCustomer(null)
    setDuplicates([])
    setPendingPayload(null)
    onClose()
  }

  function requestClose() {
    if (pending) return
    if (dirty) {
      setCloseConfirm(true)
      return
    }
    resetAndClose()
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      requestClose()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    )
    if (!focusable?.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  async function create(payload: ContactPayload) {
    setPending(true)
    setError('')
    try {
      const response = await fetch(
        `/api/v1/contacts?market=${encodeURIComponent(marketCode)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken(),
          },
          body: JSON.stringify(payload),
        },
      )
      const body = await response.json()
      if (!response.ok) {
        setError(
          response.status === 404
            ? vi
              ? 'Buyer này không còn nằm trong phạm vi truy cập của bạn.'
              : 'That buyer is no longer in your authorized scope.'
            : vi
              ? 'Không thể tạo liên hệ. Hãy kiểm tra quyền và dữ liệu đã nhập.'
              : 'Contact could not be created. Check your access and the entered values.',
        )
        return
      }
      const contactId = Number(body.data?.id)
      if (!Number.isSafeInteger(contactId) || contactId < 1) {
        setError(
          vi
            ? 'Đã tạo liên hệ nhưng không thể mở hồ sơ. Hãy tải lại danh sách.'
            : 'The contact was created, but its record could not be opened. Reload the list.',
        )
        return
      }
      setDirty(false)
      router.push(`/${locale}/contacts/${contactId}?market=${marketCode}`)
    } catch {
      setError(
        vi
          ? 'Mất kết nối khi tạo liên hệ. Hãy thử lại.'
          : 'Connection lost while creating the contact. Try again.',
      )
    } finally {
      setPending(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCustomer) {
      setError(
        vi
          ? 'Hãy tìm và chọn buyer chủ quản.'
          : 'Search for and select a parent buyer.',
      )
      return
    }
    const payload = payloadFrom(
      new FormData(event.currentTarget),
      selectedCustomer.id,
    )
    setError('')
    if (payload.channels.length) {
      setPending(true)
      try {
        const response = await fetch(
          `/api/v1/contacts/duplicate-candidates?market=${encodeURIComponent(marketCode)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': csrfToken(),
            },
            body: JSON.stringify({
              customerId: payload.customerId,
              channels: payload.channels.map(({ kind, handle }) => ({
                kind,
                handle,
              })),
            }),
          },
        )
        if (!response.ok) throw new Error('DUPLICATE_CHECK_FAILED')
        const body = await response.json()
        const candidates = body.data as DuplicateCandidate[]
        if (candidates.length > 0) {
          setDuplicates(candidates)
          setPendingPayload(payload)
          return
        }
      } catch {
        setError(
          vi
            ? 'Không thể kiểm tra kênh liên hệ trùng. Hãy thử lại trước khi lưu.'
            : 'Duplicate channels could not be checked. Try again before saving.',
        )
        return
      } finally {
        setPending(false)
      }
    }
    await create(payload)
  }

  if (typeof document === 'undefined' || !open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/35 motion-safe:transition-colors"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
    >
      <section
        aria-describedby="contact-create-description"
        aria-labelledby="contact-create-title"
        aria-modal="true"
        className={`bg-background absolute inset-y-0 right-0 flex w-full flex-col shadow-2xl motion-safe:transition-[max-width] motion-safe:duration-200 ${expanded ? 'max-w-5xl' : 'max-w-2xl'}`}
        onKeyDown={handleKeyDown}
        ref={panelRef}
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
          <div>
            <h2
              className="text-xl font-semibold tracking-tight"
              id="contact-create-title"
            >
              {vi ? 'Tạo liên hệ' : 'Create contact'}
            </h2>
            <p
              className="text-muted-foreground mt-1 max-w-xl text-sm"
              id="contact-create-description"
            >
              {vi
                ? `Thêm một người liên hệ vào buyer trong market ${marketCode}.`
                : `Add a contact to an authorized buyer in the ${marketCode} market.`}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              aria-label={
                expanded
                  ? vi
                    ? 'Thu gọn panel'
                    : 'Collapse panel'
                  : vi
                    ? 'Mở rộng panel'
                    : 'Expand panel'
              }
              className="hover:bg-muted focus-visible:ring-primary hidden size-10 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-none sm:inline-flex"
              onClick={() => setExpanded((value) => !value)}
              type="button"
            >
              {expanded ? (
                <Minimize2 aria-hidden size={18} />
              ) : (
                <Maximize2 aria-hidden size={18} />
              )}
            </button>
            <button
              aria-label={vi ? 'Đóng form tạo liên hệ' : 'Close contact form'}
              className="hover:bg-muted focus-visible:ring-primary inline-flex size-10 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-none"
              onClick={requestClose}
              type="button"
            >
              <X aria-hidden size={19} />
            </button>
          </div>
        </header>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onChange={() => {
            setDirty(true)
            setDuplicates([])
            setPendingPayload(null)
          }}
          onSubmit={handleSubmit}
        >
          <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-5 py-6 sm:px-6">
            <FormSection
              description={
                vi
                  ? 'Tìm theo tên pháp lý, tên giao dịch hoặc mã buyer.'
                  : 'Search by legal name, trading name, or buyer code.'
              }
              title={vi ? 'Buyer chủ quản' : 'Parent buyer'}
            >
              <div className="relative sm:col-span-2">
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">
                    {vi ? 'Tìm buyer' : 'Search buyers'}
                  </span>
                  <span className="relative block">
                    <Search
                      aria-hidden
                      className="text-muted-foreground absolute top-3.5 left-3"
                      size={17}
                    />
                    <input
                      aria-describedby="buyer-search-help"
                      className="bg-background border-input placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20 min-h-11 w-full rounded-md border pr-3 pl-10 outline-none focus-visible:ring-2"
                      onChange={(event) => {
                        setCustomerQuery(event.target.value)
                        setSelectedCustomer(null)
                      }}
                      placeholder={
                        vi
                          ? 'Nhập tên hoặc mã buyer…'
                          : 'Enter buyer name or code…'
                      }
                      value={customerQuery}
                    />
                  </span>
                </label>
                <p className="sr-only" id="buyer-search-help">
                  {vi
                    ? 'Chọn một buyer trong kết quả bên dưới.'
                    : 'Select one buyer from the results below.'}
                </p>
                <div
                  className="mt-2 overflow-hidden rounded-lg border"
                  role="listbox"
                  aria-label={vi ? 'Kết quả buyer' : 'Buyer results'}
                >
                  {customersLoading ? (
                    <p
                      className="text-muted-foreground flex min-h-12 items-center gap-2 px-3 text-sm"
                      role="status"
                    >
                      <LoaderCircle
                        aria-hidden
                        className="animate-spin"
                        size={16}
                      />
                      {vi ? 'Đang tìm buyer…' : 'Searching buyers…'}
                    </p>
                  ) : customers.length === 0 ? (
                    <p className="text-muted-foreground px-3 py-3 text-sm">
                      {vi
                        ? 'Không tìm thấy buyer trong phạm vi truy cập.'
                        : 'No buyers found in your authorized scope.'}
                    </p>
                  ) : (
                    customers.map((customer) => {
                      const selected = selectedCustomer?.id === customer.id
                      return (
                        <button
                          aria-selected={selected}
                          className="hover:bg-muted focus-visible:bg-muted flex min-h-12 w-full items-center justify-between gap-4 border-b px-3 py-2 text-left text-sm last:border-b-0 focus-visible:outline-none"
                          key={customer.id}
                          onClick={() => {
                            setSelectedCustomer(customer)
                            setDirty(true)
                            setError('')
                          }}
                          role="option"
                          type="button"
                        >
                          <span>
                            <strong className="block font-medium">
                              {customer.legalName}
                            </strong>
                            <span className="text-muted-foreground">
                              {customer.code}
                              {customer.tradeName
                                ? ` · ${customer.tradeName}`
                                : ''}
                            </span>
                          </span>
                          {selected && (
                            <Check
                              aria-hidden
                              className="text-primary shrink-0"
                              size={18}
                            />
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </FormSection>

            <FormSection
              description={
                vi
                  ? 'Thông tin nhận diện người liên hệ tại buyer.'
                  : 'Information used to identify the person at the buyer.'
              }
              title={vi ? 'Thông tin liên hệ' : 'Contact identity'}
            >
              <Field
                label={vi ? 'Tên liên hệ' : 'Contact name'}
                name="displayName"
                required
              />
              <Field label={vi ? 'Chức danh' : 'Job title'} name="jobTitle" />
              <Field label={vi ? 'Bộ phận' : 'Department'} name="department" />
              <SelectField
                label={vi ? 'Ngôn ngữ ưu tiên' : 'Preferred language'}
                name="preferredLanguage"
              >
                <option value="">{vi ? 'Chưa chọn' : 'Not specified'}</option>
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
                <option value="ko">한국어</option>
              </SelectField>
            </FormSection>

            <FormSection
              description={
                vi
                  ? 'Chỉ thêm kênh đã được người liên hệ cung cấp.'
                  : 'Only add channels the contact has provided.'
              }
              title={vi ? 'Kênh liên hệ' : 'Contact channels'}
            >
              <Field label="Email" name="email" type="email" />
              <Field
                label={vi ? 'Điện thoại' : 'Phone'}
                name="phone"
                type="tel"
              />
            </FormSection>

            {duplicates.length > 0 && (
              <section
                className="border-primary/20 bg-primary/5 rounded-xl border p-4"
                aria-labelledby="contact-duplicate-title"
              >
                <div className="flex gap-3">
                  <AlertTriangle
                    aria-hidden
                    className="text-primary mt-0.5 shrink-0"
                    size={20}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold" id="contact-duplicate-title">
                      {vi
                        ? 'Đã tìm thấy kênh liên hệ trùng'
                        : 'Matching contact channel found'}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {vi
                        ? 'Đây chỉ là cảnh báo. Mỗi người vẫn giữ ID và lịch sử riêng.'
                        : 'This is a warning only. Each person keeps a separate ID and history.'}
                    </p>
                    <ul className="mt-3 space-y-2 text-sm">
                      {duplicates.map((candidate) => (
                        <li
                          className="bg-background rounded-lg p-3"
                          key={`${candidate.id}-${candidate.matchedKind}`}
                        >
                          <strong>{candidate.displayName}</strong>
                          {candidate.jobTitle ? ` · ${candidate.jobTitle}` : ''}
                          <span className="text-muted-foreground block">
                            {candidate.customerLegalName}
                            {candidate.sameCustomer
                              ? ` · ${vi ? 'cùng buyer' : 'same buyer'}`
                              : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <button
                      className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 min-h-10 rounded-md px-4 text-sm font-medium"
                      onClick={() =>
                        pendingPayload && void create(pendingPayload)
                      }
                      type="button"
                    >
                      {vi ? 'Vẫn tạo liên hệ riêng' : 'Create separate contact'}
                    </button>
                  </div>
                </div>
              </section>
            )}

            {error && (
              <p
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>

          <footer className="bg-background flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            {closeConfirm ? (
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium">
                  {vi
                    ? 'Hủy các thay đổi chưa lưu?'
                    : 'Discard unsaved changes?'}
                </p>
                <div className="flex gap-2">
                  <button
                    className="hover:bg-muted min-h-10 rounded-md px-3 text-sm font-medium"
                    onClick={() => setCloseConfirm(false)}
                    type="button"
                  >
                    {vi ? 'Tiếp tục nhập' : 'Keep editing'}
                  </button>
                  <button
                    className="bg-destructive text-destructive-foreground min-h-10 rounded-md px-3 text-sm font-medium"
                    onClick={resetAndClose}
                    type="button"
                  >
                    {vi ? 'Hủy thay đổi' : 'Discard changes'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  className="hover:bg-muted focus-visible:ring-primary min-h-10 rounded-md px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
                  disabled={pending}
                  onClick={requestClose}
                  type="button"
                >
                  {vi ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  aria-busy={pending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={pending || duplicates.length > 0}
                  type="submit"
                >
                  {pending && (
                    <LoaderCircle
                      aria-hidden
                      className="animate-spin"
                      size={17}
                    />
                  )}
                  {pending
                    ? vi
                      ? 'Đang lưu…'
                      : 'Saving…'
                    : vi
                      ? 'Lưu liên hệ'
                      : 'Save contact'}
                </button>
              </>
            )}
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  )
}

function FormSection({
  title,
  description,
  children,
}: Readonly<{ title: string; description: string; children: ReactNode }>) {
  return (
    <fieldset>
      <legend className="text-base font-semibold">{title}</legend>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

function Field({
  label,
  name,
  required,
  type = 'text',
}: Readonly<{
  label: string
  name: string
  required?: boolean
  type?: string
}>) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="font-medium">
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-hidden>
            *
          </span>
        )}
      </span>
      <input
        aria-required={required}
        className="bg-background border-input placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20 min-h-11 w-full rounded-md border px-3 outline-none focus-visible:ring-2"
        name={name}
        required={required}
        type={type}
      />
    </label>
  )
}

function SelectField({
  label,
  name,
  children,
}: Readonly<{ label: string; name: string; children: ReactNode }>) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <select
        className="bg-background border-input focus-visible:border-primary focus-visible:ring-primary/20 min-h-11 w-full rounded-md border px-3 outline-none focus-visible:ring-2"
        name={name}
      >
        {children}
      </select>
    </label>
  )
}
