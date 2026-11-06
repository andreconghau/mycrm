import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Seafood Export CRM',
  description: 'Internal seafood export CRM workspace',
}

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'vi' }]
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params
  if (locale !== 'en' && locale !== 'vi') notFound()
  return (
    <html lang={locale}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
