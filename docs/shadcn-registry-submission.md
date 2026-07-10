# Submitting Dither Kit to the shadcn registry directory

This registers the `@dither-kit` namespace in shadcn's open-source registry index,
so anyone can `npx shadcn@latest add @dither-kit/<chart>` without configuring a URL.

## Pre-flight (all verified ✓)

- Registry is public and live at the canonical host (direct `200`, no redirect):
  - Index: <https://www.tripwire.sh/r/registry.json>
  - Items: `core`, `area-chart`, `bar-chart`, `pie-chart`, `radar-chart`, `dither-kit`
- Flat registry — `registry.json` + `<name>.json` at the root of `/r/`.
- Index (`registry.json`) items carry **no** `content` property (rule #4).
  Served item files *do* include `content` — required for install, and matches
  merged registries like `@threecn`.
- Every `@dither-kit/*` `registryDependency` resolves to a real item.

> Source of truth is `scripts/build-registry.mjs`; run `bun run registry:build`
> to regenerate `apps/web/public/r/*` if anything changes.

## The entry to add

Append this object to the `items` array in
[`apps/v4/registry/directory.json`](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/directory.json)
in a fork of `shadcn-ui/ui`:

```json
{
  "name": "@dither-kit",
  "homepage": "https://www.tripwire.sh/dither-kit",
  "url": "https://www.tripwire.sh/r/{name}.json",
  "description": "Composable, dithered charts for shadcn/ui — area, line, bar, pie & radar on a tiny ordered-dither canvas engine. Inspired by Evil Charts.",
  "logo": "<svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'><rect x='3' y='13' width='5' height='8' rx='1' fill='var(--foreground)' fill-opacity='.25'/><rect x='9.5' y='8' width='5' height='13' rx='1' fill='var(--foreground)' fill-opacity='.55'/><rect x='16' y='3' width='5' height='18' rx='1' fill='var(--foreground)'/></svg>"
}
```

## Steps

1. Fork <https://github.com/shadcn-ui/ui> and clone the fork.
2. Add the entry above to the end of `apps/v4/registry/directory.json`'s `items` array
   (mind the trailing comma on the previous entry).
3. From the repo root: `pnpm validate:registries`.
4. Open a PR to `shadcn-ui/ui` titled e.g. `feat: add @dither-kit to registry directory`.
