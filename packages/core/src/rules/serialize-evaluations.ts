import type { RuleEvaluation } from "../filter-pipeline"

/**
 * Full per-rule detail persisted in `pipeline_*` event metadata so the event
 * detail page can render a complete checks timeline (the live pipeline result
 * keeps `reason`/`action`/`nearMiss` that the older summary dropped).
 */
export function serializeEvaluations(evals: RuleEvaluation[]) {
  return evals.map((e) => ({
    rule: e.rule,
    passed: e.passed,
    nearMiss: e.nearMiss,
    reason: e.reason,
    action: e.action,
    actual: e.actual,
    threshold: e.threshold,
  }))
}
