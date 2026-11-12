import { compare, fromString } from '@/lib/decimal'

export type SelectionRequest = {
  priceListItemId?: number | null
  selectedAmount: string
  reason?: string | null
}

export type SelectionClassification = {
  selectionType: 'REFERENCE' | 'MANUAL' | 'OVERRIDE'
  listedAmount: string | null
  reason: string | null
  requiresOverrideGrant: boolean
}

export class PriceSelectionBusinessRuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PriceSelectionBusinessRuleError'
  }
}

export class PriceSelectionReasonError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PriceSelectionReasonError'
  }
}

export function classifyPriceSelection(
  request: SelectionRequest,
  eligible: readonly { id: number; unitPrice: string }[],
): SelectionClassification {
  const reason = request.reason?.trim() || null
  if (request.priceListItemId == null) {
    if (!reason || reason.length < 10) throw new PriceSelectionReasonError('Manual price requires a reason of at least 10 characters')
    return { selectionType: 'MANUAL', listedAmount: null, reason, requiresOverrideGrant: true }
  }
  const item = eligible.find((candidate) => candidate.id === request.priceListItemId)
  if (!item) throw new PriceSelectionBusinessRuleError('The selected price is no longer eligible')
  const sameAmount = compare(fromString(request.selectedAmount), fromString(item.unitPrice)) === 0
  if (sameAmount) return { selectionType: 'REFERENCE', listedAmount: item.unitPrice, reason: null, requiresOverrideGrant: false }
  if (!reason || reason.length < 10) throw new PriceSelectionReasonError('Price override requires a reason of at least 10 characters')
  return { selectionType: 'OVERRIDE', listedAmount: item.unitPrice, reason, requiresOverrideGrant: true }
}
