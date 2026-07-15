import * as PopoverPrimitive from "@radix-ui/react-popover"
import { Command } from "cmdk"
import { Check, ChevronDown, Plus } from "lucide-react"
import * as React from "react"

import { EmptyState } from "../ganado/empty-state"
import { cn } from "../lib/utils"

/**
 * SelectConCreacion — searchable selector with optional "+ Crear" affordance.
 *
 * Uses `cmdk` for keyboard / type-ahead search; the `filter` callback
 * matches against the option `label` (not the value), so users type
 * the visible text. Hidden native <input name="…"> mirrors the chosen
 * id so FormData serialises the value.
 *
 * CA-UI-001: option `id` (== `value`) is what gets emitted; label is shown.
 * CA-UI-002: `+ Crear nuevo` only renders when `canCreate` is true.
 * CA-UI-004: empty list + canCreate → EmptyState with `+ Crear el primero`;
 *            empty list + !canCreate → disabled trigger + hint inline.
 */

export interface SelectOption {
  value: string
  label: string
}

export interface SelectConCreacionProps {
  options: readonly SelectOption[]
  value?: string | null
  onChange: (value: string) => void
  canCreate: boolean
  onCreate?: () => void
  name?: string
  id?: string
  placeholder?: string
  searchPlaceholder?: string
  emptyHint?: string
  "aria-invalid"?: "true" | "false" | boolean
  "aria-describedby"?: string
  className?: string
  disabled?: boolean
}

export function SelectConCreacion({
  options,
  value,
  onChange,
  canCreate,
  onCreate,
  name,
  id,
  placeholder = "Selecciona",
  searchPlaceholder = "Buscar…",
  emptyHint = "No hay opciones disponibles",
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
  className,
  disabled = false,
}: SelectConCreacionProps) {
  const [open, setOpen] = React.useState(false)
  const listboxId = React.useId()
  const selected = options.find((o) => o.value === value)
  const triggerText = selected?.label ?? placeholder
  const isEmpty = options.length === 0
  const isEmptyWithoutCreate = isEmpty && !canCreate
  const isDisabled = disabled || isEmptyWithoutCreate

  const labelIndex = React.useMemo(() => {
    const idx = new Map<string, string>()
    for (const opt of options) idx.set(opt.value, opt.label.toLowerCase())
    return idx
  }, [options])

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
            disabled={isDisabled}
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
        {isEmpty && canCreate ? (
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              align="start"
              sideOffset={4}
              className="z-50 w-[var(--radix-popover-trigger-width)] rounded-md border bg-popover text-popover-foreground shadow-md outline-none"
            >
              <EmptyState
                icon={Plus}
                title="Sin opciones"
                description="Crea la primera opción para empezar"
                actionLabel="+ Crear el primero"
                onAction={() => {
                  onCreate?.()
                  setOpen(false)
                }}
              />
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        ) : null}
        {!isEmpty ? (
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              align="start"
              sideOffset={4}
              className="z-50 w-[var(--radix-popover-trigger-width)] rounded-md border bg-popover text-popover-foreground shadow-md outline-none"
            >
              <Command
                filter={(value, search) => {
                  if (value === "__crear_nuevo__") return 1
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
                  {options.map((option) => {
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
                          {isSelected ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                        </span>
                        <span>{option.label}</span>
                      </Command.Item>
                    )
                  })}
                  {canCreate ? (
                    <Command.Item
                      value="__crear_nuevo__"
                      onSelect={() => {
                        onCreate?.()
                        setOpen(false)
                      }}
                      className="mt-1 flex w-full cursor-default select-none items-center gap-2 rounded-sm border-t pt-2 text-support font-medium outline-none data-[selected=true]:bg-muted"
                    >
                      <Plus className="ml-2 size-4" aria-hidden="true" />
                      <span>+ Crear nuevo</span>
                    </Command.Item>
                  ) : null}
                </Command.List>
              </Command>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        ) : null}
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
      {isEmptyWithoutCreate ? (
        // biome-ignore lint/a11y/useSemanticElements: status announcements belong in a paragraph, not a form-associated <output>.
        <p role="status" className="text-caption text-muted-foreground">
          {emptyHint}
        </p>
      ) : null}
    </span>
  )
}
