"use client"

import type * as React from "react"
import { cn } from "./utils"
import { buttonVariants } from "./button"
import {
  ChevronLeftStrokeIcon14,
  ChevronRightIndicatorIcon12,
} from "./icons/app-chrome-icons"

/**
 * Client-side pagination controls (shadcn-style API, tokenized for the
 * project's always-dark palette). `PaginationLink` renders a real button
 * since pages are switched in-app rather than via URL.
 */
function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  )
}

function PaginationItem(props: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & React.ComponentProps<"button">

function PaginationLink({
  className,
  isActive,
  type = "button",
  ...props
}: PaginationLinkProps) {
  return (
    <button
      type={type}
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? "outline" : "ghost",
          size: "icon-sm",
        }),
        "text-[13px] text-tw-text-secondary data-[active=true]:text-tw-text-primary",
        className
      )}
      {...props}
    />
  )
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      className={cn("w-auto gap-1 px-2", className)}
      {...props}
    >
      <ChevronLeftStrokeIcon14 />
      <span className="text-[13px]">Prev</span>
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      className={cn("w-auto gap-1 px-2", className)}
      {...props}
    >
      <span className="text-[13px]">Next</span>
      <ChevronRightIndicatorIcon12 />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        "flex size-7 items-center justify-center text-[13px] text-tw-text-muted sm:size-6",
        className
      )}
      {...props}
    >
      …
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}
