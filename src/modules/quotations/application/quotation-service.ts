import 'server-only'
import { requireGrant } from '@/modules/access-control/application/authorization'
import { AccessDeniedError, type EffectiveGrant, type Principal } from '@/modules/access-control/domain/types'
import {
  calculateQuotationSchema,
  createQuotationLineSchema,
  createQuotationSchema,
  quotationQuerySchema,
  quotationRfqQuerySchema,
  setQuotationAdjustmentSchema,
  updateQuotationLineSchema,
  updateQuotationVersionSchema,
} from './contracts'
import { QuotationRepository } from '../infrastructure/quotation-repository'

export class QuotationService {
  constructor(private readonly repository = new QuotationRepository()) {}

  resolveMarketId(actor: Principal, marketCode: string) {
    return this.repository.resolveMarketId(actor, marketCode)
  }

  private assertWritable(grants: EffectiveGrant[], value: Record<string, unknown>) {
    const policy = requireGrant(grants, 'quotations', 'edit')
    const controls = new Set(['version'])
    if (Object.keys(value).some((field) => !controls.has(field) && !policy.writeFields.includes(field))) throw new AccessDeniedError()
  }

  private presentVersion(version: Record<string, unknown>) {
    return {
      id: version.id, revisionNo: version.revisionNo, state: version.state,
      currency: version.currency, vndPerUsd: version.vndPerUsd,
      incoterm: version.incoterm, incotermPlace: version.incotermPlace,
      incotermYear: version.incotermYear, paymentTerms: version.paymentTerms,
      validUntil: version.validUntil, originalUsdTotal: version.originalUsdTotal,
      originalVndTotal: version.originalVndTotal, unroundedUsdTotal: version.unroundedUsdTotal,
      unroundedUsdNumerator: version.unroundedUsdNumerator,
      unroundedUsdDenominator: version.unroundedUsdDenominator,
      roundedUsdTotal: version.roundedUsdTotal, version: version.version,
    }
  }

  private presentLine(line: Record<string, unknown>) {
    return {
      id: line.id, lineNo: line.lineNo, rfqLineId: line.rfqLineId,
      productId: line.productId, specificationVersionId: line.specificationVersionId,
      quantity: line.quantity, unit: line.unit, inputCurrency: line.inputCurrency,
      inputUnitPrice: line.inputUnitPrice, originalLineAmount: line.originalLineAmount,
      convertedUsdAmount: line.convertedUsdAmount, priceListItemId: line.priceListItemId,
      priceSelectionId: line.priceSelectionId, referencePrice: line.referencePrice,
      referenceCurrency: line.referenceCurrency, priceReason: line.priceReason,
      priceBasis: line.priceBasis, priceBasisNote: line.priceBasisNote,
      selectedAt: line.selectedAt, productSnapshot: line.productSnapshot,
      specificationSnapshot: line.specificationSnapshot,
    }
  }

  private presentCalculation(value: Record<string, unknown>) {
    const calculation = value.calculation as Record<string, unknown> | undefined
    return {
      ...(value.quotationId !== undefined ? { quotationId: value.quotationId } : {}),
      ...(value.version && typeof value.version === 'object' ? { version: this.presentVersion(value.version as Record<string, unknown>) } : {}),
      ...(value.line && typeof value.line === 'object' ? { line: this.presentLine(value.line as Record<string, unknown>) } : {}),
      ...(calculation ? { calculation: {
        lines: calculation.lines,
        originalUsdTotal: calculation.originalUsdTotal,
        originalVndTotal: calculation.originalVndTotal,
        unroundedUsdTotal: calculation.unroundedUsdTotal,
        unroundedUsdNumerator: calculation.unroundedUsdNumerator,
        unroundedUsdDenominator: calculation.unroundedUsdDenominator,
        roundedUsdTotal: calculation.roundedUsdTotal,
      } } : {}),
      ...(Array.isArray(value.incompleteLineIds) ? { incompleteLineIds: value.incompleteLineIds } : {}),
    }
  }

  private presentQuotation(row: Record<string, unknown>) {
    const presentVersion = (version: Record<string, unknown>) => ({
      ...this.presentVersion(version),
      lines: Array.isArray(version.lines) ? version.lines.map((value) => {
        const line = value as Record<string, unknown>
        return {
          id: line.id, lineNo: line.lineNo, rfqLineId: line.rfqLineId,
          productId: line.productId, specificationVersionId: line.specificationVersionId,
          quantity: line.quantity, unit: line.unit, inputCurrency: line.inputCurrency,
          inputUnitPrice: line.inputUnitPrice, originalLineAmount: line.originalLineAmount,
          convertedUsdAmount: line.convertedUsdAmount, priceListItemId: line.priceListItemId,
          priceSelectionId: line.priceSelectionId,
          referencePrice: line.referencePrice, referenceCurrency: line.referenceCurrency,
          priceReason: line.priceReason, priceBasis: line.priceBasis,
          priceBasisNote: line.priceBasisNote, selectedAt: line.selectedAt,
          productSnapshot: line.productSnapshot, specificationSnapshot: line.specificationSnapshot,
        }
      }) : undefined,
      adjustments: Array.isArray(version.adjustments) ? version.adjustments.map((value) => {
        const adjustment = value as Record<string, unknown>
        return { kind: adjustment.kind, inputCurrency: adjustment.inputCurrency, originalAmount: adjustment.originalAmount, convertedUsdAmount: adjustment.convertedUsdAmount }
      }) : undefined,
    })
    const result: Record<string, unknown> = {
      id: row.id, number: row.number, rfqId: row.rfqId, rfqNumber: row.rfqNumber,
      customerId: row.customerId, customerCode: row.customerCode,
      customerName: row.customerName, customerLegalName: row.customerLegalName,
      version: row.version, createdAt: row.createdAt, updatedAt: row.updatedAt,
    }
    if (row.latestVersion && typeof row.latestVersion === 'object') result.latestVersion = presentVersion(row.latestVersion as Record<string, unknown>)
    if (Array.isArray(row.versions)) result.versions = row.versions.map((value) => presentVersion(value as Record<string, unknown>))
    return result
  }

  async list(actor: Principal, grants: EffectiveGrant[], marketId: number, raw: unknown) {
    requireGrant(grants, 'quotations', 'read')
    const page = await this.repository.list({ actor, grants, marketId, ...quotationQuerySchema.parse(raw) })
    return page.map((row) => this.presentQuotation(row as unknown as Record<string, unknown>))
  }

  async rfqOptions(actor: Principal, grants: EffectiveGrant[], marketId: number, raw: unknown) {
    requireGrant(grants, 'quotations', 'create')
    const rows = await this.repository.listRfqOptions({ actor, grants, marketId, ...quotationRfqQuerySchema.parse(raw) })
    return rows.map(({ id, number, customerId, customerCode, customerName, customerLegalName }) => ({ id, number, customerId, customerCode, customerName, customerLegalName }))
  }

  async get(actor: Principal, grants: EffectiveGrant[], marketId: number, id: number) {
    requireGrant(grants, 'quotations', 'read')
    return this.presentQuotation(await this.repository.get({ actor, grants, marketId, id }) as unknown as Record<string, unknown>)
  }

  async create(actor: Principal, grants: EffectiveGrant[], marketId: number, raw: unknown, requestId: string) {
    requireGrant(grants, 'quotations', 'create')
    requireGrant(grants, 'rfqs', 'read')
    requireGrant(grants, 'customers', 'read')
    return this.presentQuotation(await this.repository.create({ actor, grants, marketId, requestId, ...createQuotationSchema.parse(raw) }) as unknown as Record<string, unknown>)
  }

  async clone(actor: Principal, grants: EffectiveGrant[], marketId: number, id: number, raw: unknown, requestId: string) {
    requireGrant(grants, 'quotations', 'edit')
    const value = calculateQuotationSchema.parse(raw)
    return this.presentVersion(await this.repository.cloneLatestRevision({ actor, grants, marketId, requestId, quotationId: id, expectedVersion: value.version }) as unknown as Record<string, unknown>)
  }

  async updateVersion(actor: Principal, grants: EffectiveGrant[], marketId: number, id: number, raw: unknown, requestId: string) {
    const value = updateQuotationVersionSchema.parse(raw)
    this.assertWritable(grants, value)
    return this.presentCalculation(await this.repository.updateVersion({ actor, grants, marketId, requestId, versionId: id, expectedVersion: value.version, values: value }) as unknown as Record<string, unknown>)
  }

  async createLine(actor: Principal, grants: EffectiveGrant[], marketId: number, id: number, raw: unknown, requestId: string) {
    requireGrant(grants, 'quotations', 'edit')
    const value = createQuotationLineSchema.parse(raw)
    this.assertWritable(grants, value)
    return this.presentCalculation(await this.repository.createLine({ actor, grants, marketId, requestId, versionId: id, expectedVersion: value.version, values: value }) as unknown as Record<string, unknown>)
  }

  async updateLine(actor: Principal, grants: EffectiveGrant[], marketId: number, versionId: number, lineId: number, raw: unknown, requestId: string) {
    requireGrant(grants, 'quotations', 'edit')
    const value = updateQuotationLineSchema.parse(raw)
    this.assertWritable(grants, value)
    return this.presentCalculation(await this.repository.updateLine({ actor, grants, marketId, requestId, versionId, lineId, expectedVersion: value.version, values: value }) as unknown as Record<string, unknown>)
  }

  async setAdjustment(actor: Principal, grants: EffectiveGrant[], marketId: number, id: number, kind: 'FREIGHT' | 'INSURANCE', raw: unknown, requestId: string) {
    requireGrant(grants, 'quotations', 'edit')
    const value = setQuotationAdjustmentSchema.parse(raw)
    this.assertWritable(grants, value)
    return this.presentCalculation(await this.repository.setAdjustment({ actor, grants, marketId, requestId, versionId: id, kind, expectedVersion: value.version, amount: value.amount, currency: value.currency }) as unknown as Record<string, unknown>)
  }

  async calculate(actor: Principal, grants: EffectiveGrant[], marketId: number, id: number, raw: unknown, requestId: string) {
    requireGrant(grants, 'quotations', 'edit')
    const value = calculateQuotationSchema.parse(raw)
    return this.presentCalculation(await this.repository.calculate({ actor, grants, marketId, requestId, versionId: id, expectedVersion: value.version }) as unknown as Record<string, unknown>)
  }

  async readiness(actor: Principal, grants: EffectiveGrant[], marketId: number, id: number) {
    requireGrant(grants, 'quotations', 'read')
    return this.repository.readiness({ actor, grants, marketId, versionId: id })
  }
}
