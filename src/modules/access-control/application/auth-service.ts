import 'server-only'
import {
  invitationAcceptanceRequestSchema,
  loginRequestSchema,
} from './api-contracts'
import { createCsrfToken } from '../infrastructure/csrf'
import { getAuthConfig } from '../infrastructure/auth-config'
import {
  getDummyPasswordHash,
  hashPassword,
  verifyPassword,
} from '../infrastructure/password'
import {
  decodeRefreshToken,
  encodeRefreshToken,
  generateOpaqueSecret,
  hashOpaqueSecret,
  signAccessToken,
} from '../infrastructure/tokens'
import { AccessRepository } from '../infrastructure/access-repository'
import { AuthenticationError, type Principal } from '../domain/types'

export class AuthService {
  constructor(private readonly repository = new AccessRepository()) {}

  async login(input: unknown) {
    const credentials = loginRequestSchema.parse(input)
    const now = new Date()
    const rateLimitKey = this.repository.rateLimitKey(credentials.email)
    if (await this.repository.isLoginBlocked(rateLimitKey, now)) {
      throw new AuthenticationError('Invalid email or password')
    }

    const user = await this.repository.findLoginUser(credentials.email)
    const encoded = user?.passwordHash ?? (await getDummyPasswordHash())
    const passwordValid = await verifyPassword(credentials.password, encoded)
    if (
      !user ||
      user.status !== 'ACTIVE' ||
      !user.passwordHash ||
      !passwordValid
    ) {
      await this.repository.recordLoginFailure(rateLimitKey, now)
      throw new AuthenticationError('Invalid email or password')
    }

    await this.repository.clearLoginFailures(rateLimitKey)
    const refreshSecret = generateOpaqueSecret()
    const session = await this.repository.createSession(
      user.id,
      hashOpaqueSecret(refreshSecret),
      now,
    )
    return this.issueTokens(user.id, session.id, refreshSecret)
  }

  async authenticate(accessToken: string | undefined): Promise<Principal> {
    if (!accessToken) throw new AuthenticationError()
    try {
      const { verifyAccessToken } = await import('../infrastructure/tokens')
      const claims = await verifyAccessToken(accessToken)
      const principal = await this.repository.loadPrincipal(
        claims.sessionId,
        claims.userId,
      )
      if (!principal) throw new AuthenticationError()
      return principal
    } catch (error) {
      if (error instanceof AuthenticationError) throw error
      throw new AuthenticationError()
    }
  }

  async refresh(refreshToken: string | undefined) {
    const decoded = refreshToken ? decodeRefreshToken(refreshToken) : null
    if (!decoded) throw new AuthenticationError()
    const session = await this.repository.getSessionVerifier(decoded.sessionId)
    const suppliedHash = hashOpaqueSecret(decoded.secret)
    if (
      !session ||
      session.revokedAt ||
      session.absoluteExpiresAt <= new Date() ||
      session.idleExpiresAt <= new Date() ||
      !this.repository.safeHashEquals(session.tokenVerifierHash, suppliedHash)
    ) {
      if (session && !session.revokedAt) {
        await this.repository.revokeSession(
          decoded.sessionId,
          session.userId,
          'auth.refresh_reuse_detected',
        )
      }
      throw new AuthenticationError()
    }

    const refreshSecret = generateOpaqueSecret()
    const now = new Date()
    const idleExpiresAt = new Date(
      Math.min(
        session.absoluteExpiresAt.getTime(),
        now.getTime() + getAuthConfig().idleTtlSeconds * 1000,
      ),
    )
    const rotated = await this.repository.rotateSession(
      decoded.sessionId,
      hashOpaqueSecret(refreshSecret),
      now,
      idleExpiresAt,
    )
    if (!rotated) throw new AuthenticationError()
    return this.issueTokens(session.userId, decoded.sessionId, refreshSecret)
  }

  async logout(sessionId: number, actorId?: number) {
    await this.repository.revokeSession(sessionId, actorId)
  }

  async acceptInvitation(input: unknown) {
    const value = invitationAcceptanceRequestSchema.parse(input)
    const passwordHash = await hashPassword(value.password)
    const userId = await this.repository.acceptInvitation(
      hashOpaqueSecret(value.token),
      passwordHash,
      value.displayName,
    )
    if (!userId)
      throw new AuthenticationError('Invitation is invalid or expired')
    return { userId, acceptedAt: new Date().toISOString() }
  }

  async effectiveGrants(principal: Principal) {
    return this.repository.getEffectiveGrants(principal.roles)
  }

  private async issueTokens(
    userId: number,
    sessionId: number,
    refreshSecret: string,
  ) {
    const config = getAuthConfig()
    return {
      accessToken: await signAccessToken(userId, sessionId),
      refreshToken: encodeRefreshToken(sessionId, refreshSecret),
      csrfToken: createCsrfToken(sessionId),
      accessExpiresAt: new Date(
        Date.now() + config.accessTtlSeconds * 1000,
      ).toISOString(),
      sessionId,
    }
  }
}
