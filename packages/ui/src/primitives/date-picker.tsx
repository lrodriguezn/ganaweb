import * as PopoverPrimitive from "@radix-ui/react-popover"
import { format, isAfter, isBefore, parseISO, startOfDay, subYears } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import * as React from "react"
import { type DayButtonProps, DayPicker } from "react-day-picker"
import "react-day-picker/style.css"

import { cn } from "../lib/utils"
import { Button } from "./button"

/**
 * DatePicker — vendored primitive per the v1.3 form spec.
 *
 * Controlled via `value: string` (ISO `yyyy-mm-dd` or `""`) + `onChange(value)`.
 * Display format is es-CO `dd/mm/aaaa`. The native `<input type="date">`
 * mirroring the value carries `name` so the form submit serialises ISO.
 *
 * RN-002: any day after `maxDate` (default = today) is disabled in the
 * day grid; the trigger also has `max` on the native fallback input.
 *
 * BUG-004: the calendar uses token-only typography and sizing, two
 * month/year dropdowns for navigation, and a custom DayButton that
 * re-renders the day number with the design tokens (`text-support`,
 * `num`, `text-primary font-semibold` for today, `bg-primary
 * text-primary-foreground` for selected, `text-muted-foreground` for
 * disabled). The root carries a `ganaweb-calendar` class so the
 * responsive 36/40px cell sizing lives in globals.css without
 * per-component media queries. No hex literals, no theme-flip
 * Tailwind variants — themes re-color via the :root/.theme-* cascade.
 *
 * **CSS dependency:** this primitive imports `react-day-picker/style.css`
 * at the top of the file so the calendar grid is styled when the
 * consumer renders `<DatePicker />`. The CSS ships as part of the
 * `@ganaweb/ui` bundle (via tsup) and is injected once when the
 * consumer imports the primitive. **Consumers MUST NOT import the CSS
 * themselves** — that would create duplicate selectors.
 *
 * **Test runner note:** the `tsx`-based unit tests in `apps/web` need a
 * Node loader that ignores CSS imports, otherwise the runtime
 * chokes on `react-day-picker/style.css`. The loader is wired in
 * `apps/web/package.json` (or via `node --import`).
 */

function toIsoDate(date: Date | null | undefined): string {
  if (!date) return ""
  return format(date, "yyyy-MM-dd")
}

function toDisplayDate(value: string): string {
  if (!value) return ""
  try {
    return format(parseISO(value), "dd/MM/yyyy")
  } catch {
    return ""
  }
}

/**
 * `LOOKBACK_YEARS` — default window for the caption year dropdown.
 * Five years covers livestock purchase and birth history while keeping
 * the dropdown short enough to scan quickly.
 */
const LOOKBACK_YEARS = 5

/**
 * `GANAWEB_CALENDAR_ROOT` — marker class on the DayPicker root so the
 * responsive 36/40px cell sizing lives in globals.css (one breakpoint,
 * one cascade, no per-component media queries).
 */
const GANAWEB_CALENDAR_ROOT = "ganaweb-calendar"

/**
 * `CALENDAR_CLASSNAMES` — token-only class names for the BUG-004
 * calendar. The deprecated `caption_label` / `weekday` keys keep the
 * contract testable; the custom `TokenDayButton` handles the per-day
 * modifier classes (today / selected / disabled / outside) because the
 * day number text lives inside the day button, not the day cell.
 *
 * Tokens used: `text-support` (14px), `text-caption` (12px),
 * `text-muted-foreground`, `font-semibold` (600), `font-medium` (500).
 * No hex literals, no theme-flip Tailwind variants — themes re-color
 * via the :root/.theme-* cascade.
 */
const CALENDAR_CLASSNAMES = {
  // Caption label "Julio 2026" rendered with dropdown nav: 14px / 600.
  caption_label: "text-support font-semibold",
  // Weekday header "lu ma mi ju vi sá do": 12px / 500 muted.
  weekday: "text-caption text-muted-foreground font-medium",
  // Root carries the marker for the responsive 36/40px sizing in globals.css.
  root: GANAWEB_CALENDAR_ROOT,
} as const

/**
 * `TokenDayButton` — custom DayButton that applies the BUG-004 token
 * hierarchy to the day number. react-day-picker v9 places modifier
 * classes (`today`, `selected`, `disabled`) on the day CELL, not the
 * button; the day number the user reads lives inside the button. So we
 * re-derive the modifier classes here and merge them with the base
 * `text-support num` styling.
 */
function TokenDayButton(props: DayButtonProps) {
  const { className, modifiers, ...buttonProps } = props
  const isToday = modifiers.today
  const isSelected = modifiers.selected
  const isDisabled = modifiers.disabled
  const isOutside = modifiers.outside
  const todayClass = isToday && !isSelected ? "text-primary font-semibold" : ""
  const selectedClass = isSelected ? "bg-primary text-primary-foreground" : ""
  const disabledClass = isDisabled ? "text-muted-foreground" : ""
  const outsideClass = isOutside && !isSelected ? "opacity-60" : ""
  const classes = cn(
    "text-support num",
    todayClass,
    selectedClass,
    disabledClass,
    outsideClass,
    className,
  )
  return <button {...buttonProps} type="button" className={classes} />
}

export interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  name?: string
  id?: string
  placeholder?: string
  disabled?: boolean
  minDate?: Date | undefined
  maxDate?: Date
  "aria-invalid"?: "true" | "false" | boolean
  "aria-describedby"?: string
  className?: string
  /**
   * Optional slot rendered below the calendar inside the popover
   * (separated by `border-t p-3`). Used by FechaNacimientoField to
   * embed "Estimar por edad" inside the popover (CA-UI-013).
   * Default undefined — existing consumers unaffected.
   */
  footerChildren?: React.ReactNode
}

export function DatePicker({
  value,
  onChange,
  name,
  id,
  placeholder = "dd/mm/aaaa",
  disabled = false,
  minDate,
  maxDate,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
  className,
  footerChildren,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const effectiveMin = minDate ? startOfDay(minDate) : undefined
  const effectiveMax = startOfDay(maxDate ?? new Date())
  // BUG-004: bound the caption dropdown window. `endMonth` is the max
  // date (capped at today by RN-002); `startMonth` defaults to
  // LOOKBACK_YEARS before endMonth, which keeps the year dropdown
  // short while still covering realistic purchase and birth history.
  const endMonth = effectiveMax
  const startMonth = effectiveMin ?? subYears(endMonth, LOOKBACK_YEARS)
  const selected = value ? parseISO(value) : undefined
  const display = toDisplayDate(value)

  return (
    <span className={cn("inline-flex flex-col gap-1", className)}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <Button
            type="button"
            variant="outline"
            id={id}
            disabled={disabled}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedby}
            className="min-h-[--h-touch] w-full justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 size-4" aria-hidden="true" />
            <span className={cn(!display && "text-muted-foreground")}>
              {display || placeholder}
            </span>
          </Button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            side="bottom"
            align="start"
            sideOffset={4}
            collisionPadding={8}
            className="z-50 rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-none"
          >
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={(date) => {
                if (!date) return
                onChange(toIsoDate(date))
                setOpen(false)
              }}
              disabled={(day) =>
                isAfter(startOfDay(day), effectiveMax) ||
                (effectiveMin ? isBefore(startOfDay(day), effectiveMin) : false)
              }
              locale={es}
              defaultMonth={selected ?? effectiveMax}
              captionLayout="dropdown"
              startMonth={startMonth}
              endMonth={endMonth}
              classNames={CALENDAR_CLASSNAMES}
              components={{ DayButton: TokenDayButton }}
            />
            {footerChildren ? (
              <div className="border-t p-3">{footerChildren}</div>
            ) : null}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
      {/* Hidden native input so FormData serialises ISO under `name`. */}
      <input
        type="date"
        name={name}
        value={value}
        min={effectiveMin ? format(effectiveMin, "yyyy-MM-dd") : undefined}
        max={format(effectiveMax, "yyyy-MM-dd")}
        onChange={(event) => onChange(event.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
    </span>
  )
}
