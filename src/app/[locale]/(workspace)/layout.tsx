import { WorkspaceShell } from '@/components/layout/workspace-shell'
import { currentPrincipal } from '@/modules/access-control/application/request-auth'
import { redirect } from 'next/navigation'

export default async function WorkspaceLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params
  const principal = await currentPrincipal().catch(() => null)
  if (!principal) redirect(`/${locale}/login`)
  return (
    <WorkspaceShell
      displayName={principal.displayName}
      locale={locale as 'en' | 'vi'}
    >
      {children}
    </WorkspaceShell>
  )
}
