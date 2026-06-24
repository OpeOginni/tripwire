export const CONTRIBUTOR_RULE_SUBTYPES = [
  "accountAge",
  "minMergedPrs",
  "requireProfileReadme",
  "repoActivityMinimum",
  "maxFilesChanged",
  "vouchedUsersOnly",
  "contributorScore",
] as const

export type ContributorRuleSubtype = (typeof CONTRIBUTOR_RULE_SUBTYPES)[number]

export const CONTENT_RULE_SUBTYPES = ["crypto", "language"] as const

export type ContentRuleSubtype = (typeof CONTENT_RULE_SUBTYPES)[number]
