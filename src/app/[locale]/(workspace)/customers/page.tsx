import { currentPrincipal } from '@/modules/access-control/application/request-auth'
import { CustomerWorkspace } from '@/modules/customers/presentation/customer-workspace'

export default async function ModulePage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params
  const principal = await currentPrincipal()
  return (
    <CustomerWorkspace
      locale={locale as 'en' | 'vi'}
      roles={principal.roles}
    />
  )
}
