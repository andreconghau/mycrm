export default function LoginPage() {
  return (
    <section aria-describedby="prototype-notice" aria-labelledby="login-title">
      <div className="mb-7 flex items-center gap-3">
        <span className="bg-secondary text-secondary-foreground grid size-10 place-items-center rounded-xl font-semibold">
          S
        </span>
        <span className="font-semibold tracking-tight">Seafood Export CRM</span>
      </div>
      <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
        Employee workspace
      </p>
      <h1
        className="mt-2 text-3xl font-semibold tracking-tight"
        id="login-title"
      >
        Sign in
      </h1>
      <p className="text-muted-foreground mt-2 text-sm leading-6">
        Use your company account to access the CRM workspace.
      </p>

      <form className="mt-7 space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">
            Work email
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
            Password
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
          Sign in
        </button>
      </form>
      <p
        className="bg-muted/40 text-muted-foreground mt-6 rounded-md border border-dashed p-3 text-xs leading-5"
        id="prototype-notice"
      >
        Prototype only. Authentication is not connected; these disabled fields
        do not accept credentials.
      </p>
    </section>
  )
}
