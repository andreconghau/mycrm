import { requirePermission } from '@/modules/access-control/application/request-auth'
import { SwaggerDocs } from '@/modules/api-docs/swagger-docs'

export default async function ApiDocsPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params
  const authorized = await requirePermission('access.grants', 'read').catch(
    () => null,
  )

  if (!authorized) {
    return (
      <section aria-labelledby="api-docs-denied-title">
        <h1 className="text-2xl font-semibold" id="api-docs-denied-title">
          {locale === 'vi' ? 'Không có quyền truy cập' : 'Access denied'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {locale === 'vi'
            ? 'Tài khoản này không có quyền xem tài liệu API.'
            : 'This account cannot view API documentation.'}
        </p>
      </section>
    )
  }

  return (
    <section aria-labelledby="api-docs-title">
      <p className="text-primary text-xs font-semibold tracking-widest uppercase">
        OpenAPI 3.1
      </p>
      <h1 className="mt-2 text-3xl font-semibold" id="api-docs-title">
        {locale === 'vi' ? 'Tài liệu API' : 'API documentation'}
      </h1>
      <p className="text-muted-foreground mt-2 max-w-3xl text-sm">
        {locale === 'vi'
          ? 'Chỉ bao gồm các endpoint đã triển khai. Swagger gửi cookie cùng nguồn và tự thêm CSRF token cho request thay đổi dữ liệu.'
          : 'Only implemented endpoints are included. Swagger sends same-origin cookies and adds the CSRF token to mutation requests.'}
      </p>
      <div className="mt-6">
        <SwaggerDocs />
      </div>
    </section>
  )
}
