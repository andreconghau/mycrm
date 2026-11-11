'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Product = {
  id: number
  sku?: string
  displayName?: string
  category?: string | null
  speciesCommonName?: string | null
  speciesScientificName?: string | null
  productFamily?: string | null
  defaultUnit?: string
  status?: string
  descriptionEn?: string | null
  descriptionVi?: string | null
  descriptionKo?: string | null
  names?: Record<string, string>
  version?: number
}

function csrfToken() {
  const value = document.cookie
    .split('; ')
    .find(
      (cookie) =>
        cookie.startsWith('crm_csrf=') || cookie.startsWith('__Host-crm_csrf='),
    )
  return value ? decodeURIComponent(value.slice(value.indexOf('=') + 1)) : ''
}

export function ProductDetail({
  id,
  locale,
  roles,
}: Readonly<{ id: number; locale: 'en' | 'vi'; roles: string[] }>) {
  const vi = locale === 'vi'
  const [product, setProduct] = useState<Product | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')
  const canManage = roles.includes('manager') || roles.includes('admin')

  useEffect(() => {
    let active = true
    void fetch(`/api/v1/products/${id}`, { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok)
          throw new Error(response.status === 404 ? 'NOT_FOUND' : 'LOAD_FAILED')
        return body.data as Product
      })
      .then((value) => {
        if (active) setProduct(value)
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error && reason.message === 'NOT_FOUND'
              ? vi
                ? 'Không tìm thấy sản phẩm trong phạm vi truy cập.'
                : 'Product not found in your authorized scope.'
              : vi
                ? 'Không thể tải sản phẩm.'
                : 'Product could not be loaded.',
          )
      })
    return () => {
      active = false
    }
  }, [id, vi])

  async function transition(action: 'approve' | 'retire' | 'reactivate') {
    if (!product?.version) return
    setPending(true)
    setError('')
    try {
      const response = await fetch(`/api/v1/products/${id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken(),
        },
        body: JSON.stringify({ version: product.version }),
      })
      const body = await response.json()
      if (!response.ok)
        throw new Error(response.status === 409 ? 'CONFLICT' : 'TRANSITION_FAILED')
      setProduct((current) => (current ? { ...current, ...body.data } : current))
      setNotice(
        vi
          ? 'Đã cập nhật trạng thái sản phẩm.'
          : 'Product status updated.',
      )
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message === 'CONFLICT'
          ? vi
            ? 'Bản ghi đã thay đổi. Tải lại trước khi tiếp tục.'
            : 'This record changed. Reload before continuing.'
          : vi
            ? 'Không thể cập nhật trạng thái.'
            : 'Status could not be updated.',
      )
    } finally {
      setPending(false)
    }
  }

  if (error && !product) {
    return (
      <section className="space-y-4">
        <Link
          className="text-primary text-sm hover:underline"
          href={`/${locale}/products`}
        >
          ← {vi ? 'Sản phẩm' : 'Products'}
        </Link>
        <p className="text-destructive" role="alert">
          {error}
        </p>
      </section>
    )
  }
  if (!product)
    return (
      <p className="text-muted-foreground p-6" role="status">
        {vi ? 'Đang tải…' : 'Loading…'}
      </p>
    )

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <Link
        className="text-primary text-sm hover:underline"
        href={`/${locale}/products`}
      >
        ← {vi ? 'Sản phẩm' : 'Products'}
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground font-mono text-xs">{product.sku}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {product.displayName}
          </h1>
        </div>
        <span className="rounded-full border px-3 py-1 text-sm">
          {product.status}
        </span>
      </header>

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm text-emerald-700" role="status">
          {notice}
        </p>
      )}

      <div className="bg-card grid gap-4 rounded-xl border p-5 sm:grid-cols-2">
        <DetailValue label={vi ? 'Danh mục' : 'Category'} value={product.category} />
        <DetailValue label={vi ? 'Nhóm sản phẩm' : 'Product family'} value={product.productFamily} />
        <DetailValue label={vi ? 'Tên loài' : 'Species common name'} value={product.speciesCommonName} />
        <DetailValue label={vi ? 'Tên khoa học' : 'Species scientific name'} value={product.speciesScientificName} />
        <DetailValue label={vi ? 'Đơn vị mặc định' : 'Default unit'} value={product.defaultUnit} />
      </div>

      {product.names && (
        <div className="bg-card grid gap-4 rounded-xl border p-5 sm:grid-cols-3">
          <DetailValue label="Name (EN)" value={product.names.en} />
          <DetailValue label="Tên (VI)" value={product.names.vi} />
          <DetailValue label="이름 (KO)" value={product.names.ko} />
        </div>
      )}

      {canManage && (
        <div className="bg-card flex flex-wrap gap-2 rounded-xl border p-5">
          {product.status === 'DRAFT' && (
            <button
              className="bg-primary text-primary-foreground min-h-10 rounded-md px-4 text-sm font-medium disabled:opacity-60"
              disabled={pending}
              onClick={() => void transition('approve')}
              type="button"
            >
              {vi ? 'Phê duyệt (DRAFT → ACTIVE)' : 'Approve (DRAFT → ACTIVE)'}
            </button>
          )}
          {product.status === 'ACTIVE' && (
            <button
              className="border-destructive text-destructive min-h-10 rounded-md border px-4 text-sm font-medium disabled:opacity-60"
              disabled={pending}
              onClick={() => void transition('retire')}
              type="button"
            >
              {vi ? 'Ngừng kinh doanh (ACTIVE → INACTIVE)' : 'Retire (ACTIVE → INACTIVE)'}
            </button>
          )}
          {product.status === 'INACTIVE' && (
            <button
              className="min-h-10 rounded-md border px-4 text-sm font-medium disabled:opacity-60"
              disabled={pending}
              onClick={() => void transition('reactivate')}
              type="button"
            >
              {vi ? 'Kích hoạt lại (INACTIVE → ACTIVE)' : 'Reactivate (INACTIVE → ACTIVE)'}
            </button>
          )}
        </div>
      )}
    </section>
  )
}

function DetailValue({
  label,
  value,
}: Readonly<{ label: string; value?: string | null }>) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-sm">{value || '—'}</p>
    </div>
  )
}
