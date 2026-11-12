import Link from 'next/link'

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <main className="bg-muted grid min-h-screen place-items-center px-6 py-12">
      <div className="bg-card text-card-foreground w-full max-w-md rounded-xl border p-8 shadow-sm">
        <div className="mb-3 flex justify-end gap-2 text-xs">
          <Link href="/en/login">EN</Link>
          <Link href="/vi/login">VI</Link>
        </div>
        {children}
      </div>
    </main>
  )
}
