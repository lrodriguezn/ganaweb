import { useEffect, useRef, useState } from "react"

import { cn } from "../lib/utils"

export type EstiloId = "campo" | "moderna" | "indigo" | "cielo" | "grafito"

type Estilo = {
  id: EstiloId
  label: string
  description: string
  className: string | null
  preview: [string, string, string]
}

export const ESTILO_STORAGE_KEY = "ganaweb-estilo"
const RADIOGROUP_LABEL = "Estilo visual"
const STYLE_CLASSES = ["theme-b", "theme-moderna", "theme-indigo", "theme-cielo", "theme-grafito"]

export const ESTILOS: Estilo[] = [
  {
    id: "campo",
    label: "Campo",
    description: "Cálido y claro para trabajo en campo",
    className: null,
    preview: ["#F8F5EC", "#2F6B3F", "#D97706"],
  },
  {
    id: "moderna",
    label: "Moderna",
    description: "SaaS esmeralda con gradiente",
    className: "theme-moderna",
    preview: ["#F4F5F7", "#059669", "#10B981"],
  },
  {
    id: "indigo",
    label: "Índigo",
    description: "SaaS clásico con acento violeta",
    className: "theme-indigo",
    preview: ["#F5F5FA", "#4F46E5", "#7C3AED"],
  },
  {
    id: "cielo",
    label: "Cielo",
    description: "Agro-tech azul confianza",
    className: "theme-cielo",
    preview: ["#F3F6F9", "#0284C7", "#06B6D4"],
  },
  {
    id: "grafito",
    label: "Grafito",
    description: "Premium sobrio con acento ámbar",
    className: "theme-grafito",
    preview: ["#F5F5F4", "#1C1917", "#F59E0B"],
  },
]

const FIRST_ESTILO = ESTILOS[0] as Estilo
const LAST_ESTILO = ESTILOS[ESTILOS.length - 1] as Estilo

export interface EstiloSwitcherProps {
  size?: "md" | "sm"
  className?: string
}

function normalizeEstilo(value: string | null): EstiloId {
  if (value === "theme-b" || value === "moderna") return "moderna"
  if (value === "indigo" || value === "cielo" || value === "grafito" || value === "campo")
    return value
  return "campo"
}

function readInitialEstilo(): EstiloId {
  if (typeof document === "undefined") return "campo"

  try {
    const stored = normalizeEstilo(localStorage.getItem(ESTILO_STORAGE_KEY))
    if (stored !== "campo" || localStorage.getItem(ESTILO_STORAGE_KEY) !== null) return stored
  } catch {
    // Fall back to DOM class inspection below.
  }

  const classList = document.documentElement.classList
  if (classList.contains("theme-b") || classList.contains("theme-moderna")) return "moderna"
  if (classList.contains("theme-indigo")) return "indigo"
  if (classList.contains("theme-cielo")) return "cielo"
  if (classList.contains("theme-grafito")) return "grafito"
  return "campo"
}

function applyEstilo(id: EstiloId) {
  const root = document.documentElement
  root.classList.remove(...STYLE_CLASSES)
  const styleClass = ESTILOS.find((estilo) => estilo.id === id)?.className
  if (styleClass) root.classList.add(styleClass)
}

export function EstiloSwitcher({ size = "md", className }: EstiloSwitcherProps) {
  const [value, setValue] = useState<EstiloId>(readInitialEstilo)
  const initialValue = useRef(value)
  const optionRefs = useRef<Record<EstiloId, HTMLInputElement | null>>({
    campo: null,
    moderna: null,
    indigo: null,
    cielo: null,
    grafito: null,
  })

  useEffect(() => {
    applyEstilo(value)
    const storedValue = (() => {
      try {
        return localStorage.getItem(ESTILO_STORAGE_KEY)
      } catch {
        return null
      }
    })()
    const shouldPersist =
      value !== initialValue.current || (storedValue !== null && storedValue !== value)

    if (shouldPersist) {
      try {
        localStorage.setItem(ESTILO_STORAGE_KEY, value)
      } catch {
        /* Storage can fail in private mode; the DOM class still applies for this session. */
      }
      initialValue.current = value
    }
  }, [value])

  function selectAndFocus(next: EstiloId) {
    setValue(next)
    optionRefs.current[next]?.focus()
  }

  function moveBy(delta: number) {
    const currentIndex = ESTILOS.findIndex((estilo) => estilo.id === value)
    const nextIndex = (currentIndex + delta + ESTILOS.length) % ESTILOS.length
    selectAndFocus((ESTILOS[nextIndex] as Estilo).id)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault()
        moveBy(1)
        return
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault()
        moveBy(-1)
        return
      case "Home":
        event.preventDefault()
        selectAndFocus(FIRST_ESTILO.id)
        return
      case "End":
        event.preventDefault()
        selectAndFocus(LAST_ESTILO.id)
        return
    }
  }

  const compact = size === "sm"

  return (
    <div
      role="radiogroup"
      aria-label={RADIOGROUP_LABEL}
      onKeyDown={handleKeyDown}
      className={cn("grid grid-cols-1 gap-2", compact ? "text-[13px]" : "text-sm", className)}
    >
      {ESTILOS.map((estilo) => {
        const selected = value === estilo.id

        return (
          <label
            key={estilo.id}
            style={{ minHeight: 44 }}
            className={cn(
              "block w-full rounded-card border border-border bg-card p-3 text-left transition-none",
              "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
              selected ? "border-primary shadow-card" : "hover:bg-muted/60",
            )}
          >
            <input
              ref={(node) => {
                optionRefs.current[estilo.id] = node
              }}
              type="radio"
              name="ganaweb-estilo"
              value={estilo.id}
              checked={selected}
              aria-label={estilo.label}
              tabIndex={selected ? 0 : -1}
              onChange={() => setValue(estilo.id)}
              className="sr-only"
            />
            <span className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block font-semibold text-primary">{estilo.label}</span>
                <span className="block text-xs text-secondary">{estilo.description}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1" aria-hidden="true">
                {estilo.preview.map((color) => (
                  <span
                    key={color}
                    className="h-3 w-3 rounded-full border border-border"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
            </span>
          </label>
        )
      })}
    </div>
  )
}
