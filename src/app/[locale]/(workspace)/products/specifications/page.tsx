import { currentPrincipal } from '@/modules/access-control/application/request-auth'
import { SpecificationWorkspace } from '@/modules/product-specifications/presentation/specification-workspace'

export default async function ModulePage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params
  const principal = await currentPrincipal()
  return (
    <SpecificationWorkspace
      locale={locale as 'en' | 'vi'}
      roles={principal.roles}
    />
  )
}
