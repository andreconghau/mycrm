import 'server-only'
import { and, eq } from 'drizzle-orm'
import {
  contactChannels,
  contactPreferences,
  contacts,
  customerPrimaryContacts,
  historyEntitlements,
  historySnapshots,
  recordLinks,
} from '@/modules/access-control/infrastructure/schema'
import { getDatabase } from '@/modules/access-control/infrastructure/database'

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>['transaction']>[0]
>[0]

/**
 * Freezes every contact under a customer at handover time.
 *
 * One `record_links` row (contactId only, satisfying the baseline
 * `CHECK (num_nonnulls(...) = 1)`), one `history_snapshots` row sharing the
 * customer transfer's `transfer_id`, and one `history_entitlements` row for the
 * former owner. Because the payload is immutable JSONB, later edits are
 * invisible to the former owner by construction rather than by a filter.
 */
export async function snapshotContactsForTransfer(
  transaction: Transaction,
  input: {
    marketId: number
    transferId: number
    customerId: number
    formerOwnerId: number
  },
) {
  const rows = await transaction
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.marketId, input.marketId),
        eq(contacts.customerId, input.customerId),
      ),
    )
  const snapshotIds: number[] = []
  for (const contact of rows) {
    const [channels, preferences, primaries] = await Promise.all([
      transaction
        .select({
          id: contactChannels.id,
          kind: contactChannels.kind,
          handle: contactChannels.handle,
          isPrimary: contactChannels.isPrimary,
          verifiedAt: contactChannels.verifiedAt,
        })
        .from(contactChannels)
        .where(
          and(
            eq(contactChannels.marketId, input.marketId),
            eq(contactChannels.contactId, contact.id),
          ),
        ),
      transaction
        .select({
          id: contactPreferences.id,
          purpose: contactPreferences.purpose,
          allowed: contactPreferences.allowed,
          recordedAt: contactPreferences.recordedAt,
        })
        .from(contactPreferences)
        .where(
          and(
            eq(contactPreferences.marketId, input.marketId),
            eq(contactPreferences.contactId, contact.id),
          ),
        ),
      transaction
        .select({ context: customerPrimaryContacts.context })
        .from(customerPrimaryContacts)
        .where(
          and(
            eq(customerPrimaryContacts.marketId, input.marketId),
            eq(customerPrimaryContacts.contactId, contact.id),
          ),
        ),
    ])
    const [link] = await transaction
      .insert(recordLinks)
      .values({ marketId: input.marketId, contactId: contact.id })
      .returning({ id: recordLinks.id })
    const [snapshot] = await transaction
      .insert(historySnapshots)
      .values({
        marketId: input.marketId,
        transferId: input.transferId,
        recordLinkId: link.id,
        sourceVersion: contact.version,
        payload: {
          id: contact.id,
          marketId: contact.marketId,
          customerId: contact.customerId,
          displayName: contact.displayName,
          jobTitle: contact.jobTitle,
          department: contact.department,
          preferredLanguage: contact.preferredLanguage,
          timezone: contact.timezone,
          active: contact.active,
          version: contact.version,
          channels,
          preferences,
          primaryContexts: primaries.map((row) => row.context),
        },
      })
      .returning({ id: historySnapshots.id })
    await transaction.insert(historyEntitlements).values({
      marketId: input.marketId,
      snapshotId: snapshot.id,
      userId: input.formerOwnerId,
    })
    snapshotIds.push(snapshot.id)
  }
  return snapshotIds
}
