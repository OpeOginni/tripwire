"use client"

import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"
import { useWebHaptics as useHaptics } from "web-haptics/react"
import { cn } from "./utils"
import { Spinner } from "./spinner"

/**
 * Variants are written against the project's `--color-tw-*` palette
 * (defined in apps/web/src/styles.css) so they render correctly in the
 * project's always-dark theme. Don't reach for `bg-popover`, `bg-accent`,
 * `border-input`, etc. — those are shadcn semantic tokens scoped to a
 * `.dark` toggle that the project doesn't carry.
 */
export const buttonVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border text-base font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-tw-accent focus-visible:ring-offset-1 focus-visible:ring-offset-tw-bg disabled:pointer-events-none disabled:opacity-50 data-loading:text-transparent data-loading:select-none sm:text-sm pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 [&_svg]:pointer-events-none [&_svg]:-mx-0.5 [&_svg]:shrink-0 [&_svg:not([class*='opacity-'])]:opacity-80 [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        /** Tall / multi-line content (empty states, pickers); overrides fixed height + nowrap. */
        card: "h-auto min-h-0 w-full justify-start p-0 whitespace-normal shadow-none sm:h-auto [&_svg]:mx-0",
        default: "h-9 px-3 sm:h-8",
        icon: "size-9 sm:size-8",
        "icon-lg": "size-10 sm:size-9",
        "icon-sm": "size-8 sm:size-7",
        "icon-xl":
          "size-11 sm:size-10 [&_svg:not([class*='size-'])]:size-5 sm:[&_svg:not([class*='size-'])]:size-4.5",
        "icon-xs":
          "size-7 rounded-md sm:size-6 not-in-data-[slot=input-group]:[&_svg:not([class*='size-'])]:size-4 sm:not-in-data-[slot=input-group]:[&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 px-3.5 sm:h-9",
        sm: "h-8 gap-1.5 px-2.5 sm:h-7",
        xl: "h-11 px-4 text-lg sm:h-10 sm:text-base [&_svg:not([class*='size-'])]:size-5 sm:[&_svg:not([class*='size-'])]:size-4.5",
        xs: "h-7 gap-1 rounded-md px-2 text-sm sm:h-6 sm:text-xs [&_svg:not([class*='size-'])]:size-4 sm:[&_svg:not([class*='size-'])]:size-3.5",
      },
      variant: {
        default:
          "border-transparent bg-tw-accent text-white shadow-sm shadow-tw-accent/20 hover:bg-tw-accent/90 data-pressed:bg-tw-accent/85 *:data-[slot=button-loading-indicator]:text-white",
        destructive:
          "border-transparent bg-tw-error text-white shadow-sm shadow-tw-error/20 hover:bg-tw-error/90 data-pressed:bg-tw-error/85 *:data-[slot=button-loading-indicator]:text-white",
        "destructive-outline":
          "border-tw-border bg-tw-card px-3 text-tw-error hover:border-tw-error/40 hover:bg-tw-error/8 data-pressed:border-tw-error/40 data-pressed:bg-tw-error/12 *:data-[slot=button-loading-indicator]:text-tw-error",
        ghost:
          "border-transparent bg-transparent text-tw-text-primary hover:bg-tw-hover-light data-pressed:bg-tw-hover-light *:data-[slot=button-loading-indicator]:text-tw-text-primary",
        link: "border-transparent bg-transparent text-tw-text-primary underline-offset-4 hover:underline data-pressed:underline *:data-[slot=button-loading-indicator]:text-tw-text-primary",
        outline:
          "border-tw-border bg-tw-card px-3 text-tw-text-primary hover:bg-tw-hover-light data-pressed:bg-tw-hover-light *:data-[slot=button-loading-indicator]:text-tw-text-primary",
        secondary:
          "border-transparent bg-tw-button-muted text-tw-text-primary hover:bg-tw-button-muted-hover data-pressed:bg-tw-button-muted-hover *:data-[slot=button-loading-indicator]:text-tw-text-primary",
      },
    },
  }
)

export type HapticTriggerType =
  | "success"
  | "warning"
  | "error"
  | "light"
  | "medium"
  | "heavy"
  | "selection"

export interface ButtonProps extends useRender.ComponentProps<"button"> {
  variant?: VariantProps<typeof buttonVariants>["variant"]
  size?: VariantProps<typeof buttonVariants>["size"]
  loading?: boolean
  haptic?: HapticTriggerType | false
}

export function Button({
  className,
  variant,
  size,
  render,
  children,
  loading = false,
  disabled: disabledProp,
  haptic,
  onClick,
  ...props
}: ButtonProps): React.ReactElement {
  const { trigger: triggerHaptic } = useHaptics()
  const isDisabled: boolean = Boolean(loading || disabledProp)
  const typeValue: React.ButtonHTMLAttributes<HTMLButtonElement>["type"] =
    render ? undefined : "button"

  const hapticType =
    haptic !== undefined
      ? haptic
      : variant === "destructive" || variant === "destructive-outline"
        ? "warning"
        : variant === "ghost" || variant === "outline" || variant === "link"
          ? "light"
          : "medium"

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (hapticType !== false) {
      triggerHaptic(hapticType)
    }
    onClick?.(e)
  }

  const defaultProps = {
    children: (
      <>
        {children}
        {loading && (
          <Spinner
            className="pointer-events-none absolute"
            data-slot="button-loading-indicator"
          />
        )}
      </>
    ),
    className: cn(buttonVariants({ className, size, variant })),
    "aria-disabled": loading || undefined,
    "data-loading": loading ? "" : undefined,
    "data-slot": "button",
    disabled: isDisabled,
    type: typeValue,
    onClick: handleClick,
  }

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(defaultProps, props),
    render,
  })
}
