import { currentPrincipal } from '@/modules/access-control/application/request-auth'
import { QuotationWorkspace } from '@/modules/quotations/presentation/quotation-workspace'

export default async function ModulePage({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  await currentPrincipal()
  const { locale } = await params
  return <QuotationWorkspace locale={locale === 'en' ? 'en' : 'vi'} />
}
