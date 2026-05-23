import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { user } from "./auth"
import { repositories } from "./installations"

export type OnboardingUseCase =
  | "ai_prs"
  | "crypto_bots"
  | "spam_issues"
  | "takeover_attempts"
  | "vouched_only"
  | "other"

export type OnboardingTeamSize = "solo" | "small" | "medium" | "large"

export type OnboardingSource =
  | "twitter"
  | "github"
  | "friend"
  | "hacker_news"
  | "other"

export interface OnboardingSetupAnswers {
  useCases: OnboardingUseCase[]
  priorIncident: string | null
  teamSize: OnboardingTeamSize | null
}

export const onboardingState = pgTable("onboarding_state", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  completedStep1: boolean("completed_step_1").notNull().default(false),
  completedStep2: boolean("completed_step_2").notNull().default(false),
  completedStep3: boolean("completed_step_3").notNull().default(false),
  completedStep4: boolean("completed_step_4").notNull().default(false),
  mainRepoId: uuid("main_repo_id").references(() => repositories.id, {
    onDelete: "set null",
  }),
  source: text("source").$type<OnboardingSource>(),
  setupAnswers: jsonb("setup_answers").$type<OnboardingSetupAnswers>(),
  gettingStartedDismissed: boolean("getting_started_dismissed")
    .notNull()
    .default(false),
  configuredRules: boolean("configured_rules").notNull().default(false),
  reviewedRiskAlerts: boolean("reviewed_risk_alerts").notNull().default(false),
  vouchedSomeone: boolean("vouched_someone").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export type OnboardingState = typeof onboardingState.$inferSelect
export type NewOnboardingState = typeof onboardingState.$inferInsert
