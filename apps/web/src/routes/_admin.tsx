import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router"
import { trpcClient } from "#/integrations/tanstack-query/root-provider"

export const Route = createFileRoute("/_admin")({
  beforeLoad: async () => {
    const me = await trpcClient.auth.me.query()
    if (!me) throw redirect({ to: "/login" })
    if (!me.isAdmin) throw redirect({ to: "/home" })
  },
  component: AdminShell,
})

function AdminShell() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 bg-zinc-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs font-semibold tracking-wider text-red-300 uppercase">
              Admin
            </span>
            <span className="font-mono text-sm text-zinc-400">tripwire</span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              to="/admin/research"
              activeProps={{ className: "text-white" }}
              inactiveProps={{ className: "text-zinc-400 hover:text-white" }}
            >
              Research
            </Link>
            <Link
              to="/home"
              className="rounded border border-white/10 px-3 py-1 text-xs text-zinc-300 hover:bg-white/5"
            >
              ← Exit admin
            </Link>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
