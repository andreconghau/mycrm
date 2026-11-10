import { currentPrincipal } from '@/modules/access-control/application/request-auth'
import { CustomerDetail } from '@/modules/customers/presentation/customer-detail'
import { notFound } from 'next/navigation'

export default async function CustomerDetailPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string; id: string }>
}>) {
  const { locale, id } = await params
  const principal = await currentPrincipal()
  const safeLocale = locale === 'en' ? 'en' : 'vi'
  const customerId = Number(id)
  if (!Number.isInteger(customerId) || customerId < 1) notFound()
  return (
    <CustomerDetail
      id={customerId}
      locale={safeLocale}
      roles={principal.roles}
    />
  )
}
