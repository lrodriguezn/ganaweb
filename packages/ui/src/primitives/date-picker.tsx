import { format, isAfter, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { DayPicker } from "react-day-picker"
import * as React from "react"

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
  maxDate,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
  className,
}: DatePickerProps) {
  const effectiveMax = maxDate ?? new Date()
  const selected = value ? parseISO(value) : undefined
  const display = toDisplayDate(value)

  return (
    <span className={cn("inline-flex flex-col gap-1", className)}>
      <PopoverPrimitive.Root>
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
            align="start"
            sideOffset={4}
            className="z-50 rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-none"
          >
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={(date) => onChange(toIsoDate(date ?? null))}
              disabled={(day) => isAfter(day, effectiveMax)}
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
        max={format(effectiveMax, "yyyy-MM-dd")}
        onChange={(event) => onChange(event.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
    </span>
  )
}
