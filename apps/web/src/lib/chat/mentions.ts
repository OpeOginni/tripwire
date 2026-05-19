export type ListedUserStatus = "blacklist" | "whitelist" | "github"

export interface ListedUserSuggestion {
  githubUsername: string
  avatarUrl?: string | null
  list: ListedUserStatus
}

export interface MentionTrigger {
  query: string
  start: number
  end: number
}

/** Max list-based @ suggestions (GitHub-resolved row can prepend before slicing). */
export const MAX_LISTED_USER_SUGGESTIONS = 6

const MAX_SUGGESTIONS = MAX_LISTED_USER_SUGGESTIONS

export function getMentionTrigger(
  value: string,
  cursorPosition: number
): MentionTrigger | null {
  const beforeCursor = value.slice(0, cursorPosition)
  const match = beforeCursor.match(/(^|\s)@([A-Za-z0-9_-]*)$/)
  if (!match) return null

  const query = match[2] ?? ""
  const start = cursorPosition - query.length - 1

  return {
    query,
    start,
    end: cursorPosition,
  }
}

export function buildListedUserSuggestions(
  users: ListedUserSuggestion[],
  query: string
): ListedUserSuggestion[] {
  const normalizedQuery = query.trim().replace(/^@/, "").toLowerCase()
  const seen = new Set<string>()
  const suggestions: ListedUserSuggestion[] = []

  for (const user of users) {
    const usernameKey = user.githubUsername.toLowerCase()
    if (seen.has(usernameKey)) continue
    if (normalizedQuery && !usernameKey.startsWith(normalizedQuery)) continue

    seen.add(usernameKey)
    suggestions.push(user)
  }

  return suggestions.slice(0, MAX_SUGGESTIONS)
}

const GITHUB_LOGIN_AT_AFTER_BOUNDARY = /(^|\s)@([A-Za-z0-9_-]+)/g

/**
 * Every `@login` token after start-of-string or ASCII whitespace must have a
 * resolved mention chip whose `githubUsername` matches case-insensitively
 * (otherwise send stays blocked — avoids spoofing `@` pasted into email-like text).
 *
 * Returned handles preserve their first casing for display/errors.
 */
export function listGithubAtMentionsMissingChips(
  text: string,
  chippedGithubUsernamesLower: ReadonlySet<string>
): readonly string[] {
  const missing: string[] = []
  const seen = new Set<string>()
  GITHUB_LOGIN_AT_AFTER_BOUNDARY.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = GITHUB_LOGIN_AT_AFTER_BOUNDARY.exec(text)) !== null) {
    const login = match[2]
    const key = login.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    if (!chippedGithubUsernamesLower.has(key)) {
      missing.push(login)
    }
  }
  return missing
}

export function replaceMentionTrigger(
  value: string,
  trigger: MentionTrigger,
  username: string
): { value: string; cursorPosition: number } {
  const before = value.slice(0, trigger.start)
  const after = value.slice(trigger.end)
  const inserted = `@${username}`
  const needsSpaceAfter = after.length === 0 || /^\s/.test(after)
  const nextValue = `${before}${inserted}${needsSpaceAfter ? "" : " "}${after}`
  const cursorPosition =
    before.length + inserted.length + (needsSpaceAfter ? 0 : 1)

  return { value: nextValue, cursorPosition }
}
