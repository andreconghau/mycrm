import Link from 'next/link'
import { r1Routes } from '@/modules/routing/r1-route-data'

export function WorkspaceShell({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="bg-muted text-foreground min-h-screen lg:grid lg:grid-cols-[236px_minmax(0,1fr)]">
      <aside className="bg-card border-b p-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-r lg:border-b-0">
        <Link
          className="flex items-center gap-3 px-2 py-2 font-semibold tracking-tight"
          href="/dashboard"
        >
          <span className="bg-secondary text-secondary-foreground grid size-9 place-items-center rounded-xl text-sm">
            S
          </span>
          <span>Seafood Export CRM</span>
        </Link>
        <p className="bg-muted text-muted-foreground mx-2 mt-3 mb-4 rounded-lg border px-3 py-2 text-xs">
          Prototype workspace{' '}
          <span className="text-foreground block font-medium">
            R1 · Core CRM
          </span>
        </p>
        <nav aria-label="R1 workspace navigation" className="space-y-4">
          <div>
            <p className="text-muted-foreground px-2 pb-1 text-[10px] font-semibold tracking-widest uppercase">
              Overview
            </p>
            <NavLink href="/dashboard">Dashboard &amp; reports</NavLink>
          </div>
          <div>
            <p className="text-muted-foreground px-2 pb-1 text-[10px] font-semibold tracking-widest uppercase">
              Sales
            </p>
            {r1Routes.slice(0, 5).map((route) => (
              <NavLink href={route.href} key={route.href}>
                {route.label}
              </NavLink>
            ))}
          </div>
          <div>
            <p className="text-muted-foreground px-2 pb-1 text-[10px] font-semibold tracking-widest uppercase">
              Product &amp; trade
            </p>
            {r1Routes.slice(5, 12).map((route) => (
              <NavLink href={route.href} key={route.href}>
                {route.label}
              </NavLink>
            ))}
          </div>
          <div>
            <p className="text-muted-foreground px-2 pb-1 text-[10px] font-semibold tracking-widest uppercase">
              Administration
            </p>
            {r1Routes.slice(12).map((route) => (
              <NavLink href={route.href} key={route.href}>
                {route.label}
              </NavLink>
            ))}
          </div>
        </nav>
        <p className="text-muted-foreground mt-5 border-t px-2 pt-3 text-[11px] leading-5">
          Static prototype · no sign-in or access checks
        </p>
      </aside>
      <div className="min-w-0">
        <header className="bg-card/95 sticky top-0 z-10 flex min-h-14 items-center justify-between border-b px-4 backdrop-blur sm:px-7">
          <p className="text-muted-foreground text-sm">R1 workspace</p>
          <span className="text-muted-foreground rounded-full border border-dashed px-3 py-1 text-[11px] font-medium">
            Illustrative data
          </span>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-7 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function NavLink({
  children,
  href,
}: Readonly<{ children: React.ReactNode; href: string }>) {
  return (
    <Link
      className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-ring block rounded-md px-2 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      href={href}
    >
      {children}
    </Link>
  )
}
