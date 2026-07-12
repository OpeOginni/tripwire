import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

export type Dimensions = { width: number; height: number }

/**
 * True only while `ref`'s element is on-screen and the tab is visible. Lets a
 * chart's requestAnimationFrame paint loop park itself completely when scrolled
 * out of view or backgrounded — so a page stacking several dither charts stops
 * running every loop at once (the fix for phones heating up). Falls back to
 * always-active where IntersectionObserver is unavailable.
 */
export function useCanvasActive<T extends Element>(ref: RefObject<T | null>) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      setActive(true)
      return
    }

    let onScreen = false
    const update = () => setActive(onScreen && !document.hidden)
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry?.isIntersecting ?? false
        update()
      },
      // Start a touch before it scrolls in so the entrance is ready.
      { rootMargin: "128px" }
    )
    io.observe(el)
    document.addEventListener("visibilitychange", update)
    return () => {
      io.disconnect()
      document.removeEventListener("visibilitychange", update)
    }
  }, [ref])

  return active
}

/**
 * Tracks an element's CSS pixel size via {@link ResizeObserver}. Uses
 * `clientWidth`/`clientHeight` (the layout size) rather than
 * `getBoundingClientRect()` so a parent `layoutId` morph — which scales the
 * element via a transform — can't trick the chart into measuring a scaled size
 * and locking its canvas to it.
 */
export function useChartDimensions<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState<Dimensions>({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => {
      const width = Math.max(0, el.clientWidth)
      const height = Math.max(0, el.clientHeight)
      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev // guard against repeat fires
          : { width, height }
      )
    }

    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])

  return { ref, size }
}
