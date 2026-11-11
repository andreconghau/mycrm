'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { ProductCreateDrawer } from './product-create-drawer'

type Product = {
  id: number
  sku?: string
  displayName?: string
  category?: string | null
  status?: string
  defaultUnit?: string
  version?: number
}

export function ProductWorkspace({
  locale,
  roles,
}: Readonly<{ locale: 'en' | 'vi'; roles: string[] }>) {
  const vi = locale === 'vi'
  const [items, setItems] = useState<Product[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const canCreate = roles.includes('manager') || roles.includes('admin')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ q: query })
      if (status) params.set('status', status)
      const response = await fetch(`/api/v1/products?${params}`, {
        cache: 'no-store',
      })
      const body = await response.json()
      if (!response.ok) {
        setError(
          response.status === 403
            ? vi
              ? 'Bạn chưa được cấp quyền xem danh mục sản phẩm.'
              : 'You do not have access to the product catalog.'
            : vi
              ? 'Không thể tải danh mục sản phẩm.'
              : 'Products could not be loaded.',
        )
        setItems([])
        return
      }
      setItems(body.data.items)
    } catch {
      setError(vi ? 'Lỗi kết nối.' : 'Connection error.')
    } finally {
      setLoading(false)
    }
  }, [query, status, vi])

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  return (
    <section aria-labelledby="product-title" className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
            R1 · M06
          </p>
          <h1
            className="mt-2 text-3xl font-semibold tracking-tight"
            id="product-title"
          >
            {vi ? 'Sản phẩm' : 'Products'}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {vi
              ? 'Danh mục SKU hải sản xuất khẩu dùng chung cho toàn công ty.'
              : 'Shared seafood export SKU catalog across the company.'}
          </p>
        </div>
        {canCreate && (
          <button
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={() => setCreateOpen(true)}
            type="button"
          >
            <Plus aria-hidden size={17} />
            {vi ? 'Tạo sản phẩm' : 'Create product'}
          </button>
        )}
      </header>

      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold">
            {vi ? 'Danh sách sản phẩm' : 'Product list'}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-muted-foreground text-sm">
              <span className="sr-only">
                {vi ? 'Tìm sản phẩm' : 'Search products'}
              </span>
              <input
                className="text-foreground min-h-10 w-full rounded-md border px-3 sm:w-64"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={vi ? 'Tìm SKU hoặc tên…' : 'Search SKU or name…'}
                value={query}
              />
            </label>
            <label className="text-sm">
              <span className="sr-only">{vi ? 'Trạng thái' : 'Status'}</span>
              <select
                className="bg-card min-h-10 rounded-md border px-3"
                onChange={(event) => setStatus(event.target.value)}
                value={status}
              >
                <option value="">{vi ? 'Tất cả trạng thái' : 'All statuses'}</option>
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </label>
          </div>
        </div>
        {error ? (
          <p className="text-destructive p-6 text-sm" role="alert">
            {error}
          </p>
        ) : loading ? (
          <p className="text-muted-foreground p-6 text-sm" role="status">
            {vi ? 'Đang tải…' : 'Loading…'}
          </p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground p-6 text-sm">
            {vi
              ? 'Chưa có sản phẩm trong phạm vi truy cập.'
              : 'No products in your authorized scope.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">
                    {vi ? 'Tên sản phẩm' : 'Product'}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {vi ? 'Danh mục' : 'Category'}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {vi ? 'Đơn vị' : 'Unit'}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {vi ? 'Trạng thái' : 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr className="border-t" key={item.id}>
                    <td className="px-4 py-3 font-mono text-xs">{item.sku}</td>
                    <td className="px-4 py-3">
                      <Link
                        className="text-primary font-medium hover:underline"
                        href={`/${locale}/products/${item.id}`}
                      >
                        {item.displayName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{item.category ?? '—'}</td>
                    <td className="px-4 py-3">{item.defaultUnit}</td>
                    <td className="px-4 py-3">{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductCreateDrawer
        locale={locale}
        onClose={() => setCreateOpen(false)}
        open={createOpen}
      />
    </section>
  )
}
