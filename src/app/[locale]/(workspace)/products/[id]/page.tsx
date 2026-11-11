import { currentPrincipal } from '@/modules/access-control/application/request-auth'
import { ProductDetail } from '@/modules/products/presentation/product-detail'
import { notFound } from 'next/navigation'

export default async function ProductDetailPage({
  params,
}: Readonly<{ params: Promise<{ locale: string; id: string }> }>) {
  const { locale, id } = await params
  const principal = await currentPrincipal()
  const safeLocale = locale === 'en' ? 'en' : 'vi'
  const productId = Number(id)
  if (!Number.isInteger(productId) || productId < 1) notFound()
  return (
    <ProductDetail
      id={productId}
      locale={safeLocale}
      roles={principal.roles}
    />
  )
}
