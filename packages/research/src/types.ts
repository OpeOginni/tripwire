import type {
  ContributorCohort,
  PrCohort,
  ResearchRuleEvaluation,
} from "@tripwire/db/schema/research"
import type { GitHubUser, UserSignals } from "@tripwire/core/contributor-fetch"
import type { ScoreInput } from "@tripwire/core"

export type {
  ContributorCohort,
  PrCohort,
  GitHubUser,
  ResearchRuleEvaluation as RuleEvaluation,
}

export interface ProcessedContributor {
  username: string
  ghUser: GitHubUser | null
  accountCreatedAt: string | null
  accountAgeDays: number
  cohort: ContributorCohort
  status: UserSignals["status"]
  badges: string[]
  signals: Record<string, unknown>
  score: Record<string, unknown>
  evaluations: ResearchRuleEvaluation[]
  scoreInput: ScoreInput
  prCount: number
  fetchedAt: string
  error?: string
}

export interface ProcessedPr {
  prNumber: number
  repoFullName: string
  title: string
  body: string | null
  state: string
  createdAt: string
  mergedAt: string | null
  closedAt: string | null
  timeToMergeMinutes: number | null
  additions: number
  deletions: number
  changedFiles: number
  commits: number
  selfClosed: boolean | null
  labels: Array<{ name: string; color: string }>
  cohort: PrCohort
  ruleEvaluations: ResearchRuleEvaluation[]
}

export interface ProcessResult {
  contributor: ProcessedContributor
  prs: ProcessedPr[]
}

/** Subset of `ProcessedContributor` that maps 1:1 to `research_contributors` columns. */
export interface PersistedContributor {
  username: string
  accountCreatedAt: string | null
  accountAgeDays: number
  cohort: ContributorCohort
  signals: Record<string, unknown>
  score: Record<string, unknown>
  evaluations: ResearchRuleEvaluation[]
  prCount: number
  fetchedAt: string
  error?: string
}

export interface PersistedPr {
  prNumber: number
  repoFullName: string
  title: string
  body: string | null
  state: string
  createdAt: string
  mergedAt: string | null
  closedAt: string | null
  timeToMergeMinutes: number | null
  additions: number
  deletions: number
  changedFiles: number
  commits: number
  selfClosed: boolean | null
  labels: Array<{ name: string; color: string }>
  cohort: PrCohort
  ruleEvaluations: ResearchRuleEvaluation[]
}

export interface PersistedRunResult {
  contributor: PersistedContributor
  prs: PersistedPr[]
}

export function toPersisted(result: ProcessResult): PersistedRunResult {
  const {
    username,
    accountCreatedAt,
    accountAgeDays,
    cohort,
    signals,
    score,
    evaluations,
    prCount,
    fetchedAt,
    error,
  } = result.contributor
  return {
    contributor: {
      username,
      accountCreatedAt,
      accountAgeDays,
      cohort,
      signals,
      score,
      evaluations,
      prCount,
      fetchedAt,
      ...(error !== undefined ? { error } : {}),
    },
    prs: result.prs.map((pr) => ({
      prNumber: pr.prNumber,
      repoFullName: pr.repoFullName,
      title: pr.title,
      body: pr.body,
      state: pr.state,
      createdAt: pr.createdAt,
      mergedAt: pr.mergedAt,
      closedAt: pr.closedAt,
      timeToMergeMinutes: pr.timeToMergeMinutes,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changedFiles,
      commits: pr.commits,
      selfClosed: pr.selfClosed,
      labels: pr.labels,
      cohort: pr.cohort,
      ruleEvaluations: pr.ruleEvaluations,
    })),
  }
}

export interface ProcessOptions {
  cutoffDate: string
  prLimit?: number
  contextRepoId?: string
  languageCode?: string
}
