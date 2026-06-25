import { type QueryKey, useQueryClient } from "@tanstack/react-query"
import { type RefObject, useEffect, useMemo, useRef } from "react"
import { useTRPC } from "#/integrations/trpc/react"

/**
 * Maps a query key (or set of keys) to the GitHub revalidation signals
 * it depends on. When any of those signals is bumped, the queries are
 * invalidated and re-fetched.
 */
export type GitHubSignalPollTarget = {
  queryKey: QueryKey
  signalKeys: readonly string[]
}

/** Exported for unit tests — see use-signal-poll.test.ts. */
export const __internal = {
  signalCompositeKey: (queryKey: QueryKey, signalKey: string) =>
    signalCompositeKey(queryKey, signalKey),
  collectKeysToInvalidate: (
    targets: readonly GitHubSignalPollTarget[],
    signals: ReadonlyArray<{ signalKey: string; updatedAt: number }>,
    lastSeen: Map<string, number>
  ) => collectKeysToInvalidate(targets, signals, lastSeen),
}

/**
 * Poll interval — tight enough that a dropped webhook surfaces within
 * ~20s, loose enough that idle tabs cost almost nothing (one indexed
 * DB lookup per cycle, keyed by the page's small set of signal keys).
 */
const POLL_INTERVAL_MS = 20 * 1_000
const RESUME_SYNC_MIN_INTERVAL_MS = 2_000

function signalCompositeKey(queryKey: QueryKey, signalKey: string): string {
  // `\0` delimiter (matches diffkit) so a signalKey can't collide with
  // another (queryKey, signalKey) pair.
  return `${JSON.stringify(queryKey)}\0${signalKey}`
}

/**
 * Sync server signal timestamps with what each query has already seen.
 * Mutates `lastSeen` (per queryKey+signalKey) and returns the set of
 * signal keys whose timestamp advanced — those are what we invalidate.
 */
function collectKeysToInvalidate(
  targets: readonly GitHubSignalPollTarget[],
  signals: ReadonlyArray<{ signalKey: string; updatedAt: number }>,
  lastSeen: Map<string, number>
): string[] {
  const updated = new Set<string>()

  for (const signal of signals) {
    for (const target of targets) {
      if (!target.signalKeys.includes(signal.signalKey)) continue

      const composite = signalCompositeKey(target.queryKey, signal.signalKey)
      const previous = lastSeen.get(composite)

      if (previous === undefined) {
        // First sighting — record without invalidating. Otherwise every
        // mount would re-fetch on the first poll even though nothing
        // changed since the page rendered.
        lastSeen.set(composite, signal.updatedAt)
        continue
      }
      if (signal.updatedAt > previous) {
        lastSeen.set(composite, signal.updatedAt)
        updated.add(signal.signalKey)
      }
    }
  }

  return Array.from(updated)
}

function invalidateTargets(
  queryClient: ReturnType<typeof useQueryClient>,
  targets: readonly GitHubSignalPollTarget[],
  receivedKeys: Set<string>
): number {
  let count = 0
  for (const target of targets) {
    const matched = target.signalKeys.some((key) => receivedKeys.has(key))
    if (!matched) continue

    const state = queryClient.getQueryState(target.queryKey)
    if (
      !state ||
      state.dataUpdatedAt === 0 ||
      state.fetchStatus === "fetching"
    ) {
      continue
    }

    void queryClient.invalidateQueries({
      queryKey: target.queryKey,
      exact: true,
      refetchType: "active",
    })
    count++
  }
  return count
}

/**
 * Subscribe to revalidation signals. Polls the server every 20s and
 * also catches up on visibility/focus/online so a user coming back to
 * a stale tab sees fresh data quickly.
 *
 * Webhook arrives at the server → `github_revalidation_signal` row is
 * upserted → next poll observes the newer `updated_at` → mounted
 * queries that subscribed to that key are invalidated and refetched.
 */
export function useGitHubSignalPoll(
  targets: readonly GitHubSignalPollTarget[]
) {
  const queryClient = useQueryClient()
  const trpc = useTRPC()

  const targetsRef = useRef(targets)
  targetsRef.current = targets

  const allSignalKeys = useMemo(
    () =>
      Array.from(
        new Set(targets.flatMap((target) => [...target.signalKeys]))
      ).sort(),
    [targets]
  )
  // Stable string so the effect only re-runs when the keys actually change.
  const signalKeysKey = allSignalKeys.join(",")

  const lastSeenRef: RefObject<Map<string, number>> = useRef(
    new Map<string, number>()
  )

  useEffect(() => {
    lastSeenRef.current = new Map()
  }, [signalKeysKey])

  useEffect(() => {
    if (signalKeysKey.length === 0) return
    const keys = signalKeysKey.split(",")
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    let disposed = false
    let lastResumeSyncAt = 0

    async function syncOnce() {
      if (disposed) return
      try {
        const signals = await queryClient.fetchQuery({
          ...trpc.githubSignals.timestamps.queryOptions({ signalKeys: keys }),
          staleTime: 0,
        })
        if (disposed) return
        const updated = collectKeysToInvalidate(
          targetsRef.current,
          signals,
          lastSeenRef.current
        )
        if (updated.length > 0) {
          invalidateTargets(queryClient, targetsRef.current, new Set(updated))
        }
      } catch {
        // Best-effort: next poll cycle will retry.
      }
    }

    function schedulePoll() {
      if (disposed) return
      pollTimer = setTimeout(async () => {
        await syncOnce()
        schedulePoll()
      }, POLL_INTERVAL_MS)
    }

    function scheduleResumeSync() {
      const now = Date.now()
      if (now - lastResumeSyncAt < RESUME_SYNC_MIN_INTERVAL_MS) return
      lastResumeSyncAt = now
      void syncOnce()
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") scheduleResumeSync()
    }
    function handleFocus() {
      scheduleResumeSync()
    }
    function handleOnline() {
      scheduleResumeSync()
    }

    // Seed timestamps immediately so future bumps register as "advanced".
    void syncOnce()
    schedulePoll()
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    window.addEventListener("online", handleOnline)

    return () => {
      disposed = true
      if (pollTimer) clearTimeout(pollTimer)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("online", handleOnline)
    }
  }, [signalKeysKey, queryClient, trpc])
}
