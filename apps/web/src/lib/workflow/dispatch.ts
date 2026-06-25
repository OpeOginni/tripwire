import { and, eq } from "drizzle-orm"
import { db } from "@tripwire/db/client"
import {
  workflowRuns,
  workflows,
  type WorkflowDefinition,
  type WorkflowTrigger,
} from "@tripwire/db"
import { executeWorkflow } from "@tripwire/core/workflow-executor"
import { fetchWorkflowRunContext } from "#/lib/workflow/simulation"
import {
  performWorkflowActions,
  type WorkflowActionNode,
} from "#/lib/workflow/enforce"

export interface WorkflowDispatchArgs {
  repoId: string
  installationId: number
  repoFullName: string
  /** Trigger subtypes this event should fire (e.g. ["pr_opened"]). */
  triggers: WorkflowTrigger[]
  username: string
  userId?: number
  kind: "pr" | "issue"
  /** PR or issue number. */
  number: number
}

function triggerSubtypes(def: WorkflowDefinition): Set<string> {
  return new Set(
    (def.nodes ?? [])
      .filter((n) => n.type === "trigger")
      .map((n) => (n.data?.trigger as string | undefined) ?? "manual")
  )
}

function actionNodeData(
  def: WorkflowDefinition,
  nodeId: string
): Record<string, unknown> {
  return (def.nodes ?? []).find((n) => n.id === nodeId)?.data ?? {}
}

/**
 * Run every enabled workflow whose trigger matches this event. Each run is
 * recorded in `workflow_runs`; the in-flight unique index dedupes concurrent
 * deliveries. Observe-first: steps are always logged, but GitHub/list actions
 * only fire for workflows in enforce mode.
 */
export async function runWorkflowsForEvent(
  args: WorkflowDispatchArgs
): Promise<void> {
  const rows = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.repoId, args.repoId), eq(workflows.enabled, true)))
  if (rows.length === 0) return

  const wanted = new Set(args.triggers)
  const matching = rows.filter((w) => {
    const subs = triggerSubtypes(w.definition)
    for (const t of wanted) if (subs.has(t)) return true
    return false
  })
  if (matching.length === 0) return

  const { userData, contentText } = await fetchWorkflowRunContext({
    repoId: args.repoId,
    username: args.username,
    ref: `#${args.number}`,
    kind: args.kind,
  })

  for (const wf of matching) {
    await runOneWorkflow(wf, args, userData?.data ?? {}, contentText).catch(
      (err) => console.error("[Workflow] dispatch failed:", wf.id, err)
    )
  }
}

async function runOneWorkflow(
  wf: typeof workflows.$inferSelect,
  args: WorkflowDispatchArgs,
  userData: Record<string, unknown>,
  contentText: string | null
): Promise<void> {
  // Reserve the run; the partial-unique in-flight index drops duplicates.
  const [run] = await db
    .insert(workflowRuns)
    .values({
      workflowId: wf.id,
      repoId: args.repoId,
      pullNumber: args.number,
      status: "running",
      triggerKind: "webhook",
      targetUsername: args.username,
      startedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning({ id: workflowRuns.id })
  if (!run) return

  try {
    const def = wf.definition
    const nodes = (def.nodes ?? []).map((n) => ({
      id: n.id,
      type: n.type,
      data: n.data ?? {},
    }))
    const edges = (def.edges ?? []).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
    }))
    const ctx: Record<string, unknown> = { ...userData }
    if (contentText) ctx.contentText = contentText

    const steps = executeWorkflow(nodes, edges, ctx)
    const reached = steps.filter(
      (s) => s.type === "action" && s.status === "executed"
    )

    let actions: unknown[] = reached.map((s) => ({
      nodeId: s.nodeId,
      action: actionNodeData(def, s.nodeId).action ?? s.subtype,
      performed: false,
      detail: "observe-only",
    }))

    if (wf.enforce && reached.length > 0) {
      const actionNodes: WorkflowActionNode[] = reached.map((s) => ({
        nodeId: s.nodeId,
        data: actionNodeData(def, s.nodeId),
      }))
      actions = await performWorkflowActions({
        installationId: args.installationId,
        repoFullName: args.repoFullName,
        repoId: args.repoId,
        kind: args.kind,
        number: args.number,
        username: args.username,
        userId: args.userId,
        actionNodes,
      })
    }

    await db
      .update(workflowRuns)
      .set({
        status: "completed",
        completedAt: new Date(),
        result: { steps, actions, enforce: wf.enforce },
      })
      .where(eq(workflowRuns.id, run.id))
  } catch (err) {
    await db
      .update(workflowRuns)
      .set({
        status: "failed",
        completedAt: new Date(),
        error: err instanceof Error ? err.message : String(err),
      })
      .where(eq(workflowRuns.id, run.id))
  }
}
