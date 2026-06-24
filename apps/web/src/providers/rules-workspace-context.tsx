import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { authClient } from "@tripwire/auth/client"
import {
  getRouteApi,
  useBlocker,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs"
import { toastFromError } from "#/lib/toast-error"
import { toastManager } from "@tripwire/ui/toast"
import {
  isRulesCustomPath,
  rulesPathForTab,
  rulesWorkspaceTabFromPath,
  type RulesWorkspaceTab,
} from "#/constants/rules-tab-paths"
import type { RuleConfig } from "@tripwire/db"
import { env } from "@tripwire/env/client"
import { useTRPC } from "#/integrations/trpc/react"
// Narrow subpath: avoids pulling the server-only events/reputation/filter
// modules (which transitively reach the live db client).
import {
  areRuleConfigsEqual,
  getRuleConfigChanges,
  normalizeRuleConfig,
  revertRuleConfigChange,
} from "@tripwire/core/rules/config-draft"
import { useWorkspace } from "#/providers/workspace-context"

const rulesRouteApi = getRouteApi("/_app/$orgHandle/rules")

function useRulesWorkspaceValue() {
  const { orgHandle } = rulesRouteApi.useParams()
  const navigate = useNavigate()
  const { repo, repos, isLoading } = useWorkspace()
  const { data: session } = authClient.useSession()
  const isAdmin = session?.user?.role === "admin"
  const repoId = repo?.id
  const trpc = useTRPC()
  const githubAppSlug = env.VITE_GITHUB_APP_SLUG ?? "tripwire-app"
  const customHubPath: string = `/${orgHandle}/rules/custom`
  const queryClient = useQueryClient()
  const [draftConfig, setDraftConfig] = useState<RuleConfig | null>(null)
  const [showSavedState, setShowSavedState] = useState(false)

  const configQueryKey = trpc.rules.getConfig.queryKey({ repoId: repoId! })

  const configQuery = useQuery(
    trpc.rules.getConfig.queryOptions(
      { repoId: repoId! },
      { enabled: !!repoId, staleTime: 30 * 1000 }
    )
  )

  const serverConfig = normalizeRuleConfig(configQuery.data)
  const activeConfig = draftConfig ?? serverConfig
  const changes = getRuleConfigChanges(serverConfig, activeConfig)
  const dirty = changes.length > 0

  const updateConfig = useMutation(
    trpc.rules.updateConfig.mutationOptions({
      onError: (err) =>
        toastFromError(err, { fallbackTitle: "Failed to update rule" }),
    })
  )

  useEffect(() => {
    setDraftConfig(null)
    setShowSavedState(false)
  }, [repoId])

  useEffect(() => {
    if (draftConfig && areRuleConfigsEqual(draftConfig, serverConfig)) {
      setDraftConfig(null)
    }
  }, [draftConfig, serverConfig])

  useEffect(() => {
    if (!showSavedState) return

    const timeout = window.setTimeout(() => {
      setShowSavedState(false)
    }, 1800)

    return () => window.clearTimeout(timeout)
  }, [showSavedState])

  const leaveBlocker = useBlocker({
    shouldBlockFn: () => dirty,
    withResolver: true,
    disabled: !dirty,
  })

  const toggleRule = <K extends keyof RuleConfig>(key: K, enabled: boolean) => {
    if (updateConfig.isPending) return

    setDraftConfig((currentDraft) => {
      const baseConfig = currentDraft ?? serverConfig
      return normalizeRuleConfig({
        ...baseConfig,
        [key]: enabled
          ? { ...baseConfig[key], enabled: true }
          : { ...serverConfig[key], enabled: false },
      })
    })
  }

  const updateRuleValue = <K extends keyof RuleConfig>(
    key: K,
    patch: Partial<RuleConfig[K]>
  ) => {
    if (updateConfig.isPending) return

    setDraftConfig((currentDraft) => {
      const baseConfig = currentDraft ?? serverConfig
      return normalizeRuleConfig({
        ...baseConfig,
        [key]: { ...baseConfig[key], ...patch },
      })
    })
  }

  const toggleScope = (
    field: "pullRequests" | "issues" | "comments",
    value: boolean
  ) => {
    if (updateConfig.isPending) return
    setDraftConfig((currentDraft) => {
      const baseConfig = currentDraft ?? serverConfig
      return normalizeRuleConfig({
        ...baseConfig,
        contentScope: { ...baseConfig.contentScope, [field]: value },
      })
    })
  }

  const handleSave = async () => {
    if (!repoId || !dirty) return

    try {
      const savedConfig = await updateConfig.mutateAsync({
        repoId,
        config: activeConfig,
      })
      queryClient.setQueryData(configQueryKey, savedConfig)
      setDraftConfig(null)
      setShowSavedState(true)
      void queryClient.invalidateQueries({ queryKey: configQueryKey })
    } catch {
      // Error state is surfaced via the mutation toast.
    }
  }

  const handleDiscard = () => {
    if (updateConfig.isPending) return
    setDraftConfig(null)
    setShowSavedState(false)
  }

  const handleRevert = (changeId: string) => {
    if (updateConfig.isPending) return

    setDraftConfig((currentDraft) => {
      const baseConfig = currentDraft ?? serverConfig
      return revertRuleConfigChange(serverConfig, baseConfig, changeId)
    })
  }

  const whitelistQuery = useQuery(
    trpc.whitelist.list.queryOptions(
      { repoId: repoId! },
      { enabled: !!repoId, staleTime: 30 * 1000 }
    )
  )

  const whitelistUsers = (whitelistQuery.data ?? []).map((entry) => ({
    username: entry.githubUsername,
    avatarUrl:
      entry.avatarUrl ?? `https://github.com/${entry.githubUsername}.png`,
  }))

  const addWhitelist = useMutation(
    trpc.whitelist.add.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.whitelist.list.queryKey({ repoId: repoId! }),
        })
      },
    })
  )

  const removeWhitelist = useMutation(
    trpc.whitelist.remove.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.whitelist.list.queryKey({ repoId: repoId! }),
        })
      },
    })
  )

  const blacklistQuery = useQuery(
    trpc.blacklist.list.queryOptions(
      { repoId: repoId! },
      { enabled: !!repoId, staleTime: 30 * 1000 }
    )
  )

  const blacklistUsers = (blacklistQuery.data ?? []).map((entry) => ({
    username: entry.githubUsername,
    avatarUrl:
      entry.avatarUrl ?? `https://github.com/${entry.githubUsername}.png`,
  }))

  const addBlacklist = useMutation(
    trpc.blacklist.add.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.blacklist.list.queryKey({ repoId: repoId! }),
        })
      },
    })
  )

  const removeBlacklist = useMutation(
    trpc.blacklist.remove.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.blacklist.list.queryKey({ repoId: repoId! }),
        })
      },
    })
  )

  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const activeTab = rulesWorkspaceTabFromPath(pathname, orgHandle)
  const isCustomRoute = isRulesCustomPath(pathname, orgHandle)

  const navigateToRulesTab = (tab: RulesWorkspaceTab) => {
    void navigate({ href: rulesPathForTab(orgHandle, tab) })
  }

  const suggestedQuery = useQuery({
    ...trpc.whitelist.suggestedContributors.queryOptions({ repoId: repoId! }),
    enabled: !!repoId && activeTab === "people",
    staleTime: 5 * 60 * 1000,
  })

  const [searchQuery, setSearchQuery] = useState("")

  const [
    { rule: configureRule, configure: configureFlag },
    setConfigureParams,
  ] = useQueryStates({
    rule: parseAsString,
    configure: parseAsBoolean.withDefault(false),
  })

  const ruleConfigureProps = (key: keyof RuleConfig) => {
    const rule = activeConfig[key]
    const scopeOverride =
      rule && typeof rule === "object" && "scopeOverride" in rule
        ? (rule.scopeOverride as
            | { pullRequests?: boolean; issues?: boolean; comments?: boolean }
            | undefined)
        : undefined
    return {
      configureOpen: configureFlag && configureRule === key,
      onConfigureOpenChange: (open: boolean) =>
        setConfigureParams(
          open
            ? { rule: key, configure: true }
            : { rule: null, configure: false }
        ),
      globalScope: activeConfig.contentScope,
      scopeOverride,
      onScopeOverrideChange: (
        next:
          | { pullRequests?: boolean; issues?: boolean; comments?: boolean }
          | undefined
      ) => updateRuleValue(key, { scopeOverride: next } as never),
    }
  }

  const requestsQuery = useQuery(
    trpc.requests.list.queryOptions(
      { repoId: repoId!, status: "pending" },
      { enabled: !!repoId, staleTime: 90 * 1000 }
    )
  )
  const pendingRequestCount = requestsQuery.data?.length ?? 0

  const vouchRequestsQuery = useQuery(
    trpc.vouches.listRequests.queryOptions(
      { status: "pending" },
      { staleTime: 90 * 1000 }
    )
  )
  const pendingVouchCount = vouchRequestsQuery.data?.length ?? 0

  const customRulesQuery = useQuery(
    trpc.customRules.list.queryOptions(
      { repoId: repoId! },
      { enabled: !!repoId, staleTime: 30 * 1000 }
    )
  )
  const customRuleCount = customRulesQuery.data?.length ?? 0

  const decideVouchRequest = useMutation(
    trpc.vouches.decideRequest.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.vouches.listRequests.queryKey(),
        })
      },
      onError: (err) =>
        toastFromError(err, {
          fallbackTitle: "Failed to decide vouch request",
        }),
    })
  )

  const decideRequest = useMutation(
    trpc.requests.decide.mutationOptions({
      onSuccess: (_, vars) => {
        toastManager.add({
          title:
            vars.decision === "approve" ? "Request approved" : "Request denied",
          type: "success",
        })
        queryClient.invalidateQueries({
          queryKey: trpc.requests.list.queryKey({
            repoId: repoId!,
            status: "pending",
          }),
        })
        queryClient.invalidateQueries({
          queryKey: trpc.whitelist.list.queryKey({ repoId: repoId! }),
        })
        queryClient.invalidateQueries({
          queryKey: trpc.blacklist.list.queryKey({ repoId: repoId! }),
        })
      },
      onError: (e) => toastFromError(e, { fallbackTitle: "Action failed" }),
    })
  )

  const activeCount = [
    activeConfig.languageRequirement.enabled,
    activeConfig.minMergedPrs.enabled,
    activeConfig.accountAge.enabled,
    activeConfig.maxPrsPerDay.enabled,
    activeConfig.maxFilesChanged.enabled,
    activeConfig.repoActivityMinimum.enabled,
    activeConfig.requireProfileReadme.enabled,
    activeConfig.cryptoAddressDetection.enabled,
    activeConfig.vouchedUsersOnly.enabled,
  ].filter(Boolean).length

  const showEmptyInstall = !isLoading && repos.length === 0

  const isDataLoading =
    isLoading ||
    configQuery.isLoading ||
    whitelistQuery.isLoading ||
    blacklistQuery.isLoading

  // Build rule list for filtering
  const allRules = [
    {
      key: "languageRequirement" as const,
      title: "Language requirement",
      searchable: "language requirement english",
    },
    {
      key: "minMergedPrs" as const,
      title: "Minimum merged PRs",
      searchable: "minimum merged prs pull requests",
    },
    {
      key: "accountAge" as const,
      title: "Account age",
      searchable: "account age days old new",
    },
    {
      key: "maxPrsPerDay" as const,
      title: "Max PRs per day",
      searchable: "max prs per day rate limit",
    },
    {
      key: "maxFilesChanged" as const,
      title: "Max files changed",
      searchable: "max files changed",
    },
    {
      key: "repoActivityMinimum" as const,
      title: "Repo activity minimum",
      searchable: "repo activity minimum public repos",
    },
    {
      key: "requireProfileReadme" as const,
      title: "Require profile README",
      searchable: "require profile readme",
    },
    {
      key: "cryptoAddressDetection" as const,
      title: "Crypto address detection",
      searchable: "crypto address detection bitcoin ethereum",
    },
    {
      key: "vouchedUsersOnly" as const,
      title: "Vouched users only",
      searchable: "vouched users whitelist allowlist trusted contributors",
    },
  ]

  const q = searchQuery.toLowerCase()
  const matchesSearch = (r: (typeof allRules)[number]) =>
    !q || r.searchable.includes(q) || r.title.toLowerCase().includes(q)

  const installedRuleKeys = allRules.filter((r) => activeConfig[r.key].enabled)

  return {
    orgHandle,
    pathname,
    repo,
    repoId,
    repos,
    isLoading,
    isAdmin,
    githubAppSlug,
    customHubPath,
    showEmptyInstall,
    isDataLoading,
    isCustomRoute,
    activeTab,
    navigateToRulesTab,
    customRuleCount,
    activeCount,
    activeConfig,
    serverConfig,
    toggleScope,
    pendingRequestCount,
    pendingVouchCount,
    searchQuery,
    setSearchQuery,
    ruleConfigureProps,
    toggleRule,
    updateRuleValue,
    allRules,
    matchesSearch,
    installedRuleKeys,
    suggestedQuery,
    blacklistUsers,
    whitelistUsers,
    addBlacklist,
    removeBlacklist,
    addWhitelist,
    removeWhitelist,
    requestsQuery,
    vouchRequestsQuery,
    decideRequest,
    decideVouchRequest,
    updateConfig,
    dirty,
    changes,
    showSavedState,
    handleSave,
    handleDiscard,
    handleRevert,
    leaveBlocker,
  }
}

export type RulesWorkspaceContextValue = ReturnType<
  typeof useRulesWorkspaceValue
>

const RulesWorkspaceContext = createContext<RulesWorkspaceContextValue | null>(
  null
)

export function useRulesWorkspace(): RulesWorkspaceContextValue {
  const ctx = useContext(RulesWorkspaceContext)
  if (!ctx) {
    throw new Error(
      "useRulesWorkspace must be used within RulesWorkspaceProvider"
    )
  }
  return ctx
}

export function RulesWorkspaceProvider({ children }: { children: ReactNode }) {
  const value = useRulesWorkspaceValue()
  return (
    <RulesWorkspaceContext.Provider value={value}>
      {children}
    </RulesWorkspaceContext.Provider>
  )
}
