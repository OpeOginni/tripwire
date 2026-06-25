import type { WorkflowTrigger } from "@tripwire/db"

/**
 * GitHub webhook actions that should (re)run rules + workflows. Shared by the
 * webhook route dispatch and the workflow dispatcher so coverage stays in sync.
 */

/** `pull_request` actions: first open, reopen, new commits, edits, draft→ready. */
export const PR_EVAL_ACTIONS = new Set([
  "opened",
  "reopened",
  "synchronize",
  "edited",
  "ready_for_review",
])

/** `issues` actions: first open, reopen, edits. */
export const ISSUE_EVAL_ACTIONS = new Set(["opened", "reopened", "edited"])

/** Workflow trigger subtypes a given GitHub event+action should fire. */
export function workflowTriggersForEvent(
  eventType: "pull_request" | "issues" | "issue_comment",
  action: string
): WorkflowTrigger[] {
  if (eventType === "pull_request") {
    // synchronize / edited are "edits"; everything else here is an open.
    return action === "synchronize" || action === "edited"
      ? ["pr_edited"]
      : ["pr_opened"]
  }
  if (eventType === "issues") {
    return action === "edited" ? ["issue_edited"] : ["issue_opened"]
  }
  return ["comment_created"]
}
