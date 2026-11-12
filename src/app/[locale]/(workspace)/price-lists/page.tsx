import { currentPrincipal } from '@/modules/access-control/application/request-auth'
import { PriceListWorkspace } from '@/modules/price-lists/presentation/price-list-workspace'

export default async function ModulePage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params
  const principal = await currentPrincipal()
  return <PriceListWorkspace locale={locale as 'en' | 'vi'} roles={principal.roles} />
}
