import * as PopoverPrimitive from "@radix-ui/react-popover"
import { format, isAfter, isBefore, parseISO, startOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import * as React from "react"
import { DayPicker } from "react-day-picker"
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
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const effectiveMin = minDate ? startOfDay(minDate) : undefined
  const effectiveMax = startOfDay(maxDate ?? new Date())
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
            />
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
