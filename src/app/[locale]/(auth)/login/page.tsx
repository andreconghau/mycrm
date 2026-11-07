import en from '@/constants/messages/en.json'
import vi from '@/constants/messages/vi.json'
import { LoginForm } from '@/modules/access-control/presentation/login-form'

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

      <LoginForm locale={locale as 'en' | 'vi'} />
    </section>
  )
}
