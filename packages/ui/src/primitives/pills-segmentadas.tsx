import * as React from "react"

import { cn } from "../lib/utils"

/**
 * PillsSegmentadas — 2-option segmented control.
 *
 * Renders a `role="radiogroup"` with two `role="radio"` buttons. Click or
 * Enter/Space confirms; ArrowLeft / ArrowRight move focus between the two
 * options. The `value` that matches a pill gets `aria-checked="true"` and
 * `aria-pressed="true"`. A hidden native input mirrors the chosen value
 * under `name` so FormData serialises it.
 */

export interface PillsOption {
  value: string
  label: string
}

export interface PillsSegmentadasProps {
  options: readonly [PillsOption, PillsOption]
  value: string
  onChange: (value: string) => void
  name?: string
  id?: string
  label?: string
  "aria-invalid"?: "true" | "false" | boolean
  "aria-describedby"?: string
  className?: string
}

export function PillsSegmentadas({
  options,
  value,
  onChange,
  name,
  id,
  label = "Origen",
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
  className,
}: PillsSegmentadasProps) {
  const groupId = id ? `${id}-group` : undefined
  const refs = React.useRef<Array<HTMLButtonElement | null>>([])

  function move(direction: 1 | -1) {
    const idx = options.findIndex((opt) => opt.value === value)
    const next = (idx + direction + options.length) % options.length
    const nextRef = refs.current[next]
    nextRef?.focus()
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div
        id={groupId}
        role="radiogroup"
        aria-label={label}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedby}
        className="inline-flex rounded-control border bg-card p-0.5"
      >
        {options.map((opt, idx) => {
          const selected = opt.value === value
          return (
            <button
              key={opt.value}
              ref={(el) => {
                refs.current[idx] = el
              }}
              type="button"
              // biome-ignore lint/a11y/useSemanticElements: pills render as a button-styled radiogroup, not native <input type="radio">; the role=radio pattern is intentional and required for the keyboard arrow roving-tabindex.
              role="radio"
              aria-checked={selected}
              aria-pressed={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(opt.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") {
                  event.preventDefault()
                  move(1)
                } else if (event.key === "ArrowLeft") {
                  event.preventDefault()
                  move(-1)
                } else if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  onChange(opt.value)
                }
              }}
              className={cn(
                "min-h-[--h-touch] flex-1 rounded-sm px-4 text-support font-medium",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                selected ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {/* Hidden native input so FormData serialises the chosen value under `name`. */}
      <input
        type="hidden"
        name={name}
        value={value}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
    </div>
  )
}
