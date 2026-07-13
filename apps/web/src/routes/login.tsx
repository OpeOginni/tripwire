import { createFileRoute } from "@tanstack/react-router"
import {
  LoginPage,
  LoginPageSkeleton,
} from "#/components/layout/auth/login-page"
import { buildSeo, formatPageTitle } from "#/lib/seo"

export const Route = createFileRoute("/login")({
  validateSearch: (
    search: Record<string, unknown>
  ): { error?: string; redirect?: string } => ({
    error: typeof search.error === "string" ? search.error : undefined,
    redirect:
      typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: LoginPage,
  pendingComponent: LoginPageSkeleton,
  head: ({ match }) =>
    buildSeo({
      path: match.pathname,
      title: formatPageTitle("Log in"),
      description:
        "Log in to Tripwire to protect your open-source repos from spam PRs, abusive accounts, and AI-generated noise.",
    }),
})
