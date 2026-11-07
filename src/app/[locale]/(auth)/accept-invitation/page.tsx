import { Suspense } from 'react'
import { AcceptInvitationForm } from '@/modules/access-control/presentation/accept-invitation-form'

export default async function AcceptInvitationPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params
  return (
    <section>
      <h1 className="mb-6 text-2xl font-semibold">
        {locale === 'vi' ? 'Kích hoạt tài khoản' : 'Activate account'}
      </h1>
      <Suspense fallback={<p>{locale === 'vi' ? 'Đang tải…' : 'Loading…'}</p>}>
        <AcceptInvitationForm locale={locale as 'en' | 'vi'} />
      </Suspense>
    </section>
  )
}
