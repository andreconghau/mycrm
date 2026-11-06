import { R1RoutePage } from '@/modules/routing/r1-route-page'

export default async function ModulePage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params
  return <R1RoutePage href="/customers" locale={locale as 'en' | 'vi'} />
}
