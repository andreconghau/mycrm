import { WorkspaceShell } from '@/components/layout/workspace-shell'

export default async function WorkspaceLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params
  return (
    <WorkspaceShell locale={locale as 'en' | 'vi'}>{children}</WorkspaceShell>
  )
}
