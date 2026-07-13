import { createHash } from "node:crypto"
import { Databuddy } from "@databuddy/sdk/node"
import { createFileRoute } from "@tanstack/react-router"
import { env } from "@tripwire/env/server"

/**
 * Tracked Dither Kit registry endpoint. Serves each registry item's JSON from
 * the canonical repo and counts the fetch as an install signal in Databuddy —
 * the only way to measure installs, since the raw-GitHub shorthand is a black
 * box. Deps are rewritten to self-referencing `/r/*` URLs so a bare
 * `shadcn add https://tripwire.sh/r/dither-kit.json` install is zero-config and
 * every fetch (including `core`) flows through here.
 */

const REPO_RAW =
  "https://raw.githubusercontent.com/Boring-Software-Inc/dither-kit/main/r"
const WEBSITE_ID = "09661145-7249-45d9-a9e3-f1a93e9c7266"
const NS = "@dither-kit/"
const ITEMS = new Set([
  "registry",
  "core",
  "area-chart",
  "bar-chart",
  "pie-chart",
  "radar-chart",
  "dither-kit",
])

const db = env.DATABUDDY_API_KEY
  ? new Databuddy({
      apiKey: env.DATABUDDY_API_KEY,
      websiteId: WEBSITE_ID,
      source: "registry",
    })
  : null

// Warm in-memory cache of the upstream JSON so we don't hit GitHub on every
// install; the response itself is `no-store` so each install still reaches us.
const cache = new Map<string, { raw: string; exp: number }>()

async function upstreamJson(name: string): Promise<string | null> {
  const hit = cache.get(name)
  if (hit && hit.exp > Date.now()) return hit.raw
  const res = await fetch(`${REPO_RAW}/${name}.json`)
  if (!res.ok) return null
  const raw = await res.text()
  cache.set(name, { raw, exp: Date.now() + 5 * 60_000 })
  return raw
}

/** Rewrite `@dither-kit/<x>` registryDependencies to this host's `/r/<x>.json`. */
function selfHost(raw: string, origin: string): string {
  const rewrite = (dep: string) =>
    dep.startsWith(NS) ? `${origin}/r/${dep.slice(NS.length)}.json` : dep
  const obj = JSON.parse(raw)
  if (Array.isArray(obj.registryDependencies)) {
    obj.registryDependencies = obj.registryDependencies.map(rewrite)
  }
  if (Array.isArray(obj.items)) {
    obj.items = obj.items.map((it: { registryDependencies?: string[] }) => ({
      ...it,
      registryDependencies: (it.registryDependencies ?? []).map(rewrite),
    }))
  }
  return JSON.stringify(obj)
}

function anonId(request: Request): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  const ua = request.headers.get("user-agent") ?? ""
  return createHash("sha256").update(`${ip}|${ua}`).digest("hex").slice(0, 32)
}

async function handler({ request }: { request: Request }) {
  const url = new URL(request.url)
  const name = url.pathname.split("/").pop()?.replace(/\.json$/, "") ?? ""

  if (!ITEMS.has(name)) {
    return new Response(JSON.stringify({ error: "unknown registry item" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  const raw = await upstreamJson(name)
  if (raw === null) {
    return new Response(JSON.stringify({ error: "registry item unavailable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Fire-and-forget — never block the install. Skip the index (`registry`);
  // per-item hits are the signal (core ≈ total installs, others = popularity).
  if (db && name !== "registry") {
    db.track({
      name: "registry_install",
      anonymousId: anonId(request),
      properties: {
        item: name,
        isCore: name === "core",
        ua: request.headers.get("user-agent") ?? "",
      },
    }).catch(() => {})
  }

  return new Response(selfHost(raw, url.origin), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // No shared cache, so every install reaches us and is counted.
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  })
}

export const Route = createFileRoute("/r/$name")({
  server: {
    handlers: {
      GET: handler,
    },
  },
})
