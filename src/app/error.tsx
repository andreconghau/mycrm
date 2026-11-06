'use client'

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">
        The page could not be displayed. Try again.
      </p>
      <button
        className="bg-primary text-primary-foreground w-fit rounded-md px-4 py-2"
        onClick={() => reset()}
        type="button"
      >
        Try again
      </button>
    </main>
  )
}
