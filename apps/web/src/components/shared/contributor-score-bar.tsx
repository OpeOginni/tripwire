import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tripwire/ui/tooltip"

export type ContributorScore = {
  total: number
  globalReputation: number
  communitySignals: number
  repoHistory: number
  redFlags: number
}

type Segment = {
  key: "globalReputation" | "communitySignals" | "repoHistory"
  label: string
  color: string
}

const SCORE_SEGMENTS: readonly Segment[] = [
  { key: "globalReputation", label: "Global reputation", color: "#34A6FF" },
  { key: "communitySignals", label: "Community signals", color: "#A78BFA" },
  { key: "repoHistory", label: "Repo history", color: "#67E19F" },
]

function scoreColor(total: number): string {
  if (total >= 70) return "#67E19F"
  if (total >= 40) return "#D1BC00"
  return "#F56D5D"
}

export function ContributorScoreBadge({ total }: { total: number }) {
  const color = scoreColor(total)
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-medium"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {total}/100
    </span>
  )
}

export function ContributorScoreBar({ score }: { score: ContributorScore }) {
  return (
    <TooltipProvider delay={120}>
      <div className="flex h-1.5 gap-[1px] overflow-hidden rounded-full bg-tw-surface">
        {SCORE_SEGMENTS.map((segment) => {
          const value = score[segment.key]
          if (value <= 0) return null
          return (
            <Tooltip key={segment.key}>
              <TooltipTrigger
                render={
                  <div
                    className="h-full cursor-help rounded-full transition-all"
                    style={{
                      width: `${value}%`,
                      minWidth: "2px",
                      backgroundColor: segment.color,
                    }}
                  />
                }
              />
              <TooltipContent>{segment.label}</TooltipContent>
            </Tooltip>
          )
        })}
        {score.redFlags < 0 && (
          <Tooltip>
            <TooltipTrigger
              render={
                <div
                  className="h-full cursor-help rounded-full"
                  style={{
                    width: `${Math.abs(score.redFlags)}%`,
                    minWidth: "2px",
                    backgroundColor: "#F56D5D",
                  }}
                />
              }
            />
            <TooltipContent>Red flags</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
