import { MarketDashboard } from '@/modules/markets/market-dashboard'

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ view?: string }>
}) {
  const { locale } = await params
  const { view } = await searchParams
  return <MarketDashboard locale={locale as 'en' | 'vi'} view={view} />
}
