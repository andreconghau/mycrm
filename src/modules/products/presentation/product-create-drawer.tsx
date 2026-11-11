'use client'

import { LoaderCircle, Maximize2, Minimize2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

const productUnits = ['KG', 'MT', 'CTN', 'PCS', 'LB'] as const

type ProductPayload = {
  sku: string
  names: { en: string; vi: string; ko: string }
  category: string | null
  speciesCommonName: string | null
  speciesScientificName: string | null
  productFamily: string | null
  defaultUnit: string
  descriptionEn: string | null
  descriptionVi: string | null
  descriptionKo: string | null
  aliases: Array<{ locale: string; label: string }>
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

function payloadFrom(form: FormData): ProductPayload {
  return {
    sku: String(form.get('sku') ?? '').trim(),
    names: {
      en: String(form.get('nameEn') ?? '').trim(),
      vi: String(form.get('nameVi') ?? '').trim(),
      ko: String(form.get('nameKo') ?? '').trim(),
    },
    category: String(form.get('category') ?? '').trim() || null,
    speciesCommonName: String(form.get('speciesCommonName') ?? '').trim() || null,
    speciesScientificName:
      String(form.get('speciesScientificName') ?? '').trim() || null,
    productFamily: String(form.get('productFamily') ?? '').trim() || null,
    defaultUnit: String(form.get('defaultUnit') ?? 'KG'),
    descriptionEn: String(form.get('descriptionEn') ?? '').trim() || null,
    descriptionVi: String(form.get('descriptionVi') ?? '').trim() || null,
    descriptionKo: String(form.get('descriptionKo') ?? '').trim() || null,
    aliases: [],
  }
}

export function ProductCreateDrawer({
  locale,
  open,
  onClose,
}: Readonly<{ locale: 'en' | 'vi'; open: boolean; onClose: () => void }>) {
  const vi = locale === 'vi'
  const router = useRouter()
  const panelRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [closeConfirm, setCloseConfirm] = useState(false)

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload = payloadFrom(new FormData(event.currentTarget))
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/v1/products', {
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
              ? 'SKU này đã tồn tại.'
              : 'That SKU already exists.'
            : vi
              ? 'Không thể tạo sản phẩm. Hãy kiểm tra quyền và các trường đã nhập.'
              : 'Product could not be created. Check your access and the entered fields.',
        )
        return
      }
      const productId = Number(body.data?.id)
      if (!Number.isSafeInteger(productId) || productId < 1) {
        setError(
          vi
            ? 'Đã tạo sản phẩm nhưng không thể mở hồ sơ. Hãy tải lại danh sách.'
            : 'The product was created, but its record could not be opened. Reload the list.',
        )
        return
      }
      setDirty(false)
      router.push(`/${locale}/products/${productId}`)
    } catch {
      setError(
        vi
          ? 'Mất kết nối khi tạo sản phẩm. Hãy thử lại.'
          : 'Connection lost while creating the product. Try again.',
      )
    } finally {
      setPending(false)
    }
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
        aria-describedby="product-create-description"
        aria-labelledby="product-create-title"
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
              id="product-create-title"
            >
              {vi ? 'Tạo sản phẩm' : 'Create product'}
            </h2>
            <p
              className="text-muted-foreground mt-1 max-w-xl text-sm"
              id="product-create-description"
            >
              {vi
                ? 'Thêm SKU mới vào danh mục chung. Hồ sơ bắt đầu ở trạng thái DRAFT và chưa thể dùng cho giao dịch thương mại.'
                : 'Add a new SKU to the shared catalog. The record starts as DRAFT and is not yet usable on commercial documents.'}
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
              aria-label={vi ? 'Đóng form tạo sản phẩm' : 'Close product form'}
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
          onChange={() => setDirty(true)}
          onSubmit={handleSubmit}
        >
          <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-5 py-6 sm:px-6">
            <FormSection
              description={
                vi
                  ? 'SKU và đơn vị tính mặc định dùng cho toàn bộ giao dịch.'
                  : 'SKU and the default unit used across all commercial documents.'
              }
              title={vi ? 'Định danh SKU' : 'SKU identity'}
            >
              <Field label="SKU" name="sku" required />
              <SelectField label={vi ? 'Đơn vị mặc định' : 'Default unit'} name="defaultUnit">
                {productUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </SelectField>
            </FormSection>

            <FormSection
              description={
                vi
                  ? 'Tên chính thức theo từng ngôn ngữ; cả ba đều bắt buộc.'
                  : 'Official per-locale names; all three are required.'
              }
              title={vi ? 'Tên đa ngôn ngữ' : 'Multilingual names'}
            >
              <Field label="Name (EN)" name="nameEn" required />
              <Field label="Tên (VI)" name="nameVi" required />
              <Field label="이름 (KO)" name="nameKo" required />
            </FormSection>

            <FormSection
              description={
                vi
                  ? 'Phân loại nhận diện sản phẩm; chi tiết chế biến/đóng gói thuộc Product Specifications.'
                  : 'Identity-level classification; processing/packaging detail belongs to Product Specifications.'
              }
              title={vi ? 'Phân loại' : 'Classification'}
            >
              <Field label={vi ? 'Danh mục' : 'Category'} name="category" />
              <Field label={vi ? 'Nhóm sản phẩm' : 'Product family'} name="productFamily" />
              <Field label={vi ? 'Tên loài (thông thường)' : 'Species common name'} name="speciesCommonName" />
              <Field label={vi ? 'Tên khoa học' : 'Species scientific name'} name="speciesScientificName" />
            </FormSection>

            <FormSection
              description={
                vi
                  ? 'Mô tả tiếp thị/catalog theo từng ngôn ngữ (tùy chọn).'
                  : 'Optional per-locale marketing/catalog description.'
              }
              title={vi ? 'Mô tả' : 'Description'}
            >
              <Field label="Description (EN)" name="descriptionEn" />
              <Field label="Mô tả (VI)" name="descriptionVi" />
              <Field label="설명 (KO)" name="descriptionKo" />
            </FormSection>

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
                  {vi ? 'Hủy các thay đổi chưa lưu?' : 'Discard unsaved changes?'}
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
                  disabled={pending}
                  type="submit"
                >
                  {pending && (
                    <LoaderCircle aria-hidden className="animate-spin" size={17} />
                  )}
                  {pending
                    ? vi
                      ? 'Đang lưu…'
                      : 'Saving…'
                    : vi
                      ? 'Lưu sản phẩm'
                      : 'Save product'}
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
}: Readonly<{
  className?: string
  label: string
  name: string
  required?: boolean
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
