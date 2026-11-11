/**
 * Immutable commercial snapshot contract — the core requirement of R1-06.
 *
 * M10 Quotations is responsible for submission and PDF issue. R1-06 only owns
 * the contract: a pure function that freezes everything needed to reproduce an
 * offer line, which M10 persists verbatim into
 * `quotation_lines.specification_snapshot` (the column already exists in the
 * R1 baseline schema).
 *
 * Consequences of this design, which are what AC-05 … AC-11 actually test:
 *   - A later revision cannot change an earlier offer, because the offer holds
 *     a value copy rather than a reference.
 *   - Renaming or retiring the product cannot change an earlier offer.
 *   - Archiving the specification cannot change an earlier offer.
 *   - Historical offers are never re-rendered through a mutable database join.
 *
 * Document references point at immutable file versions (id + SHA-256) and
 * deliberately exclude the private storage key, so a snapshot can be persisted
 * and returned over the API without leaking object storage locations.
 */

export const specificationSnapshotVersion = 1 as const

export type SpecificationSnapshotDocument = {
  readonly fileId: number
  readonly purpose: string
  readonly originalName: string
  readonly mediaType: string
  readonly byteSize: number
  readonly sha256: string
  readonly attachedAt: string
}

export type SpecificationSnapshot = {
  readonly snapshotVersion: typeof specificationSnapshotVersion
  readonly capturedAt: string

  readonly productId: number
  readonly sku: string
  readonly productNames: Readonly<Record<string, string>>

  readonly specificationId: number
  readonly specificationCode: string
  readonly specificationVersionId: number
  readonly revisionNo: number
  readonly status: string
  readonly approvedAt: string | null
  readonly approvedBy: number | null
  readonly customerId: number | null

  readonly nameEn: string | null
  readonly nameVi: string | null
  readonly nameKo: string | null
  readonly descriptionEn: string | null
  readonly descriptionVi: string | null
  readonly descriptionKo: string | null

  readonly grade: string | null
  readonly processing: string | null
  readonly treatment: string | null
  readonly frozenForm: string | null
  readonly sizeBand: string | null
  readonly sizeUnit: string | null

  readonly netWeightPerPack: string | null
  readonly grossWeightPerPack: string | null
  readonly weightUnit: string | null
  readonly packsPerCarton: number | null
  readonly cartonNetWeight: string | null
  readonly glazingPercent: string | null
  readonly packaging: string | null
  readonly packagingMaterial: string | null
  readonly uom: string | null
  readonly moq: string | null
  readonly moqUnit: string | null

  readonly storageTempC: string | null
  readonly shelfLifeMonths: number | null
  readonly originCountry: string | null
  readonly certifications: readonly string[]
  readonly labelLanguages: readonly string[]

  readonly buyerRequirements: string | null
  readonly notes: string | null
  readonly requirements: Readonly<Record<string, unknown>>

  readonly documents: readonly SpecificationSnapshotDocument[]
}

export class SpecificationNotSnapshotableError extends Error {
  constructor(status: string) {
    super(
      `Only an approved or archived specification revision can be snapshotted; this revision is ${status}`,
    )
    this.name = 'SpecificationNotSnapshotableError'
  }
}

type RevisionInput = {
  id: number
  specificationId: number
  productId: number
  revisionNo: number
  status: string
  publishedAt: Date | string | null
  approvedBy: number | null
  nameEn: string | null
  nameVi: string | null
  nameKo: string | null
  descriptionEn: string | null
  descriptionVi: string | null
  descriptionKo: string | null
  grade: string | null
  processing: string | null
  treatment: string | null
  frozenForm: string | null
  sizeBand: string | null
  sizeUnit: string | null
  netWeightPerPack: string | null
  grossWeightPerPack: string | null
  weightUnit: string | null
  packsPerCarton: number | null
  cartonNetWeight: string | null
  glazingPercent: string | null
  packaging: string | null
  packagingMaterial: string | null
  uom: string | null
  moq: string | null
  moqUnit: string | null
  storageTempC: string | null
  shelfLifeMonths: number | null
  originCountry: string | null
  certifications: string[] | null
  labelLanguages: string[] | null
  buyerRequirements: string | null
  notes: string | null
  requirements: unknown
}

type SpecificationInput = {
  id: number
  code: string
  customerId: number | null
}

type ProductInput = {
  id: number
  sku: string
  names?: Record<string, string>
}

type DocumentInput = {
  fileId: number
  purpose: string
  originalName: string
  mediaType: string
  byteSize: number
  sha256: string
  createdAt: Date | string
}

function isoOrNull(value: Date | string | null): string | null {
  if (value === null) return null
  return value instanceof Date ? value.toISOString() : value
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

function plainObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

/**
 * Builds the immutable snapshot for an offer line.
 *
 * `capturedAt` is injected rather than read from the clock so the result is a
 * pure function of its inputs and therefore deterministically testable.
 */
export function buildSpecificationSnapshot(input: {
  revision: RevisionInput
  specification: SpecificationInput
  product: ProductInput
  documents?: readonly DocumentInput[]
  capturedAt: Date | string
}): SpecificationSnapshot {
  const { revision, specification, product } = input

  if (revision.status !== 'APPROVED' && revision.status !== 'ARCHIVED') {
    throw new SpecificationNotSnapshotableError(revision.status)
  }
  if (revision.specificationId !== specification.id) {
    throw new Error('SPECIFICATION_REVISION_MISMATCH')
  }
  if (revision.productId !== product.id) {
    throw new Error('SPECIFICATION_PRODUCT_MISMATCH')
  }

  const documents: SpecificationSnapshotDocument[] = (input.documents ?? []).map(
    (document) =>
      Object.freeze({
        fileId: document.fileId,
        purpose: document.purpose,
        originalName: document.originalName,
        mediaType: document.mediaType,
        byteSize: document.byteSize,
        sha256: document.sha256,
        attachedAt: iso(document.createdAt),
      }),
  )

  return Object.freeze({
    snapshotVersion: specificationSnapshotVersion,
    capturedAt: iso(input.capturedAt),

    productId: product.id,
    sku: product.sku,
    productNames: Object.freeze({ ...(product.names ?? {}) }),

    specificationId: specification.id,
    specificationCode: specification.code,
    specificationVersionId: revision.id,
    revisionNo: revision.revisionNo,
    status: revision.status,
    approvedAt: isoOrNull(revision.publishedAt),
    approvedBy: revision.approvedBy,
    customerId: specification.customerId,

    nameEn: revision.nameEn,
    nameVi: revision.nameVi,
    nameKo: revision.nameKo,
    descriptionEn: revision.descriptionEn,
    descriptionVi: revision.descriptionVi,
    descriptionKo: revision.descriptionKo,

    grade: revision.grade,
    processing: revision.processing,
    treatment: revision.treatment,
    frozenForm: revision.frozenForm,
    sizeBand: revision.sizeBand,
    sizeUnit: revision.sizeUnit,

    // Original units and pack quantities are preserved exactly as approved;
    // nothing is normalized or converted on the way into the snapshot.
    netWeightPerPack: revision.netWeightPerPack,
    grossWeightPerPack: revision.grossWeightPerPack,
    weightUnit: revision.weightUnit,
    packsPerCarton: revision.packsPerCarton,
    cartonNetWeight: revision.cartonNetWeight,
    glazingPercent: revision.glazingPercent,
    packaging: revision.packaging,
    packagingMaterial: revision.packagingMaterial,
    uom: revision.uom,
    moq: revision.moq,
    moqUnit: revision.moqUnit,

    storageTempC: revision.storageTempC,
    shelfLifeMonths: revision.shelfLifeMonths,
    originCountry: revision.originCountry,
    certifications: Object.freeze([...(revision.certifications ?? [])]),
    labelLanguages: Object.freeze([...(revision.labelLanguages ?? [])]),

    buyerRequirements: revision.buyerRequirements,
    notes: revision.notes,
    requirements: Object.freeze({ ...plainObject(revision.requirements) }),

    documents: Object.freeze(documents),
  })
}

/**
 * Field-by-field comparison used by the revision comparison UI. Returns only
 * the fields whose value differs, so the UI never has to diff manually.
 */
export function compareRevisionFields(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
  fields: readonly string[],
): Array<{ field: string; left: unknown; right: unknown }> {
  return fields
    .map((field) => ({ field, left: left[field], right: right[field] }))
    .filter((entry) => !sameValue(entry.left, entry.right))
}

function sameValue(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => sameValue(value, right[index]))
    )
  }
  if (left instanceof Date || right instanceof Date) {
    const leftTime = left instanceof Date ? left.getTime() : left
    const rightTime = right instanceof Date ? right.getTime() : right
    return leftTime === rightTime
  }
  if (left === null || right === null) return left === right
  if (typeof left === 'object' && typeof right === 'object') {
    return JSON.stringify(left) === JSON.stringify(right)
  }
  return left === right
}
