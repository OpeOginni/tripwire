import { useQuery } from "@tanstack/react-query"
import { getRouteApi, useNavigate } from "@tanstack/react-router"
import { authClient } from "@tripwire/auth/client"
import { useEffect } from "react"
import { Button } from "@tripwire/ui/button"
import { TripwireLogo } from "@tripwire/ui/icons/tripwire-logo"

export function LoginPageSkeleton() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#191919]">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-tw-accent border-t-transparent" />
    </div>
  )
}

const loginRoute = getRouteApi("/login")

export function LoginPage() {
  const navigate = useNavigate()
  const { error } = loginRoute.useSearch()
  const { data: session, isPending } = authClient.useSession()

  const { data: loginUrl } = useQuery({
    queryKey: ["github-login-url"],
    enabled: !isPending && !session,
    queryFn: async () => {
      const { data } = await authClient.signIn.social({
        provider: "github",
        callbackURL: "/rules",
        // New-user creation is blocked server-side; failures land back here
        // so we can show the "sign-ups paused" note instead of a raw error.
        errorCallbackURL: "/login",
        disableRedirect: true,
      })
      return data?.url ?? null
    },
  })

  useEffect(() => {
    if (!isPending && session) {
      navigate({ to: "/" })
    }
  }, [session, isPending, navigate])

  if (isPending) {
    return <LoginPageSkeleton />
  }

  return (
    <div className="flex h-screen w-full shrink-0 flex-col items-center justify-center gap-8 bg-[#191919] px-6 antialiased [font-synthesis:none]">
      <TripwireLogo className="h-10 w-10 text-white" />
      <div className="flex flex-col items-center gap-3">
        {error ? (
          <p className="max-w-xs text-center text-[13px] leading-relaxed text-tw-text-secondary">
            We're not taking new sign-ups right now. If you already have access,
            log in below.
          </p>
        ) : (
          <span className="text-[14px] text-tw-text-secondary">
            Already have access?
          </span>
        )}
        <Button
          render={<a href={loginUrl ?? undefined} />}
          loading={!loginUrl}
          variant="outline"
          size="sm"
          className="border-[#CDCDCD] bg-white text-black hover:bg-white/90"
        >
          Log in
        </Button>
        {error ? null : (
          <p className="max-w-xs text-center text-[12px] leading-relaxed text-tw-text-muted">
            New sign-ups are paused for now — check back soon.
          </p>
        )}
      </div>
    </div>
  )
}
