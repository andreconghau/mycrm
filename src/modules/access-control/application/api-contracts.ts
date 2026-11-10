import { z } from 'zod'
import { roleCodes } from '../domain/types'

export const positiveIdSchema = z.coerce.number().int().positive()

export const loginRequestSchema = z.object({
  email: z
    .email()
    .max(320)
    .transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(128),
})

export const invitationAcceptanceRequestSchema = z.object({
  token: z.string().min(32).max(512),
  password: z.string().min(15).max(128),
  displayName: z.string().trim().min(2).max(120).optional(),
})

export const roleAssignmentRequestSchema = z.object({
  roleCode: z.enum(roleCodes),
  active: z.boolean(),
  reason: z.string().trim().min(3).max(500),
})

export const selfProfileRequestSchema = z
  .object({
    displayName: z.string().trim().min(2).max(120),
  })
  .strict()

export const disableUserRequestSchema = z.object({
  reason: z.string().trim().min(3).max(500),
})

export const createTeamRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
})

export const assignTeamMemberRequestSchema = z.object({
  userId: z.number().int().positive(),
})

export const marketMembershipRequestSchema = z.object({
  userId: z.number().int().positive(),
  active: z.boolean(),
})
