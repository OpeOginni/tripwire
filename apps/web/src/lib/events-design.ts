import { SEVERITY_DOT_COLORS } from "#/lib/severity-design"

export type EventFeedCategory = "all" | "security" | "activity"

export type EventFeedIcon =
  | "blocked"
  | "allowed"
  | "warned"
  | "near_miss"
  | "bypass"
  | "list_add"
  | "list_remove"
  | "config"
  | "workflow"
  | "push"
  | "pr"
  | "issue"
  | "comment"
  | "star"
  | "fork"
  | "release"
  | "branch"
  | "generic"

export const EVENT_FEED_CATEGORIES = [
  { label: "All", value: "all" },
  { label: "Security", value: "security" },
  { label: "Activity", value: "activity" },
] as const satisfies readonly { label: string; value: EventFeedCategory }[]

export const EVENT_SUMMARY_ITEMS = [
  { key: "success", label: "Allowed", dot: SEVERITY_DOT_COLORS.success },
  { key: "error", label: "Blocked", dot: SEVERITY_DOT_COLORS.error },
  { key: "warning", label: "Near Misses", dot: SEVERITY_DOT_COLORS.warning },
  { key: "workflow", label: "Workflows", dot: "bg-tw-accent" },
  { key: "info", label: "Other", dot: SEVERITY_DOT_COLORS.info },
] as const
