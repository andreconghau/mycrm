'use client'

import Link from 'next/link'
import reports from '@/constants/dummy/dashboard-reporting.json'
import {
  customers,
  rfqs,
  quotes,
  orders,
  scoped,
  routeRows,
} from '../routing/r1-route-data'
import { RecordsTable } from '../routing/records-table'
import { useMarket } from './market-context'

export function MarketDashboard({
  locale,
  view,
}: {
  locale: 'en' | 'vi'
  view?: string
}) {
  const { marketId, markets } = useMarket()
  const vi = locale === 'vi'
  const active = markets.find((m) => m.id === marketId)
  const marketCustomers = scoped(customers, marketId)
  const marketRfqs = scoped(rfqs, marketId)
  const marketQuotes = scoped(quotes, marketId)
  const marketOrders = scoped(orders, marketId)
  const selected = reports.views.find((v) => v.key === view)?.key ?? 'overview'
  const headers = vi
    ? ['Khách hàng', 'Yêu cầu báo giá', 'Báo giá', 'Đơn bán hàng']
    : ['Customer', 'RFQs', 'Quotations', 'Sales orders']
  let columns = headers
  let rows = marketCustomers.map((c) => [
    c.legal_name,
    String(marketRfqs.filter((r) => r.customer_id === c.id).length),
    String(marketQuotes.filter((r) => r.customer_id === c.id).length),
    String(marketOrders.filter((r) => r.customer_id === c.id).length),
  ])
  if (selected === 'orders') {
    columns = vi
      ? [
          'Đơn hàng',
          'Khách hàng',
          'Xác nhận',
          'Số dòng',
          'Giá trị',
          'Trạng thái',
        ]
      : ['Order', 'Customer', 'Confirmed', 'Lines', 'Value', 'Status']
    rows = routeRows('/sales-orders', marketId, locale)
  } else if (selected === 'products') {
    columns = vi
      ? ['Sản phẩm', 'Danh mục', 'Dạng', 'Thông số', 'Trạng thái']
      : ['Product', 'Category', 'Form', 'Specifications', 'Status']
    rows = routeRows('/products', marketId, locale)
  } else if (selected === 'sales') {
    columns = vi
      ? ['Nhân viên', 'Yêu cầu báo giá', 'Báo giá', 'Đơn hàng']
      : ['Sales owner', 'RFQs', 'Quotations', 'Orders']
    const owners = [
      ...new Set(
        [...marketRfqs, ...marketQuotes, ...marketOrders].map(
          (r) => r.owner_id,
        ),
      ),
    ]
    rows = owners.map((owner) => [
      owner,
      String(marketRfqs.filter((r) => r.owner_id === owner).length),
      String(marketQuotes.filter((r) => r.owner_id === owner).length),
      String(marketOrders.filter((r) => r.owner_id === owner).length),
    ])
  }
  const metrics = [
    marketCustomers.length,
    marketRfqs.length,
    marketQuotes.length,
    marketOrders.length,
  ]
  return (
    <section className="space-y-6">
      <div>
        <p className="text-primary text-sm">
          {active?.[vi ? 'name_vi' : 'name_en']}
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          {vi ? 'Báo cáo' : 'Reporting'}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {vi
            ? 'Dữ liệu mẫu theo thị trường đang chọn. Giá trị tiền giữ nguyên tiền tệ giao dịch.'
            : 'Synthetic records for the selected market. Amounts retain their transaction currency.'}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((count, i) => (
          <article key={headers[i]} className="bg-card rounded-xl border p-5">
            <p className="text-muted-foreground text-sm">{headers[i]}</p>
            <p className="mt-2 text-3xl font-semibold">{count}</p>
          </article>
        ))}
      </div>
      <nav
        aria-label={vi ? 'Loại báo cáo' : 'Report views'}
        className="flex flex-wrap gap-2"
      >
        {reports.views.map((v) => (
          <Link
            key={v.key}
            href={`/${locale}/dashboard?view=${v.key}`}
            aria-current={selected === v.key ? 'page' : undefined}
            className={`rounded-md border px-3 py-2 text-sm ${selected === v.key ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
          >
            {v[vi ? 'label_vi' : 'label_en']}
          </Link>
        ))}
      </nav>
      <div className="bg-card overflow-hidden rounded-xl border">
        <RecordsTable
          key={`${marketId}:${selected}`}
          columns={columns}
          rows={rows}
          label={vi ? 'Báo cáo thị trường' : 'Market report'}
          locale={locale}
        />
      </div>
    </section>
  )
}
