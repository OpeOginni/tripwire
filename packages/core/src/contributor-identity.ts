// GitHub App accounts (`name[bot]`) and conventional bot suffixes
// (`name-bot`, `name_bot`). Won't false-positive on `abbot`, `robotic`.
const BOT_SUFFIX = /(?:\[bot\]|[-_]bot)$/

export function isBotOrGhost(username: string | null | undefined): boolean {
  if (!username) return true
  const lower = username.toLowerCase()
  if (lower === "ghost") return true
  return BOT_SUFFIX.test(lower)
}
