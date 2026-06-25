import {
  issueAuthorSchema,
  prAuthorSchema,
  repoIdentitySchema,
  senderLoginSchema,
} from "./webhook-schemas"

export const githubRevalidationSignalKeys = {
  user: (input: { username: string }) => `user:${input.username.toLowerCase()}`,
  repo: (input: { owner: string; repo: string }) =>
    `repo:${input.owner.toLowerCase()}/${input.repo.toLowerCase()}`,
  installationAccess: "installationAccess",
} as const

function getRepositoryIdentity(payload: unknown) {
  const parsed = repoIdentitySchema.safeParse(payload)
  if (!parsed.success) return null
  return {
    owner: parsed.data.repository.owner.login,
    repo: parsed.data.repository.name,
  }
}

function getSenderLogin(payload: unknown) {
  const parsed = senderLoginSchema.safeParse(payload)
  return parsed.success ? parsed.data.sender.login : null
}

function getPullRequestAuthorLogin(payload: unknown) {
  const parsed = prAuthorSchema.safeParse(payload)
  return parsed.success ? parsed.data.pull_request.user.login : null
}

function getIssueAuthorLogin(payload: unknown) {
  const parsed = issueAuthorSchema.safeParse(payload)
  return parsed.success ? parsed.data.issue.user.login : null
}

/**
 * Map an incoming GitHub webhook delivery to the set of signal keys whose
 * cached payloads should be considered stale on next read.
 *
 * Cheap: returns string keys. Doesn't query the DB; the caller passes the
 * result to `markGitHubRevalidationSignals`.
 */
export function getGitHubWebhookRevalidationSignalKeys(
  event: string,
  payload: unknown
): string[] {
  if (
    event === "installation" ||
    event === "installation_repositories" ||
    event === "github_app_authorization"
  ) {
    return [githubRevalidationSignalKeys.installationAccess]
  }

  const repository = getRepositoryIdentity(payload)
  if (!repository) return []

  if (event === "pull_request") {
    const author = getPullRequestAuthorLogin(payload)
    const keys = [
      githubRevalidationSignalKeys.repo({
        owner: repository.owner,
        repo: repository.repo,
      }),
    ]
    if (author) {
      keys.push(githubRevalidationSignalKeys.user({ username: author }))
    }
    return keys
  }

  if (event === "issues") {
    const author = getIssueAuthorLogin(payload)
    const keys = [
      githubRevalidationSignalKeys.repo({
        owner: repository.owner,
        repo: repository.repo,
      }),
    ]
    if (author) {
      keys.push(githubRevalidationSignalKeys.user({ username: author }))
    }
    return keys
  }

  if (event === "issue_comment") {
    // Comments don't change the contributor's PR/issue counts but they do
    // change the repo's activity surface. Sender is bumped because we may
    // cache "user X's recent activity" reads.
    const sender = getSenderLogin(payload)
    const keys = [
      githubRevalidationSignalKeys.repo({
        owner: repository.owner,
        repo: repository.repo,
      }),
    ]
    if (sender) {
      keys.push(githubRevalidationSignalKeys.user({ username: sender }))
    }
    return keys
  }

  if (event === "push" || event === "create" || event === "delete") {
    return [
      githubRevalidationSignalKeys.repo({
        owner: repository.owner,
        repo: repository.repo,
      }),
    ]
  }

  return []
}
