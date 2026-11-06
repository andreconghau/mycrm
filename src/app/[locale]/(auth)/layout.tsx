export default async function AuthLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params
  return (
    <main className="bg-muted grid min-h-screen place-items-center px-6 py-12">
      <div className="bg-card text-card-foreground w-full max-w-md rounded-xl border p-8 shadow-sm">
        <div className="mb-3 flex justify-end gap-2 text-xs">
          <a href="/en/login">EN</a>
          <a href="/vi/login">VI</a>
        </div>
        {children}
      </div>
    </main>
  )
}
