import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tripwire/ui/tooltip"
import Dither from "#/components/shared/dither"

export type ContributorScore = {
  total: number
  globalReputation: number
  communitySignals: number
  repoHistory: number
  redFlags: number
}

type Rgb = [number, number, number]

type Segment = {
  key: "globalReputation" | "communitySignals" | "repoHistory"
  label: string
  rgb: Rgb
}

const SCORE_SEGMENTS: readonly Segment[] = [
  { key: "globalReputation", label: "Global reputation", rgb: [0.2, 0.65, 1] },
  { key: "communitySignals", label: "Community signals", rgb: [0.65, 0.55, 0.98] },
  { key: "repoHistory", label: "Repo history", rgb: [0.4, 0.88, 0.62] },
]

const RED_FLAG_RGB: Rgb = [0.96, 0.43, 0.36]

function scoreColor(total: number): string {
  if (total >= 70) return "#67E19F"
  if (total >= 40) return "#D1BC00"
  return "#F56D5D"
}

/** Tinted dither fill for one bar segment. */
function BarDither({ rgb }: { rgb: Rgb }) {
  return (
    <Dither
      waveColor={rgb}
      waveSpeed={0.03}
      waveFrequency={3}
      waveAmplitude={0.3}
      colorNum={4}
      pixelSize={2}
      enableMouseInteraction={false}
    />
  )
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

/** Dither placeholder shown while the contributor score loads. */
export function ContributorScoreBarLoading() {
  return (
    <div className="relative h-1.5 overflow-hidden rounded-full bg-tw-surface">
      <BarDither rgb={[0.36, 0.56, 0.85]} />
    </div>
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
                    className="relative h-full cursor-help overflow-hidden rounded-full"
                    style={{ width: `${value}%`, minWidth: "2px" }}
                  >
                    <BarDither rgb={segment.rgb} />
                  </div>
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
                  className="relative h-full cursor-help overflow-hidden rounded-full"
                  style={{
                    width: `${Math.abs(score.redFlags)}%`,
                    minWidth: "2px",
                  }}
                >
                  <BarDither rgb={RED_FLAG_RGB} />
                </div>
              }
            />
            <TooltipContent>Red flags</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
