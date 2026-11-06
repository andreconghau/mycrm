'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 px-6">
          <h1 className="text-2xl font-semibold">Application error</h1>
          <p>The workspace could not be loaded. Try again.</p>
          <button onClick={() => reset()} type="button">
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
