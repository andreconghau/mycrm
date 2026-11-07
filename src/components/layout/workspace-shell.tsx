'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { MarketProvider, useMarket } from '@/modules/markets/market-context'
import { profile } from '@/modules/markets/market-data'
import { r1Routes, searchRoutes } from '@/modules/routing/r1-route-data'
import enMessages from '@/constants/messages/en.json'
import viMessages from '@/constants/messages/vi.json'
import notifications from '@/constants/dummy/notifications.json'
import { LogoutButton } from '@/modules/access-control/presentation/logout-button'

type Locale = 'en' | 'vi'
type Messages = typeof import('@/constants/messages/en.json')
const dict: Record<Locale, Messages> = {
  en: enMessages,
  vi: viMessages,
}

const navNames: Record<string, [string, string]> = {
  '/customers': ['Customers', 'Khách hàng'],
  '/contacts': ['Contacts', 'Liên hệ'],
  '/leads': ['Leads', 'Khách hàng tiềm năng'],
  '/opportunities': ['Opportunities', 'Cơ hội'],
  '/tasks': ['Tasks & activities', 'Công việc & hoạt động'],
  '/products': ['Products', 'Sản phẩm'],
  '/products/specifications': ['Product specifications', 'Thông số sản phẩm'],
  '/price-lists': ['Price lists', 'Bảng giá'],
  '/rfqs': ['RFQs', 'Yêu cầu báo giá'],
  '/quotations': ['Quotations', 'Báo giá'],
  '/samples': ['Samples', 'Hàng mẫu'],
  '/sales-orders': ['Sales orders', 'Đơn bán hàng'],
  '/admin/users': ['Access control', 'Phân quyền'],
  '/audit-log': ['Audit log', 'Nhật ký kiểm toán'],
}

export function WorkspaceShell(
  props: Readonly<{
    children: React.ReactNode
    locale: Locale
    displayName: string
  }>,
) {
  return (
    <MarketProvider>
      <WorkspaceContent {...props} />
    </MarketProvider>
  )
}

function WorkspaceContent({
  children,
  locale,
  displayName: authenticatedDisplayName,
}: Readonly<{
  children: React.ReactNode
  locale: Locale
  displayName: string
}>) {
  const { marketId, markets, selectMarket } = useMarket()
  const m = dict[locale]
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [panel, setPanel] = useState<'notifications' | 'help' | null>(null)
  const [displayName, setDisplayName] = useState(authenticatedDisplayName)
  const [avatarInitials, setAvatarInitials] = useState(profile.avatar_initials)
  const [query, setQuery] = useState('')
  const [saved, setSaved] = useState(false)
  useEffect(
    () => setCollapsed(localStorage.getItem('r1-sidebar-collapsed') === 'true'),
    [],
  )
  const segments = pathname.split('/').filter(Boolean).slice(1)
  const localePrefix = `/${locale}`
  const searchResults = useMemo(
    () => searchRoutes(query, marketId, locale).slice(0, 5),
    [query, marketId, locale],
  )
  const changeLocale = (next: Locale) =>
    router.push(`/${next}/${segments.join('/')}${window.location.search}`)
  const nav = (mobile = false) => (
    <>
      <Link
        className="flex items-center gap-3 px-2 py-2 font-semibold tracking-tight"
        href={`${localePrefix}/dashboard`}
      >
        <span className="bg-secondary text-secondary-foreground grid size-9 shrink-0 place-items-center rounded-xl text-sm">
          S
        </span>
        {!collapsed && <span>{m.brand}</span>}
      </Link>
      {!collapsed && (
        <p className="bg-muted text-muted-foreground mx-2 mt-3 mb-4 rounded-lg border px-3 py-2 text-xs">
          {m.workspace}
          <span className="text-foreground block font-medium">
            R1 · Core CRM
          </span>
        </p>
      )}
      <nav aria-label={`${m.workspace} navigation`} className="space-y-4">
        <div>
          <p className="text-muted-foreground px-2 pb-1 text-[10px] font-semibold tracking-widest uppercase">
            {m.overview}
          </p>
          <NavLink href={`${localePrefix}/dashboard`} title={m.dashboard}>
            {collapsed ? '◫' : m.dashboard}
          </NavLink>
        </div>
        <div>
          <p className="text-muted-foreground px-2 pb-1 text-[10px] font-semibold tracking-widest uppercase">
            {m.sales}
          </p>
          {r1Routes.slice(0, 5).map((r) => (
            <NavLink
              href={`${localePrefix}${r.href}`}
              key={r.href}
              title={navNames[r.href]?.[locale === 'vi' ? 1 : 0] ?? r.label}
            >
              {collapsed
                ? r.code.slice(1)
                : (navNames[r.href]?.[locale === 'vi' ? 1 : 0] ?? r.label)}
            </NavLink>
          ))}
        </div>
        <div>
          <p className="text-muted-foreground px-2 pb-1 text-[10px] font-semibold tracking-widest uppercase">
            {m.productTrade}
          </p>
          {r1Routes.slice(5, 12).map((r) => (
            <NavLink
              href={`${localePrefix}${r.href}`}
              key={r.href}
              title={navNames[r.href]?.[locale === 'vi' ? 1 : 0] ?? r.label}
            >
              {collapsed
                ? r.code.slice(1)
                : (navNames[r.href]?.[locale === 'vi' ? 1 : 0] ?? r.label)}
            </NavLink>
          ))}
        </div>
        <div>
          <p className="text-muted-foreground px-2 pb-1 text-[10px] font-semibold tracking-widest uppercase">
            {m.administration}
          </p>
          {r1Routes.slice(12).map((r) => (
            <NavLink
              href={`${localePrefix}${r.href}`}
              key={r.href}
              title={navNames[r.href]?.[locale === 'vi' ? 1 : 0] ?? r.label}
            >
              {collapsed
                ? r.code.slice(1)
                : (navNames[r.href]?.[locale === 'vi' ? 1 : 0] ?? r.label)}
            </NavLink>
          ))}
        </div>
      </nav>
      {mobile && (
        <button
          className="mt-4 rounded-md border px-3 py-2 text-sm"
          onClick={() => setMobileOpen(false)}
        >
          {m.cancel}
        </button>
      )}
    </>
  )
  return (
    <div
      className={`bg-muted text-foreground min-h-screen lg:grid ${collapsed ? 'lg:grid-cols-[76px_minmax(0,1fr)]' : 'lg:grid-cols-[236px_minmax(0,1fr)]'}`}
    >
      <aside
        className={`bg-card hidden p-4 lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto lg:border-r ${collapsed ? 'lg:px-2' : ''}`}
      >
        {nav()}
        <button
          aria-label={collapsed ? m.expand : m.collapse}
          className="text-muted-foreground mt-5 w-full rounded-md border py-2 text-sm"
          onClick={() => {
            const value = !collapsed
            setCollapsed(value)
            localStorage.setItem('r1-sidebar-collapsed', String(value))
          }}
        >
          {collapsed ? '»' : `« ${m.collapse}`}
        </button>
        <p className="text-muted-foreground mt-3 border-t px-2 pt-3 text-[11px] leading-5">
          {collapsed ? 'R1' : m.prototype}
        </p>
      </aside>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="bg-card h-full w-[min(300px,85vw)] overflow-y-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {nav(true)}
          </aside>
        </div>
      )}
      <div className="min-w-0">
        <header className="bg-card/95 sticky top-0 z-30 flex min-h-14 flex-wrap items-center gap-3 border-b px-3 py-2 backdrop-blur sm:px-7">
          <button
            aria-label={m.openMenu}
            className="rounded-md border px-3 py-2 text-sm lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            ☰
          </button>
          <LogoutButton locale={locale} />
          <span className="bg-muted hidden rounded-full px-3 py-1 text-xs sm:inline">
            {m.workspace}
          </span>
          <label className="flex items-center gap-2 text-xs">
            <span>{locale === 'vi' ? 'Thị trường' : 'Market'}</span>
            <select
              aria-label={locale === 'vi' ? 'Thị trường' : 'Market'}
              className="bg-muted min-h-9 max-w-40 rounded-md border px-2 text-sm"
              value={marketId ?? ''}
              disabled={!markets.length}
              onChange={(e) => {
                selectMarket(e.target.value)
                setQuery('')
                setPanel(null)
              }}
            >
              {!markets.length && (
                <option value="">
                  {locale === 'vi' ? 'Chưa được cấp quyền' : 'No market access'}
                </option>
              )}
              {markets.map((market) => (
                <option value={market.id} key={market.id}>
                  {locale === 'vi' ? market.name_vi : market.name_en}
                </option>
              ))}
            </select>
          </label>
          <div className="relative min-w-36 flex-1 sm:max-w-md">
            <input
              type="search"
              aria-label={m.search}
              className="bg-muted min-h-9 w-full rounded-md border px-3 text-sm"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim())
                  router.push(
                    `${localePrefix}/search?q=${encodeURIComponent(query.trim())}`,
                  )
              }}
              placeholder={m.searchPlaceholder}
              value={query}
            />
            {searchResults.length > 0 && (
              <div className="bg-card absolute top-10 z-40 w-full rounded-md border shadow-lg">
                {searchResults.map((r) => (
                  <Link
                    className="hover:bg-muted block px-3 py-2 text-sm"
                    href={`${localePrefix}${r.href}`}
                    key={r.href}
                    onClick={() => setQuery('')}
                  >
                    {navNames[r.href]?.[locale === 'vi' ? 1 : 0] ?? r.label}
                    <span className="text-muted-foreground block truncate text-xs">
                      {r.rows[0]?.[0]}
                    </span>
                  </Link>
                ))}
                <Link
                  className="block border-t px-3 py-2 text-xs"
                  href={`${localePrefix}/search?q=${encodeURIComponent(query)}`}
                >
                  {m.openSearch}
                </Link>
              </div>
            )}
          </div>
          <span className="text-muted-foreground hidden rounded-full border border-dashed px-3 py-1 text-[11px] font-medium sm:inline">
            {m.illustrative}
          </span>
          <button
            aria-label={m.notifications}
            className="rounded-md border px-3 py-2 text-sm"
            onClick={() =>
              setPanel(panel === 'notifications' ? null : 'notifications')
            }
            title={m.notifications}
          >
            ♢
          </button>
          <button
            className="rounded-md border px-3 py-2 text-sm"
            onClick={() => setPanel(panel === 'help' ? null : 'help')}
          >
            {m.help}
          </button>
          <button
            className="rounded-md border px-3 py-2 text-sm"
            onClick={() => changeLocale(locale === 'en' ? 'vi' : 'en')}
          >
            {locale === 'en' ? 'VI' : 'EN'}
          </button>
          <button
            aria-label={m.profile}
            className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
            onClick={() => {
              setSaved(false)
              setProfileOpen(true)
            }}
          >
            <span className="bg-secondary grid size-7 place-items-center rounded-full">
              {avatarInitials}
            </span>
            <span className="hidden sm:inline">{displayName}</span>
          </button>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-7 sm:py-8">
          <nav
            aria-label={m.breadcrumbs}
            className="text-muted-foreground mb-5 flex items-center gap-2 text-xs"
          >
            <Link
              className="hover:text-foreground"
              href={`${localePrefix}/dashboard`}
            >
              {m.dashboard}
            </Link>
            {segments
              .filter((segment) => segment !== 'dashboard')
              .map((segment) => {
                const href = `/${segments.slice(0, segments.indexOf(segment) + 1).join('/')}`
                const name =
                  segment === 'products'
                    ? locale === 'vi'
                      ? 'Sản phẩm'
                      : 'Products'
                    : (navNames[href]?.[locale === 'vi' ? 1 : 0] ??
                      segment.replaceAll('-', ' '))
                return (
                  <span className="contents" key={href}>
                    <span aria-hidden="true">/</span>
                    <span className="text-foreground capitalize">{name}</span>
                  </span>
                )
              })}
          </nav>
          {marketId ? (
            children
          ) : (
            <p role="status">
              {locale === 'vi'
                ? 'Liên hệ quản trị viên để được cấp thị trường.'
                : 'Contact your access administrator for a market assignment.'}
            </p>
          )}
        </main>
      </div>
      {panel && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setPanel(null)}
        >
          <section
            aria-label={panel === 'help' ? m.help : m.notifications}
            className="bg-card absolute top-16 right-4 w-[min(380px,calc(100vw-2rem))] rounded-lg border p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                {panel === 'help' ? m.help : m.notifications}
              </h2>
              <button aria-label={m.cancel} onClick={() => setPanel(null)}>
                ×
              </button>
            </div>
            {panel === 'help' ? (
              <p className="text-muted-foreground mt-3 text-sm">
                {locale === 'vi'
                  ? 'Bản mẫu R1 minh họa các quy trình CRM. Hành động và kết nối dữ liệu chưa được bật.'
                  : 'The R1 prototype illustrates CRM workflows. Actions and data connections are not enabled.'}
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {!notifications.some(
                  (n) =>
                    n.market_id === marketId &&
                    n.recipient_user_id === profile.id,
                ) && (
                  <li>
                    {locale === 'vi'
                      ? 'Không có thông báo.'
                      : 'No notifications.'}
                  </li>
                )}
                {notifications
                  .filter(
                    (n) =>
                      n.market_id === marketId &&
                      n.recipient_user_id === profile.id,
                  )
                  .map((n) => (
                    <li className="bg-muted rounded-md p-3 text-sm" key={n.id}>
                      {locale === 'vi'
                        ? n.type === 'task_due'
                          ? 'Đến hạn công việc'
                          : 'Báo giá cần duyệt'
                        : n.title}
                      <time className="text-muted-foreground mt-1 block text-xs">
                        {n.created_at}
                      </time>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>
      )}
      {profileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setProfileOpen(false)}
        >
          <section
            aria-labelledby="profile-title"
            aria-modal="true"
            className="bg-card absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold" id="profile-title">
                {m.editProfile}
              </h2>
              <button
                aria-label={m.cancel}
                onClick={() => setProfileOpen(false)}
              >
                ×
              </button>
            </div>
            <label className="mt-6 block text-sm">
              {m.displayName}
              <input
                className="mt-1 min-h-10 w-full rounded-md border px-3"
                onChange={(e) => setDisplayName(e.target.value)}
                value={displayName}
              />
            </label>
            <label className="mt-4 block text-sm">
              {locale === 'vi'
                ? 'Chữ viết tắt ảnh đại diện'
                : 'Avatar initials'}
              <input
                className="mt-1 min-h-10 w-full rounded-md border px-3"
                maxLength={3}
                onChange={(e) =>
                  setAvatarInitials(e.target.value.toUpperCase())
                }
                value={avatarInitials}
              />
            </label>
            <label className="mt-4 block text-sm">
              {m.language}
              <select
                className="mt-1 min-h-10 w-full rounded-md border px-3"
                onChange={(e) => changeLocale(e.target.value as Locale)}
                value={locale}
              >
                <option value="en">English</option>
                <option value="vi">Tiếng Việt</option>
              </select>
            </label>
            <div className="bg-muted mt-5 space-y-3 rounded-md p-4 text-sm">
              <p>
                <span className="text-muted-foreground">{m.email}: </span>
                {profile.email}
              </p>
              <p>
                <span className="text-muted-foreground">{m.role}: </span>
                {profile.role}
              </p>
              <p>
                <span className="text-muted-foreground">{m.team}: </span>
                {profile.team}
              </p>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm"
                onClick={() => {
                  setSaved(true)
                  setProfileOpen(false)
                }}
              >
                {m.save}
              </button>
              <button
                className="rounded-md border px-4 py-2 text-sm"
                onClick={() => setProfileOpen(false)}
              >
                {m.cancel}
              </button>
            </div>
            {saved && <p className="mt-3 text-sm">✓</p>}
          </section>
        </div>
      )}
    </div>
  )
}

function NavLink({
  children,
  href,
  title,
}: Readonly<{ children: React.ReactNode; href: string; title?: string }>) {
  return (
    <Link
      className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-ring block rounded-md px-2 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      href={href}
      title={title}
    >
      {children}
    </Link>
  )
}
