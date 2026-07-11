import { useNavigate } from "@tanstack/react-router"
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

export function LoginPage() {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()

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
      <div className="flex flex-col items-center gap-4">
        <Button
          disabled
          variant="outline"
          size="sm"
          className="border-[#CDCDCD] bg-white text-black opacity-60"
        >
          Log in
        </Button>
        <p className="max-w-xs text-center text-[13px] leading-relaxed text-tw-text-secondary">
          Sign-ups are paused for now — we're keeping things small while we
          rework a few things under the hood. Check back soon.
        </p>
      </div>
    </div>
  )
}
