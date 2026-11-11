import { currentPrincipal } from '@/modules/access-control/application/request-auth'
import { ProductWorkspace } from '@/modules/products/presentation/product-workspace'

export default async function ModulePage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params
  const principal = await currentPrincipal()
  return (
    <ProductWorkspace
      locale={locale as 'en' | 'vi'}
      roles={principal.roles}
    />
  )
}
