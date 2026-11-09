import { currentPrincipal } from '@/modules/access-control/application/request-auth'
import { auditQuerySchema } from '@/modules/access-control/application/audit-contracts'
import { AuditRepository } from '@/modules/access-control/infrastructure/audit-repository'
import { notFound } from 'next/navigation'

type SearchParams = Record<string, string | string[] | undefined>

export default async function AuditLogPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>
  searchParams: Promise<SearchParams>
}>) {
  const [{ locale }, raw] = await Promise.all([params, searchParams])
  const principal = await currentPrincipal()
  if (!principal.roles.includes('admin')) notFound()

  const queryObject = Object.fromEntries(
    Object.entries(raw).flatMap(([key, value]) =>
      typeof value === 'string' ? [[key, value]] : [],
    ),
  )
  const parsed = auditQuerySchema.safeParse(queryObject)
  const query = parsed.success ? parsed.data : auditQuerySchema.parse({})
  const result = await new AuditRepository().list(query)
  const vi = locale === 'vi'
  const base = `/${locale}/audit-log`
  const nextUrl = new URLSearchParams(queryObject)
  if (result.nextCursor) nextUrl.set('cursor', result.nextCursor)
  else nextUrl.delete('cursor')
  const nextHref = `${base}?${nextUrl.toString()}`

  return (
    <main className="space-y-6 p-6">
      <header>
        <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
          M31 · R1
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {vi ? 'Nhật ký kiểm toán' : 'Audit log'}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {vi
            ? 'Lịch sử chỉ đọc, giới hạn cho quản trị viên.'
            : 'Read-only history restricted to administrators.'}
        </p>
      </header>

      <form
        action={base}
        className="bg-card grid gap-3 rounded-xl border p-4 sm:grid-cols-3"
        method="get"
      >
        <label className="grid gap-1 text-sm">
          {vi ? 'Mã người thực hiện' : 'Actor ID'}
          <input
            className="bg-background rounded-md border px-3 py-2"
            min="1"
            name="actorId"
            type="number"
            defaultValue={query.actorId}
          />
        </label>
        <label className="grid gap-1 text-sm">
          {vi ? 'Loại tài nguyên' : 'Resource type'}
          <input
            className="bg-background rounded-md border px-3 py-2"
            name="resourceType"
            defaultValue={query.resourceType}
          />
        </label>
        <label className="grid gap-1 text-sm">
          {vi ? 'Mã tài nguyên' : 'Resource ID'}
          <input
            className="bg-background rounded-md border px-3 py-2"
            min="1"
            name="resourceId"
            type="number"
            defaultValue={query.resourceId}
          />
        </label>
        <label className="grid gap-1 text-sm">
          {vi ? 'Hành động' : 'Action'}
          <input
            className="bg-background rounded-md border px-3 py-2"
            name="action"
            defaultValue={query.action}
          />
        </label>
        <label className="grid gap-1 text-sm">
          {vi ? 'Từ thời điểm (UTC)' : 'From (UTC)'}
          <input
            className="bg-background rounded-md border px-3 py-2"
            name="from"
            placeholder="2026-11-07T09:00:00Z"
            type="text"
          />
        </label>
        <label className="grid gap-1 text-sm">
          {vi ? 'Đến thời điểm (UTC)' : 'To (UTC)'}
          <input
            className="bg-background rounded-md border px-3 py-2"
            name="to"
            placeholder="2026-11-07T18:00:00Z"
            type="text"
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
            type="submit"
          >
            {vi ? 'Lọc' : 'Filter'}
          </button>
          <a className="rounded-md border px-4 py-2 text-sm" href={base}>
            {vi ? 'Xóa lọc' : 'Clear'}
          </a>
        </div>
      </form>

      {!parsed.success && (
        <p className="text-destructive text-sm" role="alert">
          {vi
            ? 'Bộ lọc không hợp lệ; đang hiển thị nhật ký mới nhất.'
            : 'Invalid filters; showing the latest events.'}
        </p>
      )}

      <section
        aria-label={vi ? 'Sự kiện kiểm toán' : 'Audit events'}
        className="overflow-x-auto rounded-xl border"
      >
        {result.items.length === 0 ? (
          <p className="text-muted-foreground p-6 text-sm">
            {vi ? 'Không có sự kiện phù hợp.' : 'No matching audit events.'}
          </p>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                {[
                  vi ? 'Thời điểm (UTC)' : 'Time (UTC)',
                  vi ? 'Người thực hiện' : 'Actor',
                  vi ? 'Hành động' : 'Action',
                  vi ? 'Tài nguyên' : 'Resource',
                  vi ? 'Kết quả' : 'Result',
                  vi ? 'Lý do' : 'Reason',
                  'Request ID',
                  vi ? 'Thay đổi an toàn' : 'Safe diff',
                ].map((label) => (
                  <th className="px-3 py-3 font-medium" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.items.map((event) => (
                <tr className="border-t align-top" key={event.id}>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {event.occurredAt.toISOString()}
                  </td>
                  <td className="px-3 py-3">{event.actorId ?? '—'}</td>
                  <td className="px-3 py-3 font-medium">{event.action}</td>
                  <td className="px-3 py-3">
                    {event.resourceType} · {event.resourceId ?? '—'}
                    {event.resourceVersion
                      ? ` · v${event.resourceVersion}`
                      : ''}
                  </td>
                  <td className="px-3 py-3">{event.result}</td>
                  <td className="max-w-64 px-3 py-3 break-words">
                    {event.reason ?? '—'}
                  </td>
                  <td className="max-w-48 px-3 py-3 font-mono text-xs break-all">
                    {event.requestId}
                  </td>
                  <td className="max-w-64 px-3 py-3 font-mono text-xs break-words">
                    {Object.keys(event.safeDiff).length
                      ? JSON.stringify(event.safeDiff)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {result.nextCursor && (
        <a
          className="inline-flex rounded-md border px-4 py-2 text-sm"
          href={nextHref}
        >
          {vi ? 'Sự kiện cũ hơn' : 'Older events'}
        </a>
      )}
    </main>
  )
}
