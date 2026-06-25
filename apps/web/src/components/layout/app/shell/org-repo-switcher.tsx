import { useWorkspace } from "#/providers/workspace-context"
import { GithubIcon } from "@tripwire/ui/icons/github"
import {
  Menu,
  MenuTrigger,
  MenuPopup,
  MenuItem,
  MenuSeparator,
} from "@tripwire/ui/menu"
import { useAuth } from "@tripwire/auth/components"
import { useState } from "react"
import {
  MenuChevronDownIcon10,
  PlusStrokeIcon11,
  SearchLoupeOutlineIcon14,
  SmallCheckStrokeIcon12,
} from "@tripwire/ui/icons/app-chrome-icons"
import { CreateOrgDialog } from "#/components/layout/app/orgs/create-org-dialog"

export function OrgSwitcher() {
  const { org, orgs, setOrg, isLoading } = useWorkspace()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
  }

  if (orgs.length === 0) {
    if (!isLoading) return null
    return (
      <span className="flex h-8 cursor-default items-center gap-1.5 rounded-[10px] bg-tw-card px-2.5 text-[13px] text-tw-text-tertiary">
        {org?.logo ? (
          <img src={org.logo} alt="" className="h-4 w-4 rounded-full" />
        ) : (
          <div
            className="relative size-5 shrink-0 overflow-hidden rounded-full bg-tw-card bg-cover bg-center opacity-70"
            style={{
              backgroundImage: user?.image
                ? `url('${user.image}')`
                : "url('https://i.pravatar.cc/80?img=12')",
            }}
          />
        )}
        <span className="max-w-[120px] truncate leading-none">
          {org?.name ?? "Loading…"}
        </span>
      </span>
    )
  }

  return (
    <Menu open={open} onOpenChange={handleOpenChange}>
      <MenuTrigger className="flex h-8 cursor-pointer items-center gap-1.5 rounded-[10px] bg-tw-card px-2.5 text-tw-text-muted transition-colors hover:text-tw-text-primary">
        {org?.logo ? (
          <img src={org.logo} alt="" className="h-4 w-4 rounded-full" />
        ) : (
          <div
            className="relative size-5 shrink-0 overflow-hidden rounded-full bg-tw-card bg-cover bg-center"
            style={{
              backgroundImage: user?.image
                ? `url('${user.image}')`
                : "url('https://i.pravatar.cc/80?img=12')",
            }}
          />
        )}
        <span className="max-w-[120px] truncate text-[13px] leading-none text-tw-text-primary">
          {org?.name ?? "Select org"}
        </span>
        <MenuChevronDownIcon10 className="text-tw-text-tertiary" />
      </MenuTrigger>
      <MenuPopup
        align="end"
        className="w-[220px] max-w-[calc(100vw-1rem)] border-tw-border bg-tw-card"
      >
        {orgs.map((o) => (
          <MenuItem
            key={o.id}
            onClick={() => {
              setOrg(o)
            }}
            className="flex items-center justify-between"
          >
            <span className="flex min-w-0 items-center gap-2">
              {o.logo ? (
                <img src={o.logo} alt="" className="h-4 w-4 rounded-full" />
              ) : (
                <div
                  className="relative size-5 shrink-0 overflow-hidden rounded-full bg-tw-card bg-cover bg-center"
                  style={{
                    backgroundImage: user?.image
                      ? `url('${user.image}')`
                      : "url('https://i.pravatar.cc/80?img=12')",
                  }}
                />
              )}
              <span className="min-w-0 truncate">{o.name}</span>
            </span>
            {org?.id === o.id && (
              <SmallCheckStrokeIcon12 className="shrink-0 text-tw-accent" />
            )}
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem
          onClick={() => {
            setTimeout(() => setCreateOpen(true), 0)
          }}
          className="flex items-center gap-2 text-tw-text-secondary"
        >
          <PlusStrokeIcon11 className="text-tw-text-tertiary" />
          Create new org
        </MenuItem>
      </MenuPopup>
      <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
    </Menu>
  )
}

export function RepoSwitcher() {
  const { repo, repos, setRepo, isLoading } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) setQuery("")
  }

  const showFilter = repos.length > 8
  const trimmedQuery = query.trim().toLowerCase()
  const filtered = trimmedQuery
    ? repos.filter((r) => r.fullName.toLowerCase().includes(trimmedQuery))
    : repos

  if (repos.length === 0) {
    if (isLoading) {
      return (
        <span className="flex h-8 cursor-default items-center gap-1.5 rounded-[10px] bg-tw-card px-2.5 text-[13px] text-tw-text-tertiary">
          <GithubIcon className="h-5 w-5 shrink-0 text-tw-text-primary opacity-70" />
          <span className="max-w-[160px] truncate leading-none">
            {repo?.name ?? "Loading repos…"}
          </span>
        </span>
      )
    }
    return (
      <span className="flex h-8 items-center rounded-[10px] bg-tw-card px-2.5 text-[13px] text-tw-text-tertiary">
        No repos
      </span>
    )
  }

  return (
    <Menu open={open} onOpenChange={handleOpenChange}>
      <MenuTrigger className="flex h-8 cursor-pointer items-center gap-1.5 rounded-[10px] bg-tw-card px-2.5 text-tw-text-muted transition-colors hover:text-tw-text-primary">
        <GithubIcon className="h-5 w-5 text-tw-text-primary" />
        <span className="max-w-[160px] truncate text-[13px] leading-none text-tw-text-primary">
          {repo?.name ?? "Select repo"}
        </span>
        <MenuChevronDownIcon10 className="text-tw-text-tertiary" />
      </MenuTrigger>
      <MenuPopup
        align="end"
        className="w-[320px] max-w-[calc(100vw-1rem)] border-tw-border bg-tw-card p-0"
      >
        {showFilter && (
          <div className="relative border-b border-tw-border p-1.5">
            <SearchLoupeOutlineIcon14 className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-tw-text-muted" />
            <input
              aria-label="Filter repositories"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Filter repositories…"
              className="h-8 w-full rounded-md bg-tw-inner pr-2.5 pl-8 text-[12px] text-tw-text-primary placeholder:text-tw-text-muted focus:outline-none"
            />
          </div>
        )}
        <div className="max-h-[300px] overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <div className="px-2.5 py-3 text-center text-[12px] text-tw-text-muted">
              No matches
            </div>
          ) : (
            filtered.map((r) => {
              const [owner, ...rest] = r.fullName.split("/")
              const name = rest.join("/") || owner
              const isSelected = repo?.id === r.id
              return (
                <MenuItem
                  key={r.id}
                  onClick={() => {
                    setRepo(r)
                  }}
                  className="flex items-center gap-2.5"
                  title={r.fullName}
                >
                  <GithubIcon
                    className={`size-4 shrink-0 ${isSelected ? "text-tw-text-primary" : "text-tw-text-tertiary"}`}
                  />
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-[12px] font-medium text-tw-text-primary">
                      {name}
                    </span>
                    {rest.length > 0 && (
                      <span className="truncate text-[10px] text-tw-text-muted">
                        {owner}
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <SmallCheckStrokeIcon12 className="ml-auto shrink-0 text-tw-accent" />
                  )}
                </MenuItem>
              )
            })
          )}
        </div>
      </MenuPopup>
    </Menu>
  )
}

export function OrgRepoSwitcher() {
  return (
    <div className="flex items-center gap-1.5">
      <OrgSwitcher />
      <RepoSwitcher />
    </div>
  )
}
