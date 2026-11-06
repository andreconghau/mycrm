import Link from 'next/link'

export function WorkspaceShell({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="bg-card border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link className="font-semibold tracking-tight" href="/dashboard">
            Seafood Export CRM
          </Link>
          <nav aria-label="Workspace navigation">
            <Link
              aria-current="page"
              className="text-primary rounded-md px-3 py-2 text-sm font-medium"
              href="/dashboard"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-6 py-8">{children}</main>
    </div>
  )
}
