import { currentPrincipal } from '@/modules/access-control/application/request-auth'
import { ContactWorkspace } from '@/modules/contacts/presentation/contact-workspace'

export default async function ModulePage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params
  const principal = await currentPrincipal()
  return (
    <ContactWorkspace
      locale={locale === 'en' ? 'en' : 'vi'}
      roles={principal.roles}
    />
  )
}
