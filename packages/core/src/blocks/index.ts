import type { WorkflowNodeType } from "@tripwire/db"
import type { Block, EvalContext, EvalResult } from "./types"

import { prOpened } from "./triggers/pr-opened"
import { prEdited } from "./triggers/pr-edited"
import { issueOpened } from "./triggers/issue-opened"
import { issueEdited } from "./triggers/issue-edited"
import { commentCreated } from "./triggers/comment-created"
import { contributorFirstInteraction } from "./triggers/contributor-first-interaction"
import { schedule } from "./triggers/schedule"
import { scheduleDaily } from "./triggers/schedule-daily"
import { scheduleWeekly } from "./triggers/schedule-weekly"
import { manual } from "./triggers/manual"
import { repoScan } from "./triggers/repo-scan"

import { accountAge } from "./rules/account-age"
import { minMergedPrs } from "./rules/min-merged-prs"
import { requireProfileReadme } from "./rules/require-profile-readme"
import { repoActivityMinimum } from "./rules/repo-activity-minimum"
import { maxPrsPerDay } from "./rules/max-prs-per-day"
import { maxFilesChanged } from "./rules/max-files-changed"
import { language } from "./rules/language"
import { crypto } from "./rules/crypto"
import { vouchedUsersOnly } from "./rules/vouched-users-only"
import { contributorScore } from "./rules/contributor-score"

import { compare } from "./conditions/compare"

import { andGate } from "./logic/and"
import { orGate } from "./logic/or"
import { notGate } from "./logic/not"

import { blockAction } from "./actions/block"
import { warn } from "./actions/warn"
import { log } from "./actions/log"
import { close } from "./actions/close"
import { label } from "./actions/label"
import { commentAction } from "./actions/comment"
import { addToWhitelist } from "./actions/add-to-whitelist"
import { addToBlacklist } from "./actions/add-to-blacklist"
import { removeFromWhitelist } from "./actions/remove-from-whitelist"
import { removeFromBlacklist } from "./actions/remove-from-blacklist"
import { notifySlack } from "./actions/notify-slack"
import { notifyDiscord } from "./actions/notify-discord"
import { sendWebhook } from "./actions/send-webhook"
import { requestReview } from "./actions/request-review"

import { wait } from "./delays/wait"

import { fetchGithubUser } from "./transforms/fetch-github-user"
import { computeScore } from "./transforms/compute-score"
import { fetchPrFiles } from "./transforms/fetch-pr-files"
import { scanHistory } from "./transforms/scan-history"
import { detectLanguage } from "./transforms/detect-language"

export * from "./types"
export * from "./handles"
export * from "./utils"

const TRIGGER_BLOCKS: Block[] = [
  prOpened,
  prEdited,
  issueOpened,
  issueEdited,
  commentCreated,
  contributorFirstInteraction,
  schedule,
  scheduleDaily,
  scheduleWeekly,
  manual,
  repoScan,
]

const RULE_BLOCKS: Block[] = [
  accountAge,
  minMergedPrs,
  requireProfileReadme,
  repoActivityMinimum,
  maxPrsPerDay,
  maxFilesChanged,
  language,
  crypto,
  vouchedUsersOnly,
  contributorScore,
]

const CONDITION_BLOCKS: Block[] = [compare]
const LOGIC_BLOCKS: Block[] = [andGate, orGate, notGate]
const ACTION_BLOCKS: Block[] = [
  blockAction,
  warn,
  log,
  close,
  label,
  commentAction,
  addToWhitelist,
  addToBlacklist,
  removeFromWhitelist,
  removeFromBlacklist,
  notifySlack,
  notifyDiscord,
  sendWebhook,
  requestReview,
]
const DELAY_BLOCKS: Block[] = [wait]
const TRANSFORM_BLOCKS: Block[] = [
  fetchGithubUser,
  computeScore,
  fetchPrFiles,
  scanHistory,
  detectLanguage,
]

export const BLOCKS: Block[] = [
  ...TRIGGER_BLOCKS,
  ...RULE_BLOCKS,
  ...CONDITION_BLOCKS,
  ...LOGIC_BLOCKS,
  ...ACTION_BLOCKS,
  ...DELAY_BLOCKS,
  ...TRANSFORM_BLOCKS,
]

export type NodeRegistryEntry = Block

export const NODE_REGISTRY: Block[] = BLOCKS

export function getBlock(type: string, subtype: string): Block | undefined {
  return BLOCKS.find((b) => b.type === type && b.subtype === subtype)
}

export function getNodeEntry(
  type: WorkflowNodeType,
  subtype: string
): Block | undefined {
  return getBlock(type, subtype)
}

export function getNodesByCategory(category?: string): Map<string, Block[]> {
  const map = new Map<string, Block[]>()
  for (const entry of BLOCKS) {
    if (category && entry.category !== category) continue
    const list = map.get(entry.category) ?? []
    list.push(entry)
    map.set(entry.category, list)
  }
  return map
}

export function validateNodeData(
  type: WorkflowNodeType,
  subtype: string,
  data: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const entry = getBlock(type, subtype)
  if (!entry) {
    return { valid: false, errors: [`Unknown node type: ${type}/${subtype}`] }
  }
  const errors: string[] = []
  for (const param of entry.params) {
    if (!param.required) continue
    const value = data[param.key]
    if (value === undefined || value === null || value === "") {
      errors.push(`Missing required param: ${param.key}`)
    }
  }
  return { valid: errors.length === 0, errors }
}

export function resolveSubtype(
  type: string,
  data: Record<string, unknown>
): string {
  switch (type) {
    case "trigger":
      return (data.trigger as string) ?? "manual"
    case "rule":
      return (data.rule as string) ?? "accountAge"
    case "condition":
      return "custom"
    case "logic":
      return (data.gate as string) ?? "AND"
    case "action":
      return (data.action as string) ?? "block"
    case "delay":
      return "wait"
    case "transform":
      return (data.transform as string) ?? "fetch_github_user"
    default:
      return "unknown"
  }
}

export interface NodeEvaluator {
  requiredContext: NonNullable<Block["requiredContext"]>
  evaluate(data: Record<string, unknown>, ctx: EvalContext): EvalResult
}

function asEvaluator(block: Block): NodeEvaluator {
  return {
    requiredContext: block.requiredContext ?? [],
    evaluate: block.evaluate,
  }
}

export function getEvaluator(
  type: string,
  subtype: string
): NodeEvaluator | undefined {
  const block = getBlock(type, subtype)
  return block ? asEvaluator(block) : undefined
}

export function getEvaluatorForNode(
  type: string,
  data: Record<string, unknown>
): NodeEvaluator | undefined {
  const subtype = resolveSubtype(type, data)
  return getEvaluator(type, subtype)
}

export {
  prOpened,
  prEdited,
  issueOpened,
  issueEdited,
  commentCreated,
  contributorFirstInteraction,
  schedule,
  scheduleDaily,
  scheduleWeekly,
  manual,
  repoScan,
  accountAge,
  minMergedPrs,
  requireProfileReadme,
  repoActivityMinimum,
  maxPrsPerDay,
  maxFilesChanged,
  language,
  crypto,
  vouchedUsersOnly,
  contributorScore,
  compare,
  andGate,
  orGate,
  notGate,
  blockAction,
  warn,
  log,
  close,
  label,
  commentAction,
  addToWhitelist,
  addToBlacklist,
  removeFromWhitelist,
  removeFromBlacklist,
  notifySlack,
  notifyDiscord,
  sendWebhook,
  requestReview,
  wait,
  fetchGithubUser,
  computeScore,
  fetchPrFiles,
  scanHistory,
  detectLanguage,
}
