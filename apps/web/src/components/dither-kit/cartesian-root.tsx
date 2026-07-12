"use client"

import {
  Children,
  type ComponentType,
  isValidElement,
  type ReactNode,
} from "react"
import {
  type ChartConfig,
  ChartContext,
  type ChartType,
  type Margins,
  useChartController,
} from "./chart-context"
import { CommonChartContext } from "./common-context"
import type { BloomInput } from "./dither-paint"
import { cn } from "./lib"
import type { StackType } from "./scales"
import { useChartDimensions } from "./use-chart-dimensions"

type Row = Record<string, unknown>

const DEFAULT_MARGINS: Margins = {
  top: 10,
  right: 12,
  bottom: 22,
  left: 36,
}

export type CartesianChartProps<TData extends Row> = {
  data: TData[]
  config: ChartConfig
  children: ReactNode
  stackType?: StackType
  margins?: Partial<Margins>
  className?: string
  animate?: boolean
  animationDuration?: number
  replayToken?: number // change to re-play the entrance without remounting
  /** Set false for a decorative sparkline: keeps the hover lift but no scrub
   * crosshair / tooltip. */
  interactive?: boolean
  /** Controlled crosshair position (e.g. a committed point) — overrides the
   * internal hover when set. */
  markerIndex?: number | null
  /** Parent-driven hover (e.g. the whole card/row) — lifts the fill. */
  hovered?: boolean
  /** Glow on the dither fill. */
  bloom?: BloomInput
  /** Only bloom while the chart is hovered. */
  bloomOnHover?: boolean
  /** Fires with the scrubbed index as the pointer moves (null on leave). */
  onHoverChange?: (index: number | null) => void
  defaultSelectedDataKey?: string | null
  onSelectionChange?: (key: string | null) => void
}

/** Which render layer a composed part targets — defaults to the front SVG. */
function layerOf(node: ReactNode): "back" | "dom" | "svg" {
  if (!isValidElement(node) || typeof node.type === "string") return "svg"
  return (node.type as { chartLayer?: "back" | "dom" }).chartLayer ?? "svg"
}

/**
 * Shared root for the cartesian dither charts (area, line, bar). Owns the
 * measured size, the shared context, and pointer interaction; every visual is
 * composed as children. Back chrome (grid) sits behind the dither canvas; the
 * canvas paints the fill/line/bars + stars; front chrome (axes, dots) and DOM
 * legend/tooltip layer on top. `chartType` drives the scales/interaction and the
 * `Canvas` prop supplies the family's painter (continuous for area/line, bars for
 * bar) — so each chart ships only its own canvas.
 */
export function CartesianRoot<TData extends Row>({
  chartType,
  Canvas,
  data,
  config,
  children,
  stackType = "default",
  margins: marginsProp,
  className,
  animate = true,
  animationDuration = 900,
  replayToken = 0,
  interactive = true,
  markerIndex = null,
  hovered = false,
  bloom = "off",
  bloomOnHover = false,
  onHoverChange,
  defaultSelectedDataKey = null,
  onSelectionChange,
}: CartesianChartProps<TData> & {
  chartType: ChartType
  Canvas: ComponentType
}) {
  const { ref, size } = useChartDimensions<HTMLDivElement>()
  const margins = { ...DEFAULT_MARGINS, ...marginsProp }

  const ctx = useChartController({
    chartType,
    data,
    config,
    stackType,
    dimensions: size,
    margins,
    animate,
    animationDuration,
    replayToken,
    markerIndex,
    hovered,
    bloom,
    bloomOnHover,
    defaultSelectedDataKey,
    onSelectionChange,
  })

  const backChildren: ReactNode[] = []
  const svgChildren: ReactNode[] = []
  const domChildren: ReactNode[] = []
  Children.forEach(children, (child) => {
    const layer = layerOf(child)
    if (layer === "back") backChildren.push(child)
    else if (layer === "dom") domChildren.push(child)
    else svgChildren.push(child)
  })

  const onMove = (clientX: number, clientY: number) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = clientX - rect.left - margins.left
    const py = clientY - rect.top - margins.top
    const index = ctx.indexAtX(px)
    ctx.setHoverIndex(index)
    ctx.setCursorX(clientX - rect.left)
    // Per-layer hover: pick the series whose surface is nearest the pointer so
    // each layer's dither lifts on its own (depth), instead of the whole chart.
    let nearest: string | null = null
    let nearestDist = Number.POSITIVE_INFINITY
    for (const key of ctx.configKeys) {
      const band = ctx.bands[key]?.[index]
      if (!band) continue
      const dist = Math.abs(ctx.y(band[1]) - py)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = key
      }
    }
    ctx.setHoverKey(nearest)
    onHoverChange?.(index)
  }

  const clearHover = () => {
    ctx.setMouseInChart(false)
    ctx.setHoverIndex(null)
    ctx.setHoverKey(null)
    onHoverChange?.(null)
  }

  return (
    <ChartContext value={ctx}>
      <CommonChartContext value={ctx.common}>
        <div
          ref={ref}
          className={cn("relative h-full w-full", className)}
          // Let the page still scroll vertically past the chart, but claim
          // horizontal drags so a thumb-scrub doesn't scroll the page.
          style={{ touchAction: "pan-y" }}
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") ctx.setMouseInChart(true)
          }}
          onPointerDown={
            interactive
              ? (e) => {
                  if (e.pointerType === "mouse") return
                  // Touch: capture so a slide keeps scrubbing, and the captured
                  // pointer never reaches the series band's click — tapping
                  // previews the tooltip without locking selection.
                  ref.current?.setPointerCapture(e.pointerId)
                  ctx.setMouseInChart(true)
                  onMove(e.clientX, e.clientY)
                }
              : undefined
          }
          onPointerMove={
            interactive ? (e) => onMove(e.clientX, e.clientY) : undefined
          }
          onPointerUp={(e) => {
            if (e.pointerType !== "mouse") clearHover()
          }}
          onPointerCancel={(e) => {
            if (e.pointerType !== "mouse") clearHover()
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") clearHover()
          }}
        >
          {ctx.ready && backChildren.length > 0 && (
            <svg
              width={size.width}
              height={size.height}
              className="absolute inset-0 overflow-visible"
              aria-hidden
              role="presentation"
            >
              <g transform={`translate(${margins.left},${margins.top})`}>
                {backChildren}
              </g>
            </svg>
          )}
          <Canvas />
          {ctx.ready && (
            <svg
              width={size.width}
              height={size.height}
              className="absolute inset-0 overflow-visible"
              role="img"
              aria-label="Chart"
            >
              <g transform={`translate(${margins.left},${margins.top})`}>
                {svgChildren}
              </g>
            </svg>
          )}
          {domChildren}
        </div>
      </CommonChartContext>
    </ChartContext>
  )
}

export type AreaChartProps<TData extends Row> = CartesianChartProps<TData>
