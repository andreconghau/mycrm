'use client'

import {
  AlertTriangle,
  LoaderCircle,
  Maximize2,
  Minimize2,
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

type DuplicateCandidate = {
  id?: number
  code?: string
  legalName?: string
  countryCode?: string
}

type CustomerPayload = {
  code: string
  legalName: string
  tradeName: string | null
  countryCode: string
  preferredCurrency: string | null
  status: 'PROSPECT'
  addresses: Array<{
    kind: string
    addressLines: string
    city: string | null
    countryCode: string
    isDefault: boolean
  }>
  identifiers: Array<{ kind: string; value: string }>
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

function payloadFrom(form: FormData): CustomerPayload {
  const identifierKind = String(form.get('identifierKind') ?? '').trim()
  const identifierValue = String(form.get('identifierValue') ?? '').trim()
  const addressLines = String(form.get('addressLines') ?? '').trim()

  return {
    code: String(form.get('code') ?? '').trim(),
    legalName: String(form.get('legalName') ?? '').trim(),
    tradeName: String(form.get('tradeName') ?? '').trim() || null,
    countryCode: String(form.get('countryCode') ?? '').trim(),
    preferredCurrency:
      String(form.get('preferredCurrency') ?? '').trim() || null,
    status: 'PROSPECT',
    addresses: addressLines
      ? [
          {
            kind: String(form.get('addressKind') || 'office'),
            addressLines,
            city: String(form.get('city') ?? '').trim() || null,
            countryCode: String(
              form.get('addressCountryCode') || form.get('countryCode'),
            ),
            isDefault: false,
          },
        ]
      : [],
    identifiers:
      identifierKind && identifierValue
        ? [{ kind: identifierKind, value: identifierValue }]
        : [],
  }
}

export function CustomerCreateDrawer({
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
  const formRef = useRef<HTMLFormElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [closeConfirm, setCloseConfirm] = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([])
  const [pendingPayload, setPendingPayload] = useState<CustomerPayload | null>(
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

  function finishClose() {
    setExpanded(false)
    setDirty(false)
    setPending(false)
    setError('')
    setCloseConfirm(false)
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
    finishClose()
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

  async function create(payload: CustomerPayload) {
    setPending(true)
    setError('')
    try {
      const response = await fetch(`/api/v1/customers?market=${marketCode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken(),
        },
        body: JSON.stringify(payload),
      })
      const body = await response.json()
      if (!response.ok) {
        setError(
          response.status === 409
            ? vi
              ? 'Mã khách hàng đã được sử dụng trong market này.'
              : 'That customer code is already used in this market.'
            : vi
              ? 'Không thể tạo khách hàng. Hãy kiểm tra quyền và các trường đã nhập.'
              : 'Customer could not be created. Check your access and the entered fields.',
        )
        return
      }
      const customerId = Number(body.data?.id)
      if (!Number.isSafeInteger(customerId) || customerId < 1) {
        setError(
          vi
            ? 'Đã tạo khách hàng nhưng không thể mở hồ sơ. Hãy tải lại danh sách.'
            : 'The customer was created, but its record could not be opened. Reload the list.',
        )
        return
      }
      setDirty(false)
      router.push(`/${locale}/customers/${customerId}?market=${marketCode}`)
    } catch {
      setError(
        vi
          ? 'Mất kết nối khi tạo khách hàng. Hãy thử lại.'
          : 'Connection lost while creating the customer. Try again.',
      )
    } finally {
      setPending(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!marketCode) return
    const payload = payloadFrom(new FormData(event.currentTarget))
    setError('')

    if (payload.identifiers.length) {
      setPending(true)
      try {
        const response = await fetch(
          `/api/v1/customers/duplicate-candidates?market=${marketCode}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': csrfToken(),
            },
            body: JSON.stringify({ identifiers: payload.identifiers }),
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
            ? 'Không thể kiểm tra buyer trùng. Hãy thử lại trước khi lưu.'
            : 'Duplicate buyers could not be checked. Try again before saving.',
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
        aria-describedby="customer-create-description"
        aria-labelledby="customer-create-title"
        aria-modal="true"
        className={`bg-background absolute inset-y-0 right-0 flex w-full flex-col shadow-2xl motion-safe:transition-[max-width] motion-safe:duration-200 ${
          expanded ? 'max-w-5xl' : 'max-w-2xl'
        }`}
        onKeyDown={handleKeyDown}
        ref={panelRef}
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
          <div>
            <h2
              className="text-xl font-semibold tracking-tight"
              id="customer-create-title"
            >
              {vi ? 'Tạo khách hàng' : 'Create customer'}
            </h2>
            <p
              className="text-muted-foreground mt-1 max-w-xl text-sm"
              id="customer-create-description"
            >
              {vi
                ? `Thêm buyer mới vào market ${marketCode}. Hồ sơ bắt đầu ở trạng thái Prospect.`
                : `Add a new buyer to the ${marketCode} market. The record starts as a Prospect.`}
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
              aria-label={
                vi ? 'Đóng form tạo khách hàng' : 'Close customer form'
              }
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
          ref={formRef}
        >
          <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-5 py-6 sm:px-6">
            <FormSection
              description={
                vi
                  ? 'Thông tin dùng để nhận diện buyer trong CRM.'
                  : 'Information used to identify the buyer in the CRM.'
              }
              title={vi ? 'Thông tin doanh nghiệp' : 'Company information'}
            >
              <Field
                label={vi ? 'Mã khách hàng' : 'Customer code'}
                name="code"
                required
              />
              <Field
                label={vi ? 'Tên pháp lý' : 'Legal name'}
                name="legalName"
                required
              />
              <Field
                label={vi ? 'Tên giao dịch' : 'Trading name'}
                name="tradeName"
              />
              <Field
                label={vi ? 'Quốc gia buyer (ISO-2)' : 'Buyer country (ISO-2)'}
                maxLength={2}
                name="countryCode"
                required
              />
              <Field
                label={
                  vi
                    ? 'Tiền tệ ưu tiên (ISO-4217)'
                    : 'Preferred currency (ISO-4217)'
                }
                maxLength={3}
                name="preferredCurrency"
              />
            </FormSection>

            <FormSection
              description={
                vi
                  ? 'Thông tin địa chỉ chính của buyer.'
                  : 'The buyer’s primary address information.'
              }
              title={vi ? 'Địa chỉ chính' : 'Primary address'}
            >
              <Field
                className="sm:col-span-2"
                label={vi ? 'Địa chỉ' : 'Address'}
                name="addressLines"
              />
              <Field label={vi ? 'Thành phố' : 'City'} name="city" />
              <SelectField
                label={vi ? 'Loại địa chỉ' : 'Address type'}
                name="addressKind"
              >
                <option value="office">{vi ? 'Văn phòng' : 'Office'}</option>
                <option value="billing">{vi ? 'Thanh toán' : 'Billing'}</option>
                <option value="shipping">
                  {vi ? 'Giao hàng' : 'Shipping'}
                </option>
              </SelectField>
              <Field
                label={
                  vi ? 'Quốc gia địa chỉ (ISO-2)' : 'Address country (ISO-2)'
                }
                maxLength={2}
                name="addressCountryCode"
              />
            </FormSection>

            <FormSection
              description={
                vi
                  ? 'Thêm mã đăng ký hoặc mã thuế để hệ thống kiểm tra buyer có thể bị trùng.'
                  : 'Add a registration or tax identifier so the system can check for possible duplicate buyers.'
              }
              title={vi ? 'Định danh doanh nghiệp' : 'Company identifier'}
            >
              <Field
                label={vi ? 'Loại định danh' : 'Identifier type'}
                name="identifierKind"
              />
              <Field
                label={
                  vi ? 'Mã đăng ký / thuế' : 'Registration / tax identifier'
                }
                name="identifierValue"
              />
            </FormSection>

            {duplicates.length > 0 && (
              <section
                className="border-primary/20 bg-primary/5 rounded-xl border p-4"
                aria-labelledby="duplicate-title"
              >
                <div className="flex gap-3">
                  <AlertTriangle
                    aria-hidden
                    className="text-primary mt-0.5 shrink-0"
                    size={19}
                  />
                  <div className="min-w-0">
                    <h3 className="font-semibold" id="duplicate-title">
                      {vi
                        ? 'Có buyer trùng định danh'
                        : 'Matching buyer identifier found'}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {vi
                        ? 'Kiểm tra các hồ sơ sau trước khi tạo bản ghi riêng.'
                        : 'Review these records before creating a separate customer.'}
                    </p>
                    <ul className="bg-background mt-3 divide-y rounded-lg border">
                      {duplicates.map((candidate, index) => (
                        <li
                          className="px-3 py-2 text-sm"
                          key={candidate.id ?? `${candidate.code}-${index}`}
                        >
                          <strong>
                            {candidate.legalName ||
                              (vi ? 'Chưa có tên' : 'Unnamed buyer')}
                          </strong>
                          <span className="text-muted-foreground ml-2">
                            {[candidate.code, candidate.countryCode]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className="border-input hover:bg-muted focus-visible:ring-primary min-h-10 rounded-md border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
                        disabled={pending}
                        onClick={() => {
                          setDuplicates([])
                          setPendingPayload(null)
                        }}
                        type="button"
                      >
                        {vi ? 'Quay lại kiểm tra' : 'Review form'}
                      </button>
                      <button
                        className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary min-h-10 rounded-md px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                        disabled={pending}
                        onClick={() =>
                          pendingPayload && void create(pendingPayload)
                        }
                        type="button"
                      >
                        {vi
                          ? 'Vẫn tạo bản ghi riêng'
                          : 'Create separate customer'}
                      </button>
                    </div>
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
                    onClick={finishClose}
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
                      ? 'Lưu khách hàng'
                      : 'Save customer'}
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
  className = '',
  label,
  name,
  required,
  maxLength,
}: Readonly<{
  className?: string
  label: string
  name: string
  required?: boolean
  maxLength?: number
}>) {
  return (
    <label className={`space-y-1.5 text-sm ${className}`}>
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
        maxLength={maxLength}
        name={name}
        required={required}
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
