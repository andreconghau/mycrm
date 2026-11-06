import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 px-6">
      <p className="text-muted-foreground text-sm font-medium">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">
        The page you requested does not exist in this workspace.
      </p>
      <Link
        className="text-primary w-fit underline underline-offset-4"
        href="/login"
      >
        Return to sign in
      </Link>
    </main>
  )
}
