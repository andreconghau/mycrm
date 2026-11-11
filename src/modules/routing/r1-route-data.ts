import routeFixtures from '@/constants/dummy/r1-route-data.json'
import customers from '@/constants/dummy/customers.json'
import leads from '@/constants/dummy/leads.json'
import opportunities from '@/constants/dummy/opportunities.json'
import tasks from '@/constants/dummy/tasks-activities.json'
import products from '@/constants/dummy/products.json'
import specs from '@/constants/dummy/product-specifications.json'
import prices from '@/constants/dummy/price-lists.json'
import rfqs from '@/constants/dummy/rfqs.json'
import quotes from '@/constants/dummy/quotations.json'
import samples from '@/constants/dummy/samples.json'
import orders from '@/constants/dummy/sales-orders.json'
import users from '@/constants/dummy/access-control.json'
import audit from '@/constants/dummy/audit-log.json'
import eligibility from '@/constants/dummy/market-products.json'
import { markets } from '../markets/market-data'

export type R1Route = (typeof routeFixtures)[number]
export const r1Routes = routeFixtures
export const getR1Route = (href: string) =>
  r1Routes.find((r) => r.href === href)
export const scoped = <T extends { market_id: string }>(
  records: T[],
  marketId: string | null,
) => records.filter((r) => r.market_id === marketId)
const customer = (id: string) =>
  customers.find((r) => r.id === id)?.legal_name ?? id
const product = (id: string) =>
  products.find((r) => r.id === id)?.display_name ?? id
const user = (id: string) => users.find((r) => r.id === id)?.display_name ?? id
const market = (id: string, locale: 'en' | 'vi') =>
  markets.find((r) => r.id === id)?.[locale === 'vi' ? 'name_vi' : 'name_en'] ??
  id

export function routeRows(
  href: string,
  marketId: string | null,
  locale: 'en' | 'vi' = 'en',
): string[][] {
  if (!marketId) return []
  switch (href) {
    case '/customers':
      return scoped(customers, marketId).map((r) => [
        r.legal_name,
        market(r.market_id, locale),
        user(r.owner_user_id),
        String(
          scoped(rfqs, marketId).filter((q) => q.customer_id === r.id).length,
        ),
        r.updated_at,
      ])
    case '/leads':
      return scoped(leads, marketId).map((r) => [
        r.contact_name,
        r.company_name,
        r.source,
        market(r.market_id, locale),
        user(r.owner_id),
        r.status,
      ])
    case '/opportunities':
      return scoped(opportunities, marketId).map((r) => [
        r.name,
        customer(r.customer_id),
        r.expected_close_date,
        `${r.currency} ${r.expected_amount}`,
        user(r.owner_id),
        r.stage,
      ])
    case '/tasks':
      return scoped(tasks, marketId).map((r) => [
        r.subject,
        r.related_id,
        r.due_at,
        user(r.assignee_id),
        r.priority,
        r.status,
      ])
    case '/products':
      return products
        .filter((r) =>
          eligibility.some(
            (e) =>
              e.product_id === r.id && e.market_id === marketId && e.eligible,
          ),
        )
        .map((r) => [
          locale === 'vi' ? r.name_vi : r.name_en,
          r.category,
          `${r.form} · ${r.processing_type}`,
          String(
            scoped(specs, marketId).filter((s) => s.product_id === r.id).length,
          ),
          r.status,
        ])
    case '/products/specifications':
      return scoped(specs, marketId).map((r) => [
        r.id,
        product(r.product_id),
        `${r.grade} / ${r.size_band} ${r.size_unit}`,
        `${r.net_weight_per_pack} kg`,
        `v${r.version}`,
      ])
    case '/price-lists':
      return scoped(prices, marketId).map((r) => [
        r.code,
        market(r.market_id, locale),
        r.currency,
        r.valid_to,
        String(r.items.length),
        r.status,
      ])
    case '/rfqs':
      return scoped(rfqs, marketId).map((r) => [
        r.rfq_number,
        customer(r.customer_id),
        r.received_at,
        String(r.lines.length),
        user(r.owner_id),
        r.status,
      ])
    case '/quotations':
      return scoped(quotes, marketId).map((r) => {
        const v = r.versions.find((v) => v.id === r.current_version_id)
        return [
          r.quote_number,
          customer(r.customer_id),
          `v${v?.revision_no ?? ''}`,
          `${v?.currency ?? ''} ${v?.total_decimal ?? ''}`,
          v?.valid_until ?? '',
          r.status,
        ]
      })
    case '/samples':
      return scoped(samples, marketId).map((r) => [
        r.id,
        customer(r.customer_id),
        r.items.map((i) => product(i.product_id)).join(', '),
        r.requested_at,
        r.dispatch.dispatched_at ?? '—',
        r.status,
      ])
    case '/sales-orders':
      return scoped(orders, marketId).map((r) => [
        r.order_number,
        customer(r.customer_id),
        r.confirmed_at,
        String(r.lines.length),
        `${r.currency} ${r.lines.reduce((sum, l) => sum + Number(l.total_decimal), 0).toFixed(2)}`,
        r.status,
      ])
    // These independent administrative prototypes do not acquire business market permissions.
    case '/admin/users':
      return users.map((r) => [
        r.display_name,
        r.role,
        r.team,
        r.manager_id ? user(r.manager_id) : '—',
        '—',
        r.status,
      ])
    case '/audit-log':
      return audit.map((r) => [
        r.action,
        user(r.actor_id),
        r.resource_id,
        r.occurred_at,
        r.reason,
        r.result,
      ])
    default:
      return []
  }
}

// Explicit safe display columns; never search contact details, money, audit or access records.
const searchableColumns: Record<string, number[]> = {
  '/customers': [0],
  '/leads': [0, 1, 5],
  '/opportunities': [0, 1, 5],
  '/tasks': [0, 1, 5],
  '/products': [0, 1, 4],
  '/products/specifications': [0, 1],
  '/price-lists': [0, 5],
  '/rfqs': [0, 1, 5],
  '/quotations': [0, 1, 5],
  '/samples': [0, 1, 2, 5],
  '/sales-orders': [0, 1, 5],
}
export function searchRoutes(
  query: string,
  marketId: string | null,
  locale: 'en' | 'vi',
) {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return []
  return r1Routes.flatMap((route) => {
    const columns = searchableColumns[route.href]
    if (!columns) return []
    const rows = routeRows(route.href, marketId, locale).filter((row) =>
      columns.some((i) => row[i]?.toLocaleLowerCase().includes(needle)),
    )
    return rows.length ? [{ ...route, rows }] : []
  })
}

export { customers, rfqs, quotes, orders, products, opportunities }
