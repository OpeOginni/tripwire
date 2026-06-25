import type { CSSProperties } from "react"
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

const RED_FLAG_COLOR = "#F56D5D"

// 4×4 ordered dither: a handful of pixels nudged lighter/darker so the fill
// reads as a couple of slight variations of the base color rather than flat.
const DITHER_OVERLAY = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'>" +
    "<rect x='0' y='0' width='1' height='1' fill='#fff' opacity='0.16'/>" +
    "<rect x='3' y='1' width='1' height='1' fill='#fff' opacity='0.16'/>" +
    "<rect x='1' y='2' width='1' height='1' fill='#000' opacity='0.16'/>" +
    "<rect x='2' y='3' width='1' height='1' fill='#000' opacity='0.16'/>" +
    "</svg>"
)}")`

function ditherStyle(color: string): CSSProperties {
  return {
    backgroundColor: color,
    backgroundImage: DITHER_OVERLAY,
    backgroundSize: "4px 4px",
    backgroundRepeat: "repeat",
    imageRendering: "pixelated",
  }
}

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

/** Dithered placeholder shown while the contributor score loads. */
export function ContributorScoreBarLoading() {
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full"
      style={ditherStyle("#4A5B7A")}
    />
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
                    className="h-full cursor-help rounded-full"
                    style={{
                      width: `${value}%`,
                      minWidth: "2px",
                      ...ditherStyle(segment.color),
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
                    ...ditherStyle(RED_FLAG_COLOR),
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
