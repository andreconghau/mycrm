import { requirePermission } from '@/modules/access-control/application/request-auth'
import { AccessRepository } from '@/modules/access-control/infrastructure/access-repository'

export default async function AccessControlPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params
  const authorized = await requirePermission('access.users', 'list').catch(
    () => null,
  )
  if (!authorized) {
    return (
      <section aria-labelledby="access-denied-title">
        <h1 className="text-2xl font-semibold" id="access-denied-title">
          {locale === 'vi' ? 'Không có quyền truy cập' : 'Access denied'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {locale === 'vi'
            ? 'Tài khoản này không có quyền xem quản trị người dùng.'
            : 'This account cannot view access administration.'}
        </p>
      </section>
    )
  }

  const rows = await new AccessRepository().listUsers()
  return (
    <section aria-labelledby="access-control-title">
      <p className="text-primary text-xs font-semibold tracking-widest uppercase">
        R1 · M29
      </p>
      <h1 className="mt-2 text-3xl font-semibold" id="access-control-title">
        {locale === 'vi' ? 'Quản lý truy cập' : 'Access control'}
      </h1>
      <p className="text-muted-foreground mt-2 max-w-3xl text-sm">
        {locale === 'vi'
          ? 'Danh sách tài khoản nhân viên. Grant nghiệp vụ vẫn bị từ chối mặc định.'
          : 'Employee accounts. Business grants remain default-deny.'}
      </p>
      <div className="bg-card mt-6 overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">{locale === 'vi' ? 'Tên' : 'Name'}</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">
                {locale === 'vi' ? 'Trạng thái' : 'Status'}
              </th>
              <th className="px-4 py-3">Version</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t" key={row.id}>
                <td className="px-4 py-3">{row.id}</td>
                <td className="px-4 py-3 font-medium">{row.displayName}</td>
                <td className="px-4 py-3">{row.email}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3">{row.version}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td
                  className="text-muted-foreground px-4 py-8 text-center"
                  colSpan={5}
                >
                  {locale === 'vi' ? 'Chưa có tài khoản.' : 'No accounts yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
