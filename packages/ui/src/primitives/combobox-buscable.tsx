import { Command } from "cmdk"
import { Check, ChevronDown } from "lucide-react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import * as React from "react"

import { cn } from "../lib/utils"

/**
 * ComboboxBuscable — searchable selector with id filtering.
 *
 * Renders each row as `código · nombre` (CA-UI-001 / CA-CRE-003) and
 * emits the option `value` (== `id`) on selection. `excludedIds` removes
 * matching options from the list. Hidden native <input name="…"> mirrors
 * the chosen id so FormData serialises the value.
 */

export interface ComboboxOption {
  value: string
  codigo: string
  nombre: string
}

export interface ComboboxBuscableProps {
  options: readonly ComboboxOption[]
  value?: string | null
  onChange: (value: string) => void
  excludedIds?: readonly string[]
  name?: string
  id?: string
  placeholder?: string
  searchPlaceholder?: string
  "aria-invalid"?: "true" | "false" | boolean
  "aria-describedby"?: string
  className?: string
  disabled?: boolean
}

export function ComboboxBuscable({
  options,
  value,
  onChange,
  excludedIds = [],
  name,
  id,
  placeholder = "Buscar",
  searchPlaceholder = "Buscar…",
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
  className,
  disabled = false,
}: ComboboxBuscableProps) {
  const [open, setOpen] = React.useState(false)
  const listboxId = React.useId()
  const selected = options.find((o) => o.value === value)
  const triggerText = selected ? `${selected.codigo} · ${selected.nombre}` : placeholder
  const filtered = React.useMemo(
    () => options.filter((opt) => !excludedIds.includes(opt.value)),
    [options, excludedIds],
  )
  const labelIndex = React.useMemo(() => {
    const idx = new Map<string, string>()
    for (const opt of filtered) {
      idx.set(
        opt.value,
        `${opt.codigo} ${opt.nombre}`.toLowerCase(),
      )
    }
    return idx
  }, [filtered])

  return (
    <span className={cn("inline-flex w-full flex-col gap-1", className)}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            id={id}
            // biome-ignore lint/a11y/useSemanticElements: cmdk-driven combobox uses a button + listbox, not a native <select>; this is the WAI-ARIA APG combobox pattern.
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-haspopup="listbox"
            aria-label={triggerText}
            disabled={disabled}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedby}
            className={cn(
              "flex h-12 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-support",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "[&>span]:line-clamp-1",
            )}
          >
            <span className={cn(!selected && "text-muted-foreground")}>{triggerText}</span>
            <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={4}
            className="z-50 w-[var(--radix-popover-trigger-width)] rounded-md border bg-popover text-popover-foreground shadow-md outline-none"
          >
            <Command
              filter={(value, search) => {
                const label = labelIndex.get(value) ?? ""
                if (label.includes(search.toLowerCase().trim())) return 1
                return 0
              }}
              className="flex flex-col"
            >
              <Command.Input
                placeholder={searchPlaceholder}
                className="h-10 w-full border-b bg-transparent px-3 text-support outline-none placeholder:text-muted-foreground"
              />
              <Command.List
                id={listboxId}
                // biome-ignore lint/a11y/useSemanticElements: cmdk's listbox pattern uses a div with role=listbox; the related <button role=combobox> points to it via aria-controls.
                role="listbox"
                className="max-h-72 overflow-y-auto p-1"
              >
                <Command.Empty className="px-3 py-4 text-support text-muted-foreground">
                  Sin resultados
                </Command.Empty>
                {filtered.map((option) => {
                  const isSelected = option.value === value
                  return (
                    <Command.Item
                      key={option.value}
                      value={option.value}
                      onSelect={() => {
                        onChange(option.value)
                        setOpen(false)
                      }}
                      className={cn(
                        "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-support outline-none",
                        "data-[selected=true]:bg-muted data-[selected=true]:text-foreground",
                        "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
                      )}
                    >
                      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                        {isSelected ? (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        ) : null}
                      </span>
                      <span>
                        {option.codigo} · {option.nombre}
                      </span>
                    </Command.Item>
                  )
                })}
              </Command.List>
            </Command>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
      {/* Hidden native input so FormData serialises the chosen id under `name`. */}
      <input
        type="hidden"
        name={name}
        value={value ?? ""}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
    </span>
  )
}
