import { compare, fromString, subtract } from '@/lib/decimal'

export type EligibleCandidate = {
  id: number
  priceListId: number
  marketId: number
  productId: number
  specificationVersionId: number | null
  unit: string
  currency: string
  priceBasis: string
  priceBasisNote?: string | null
  unitPrice: string
  minQuantity: string | null
  maxQuantity: string | null
  itemValidFrom: Date | string
  itemValidTo: Date | string | null
  listValidFrom: Date | string
  listValidTo: Date | string | null
  listStatus: string
  tier: 'CUSTOMER' | 'MARKET' | 'GENERAL'
  customerId: number | null
  code: string
}

export type EligibilityCriteria = {
  marketId: number
  productId: number
  specificationVersionId?: number | null
  customerId?: number | null
  quantity: string
  unit: string
  currency: string
  priceBasis?: string
  at?: Date
}

export type EligibleOption = EligibleCandidate & { suggested: boolean }

function validAt(fromValue: Date | string, toValue: Date | string | null, at: number) {
  const from = new Date(fromValue).getTime()
  const to = toValue === null ? Infinity : new Date(toValue).getTime()
  return from <= at && at < to
}

function tierRank(tier: EligibleCandidate['tier']) {
  return tier === 'CUSTOMER' ? 0 : tier === 'MARKET' ? 1 : 2
}

function tierWidth(candidate: EligibleCandidate): { infinite: boolean; width?: ReturnType<typeof fromString> } {
  if (candidate.minQuantity === null || candidate.maxQuantity === null) return { infinite: true }
  return { infinite: false, width: subtract(fromString(candidate.maxQuantity), fromString(candidate.minQuantity)) }
}

function compareTierWidth(left: EligibleCandidate, right: EligibleCandidate) {
  const a = tierWidth(left)
  const b = tierWidth(right)
  if (a.infinite && b.infinite) return 0
  if (a.infinite) return 1
  if (b.infinite) return -1
  return compare(a.width!, b.width!)
}

export function selectEligiblePrices(
  candidates: readonly EligibleCandidate[],
  criteria: EligibilityCriteria,
): { options: EligibleOption[]; suggestedItemId: number | null } {
  const at = (criteria.at ?? new Date()).getTime()
  const quantity = fromString(criteria.quantity)
  const options = candidates.filter((candidate) => {
    if (candidate.marketId !== criteria.marketId || candidate.productId !== criteria.productId) return false
    if (candidate.specificationVersionId !== null && candidate.specificationVersionId !== (criteria.specificationVersionId ?? null)) return false
    if (candidate.unit !== criteria.unit || candidate.currency !== criteria.currency) return false
    if (criteria.priceBasis && candidate.priceBasis !== criteria.priceBasis) return false
    if (candidate.listStatus !== 'APPROVED') return false
    if (!validAt(candidate.listValidFrom, candidate.listValidTo, at)) return false
    if (!validAt(candidate.itemValidFrom, candidate.itemValidTo, at)) return false
    if (candidate.tier === 'CUSTOMER' && candidate.customerId !== (criteria.customerId ?? null)) return false
    if (candidate.minQuantity !== null && compare(quantity, fromString(candidate.minQuantity)) < 0) return false
    if (candidate.maxQuantity !== null && compare(quantity, fromString(candidate.maxQuantity)) > 0) return false
    return true
  }).sort((left, right) => {
    const tier = tierRank(left.tier) - tierRank(right.tier)
    if (tier) return tier
    const width = compareTierWidth(left, right)
    if (width) return width
    const latest = new Date(right.listValidFrom).getTime() - new Date(left.listValidFrom).getTime()
    if (latest) return latest
    return left.id - right.id
  })
  return {
    options: options.map((option, index) => ({ ...option, suggested: index === 0 })),
    suggestedItemId: options[0]?.id ?? null,
  }
}
