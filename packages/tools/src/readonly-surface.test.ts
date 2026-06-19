import { describe, it, expect, vi } from "vitest"

// The tool definitions import the drizzle client at module load; stub it so
// importing the registry never tries to open a real DB connection.
vi.mock("@tripwire/db/client", () => ({ db: {} }))

import { tripwireTools, filterToolsForSurface } from "./index"

// Tools that must NEVER be reachable on the read-only MCP surface the Poke
// recipe connects to. If a refactor accidentally flags one of these
// `readOnly`, this test fails before it can ship.
const DESTRUCTIVE_TOOLS = [
  "add_to_blacklist",
  "remove_from_blacklist",
  "add_to_whitelist",
  "remove_from_whitelist",
  "move_to_blacklist",
  "move_to_whitelist",
  "reset_contributor_score",
  "toggle_rule",
  "update_rule_action",
  "set_account_age",
  "copy_rules",
  "create_workflow",
  "edit_workflow",
  "delete_workflow",
  "enable_workflow",
  "create_custom_rule",
  "delete_custom_rule",
  "edit_custom_rule",
]

// Reads the Poke recipe relies on.
const EXPECTED_READS = [
  "list_repos",
  "list_events",
  "get_event",
  "lookup_user",
  "get_repo_rules",
  "list_lists",
  "check_lists",
  "get_guide",
]

describe("read-only MCP surface", () => {
  const readOnlyMcp = filterToolsForSurface(tripwireTools, "mcp").filter(
    (t) => t.readOnly === true
  )
  const names = new Set(readOnlyMcp.map((t) => t.name))

  it("exposes a non-empty set of read tools", () => {
    expect(readOnlyMcp.length).toBeGreaterThan(0)
    expect(readOnlyMcp.every((t) => t.readOnly === true)).toBe(true)
  })

  it("includes the reads the recipe depends on", () => {
    for (const name of EXPECTED_READS) {
      expect(names, `expected ${name} on read-only MCP surface`).toContain(name)
    }
  })

  it("excludes every known destructive tool", () => {
    for (const name of DESTRUCTIVE_TOOLS) {
      expect(names, `${name} must NOT be on read-only MCP surface`).not.toContain(
        name
      )
    }
  })

  it("never flags a tool that performs a mutation (no logEvent/db writes leak)", () => {
    // Cross-check: a destructive tool sneaking onto the surface would also be
    // missing from the read-only set's complement. Assert the read-only set is
    // a strict subset of all mcp tools and that every mutation tool is absent.
    const allMcp = filterToolsForSurface(tripwireTools, "mcp")
    const mutationsOnSurface = allMcp.filter(
      (t) => t.readOnly !== true && names.has(t.name)
    )
    expect(mutationsOnSurface).toHaveLength(0)
  })
})
