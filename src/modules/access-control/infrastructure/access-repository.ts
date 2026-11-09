import 'server-only'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { and, eq, gt, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import { getAuthConfig } from './auth-config'
import { getDatabase } from './database'
import {
  projectSafeAuditDiff,
  projectSafeAuditReason,
} from '../application/audit-safe-diff'
import {
  auditEvents,
  authRateLimits,
  invitations,
  markets,
  roleGrants,
  sessions,
  teams,
  teamMemberships,
  userMarketMemberships,
  userRoles,
  users,
} from './schema'
import {
  recordScopes,
  roleCodes,
  type EffectiveGrant,
  type Principal,
  type RecordScope,
  type RoleCode,
} from '../domain/types'

const ACCESS_GRANTS = [
  ['access.users', 'read'],
  ['access.users', 'list'],
  ['access.users', 'invite'],
  ['access.users', 'disable'],
  ['access.roles', 'read'],
  ['access.roles', 'manage'],
  ['access.grants', 'read'],
  ['access.grants', 'manage'],
  ['access.teams', 'read'],
  ['access.teams', 'manage'],
  ['access.markets', 'read'],
  ['access.markets', 'manage'],
] as const

function isRoleCode(value: string): value is RoleCode {
  return roleCodes.includes(value as RoleCode)
}

function isRecordScope(value: string): value is RecordScope {
  return recordScopes.includes(value as RecordScope)
}

export class AccessRepository {
  private readonly database = getDatabase()

  async findLoginUser(email: string) {
    const [user] = await this.database
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        passwordHash: users.passwordHash,
        status: users.status,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    return user ?? null
  }

  async listUsers(limit = 50) {
    return this.database
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        status: users.status,
        version: users.version,
      })
      .from(users)
      .orderBy(users.id)
      .limit(Math.min(Math.max(limit, 1), 100))
  }

  async listRoleGrants() {
    return this.database
      .select({
        id: roleGrants.id,
        roleCode: roleGrants.roleCode,
        resource: roleGrants.resource,
        action: roleGrants.action,
        recordScope: roleGrants.recordScope,
        readFields: roleGrants.readFields,
        writeFields: roleGrants.writeFields,
        active: roleGrants.active,
        version: roleGrants.version,
      })
      .from(roleGrants)
      .orderBy(roleGrants.roleCode, roleGrants.resource, roleGrants.action)
  }

  async assignRole(input: {
    actorId: number
    userId: number
    roleCode: RoleCode
    active: boolean
    reason: string
    requestId?: string
  }) {
    if (
      input.actorId === input.userId &&
      input.roleCode === 'admin' &&
      !input.active
    ) {
      throw new Error(
        'Administrators cannot revoke their own administrator role',
      )
    }
    await this.database.transaction(async (transaction) => {
      const [target] = await transaction
        .select({ id: users.id, status: users.status })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1)
      if (!target || target.status === 'DISABLED')
        throw new Error('Target user is unavailable')
      await transaction
        .insert(userRoles)
        .values({
          userId: input.userId,
          roleCode: input.roleCode,
          active: input.active,
          grantedBy: input.actorId,
        })
        .onConflictDoUpdate({
          target: [userRoles.userId, userRoles.roleCode],
          set: {
            active: input.active,
            grantedBy: input.actorId,
            updatedAt: new Date(),
            version: sql`${userRoles.version} + 1`,
          },
        })
      await transaction.insert(auditEvents).values({
        actorId: input.actorId,
        action: input.active ? 'access.role_granted' : 'access.role_revoked',
        resourceType: 'user',
        resourceId: input.userId,
        requestId: input.requestId ?? randomUUID(),
        reason: projectSafeAuditReason(input.reason),
        safeDiff: projectSafeAuditDiff({
          roleCode: input.roleCode,
          active: input.active,
        }),
        result: 'SUCCESS',
      })
    })
  }

  async disableUser(input: {
    actorId: number
    userId: number
    reason: string
    requestId?: string
  }) {
    if (input.actorId === input.userId)
      throw new Error('Administrators cannot disable themselves')
    await this.database.transaction(async (transaction) => {
      const now = new Date()
      const [target] = await transaction
        .update(users)
        .set({
          status: 'DISABLED',
          updatedAt: now,
          version: sql`${users.version} + 1`,
        })
        .where(and(eq(users.id, input.userId), eq(users.status, 'ACTIVE')))
        .returning({ id: users.id })
      if (!target) throw new Error('Active user was not found')
      await transaction
        .update(sessions)
        .set({
          revokedAt: now,
          updatedAt: now,
          version: sql`${sessions.version} + 1`,
        })
        .where(
          and(eq(sessions.userId, input.userId), isNull(sessions.revokedAt)),
        )
      await transaction.insert(auditEvents).values({
        actorId: input.actorId,
        action: 'access.user_disabled',
        resourceType: 'user',
        resourceId: input.userId,
        requestId: input.requestId ?? randomUUID(),
        reason: projectSafeAuditReason(input.reason),
        safeDiff: projectSafeAuditDiff({
          status: 'DISABLED',
          sessionsRevoked: true,
        }),
        result: 'SUCCESS',
      })
    })
  }

  async createTeam(input: {
    actorId: number
    name: string
    requestId?: string
  }) {
    return this.database.transaction(async (transaction) => {
      const [team] = await transaction
        .insert(teams)
        .values({ name: input.name })
        .returning({
          id: teams.id,
          name: teams.name,
          active: teams.active,
          version: teams.version,
        })
      await transaction.insert(auditEvents).values({
        actorId: input.actorId,
        action: 'access.team_created',
        resourceType: 'team',
        resourceId: team.id,
        requestId: input.requestId ?? randomUUID(),
        safeDiff: projectSafeAuditDiff({}),
        result: 'SUCCESS',
      })
      return team
    })
  }

  async assignTeam(input: {
    actorId: number
    userId: number
    teamId: number
    requestId?: string
  }) {
    await this.database.transaction(async (transaction) => {
      const [team] = await transaction
        .select({ id: teams.id })
        .from(teams)
        .where(and(eq(teams.id, input.teamId), eq(teams.active, true)))
        .limit(1)
      const [user] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, input.userId), eq(users.status, 'ACTIVE')))
        .limit(1)
      if (!team || !user) throw new Error('Active user and team are required')
      await transaction.insert(teamMemberships).values({
        userId: input.userId,
        teamId: input.teamId,
        startsAt: new Date(),
      })
      await transaction.insert(auditEvents).values({
        actorId: input.actorId,
        action: 'access.team_member_assigned',
        resourceType: 'team',
        resourceId: input.teamId,
        requestId: input.requestId ?? randomUUID(),
        safeDiff: projectSafeAuditDiff({ userId: input.userId }),
        result: 'SUCCESS',
      })
    })
  }

  async grantMarket(input: {
    actorId: number
    userId: number
    marketId: number
    active: boolean
    requestId?: string
  }) {
    await this.database.transaction(async (transaction) => {
      const [market] = await transaction
        .select({ id: markets.id })
        .from(markets)
        .where(and(eq(markets.id, input.marketId), eq(markets.active, true)))
        .limit(1)
      const [user] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, input.userId), eq(users.status, 'ACTIVE')))
        .limit(1)
      if (!market || !user)
        throw new Error('Active user and market are required')
      const now = new Date()
      await transaction
        .insert(userMarketMemberships)
        .values({
          userId: input.userId,
          marketId: input.marketId,
          active: input.active,
          grantedBy: input.actorId,
          grantedAt: now,
          revokedAt: input.active ? null : now,
          revokedBy: input.active ? null : input.actorId,
        })
        .onConflictDoUpdate({
          target: [
            userMarketMemberships.userId,
            userMarketMemberships.marketId,
          ],
          set: {
            active: input.active,
            grantedBy: input.actorId,
            grantedAt: now,
            revokedAt: input.active ? null : now,
            revokedBy: input.active ? null : input.actorId,
            updatedAt: now,
            version: sql`${userMarketMemberships.version} + 1`,
          },
        })
      await transaction.insert(auditEvents).values({
        actorId: input.actorId,
        action: input.active
          ? 'access.market_granted'
          : 'access.market_revoked',
        resourceType: 'market',
        resourceId: input.marketId,
        requestId: input.requestId ?? randomUUID(),
        safeDiff: projectSafeAuditDiff({
          userId: input.userId,
          active: input.active,
        }),
        result: 'SUCCESS',
      })
    })
  }

  async createSession(
    userId: number,
    tokenVerifierHash: string,
    now: Date,
    requestId: string = randomUUID(),
  ) {
    const config = getAuthConfig()
    const absoluteExpiresAt = new Date(
      now.getTime() + config.absoluteTtlSeconds * 1000,
    )
    const idleExpiresAt = new Date(now.getTime() + config.idleTtlSeconds * 1000)
    return this.database.transaction(async (transaction) => {
      const [session] = await transaction
        .insert(sessions)
        .values({
          userId,
          tokenVerifierHash,
          absoluteExpiresAt,
          idleExpiresAt,
          lastSeenAt: now,
        })
        .returning({ id: sessions.id })
      await transaction.insert(auditEvents).values({
        actorId: userId,
        action: 'auth.login',
        resourceType: 'session',
        resourceId: session.id,
        requestId,
        safeDiff: {},
        result: 'SUCCESS',
      })
      return { id: session.id, absoluteExpiresAt, idleExpiresAt }
    })
  }

  async loadPrincipal(
    sessionId: number,
    userId?: number,
  ): Promise<Principal | null> {
    const now = new Date()
    const [row] = await this.database
      .select({
        sessionId: sessions.id,
        sessionUserId: sessions.userId,
        absoluteExpiresAt: sessions.absoluteExpiresAt,
        idleExpiresAt: sessions.idleExpiresAt,
        revokedAt: sessions.revokedAt,
        userId: users.id,
        displayName: users.displayName,
        email: users.email,
        status: users.status,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.id, sessionId),
          userId ? eq(users.id, userId) : undefined,
          isNull(sessions.revokedAt),
          gt(sessions.absoluteExpiresAt, now),
          gt(sessions.idleExpiresAt, now),
          eq(users.status, 'ACTIVE'),
        ),
      )
      .limit(1)
    if (!row) return null

    const [roles, teams, markets] = await Promise.all([
      this.database
        .select({ roleCode: userRoles.roleCode })
        .from(userRoles)
        .where(
          and(eq(userRoles.userId, row.userId), eq(userRoles.active, true)),
        ),
      this.database
        .select({ teamId: teamMemberships.teamId })
        .from(teamMemberships)
        .where(
          and(
            eq(teamMemberships.userId, row.userId),
            lte(teamMemberships.startsAt, now),
            or(isNull(teamMemberships.endsAt), gt(teamMemberships.endsAt, now)),
          ),
        ),
      this.database
        .select({ marketId: userMarketMemberships.marketId })
        .from(userMarketMemberships)
        .where(
          and(
            eq(userMarketMemberships.userId, row.userId),
            eq(userMarketMemberships.active, true),
            isNull(userMarketMemberships.revokedAt),
          ),
        ),
    ])

    await this.database
      .update(sessions)
      .set({
        lastSeenAt: now,
        idleExpiresAt: new Date(
          Math.min(
            row.absoluteExpiresAt.getTime(),
            now.getTime() + getAuthConfig().idleTtlSeconds * 1000,
          ),
        ),
        updatedAt: now,
        version: sql`${sessions.version} + 1`,
      })
      .where(eq(sessions.id, sessionId))

    return {
      userId: row.userId,
      sessionId: row.sessionId,
      displayName: row.displayName,
      email: row.email,
      roles: roles.map(({ roleCode }) => roleCode).filter(isRoleCode),
      teamIds: teams.map(({ teamId }) => teamId),
      marketIds: markets.map(({ marketId }) => marketId),
    }
  }

  async getEffectiveGrants(roles: RoleCode[]): Promise<EffectiveGrant[]> {
    if (!roles.length) return []
    const rows = await this.database
      .select({
        resource: roleGrants.resource,
        action: roleGrants.action,
        recordScope: roleGrants.recordScope,
        readFields: roleGrants.readFields,
        writeFields: roleGrants.writeFields,
      })
      .from(roleGrants)
      .where(
        and(inArray(roleGrants.roleCode, roles), eq(roleGrants.active, true)),
      )
    return rows.flatMap((row) =>
      isRecordScope(row.recordScope)
        ? [{ ...row, recordScope: row.recordScope }]
        : [],
    )
  }

  async getSessionVerifier(sessionId: number) {
    const [row] = await this.database
      .select({
        id: sessions.id,
        userId: sessions.userId,
        tokenVerifierHash: sessions.tokenVerifierHash,
        absoluteExpiresAt: sessions.absoluteExpiresAt,
        idleExpiresAt: sessions.idleExpiresAt,
        revokedAt: sessions.revokedAt,
      })
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1)
    return row ?? null
  }

  async rotateSession(
    sessionId: number,
    verifierHash: string,
    now: Date,
    idleExpiresAt: Date,
  ) {
    const [updated] = await this.database
      .update(sessions)
      .set({
        tokenVerifierHash: verifierHash,
        lastSeenAt: now,
        idleExpiresAt,
        updatedAt: now,
        version: sql`${sessions.version} + 1`,
      })
      .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)))
      .returning({ id: sessions.id })
    return Boolean(updated)
  }

  async revokeSession(
    sessionId: number,
    actorId?: number,
    action = 'auth.logout',
    requestId: string = randomUUID(),
  ) {
    const now = new Date()
    await this.database.transaction(async (transaction) => {
      const [session] = await transaction
        .update(sessions)
        .set({
          revokedAt: now,
          updatedAt: now,
          version: sql`${sessions.version} + 1`,
        })
        .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)))
        .returning({ id: sessions.id, userId: sessions.userId })
      if (session) {
        await transaction.insert(auditEvents).values({
          actorId: actorId ?? session.userId,
          action,
          resourceType: 'session',
          resourceId: session.id,
          requestId,
          safeDiff: {},
          result: 'SUCCESS',
        })
      }
    })
  }

  rateLimitKey(normalizedEmail: string) {
    return createHmac('sha256', getAuthConfig().csrfSecret)
      .update(normalizedEmail)
      .digest('base64url')
  }

  async isLoginBlocked(keyHash: string, now: Date) {
    const [row] = await this.database
      .select({ blockedUntil: authRateLimits.blockedUntil })
      .from(authRateLimits)
      .where(eq(authRateLimits.keyHash, keyHash))
      .limit(1)
    return Boolean(row?.blockedUntil && row.blockedUntil > now)
  }

  async recordLoginFailure(keyHash: string, now: Date) {
    const windowStart = new Date(now.getTime() - 15 * 60 * 1000)
    await this.database.execute(sql`
      INSERT INTO auth_rate_limits (
        key_hash, failure_count, window_started_at, blocked_until, updated_at
      ) VALUES (${keyHash}, 1, ${now}, NULL, ${now})
      ON CONFLICT (key_hash) DO UPDATE SET
        failure_count = CASE
          WHEN auth_rate_limits.window_started_at < ${windowStart} THEN 1
          ELSE auth_rate_limits.failure_count + 1
        END,
        window_started_at = CASE
          WHEN auth_rate_limits.window_started_at < ${windowStart} THEN ${now}
          ELSE auth_rate_limits.window_started_at
        END,
        blocked_until = CASE
          WHEN auth_rate_limits.window_started_at >= ${windowStart}
            AND auth_rate_limits.failure_count + 1 >= 10
          THEN ${new Date(now.getTime() + 15 * 60 * 1000)}
          ELSE NULL
        END,
        updated_at = ${now}
    `)
  }

  async clearLoginFailures(keyHash: string) {
    await this.database
      .delete(authRateLimits)
      .where(eq(authRateLimits.keyHash, keyHash))
  }

  async bootstrapAdmin(input: {
    email: string
    displayName: string
    passwordHash: string
  }) {
    const email = input.email.toLowerCase()
    return this.database.transaction(async (transaction) => {
      const [existing] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1)
      if (existing) throw new Error('An account with that email already exists')
      const [user] = await transaction
        .insert(users)
        .values({
          email,
          displayName: input.displayName,
          passwordHash: input.passwordHash,
          status: 'ACTIVE',
        })
        .returning({ id: users.id })
      await transaction.insert(userRoles).values({
        userId: user.id,
        roleCode: 'admin',
        active: true,
        grantedBy: user.id,
      })
      for (const [resource, action] of ACCESS_GRANTS) {
        await transaction
          .insert(roleGrants)
          .values({
            roleCode: 'admin',
            resource,
            action,
            recordScope: 'ALL',
            readFields: ['id', 'email', 'displayName', 'status', 'version'],
            writeFields: ['displayName', 'status', 'roleCode', 'active'],
            active: true,
            changedBy: user.id,
          })
          .onConflictDoNothing()
      }
      await transaction.insert(auditEvents).values({
        actorId: user.id,
        action: 'access.bootstrap_admin',
        resourceType: 'user',
        resourceId: user.id,
        requestId: randomUUID(),
        safeDiff: projectSafeAuditDiff({
          roles: ['admin'],
          grantBoundary: 'M29_ONLY',
        }),
        result: 'SUCCESS',
      })
      return user.id
    })
  }

  async createInvitation(input: {
    actorId: number
    email: string
    displayName: string
    tokenHash: string
    expiresAt: Date
  }) {
    return this.database.transaction(async (transaction) => {
      const [existing] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()))
        .limit(1)
      if (existing) throw new Error('An account with that email already exists')
      const [user] = await transaction
        .insert(users)
        .values({
          email: input.email.toLowerCase(),
          displayName: input.displayName,
          status: 'INVITED',
        })
        .returning({ id: users.id })
      const [invitation] = await transaction
        .insert(invitations)
        .values({
          userId: user.id,
          invitedBy: input.actorId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
        })
        .returning({ id: invitations.id })
      await transaction.insert(auditEvents).values({
        actorId: input.actorId,
        action: 'access.user_invited',
        resourceType: 'user',
        resourceId: user.id,
        requestId: randomUUID(),
        safeDiff: projectSafeAuditDiff({}),
        result: 'SUCCESS',
      })
      return { userId: user.id, invitationId: invitation.id }
    })
  }

  async acceptInvitation(
    tokenHash: string,
    passwordHash: string,
    displayName?: string,
    requestId: string = randomUUID(),
  ) {
    const now = new Date()
    return this.database.transaction(async (transaction) => {
      const [invitation] = await transaction
        .select({ id: invitations.id, userId: invitations.userId })
        .from(invitations)
        .where(
          and(
            eq(invitations.tokenHash, tokenHash),
            isNull(invitations.acceptedAt),
            isNull(invitations.revokedAt),
            gt(invitations.expiresAt, now),
          ),
        )
        .limit(1)
      if (!invitation) return null
      await transaction
        .update(invitations)
        .set({ acceptedAt: now })
        .where(
          and(
            eq(invitations.id, invitation.id),
            isNull(invitations.acceptedAt),
          ),
        )
      await transaction
        .update(users)
        .set({
          passwordHash,
          status: 'ACTIVE',
          ...(displayName ? { displayName } : {}),
          updatedAt: now,
          version: sql`${users.version} + 1`,
        })
        .where(eq(users.id, invitation.userId))
      await transaction.insert(auditEvents).values({
        actorId: invitation.userId,
        action: 'auth.invitation_accepted',
        resourceType: 'user',
        resourceId: invitation.userId,
        requestId,
        safeDiff: projectSafeAuditDiff({}),
        result: 'SUCCESS',
      })
      return invitation.userId
    })
  }

  safeHashEquals(expected: string, supplied: string) {
    const left = Buffer.from(expected)
    const right = Buffer.from(supplied)
    return left.length === right.length && timingSafeEqual(left, right)
  }
}
