import { sql } from "drizzle-orm"
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { user } from "./auth"
import { repositories } from "./installations"
import type { EventContentType, EventSeverity } from "./events"

/** What put this item in the review queue. */
export type ModerationSource = "rule_flag" | "report" | "new_contributor"
/** What the item's actions target. */
export type ModerationSubject = "content" | "user"
/** Queue lifecycle — an item leaves the open queue once resolved/dismissed. */
export type ModerationStatus = "open" | "resolved" | "dismissed" | "snoozed"

/**
 * The review queue. Each row is one thing a maintainer needs to decide on:
 * rule-flagged content, a human report, or a new contributor. Acting on it
 * resolves the row and logs the action to the (read-only) events ledger.
 */
export const moderationItems = pgTable(
  "moderation_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    source: text("source").$type<ModerationSource>().notNull(),
    subject: text("subject").$type<ModerationSubject>().notNull(),
    status: text("status").$type<ModerationStatus>().notNull().default("open"),
    severity: text("severity")
      .$type<EventSeverity>()
      .notNull()
      .default("warning"),
    title: text("title").notNull(),
    detail: text("detail"),
    contentType: text("content_type").$type<EventContentType>(),
    githubRef: text("github_ref"),
    ruleName: text("rule_name"),
    targetGithubUsername: text("target_github_username"),
    targetGithubUserId: integer("target_github_user_id"),
    /** Originating event, so the item can deep-link into the Events ledger. */
    eventId: uuid("event_id"),
    reportedById: text("reported_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    resolvedById: text("resolved_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at"),
    /** Action taken at resolution (e.g. "allow", "delete", "blacklist"). */
    resolution: text("resolution"),
    snoozedUntil: timestamp("snoozed_until"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("moderation_repo_status_idx").on(t.repoId, t.status),
    index("moderation_repo_status_severity_idx").on(
      t.repoId,
      t.status,
      t.severity
    ),
  ]
)

/**
 * Watchlist — "keep an eye on" users. No enforcement (unlike blacklist); a
 * watched user's activity is elevated in the review queue.
 */
export const watchlistEntries = pgTable(
  "watchlist_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    githubUsername: text("github_username").notNull(),
    githubUserId: integer("github_user_id"),
    avatarUrl: text("avatar_url"),
    note: text("note"),
    addedById: text("added_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("watchlist_repo_idx").on(t.repoId),
    uniqueIndex("watchlist_repo_username_uniq").on(
      t.repoId,
      sql`lower(${t.githubUsername})`
    ),
  ]
)
