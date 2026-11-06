import { R1RoutePage } from '@/modules/routing/r1-route-page'

export default async function SearchPage({
  searchParams,
  params,
}: Readonly<{
  searchParams: Promise<{ q?: string }>
  params: Promise<{ locale: string }>
}>) {
  const { q } = await searchParams
  const { locale } = await params
  return (
    <R1RoutePage
      href="/search"
      query={q ?? ''}
      locale={locale as 'en' | 'vi'}
    />
  )
}
