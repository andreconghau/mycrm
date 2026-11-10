import { SwaggerDocs } from '@/modules/api-docs/swagger-docs'

export default function ApiDocsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-[1440px] px-4 py-6 sm:px-7 sm:py-8">
      <section aria-labelledby="api-docs-title">
        <p className="text-primary text-xs font-semibold tracking-widest uppercase">
          OpenAPI 3.1
        </p>
        <h1 className="mt-2 text-3xl font-semibold" id="api-docs-title">
          API documentation
        </h1>
        <p className="text-muted-foreground mt-2 max-w-3xl text-sm">
          Only implemented endpoints are included. Swagger sends same-origin
          cookies and adds the CSRF token to mutation requests.
        </p>
        <div className="mt-6">
          <SwaggerDocs />
        </div>
      </section>
    </main>
  )
}
