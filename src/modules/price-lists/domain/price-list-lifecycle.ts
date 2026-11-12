export const priceListStatuses = ['DRAFT', 'APPROVED', 'ARCHIVED'] as const
export type PriceListStatus = (typeof priceListStatuses)[number]
export type EffectivePriceListState = PriceListStatus | 'SCHEDULED' | 'ACTIVE' | 'EXPIRED'

const transitions: Record<PriceListStatus, readonly PriceListStatus[]> = {
  DRAFT: ['APPROVED', 'ARCHIVED'],
  APPROVED: ['ARCHIVED'],
  ARCHIVED: [],
}

export function canTransitionPriceList(from: string, to: string): boolean {
  return transitions[from as PriceListStatus]?.includes(to as PriceListStatus) ?? false
}

export function isEditablePriceListStatus(status: string): boolean {
  return status === 'DRAFT'
}

export function effectivePriceListState(
  list: { status: string; validFrom: Date | string; validTo: Date | string | null },
  at: Date = new Date(),
): EffectivePriceListState {
  if (list.status === 'DRAFT' || list.status === 'ARCHIVED') return list.status
  if (list.status !== 'APPROVED') return 'DRAFT'
  const now = at.getTime()
  const from = new Date(list.validFrom).getTime()
  const to = list.validTo === null ? Infinity : new Date(list.validTo).getTime()
  if (now < from) return 'SCHEDULED'
  if (now >= to) return 'EXPIRED'
  return 'ACTIVE'
}
