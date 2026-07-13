import { createFileRoute } from "@tanstack/react-router"
import { DialRoot, useDialKit } from "dialkit"
import "dialkit/styles.css"
import { useState } from "react"
import type { AreaVariant } from "#/components/dither-kit"
import {
  type BloomPreset,
  bloomOf,
  type Pm,
  type Tweaks,
  VARIANTS,
} from "#/components/dither-kit-docs/content"
import {
  ChartGallery,
  DocsFooter,
  ExtrasSection,
  HeroSection,
  InstallSection,
  KnobsSection,
  type ReplayKey,
  type Replays,
} from "#/components/dither-kit-docs/sections"
import { DitherStrip, usePageTheme } from "#/components/dither-kit-docs/ui"

export const Route = createFileRoute("/dither-kit")({
  ssr: false,
  component: DitherKitDocs,
})

function DitherKitDocs() {
  const { light, toggle: toggleTheme } = usePageTheme()
  const [pm, setPm] = useState<Pm>("npm")

  // One replay counter per showcase so a replay never re-runs its neighbours.
  const [replays, setReplays] = useState<Replays>({
    hero: 0,
    area: 0,
    bar: 0,
    line: 0,
    pie: 0,
    radar: 0,
  })
  const replay = (key: ReplayKey) =>
    setReplays((r) => ({ ...r, [key]: r[key] + 1 }))
  const replayAll = () =>
    setReplays(
      (r) =>
        Object.fromEntries(
          Object.entries(r).map(([k, v]) => [k, v + 1])
        ) as Replays
    )

  // The live tweak panel — DialKit (https://joshpuckett.me/dialkit) renders a
  // floating control surface from this config; every preview and code snippet
  // on the page follows it.
  const params = useDialKit(
    "dither-kit",
    {
      bloom: {
        preset: {
          type: "select",
          options: ["off", "low", "high", "aura", "custom"],
          default: "aura",
        },
        blur: [24, 0, 32, 1],
        brightness: [2.9, 1, 4, 0.1],
        opacity: [0.1, 0.05, 1, 0.05],
        saturate: [3, 1, 4, 0.25],
        _collapsed: true,
      },
      desktopVariant: {
        type: "select",
        options: VARIANTS,
        default: "gradient",
      },
      mobileVariant: {
        type: "select",
        options: VARIANTS,
        default: "hatched",
      },
      stacked: true,
      pieInnerRadius: [0.5, 0, 0.8, 0.05],
      entranceMs: [900, 300, 2400, 100],
      replayAll: { type: "action" },
    },
    {
      onAction: (path: string) => {
        if (path === "replayAll") replayAll()
      },
    }
  )

  const tweaks: Tweaks = {
    bloomPreset: params.bloom.preset as BloomPreset,
    blur: params.bloom.blur,
    brightness: params.bloom.brightness,
    opacity: params.bloom.opacity,
    saturate: params.bloom.saturate,
    primaryVariant: params.desktopVariant as AreaVariant,
    secondaryVariant: params.mobileVariant as AreaVariant,
    stacked: params.stacked,
    donutRadius: params.pieInnerRadius,
    duration: params.entranceMs,
  }
  const bloom = bloomOf(tweaks)

  return (
    <div
      className={`min-h-screen bg-background text-foreground ${
        light ? "dither-light" : "dark"
      }`}
    >
      <DitherStrip className="h-2 w-full" />

      <div className="mx-auto flex max-w-4xl flex-col gap-20 px-6 py-16">
        <HeroSection
          light={light}
          onToggleTheme={toggleTheme}
          tweaks={tweaks}
          bloom={bloom}
          replayToken={replays.hero}
          onReplay={() => replay("hero")}
        />
        <InstallSection pm={pm} onPmChange={setPm} />
        <ChartGallery
          pm={pm}
          tweaks={tweaks}
          bloom={bloom}
          replays={replays}
          onReplay={replay}
        />
        <KnobsSection />
        <ExtrasSection pm={pm} />
        <DocsFooter />
      </div>

      <DitherStrip className="h-2 w-full" />
      <DialRoot position="top-right" defaultOpen={false} productionEnabled />
    </div>
  )
}
