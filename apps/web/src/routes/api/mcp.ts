import { createFileRoute } from "@tanstack/react-router"
import { createMcpHandler } from "mcp-handler"
import { withMcpAuth } from "better-auth/plugins"
import { auth } from "@tripwire/auth"
import { registerMcpTools, SERVER_INSTRUCTIONS } from "@tripwire/mcp"
import { tripwireTools } from "@tripwire/tools"

// The v1 Poke recipe is read-only: the MCP `needsApproval` gate isn't
// enforced over MCP (it's chat-UI only), so we expose only tools flagged
// `readOnly` to keep mutations (block, reset score, delete workflow) off
// the external surface. Unknown/unflagged tools are excluded by default.
// Flip to false — and address the write-gating follow-up — to enable writes.
const MCP_READONLY = true
const mcpTools = MCP_READONLY
  ? tripwireTools.filter((tool) => tool.readOnly === true)
  : tripwireTools

const READONLY_NOTE = `

## This connection is READ-ONLY

Only inspection tools are available here. You can investigate repos, users,
events, scores, rules, lists, and workflows, but you CANNOT change moderation
state — no blacklisting, whitelisting, rule edits, or workflow changes. If the
user asks to make a change, explain that changes are made in the Tripwire
dashboard, and offer to show them the relevant current state instead.`

const instructions = MCP_READONLY
  ? SERVER_INSTRUCTIONS + READONLY_NOTE
  : SERVER_INSTRUCTIONS

const handler = withMcpAuth(auth, (req, session) =>
  createMcpHandler(
    (server) => {
      registerMcpTools(server, session.userId, mcpTools)
    },
    {
      capabilities: {
        tools: {},
      },
      instructions,
    },
    {
      basePath: "/api",
      verboseLogs: false,
      maxDuration: 60,
    }
  )(req)
)

export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      GET: ({ request }) => handler(request),
      POST: ({ request }) => handler(request),
      DELETE: ({ request }) => handler(request),
    },
  },
})
