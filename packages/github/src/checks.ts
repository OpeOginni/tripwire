import { githubApi } from "./app"

export interface CheckRunInput {
  /** Check name shown on the PR (e.g. "Tripwire"). */
  name: string
  /** Commit SHA the check is reported against (the PR head). */
  headSha: string
  conclusion: "success" | "failure" | "neutral"
  /** Short title line. */
  title: string
  /** Markdown body (the per-rule checks table). */
  summary: string
}

/**
 * Create a completed Check Run on a commit so Tripwire's verdict shows in the
 * PR's checks box. Requires the App's `checks:write` permission — callers
 * should treat failures as non-fatal (the rest of the pipeline still runs).
 */
export async function createCheckRun(
  token: string,
  owner: string,
  repo: string,
  input: CheckRunInput
): Promise<unknown> {
  return githubApi(`/repos/${owner}/${repo}/check-runs`, token, {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      head_sha: input.headSha,
      status: "completed",
      conclusion: input.conclusion,
      output: { title: input.title, summary: input.summary },
    }),
  })
}
