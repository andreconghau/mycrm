'use client'

import { useMarket } from '../markets/market-context'
import { notFound } from 'next/navigation'
import { R1ListScreen } from './r1-list-screen'
import { getR1Route, searchRoutes } from './r1-route-data'

export function R1RoutePage({
  href,
  query,
  locale = 'vi',
}: Readonly<{ href: string; query?: string; locale?: 'vi' | 'en' }>) {
  const { marketId } = useMarket()
  const results = searchRoutes(query ?? '', marketId, locale)
  if (href === '/search') {
    return (
      <section className="space-y-4">
        <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
          M30 · R1 planned
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {locale === 'vi' ? 'Kết quả tìm kiếm' : 'Search results'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {locale === 'vi'
            ? `Kết quả minh họa cho “${query}”. Tìm kiếm không bao gồm thông tin liên hệ hoặc dữ liệu tài chính.`
            : `Illustrative matches for “${query}”. Search excludes contact information and financial data.`}
        </p>
        {results.map((item) => (
          <a
            className="bg-card hover:bg-muted block rounded-lg border p-4"
            href={`/${locale}${item.href}`}
            key={item.href}
          >
            <strong>{item.label}</strong>
            <p className="text-muted-foreground mt-1 text-sm">{item.summary}</p>
          </a>
        ))}
        {results.length === 0 && (
          <p className="text-muted-foreground bg-card rounded-lg border p-6">
            {locale === 'vi'
              ? 'Không tìm thấy bản ghi phù hợp.'
              : 'No matching records.'}
          </p>
        )}
      </section>
    )
  }
  const route = getR1Route(href)
  if (!route) notFound()
  return <R1ListScreen route={route} locale={locale} />
}
