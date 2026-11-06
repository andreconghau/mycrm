import { describe, expect, it } from 'vitest'
import { availableMarkets, resolveMarket } from './market-data'
import {
  routeRows,
  searchRoutes,
  customers,
  rfqs,
  quotes,
  orders,
} from '../routing/r1-route-data'
import contacts from '@/constants/dummy/contacts.json'
import opportunities from '@/constants/dummy/opportunities.json'
import samples from '@/constants/dummy/samples.json'
import tasks from '@/constants/dummy/tasks-activities.json'
import specs from '@/constants/dummy/product-specifications.json'
import prices from '@/constants/dummy/price-lists.json'
import notifications from '@/constants/dummy/notifications.json'
import eligibility from '@/constants/dummy/market-products.json'

describe('market fixture contract', () => {
  it('honors membership rather than role and rejects stale preferences', () => {
    expect(availableMarkets('usr-linh').map((m) => m.code)).toEqual([
      'KR',
      'JP',
      'US',
    ])
    expect(availableMarkets('usr-minh').map((m) => m.code)).toEqual(['KR'])
    expect(resolveMarket('usr-minh', 'market-us')).toBe('market-kr')
    expect(resolveMarket('unknown-user', 'market-us')).toBeNull()
  })
  it('isolates lists and search, including a country different from sales market', () => {
    expect(routeRows('/customers', 'market-us')[0][0]).toBe('Nordic Catch GmbH')
    expect(
      customers.find((c) => c.market_id === 'market-us')?.country_code,
    ).toBe('DE')
    expect(searchRoutes('Han River', 'market-kr', 'en').length).toBeGreaterThan(
      0,
    )
    expect(searchRoutes('Han River', 'market-jp', 'en')).toEqual([])
    expect(routeRows('/customers', null)).toEqual([])
    expect(routeRows('/rfqs', 'unknown-market')).toEqual([])
  })
  it('never searches contact details or financial fields', () => {
    expect(searchRoutes('jisoo.park@example.test', 'market-kr', 'en')).toEqual(
      [],
    )
    expect(searchRoutes('42800', 'market-kr', 'en')).toEqual([])
    expect(
      searchRoutes('quotation.version_submitted', 'market-kr', 'en'),
    ).toEqual([])
  })
  it('keeps parent relationships within the same market', () => {
    for (const record of [
      ...contacts,
      ...opportunities,
      ...rfqs,
      ...quotes,
      ...orders,
      ...samples,
    ]) {
      expect(
        customers.find((c) => c.id === record.customer_id)?.market_id,
      ).toBe(record.market_id)
    }
    for (const record of [...rfqs, ...samples]) {
      const contact = contacts.find((c) => c.id === record.contact_id)
      expect(contact?.market_id).toBe(record.market_id)
      expect(contact?.customer_id).toBe(record.customer_id)
    }
    for (const quote of quotes)
      expect(rfqs.find((r) => r.id === quote.rfq_id)?.market_id).toBe(
        quote.market_id,
      )
    for (const order of orders)
      expect(
        quotes.find((q) =>
          q.versions.some((v) => v.id === order.accepted_quote_version_id),
        )?.market_id,
      ).toBe(order.market_id)
    for (const sample of samples) {
      expect(
        opportunities.find((o) => o.id === sample.opportunity_id)?.market_id,
      ).toBe(sample.market_id)
      for (const item of sample.items)
        expect(specs.find((s) => s.id === item.spec_id)?.market_id).toBe(
          sample.market_id,
        )
    }
    for (const task of tasks)
      expect(
        [...rfqs, ...quotes, ...customers].find((r) => r.id === task.related_id)
          ?.market_id,
      ).toBe(task.market_id)
    for (const n of notifications)
      expect(
        [...quotes, ...tasks].find((r) => r.id === n.resource_id)?.market_id,
      ).toBe(n.market_id)
  })
  it('uses market-specific specifications and eligibility for price items', () => {
    for (const list of prices)
      for (const item of list.items) {
        const spec = specs.find((s) => s.id === item.specification_id)
        expect(spec?.market_id).toBe(list.market_id)
        expect(spec?.product_id).toBe(item.product_id)
        expect(
          eligibility.some(
            (e) =>
              e.market_id === list.market_id &&
              e.product_id === item.product_id &&
              e.eligible,
          ),
        ).toBe(true)
      }
  })
})
