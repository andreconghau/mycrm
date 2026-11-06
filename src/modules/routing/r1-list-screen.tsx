'use client'

import { useMarket } from '../markets/market-context'
import { routeRows } from './r1-route-data'
import { RecordsTable } from './records-table'
import type { R1Route } from './r1-route-data'

export function R1ListScreen({
  route,
  locale,
}: Readonly<{ route: R1Route; locale: 'en' | 'vi' }>) {
  const { marketId } = useMarket()
  const rows = routeRows(route.href, marketId, locale)
  const vi = locale === 'vi'
  const text = (value: string) =>
    vi ? (viRouteTerms[value as keyof typeof viRouteTerms] ?? value) : value
  return (
    <section aria-labelledby="page-title" className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
            {route.code} · R1 planned
          </p>
          <h1
            className="mt-2 text-3xl font-semibold tracking-tight"
            id="page-title"
          >
            {text(route.label)}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            {text(route.summary)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="bg-card text-muted-foreground rounded-md border px-3 py-2 text-sm font-medium"
            disabled
            type="button"
          >
            {vi ? 'Xuất' : 'Export'}
          </button>
          <button
            className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium opacity-60"
            disabled
            type="button"
          >
            + {vi ? 'Tạo mới' : 'New'} {text(route.label).replace(/s$/, '')}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          label={vi ? 'Bản ghi mẫu' : 'Example records'}
          value={String(rows.length)}
          detail={vi ? 'Dữ liệu minh họa' : 'Fictional mockup rows'}
        />
        <Metric
          label={vi ? 'Phiên bản' : 'Release'}
          value="R1"
          detail={vi ? 'Phạm vi CRM cốt lõi' : 'Core CRM planning scope'}
        />
        <Metric
          label={vi ? 'Nguồn dữ liệu' : 'Data source'}
          value="Static"
          detail={
            vi
              ? 'Chưa kết nối API hoặc cơ sở dữ liệu'
              : 'No API or database connected'
          }
        />
      </div>

      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">
              {text(route.label)} {vi ? '· Tổng quan' : 'overview'}
            </h2>
            <p className="text-muted-foreground mt-1 text-xs">
              {vi ? 'Bản mẫu giao diện dựa trên' : 'UI prototype based on'}{' '}
              <code>{route.mockup}</code>
            </p>
          </div>
          <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
            {vi
              ? 'Bản mẫu · thao tác và kiểm tra quyền chưa được kết nối'
              : 'Prototype only · actions and access checks are not connected'}
          </p>
        </div>
        <RecordsTable
          key={marketId}
          columns={route.columns.map(text)}
          rows={rows}
          label={text(route.label)}
          locale={locale}
        />
        <div className="text-muted-foreground border-t px-4 py-3 text-xs">
          {vi
            ? 'Đang hiển thị dữ liệu minh họa. Chưa có bản ghi thật, thao tác, xuất dữ liệu hoặc kiểm tra quyền.'
            : 'Showing illustrative rows. No live records, actions, exports or permission checks are available.'}
        </div>
      </div>
    </section>
  )
}

import viMessages from '@/constants/messages/vi.json'
const viRouteTerms = viMessages.routeTerms

function Metric({
  label,
  value,
  detail,
}: Readonly<{ label: string; value: string; detail: string }>) {
  return (
    <article className="bg-card rounded-xl border p-4 shadow-sm">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-muted-foreground mt-1 text-xs">{detail}</p>
    </article>
  )
}
