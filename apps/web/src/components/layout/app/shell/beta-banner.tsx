import { useState, useSyncExternalStore } from "react"
import { Button } from "@tripwire/ui/button"
import { CloseIcon } from "@tripwire/ui/icons/close-icon"
import { cn } from "@tripwire/ui/utils"

const STORAGE_KEY = "tripwire:beta-banner:dismissed"
const EVENT_NAME = "tripwire:beta-banner-dismissed"

function subscribe(callback: () => void): () => void {
  window.addEventListener(EVENT_NAME, callback)
  return () => window.removeEventListener(EVENT_NAME, callback)
}

function getSnapshot(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) === "true"
}

function getServerSnapshot(): boolean {
  return true
}

function dismiss(): void {
  window.localStorage.setItem(STORAGE_KEY, "true")
  window.dispatchEvent(new Event(EVENT_NAME))
}

export function BetaBanner() {
  const dismissed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )
  const [closing, setClosing] = useState(false)

  if (dismissed) return null

  return (
    <div
      className={cn(
        "grid shrink-0 transition-[grid-template-rows] duration-[360ms]",
        closing ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
      )}
      style={{ transitionTimingFunction: "cubic-bezier(0.19, 1, 0.22, 1)" }}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget) dismiss()
      }}
    >
      <div className="overflow-hidden">
        <div
          className={cn(
            "relative flex items-center justify-center bg-tw-card px-10 py-2 transition-opacity duration-200",
            closing && "opacity-0"
          )}
        >
          <p className="text-[13px] leading-tight font-medium text-white">
            Tripwire is in closed beta. Please raise any issues via DM on X{" "}
            <a
              href="https://x.com/tripwiredotsh"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              @tripwiredotsh
            </a>
          </p>
          <Button
            variant="ghost"
            aria-label="Dismiss beta banner"
            className="absolute right-2 h-6 w-6 p-0 text-white hover:bg-transparent hover:opacity-70"
            onClick={() => setClosing(true)}
          >
            <CloseIcon className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
