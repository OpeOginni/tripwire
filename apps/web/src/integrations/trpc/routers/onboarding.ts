import { z } from "zod"
import { and, desc, eq, inArray } from "drizzle-orm"
import { authedProcedure } from "../init"
import { assertRepoOwner } from "@tripwire/core"
import { trpcError } from "../error"
import { db } from "@tripwire/db/client"
import { onboardingState, visibilitySyncRuns } from "@tripwire/db"
import { inngest } from "#/inngest/client"
import type { TRPCRouterRecord } from "@trpc/server"

const useCaseEnum = z.enum([
  "ai_prs",
  "crypto_bots",
  "spam_issues",
  "takeover_attempts",
  "vouched_only",
  "other",
])

const teamSizeEnum = z.enum(["solo", "small", "medium", "large"])

const sourceEnum = z.enum([
  "twitter",
  "github",
  "friend",
  "hacker_news",
  "other",
])

const taskEnum = z.enum([
  "configuredRules",
  "reviewedRiskAlerts",
  "vouchedSomeone",
])

export const onboardingRouter = {
  getState: authedProcedure.query(async ({ ctx }) => {
    const [row] = await db
      .select()
      .from(onboardingState)
      .where(eq(onboardingState.userId, ctx.user.id))
      .limit(1)
    return row ?? null
  }),

  completeStep: authedProcedure
    .input(z.object({ step: z.number().int().min(1).max(4) }))
    .mutation(async ({ ctx, input }) => {
      const field = (
        {
          1: "completedStep1",
          2: "completedStep2",
          3: "completedStep3",
          4: "completedStep4",
        } as const
      )[input.step as 1 | 2 | 3 | 4]

      await db
        .insert(onboardingState)
        .values({ userId: ctx.user.id, [field]: true })
        .onConflictDoUpdate({
          target: onboardingState.userId,
          set: { [field]: true, updatedAt: new Date() },
        })
      return { success: true }
    }),

  setMainRepo: authedProcedure
    .input(z.object({ repoId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertRepoOwner(ctx.user.id, input.repoId)

      await db
        .insert(onboardingState)
        .values({
          userId: ctx.user.id,
          mainRepoId: input.repoId,
          completedStep2: true,
        })
        .onConflictDoUpdate({
          target: onboardingState.userId,
          set: {
            mainRepoId: input.repoId,
            completedStep2: true,
            updatedAt: new Date(),
          },
        })

      const [active] = await db
        .select({ id: visibilitySyncRuns.id })
        .from(visibilitySyncRuns)
        .where(
          and(
            eq(visibilitySyncRuns.repoId, input.repoId),
            inArray(visibilitySyncRuns.status, ["queued", "running"])
          )
        )
        .orderBy(desc(visibilitySyncRuns.createdAt))
        .limit(1)
      if (active) {
        return { repoId: input.repoId, syncRunId: active.id, enqueued: false }
      }

      const [created] = await db
        .insert(visibilitySyncRuns)
        .values({
          repoId: input.repoId,
          status: "queued",
          requestedById: ctx.user.id,
        })
        .returning({ id: visibilitySyncRuns.id })
      if (!created) {
        throw trpcError({
          code: "onboarding.sync_enqueue_failed",
          status: 500,
          message: "Failed to enqueue sync run",
        })
      }
      await inngest.send({
        name: "visibility/sync.requested",
        data: { runId: created.id },
      })
      return { repoId: input.repoId, syncRunId: created.id, enqueued: true }
    }),

  saveSetupAnswers: authedProcedure
    .input(
      z.object({
        useCases: z.array(useCaseEnum).max(useCaseEnum.options.length),
        priorIncident: z.string().max(2000).nullable(),
        teamSize: teamSizeEnum.nullable(),
        source: sourceEnum.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const setupAnswers = {
        useCases: input.useCases,
        priorIncident: input.priorIncident,
        teamSize: input.teamSize,
      }
      await db
        .insert(onboardingState)
        .values({
          userId: ctx.user.id,
          setupAnswers,
          source: input.source,
          completedStep3: true,
        })
        .onConflictDoUpdate({
          target: onboardingState.userId,
          set: {
            setupAnswers,
            ...(input.source ? { source: input.source } : {}),
            completedStep3: true,
            updatedAt: new Date(),
          },
        })
      return { success: true }
    }),

  markGettingStartedTask: authedProcedure
    .input(z.object({ task: taskEnum }))
    .mutation(async ({ ctx, input }) => {
      await db
        .insert(onboardingState)
        .values({ userId: ctx.user.id, [input.task]: true })
        .onConflictDoUpdate({
          target: onboardingState.userId,
          set: { [input.task]: true, updatedAt: new Date() },
        })
      return { success: true }
    }),

  dismissGettingStarted: authedProcedure.mutation(async ({ ctx }) => {
    await db
      .insert(onboardingState)
      .values({ userId: ctx.user.id, gettingStartedDismissed: true })
      .onConflictDoUpdate({
        target: onboardingState.userId,
        set: { gettingStartedDismissed: true, updatedAt: new Date() },
      })
    return { success: true }
  }),

  reset: authedProcedure.mutation(async ({ ctx }) => {
    await db
      .delete(onboardingState)
      .where(eq(onboardingState.userId, ctx.user.id))
    return { success: true }
  }),
} satisfies TRPCRouterRecord
