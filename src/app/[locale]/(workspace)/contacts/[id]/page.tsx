import { currentPrincipal } from '@/modules/access-control/application/request-auth'
import { ContactDetail } from '@/modules/contacts/presentation/contact-detail'
import { notFound } from 'next/navigation'

export default async function ContactDetailPage({
  params,
}: Readonly<{ params: Promise<{ locale: string; id: string }> }>) {
  const { locale, id } = await params
  const principal = await currentPrincipal()
  const contactId = Number(id)
  if (!Number.isInteger(contactId) || contactId < 1) notFound()
  return (
    <ContactDetail
      id={contactId}
      locale={locale === 'en' ? 'en' : 'vi'}
      roles={principal.roles}
    />
  )
}
