/**
 * M07 revision lifecycle: DRAFT -> APPROVED -> ARCHIVED.
 *
 * "Publish" and "approve" are the same transition; the lifecycle has no
 * separate PUBLISHED state (owner decision, 2026-11-11). Approved content is
 * immutable — changing it requires a new revision — and that rule is enforced
 * both here and by the `specification_versions_immutable_after_approval`
 * database trigger from migration 0004.
 */

export const specificationRevisionStatuses = [
  'DRAFT',
  'APPROVED',
  'ARCHIVED',
] as const

export type SpecificationRevisionStatus =
  (typeof specificationRevisionStatuses)[number]

const transitions: Record<
  SpecificationRevisionStatus,
  readonly SpecificationRevisionStatus[]
> = {
  DRAFT: ['APPROVED', 'ARCHIVED'],
  APPROVED: ['ARCHIVED'],
  ARCHIVED: [],
}

export function canTransitionSpecificationRevision(
  from: string,
  to: string,
): boolean {
  const allowed = transitions[from as SpecificationRevisionStatus]
  return allowed ? allowed.includes(to as SpecificationRevisionStatus) : false
}

/** Only a DRAFT revision may have its technical content edited. */
export function isEditableRevisionStatus(status: string): boolean {
  return status === 'DRAFT'
}

/** Only an APPROVED revision is selectable for a new commercial line. */
export function isSelectableRevisionStatus(status: string): boolean {
  return status === 'APPROVED'
}

/**
 * Fields the owner requires before a revision may be approved (owner decision
 * 8, 2026-11-11). Everything else — gross weight, glazing, size band, storage
 * temperature, shelf life, origin, MOQ, certifications, label languages — is
 * optional but still validated when supplied, because no technical value may
 * be guessed on the owner's behalf.
 */
export const approvalRequiredFields = [
  'nameEn',
  'nameVi',
  'nameKo',
  'grade',
  'processing',
  'netWeightPerPack',
  'weightUnit',
  'packsPerCarton',
  'uom',
  'packaging',
] as const

export type ApprovalRequiredField = (typeof approvalRequiredFields)[number]

export class ApprovalFieldsMissingError extends Error {
  readonly fields: readonly string[]

  constructor(fields: readonly string[]) {
    super(`Specification revision is missing required fields: ${fields.join(', ')}`)
    this.name = 'ApprovalFieldsMissingError'
    this.fields = fields
  }
}

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  return false
}

/** Returns the approval-blocking fields that are still empty. */
export function missingApprovalFields(
  revision: Record<string, unknown>,
): ApprovalRequiredField[] {
  return approvalRequiredFields.filter((field) => isBlank(revision[field]))
}

export function assertApprovable(revision: Record<string, unknown>): void {
  const missing = missingApprovalFields(revision)
  if (missing.length) throw new ApprovalFieldsMissingError(missing)
}
