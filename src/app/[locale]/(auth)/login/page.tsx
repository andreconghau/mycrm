import en from '@/constants/messages/en.json'
import vi from '@/constants/messages/vi.json'

export default async function LoginPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params
  const m = locale === 'vi' ? vi : en
  return (
    <section aria-describedby="prototype-notice" aria-labelledby="login-title">
      <div className="mb-7 flex items-center gap-3">
        <span className="bg-secondary text-secondary-foreground grid size-10 place-items-center rounded-xl font-semibold">
          S
        </span>
        <span className="font-semibold tracking-tight">{m.brand}</span>
      </div>
      <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
        {m.employeeWorkspace}
      </p>
      <h1
        className="mt-2 text-3xl font-semibold tracking-tight"
        id="login-title"
      >
        {m.login}
      </h1>
      <p className="text-muted-foreground mt-2 text-sm leading-6">
        {m.loginDescription}
      </p>

      <form className="mt-7 space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">
            {m.workEmail}
          </label>
          <input
            autoComplete="off"
            className="bg-muted/40 text-muted-foreground min-h-11 w-full rounded-md border px-3 text-sm"
            disabled
            id="email"
            placeholder="name@company.com"
            type="email"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">
            {m.password}
          </label>
          <input
            autoComplete="off"
            className="bg-muted/40 text-muted-foreground min-h-11 w-full rounded-md border px-3 text-sm"
            disabled
            id="password"
            placeholder="Enter your password"
            type="password"
          />
        </div>
        <button
          className="bg-primary text-primary-foreground min-h-11 w-full rounded-md px-4 text-sm font-semibold opacity-60"
          disabled
          type="button"
        >
          {m.login}
        </button>
      </form>
      <p
        className="bg-muted/40 text-muted-foreground mt-6 rounded-md border border-dashed p-3 text-xs leading-5"
        id="prototype-notice"
      >
        {m.loginNotice}
      </p>
    </section>
  )
}
