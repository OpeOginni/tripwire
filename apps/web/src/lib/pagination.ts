/**
 * Build the windowed list of page tokens for a pagination control:
 * first/last pages always shown, the current page flanked by neighbours,
 * and "ellipsis" markers bridging the gaps. Collapses to a plain 1..n run
 * when there are few enough pages to show them all.
 */
export function buildPageItems(
  current: number,
  total: number
): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const items: Array<number | "ellipsis"> = [1]
  const left = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)
  if (left > 2) items.push("ellipsis")
  for (let p = left; p <= right; p++) items.push(p)
  if (right < total - 1) items.push("ellipsis")
  items.push(total)
  return items
}
