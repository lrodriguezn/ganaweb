import { useEffect, useRef, useState } from "react"

import { cn } from "../lib/utils"

/**
 * EstiloSwitcher — segmented radio-group que alterna Propuesta A (Campo)
 * y Propuesta B (Moderna) agregando o quitando la clase `theme-b` en
 * `<html>`.
 *
 * Spec: ganaweb-design-b.md §"Selección por el usuario (arquitectura)".
 * Spec delta: specs/estilo-switcher.md (REQ-ES-001..006).
 * Design: design.md §D4.
 *
 * Reglas encapsuladas (D4 + T-003 + T-004 + PD-6):
 * - Inicializa desde `document.documentElement.classList.contains("theme-b")`,
 *   para que el componente quede en sincronía con el script anti-flash
 *   del `<head>` (que ya pintó B antes de la hidratación).
 * - `useEffect` aplica la clase + persiste en `localStorage["ganaweb-estilo"]`
 *   dentro de `try/catch` (private mode / cuota llena no debe romper la UI).
 * - NO comparte contexto con `ThemeToggle` — la independencia entre
 *   estilo y modo se garantiza usando una clase (`theme-b`) y una key
 *   (`ganaweb-estilo`) distintas de las de tema.
 * - Cero variantes `dark:` o `theme-b:` en el className — los tokens
 *   CSS hacen todo el trabajo visual.
 * - Roving keyboard: ←/→ mueven foco + selección, Home/End saltan al
 *   primer/último pill, Enter/Space activan el pill enfocado.
 * - Etiquetas "Campo" / "Moderna" en español (T-003).
 * - Sin onboarding, sin transiciones — el cambio es instantáneo (PD-5).
 */
const STORAGE_KEY = "ganaweb-estilo"
const RADIOGROUP_LABEL = "Estilo visual"
type Option = "campo" | "moderna"

export interface EstiloSwitcherProps {
  /** "md" es el default del shell; "sm" se usa en AparienciaCard / AvatarMenu. */
  size?: "md" | "sm"
  className?: string
}

export function EstiloSwitcher({ size = "md", className }: EstiloSwitcherProps) {
  // Hidratación segura: si document no está disponible (SSR), arrancamos
  // en Campo. Tras el primer render, useEffect re-sincroniza con la
  // realidad del DOM por si el anti-flash ya pintó B.
  const [value, setValue] = useState<Option>(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("theme-b")
      ? "moderna"
      : "campo",
  )
  const campoRef = useRef<HTMLButtonElement>(null)
  const modernaRef = useRef<HTMLButtonElement>(null)
  // REQ-ES-003 dice "en cada cambio", no "en cada render". Un visitante
  // nuevo que monta el componente NO debe ver un write espurio a
  // localStorage — el primer render solo refleja la realidad del DOM.
  // Por eso persistimos solo cuando `value` cambia respecto del snapshot
  // inicial que el anti-flash ya pintó en <html>.
  const initialRef = useRef<Option>(value)

  // Aplica la clase al <html> (idempotente, se ejecuta en cada render)
  // y persiste en localStorage solo cuando el usuario CAMBIA la selección.
  useEffect(() => {
    const isModerna = value === "moderna"
    document.documentElement.classList.toggle("theme-b", isModerna)
    if (value !== initialRef.current) {
      try {
        localStorage.setItem(STORAGE_KEY, isModerna ? "moderna" : "campo")
      } catch {
        /* almacenamiento no disponible: el cambio en <html> sobrevive la sesión */
      }
      initialRef.current = value
    }
  }, [value])

  function focusPill(option: Option) {
    if (option === "campo") campoRef.current?.focus()
    else modernaRef.current?.focus()
  }

  function selectAndFocus(next: Option) {
    setValue(next)
    focusPill(next)
  }

  // El handler se monta en el contenedor radiogroup para capturar las
  // flechas venga de donde venga el foco (los botones reciben foco por
  // su tabIndex; el keydown burbujea al grupo).
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault()
        selectAndFocus(value === "campo" ? "moderna" : "campo")
        return
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault()
        selectAndFocus(value === "campo" ? "moderna" : "campo")
        return
      case "Home":
        event.preventDefault()
        selectAndFocus("campo")
        return
      case "End":
        event.preventDefault()
        selectAndFocus("moderna")
        return
    }
  }

  // Tamaño compartido por el contenedor y los pills. El contenedor lleva
  // el fondo muted (segmented control); los pills solo cambian color de
  // texto + bg-card si están activos.
  const containerSize = size === "sm" ? "h-8 text-[13px]" : "h-9 text-sm"
  const pillSize = size === "sm" ? "h-7" : "h-[34px]"

  return (
    <div
      role="radiogroup"
      aria-label={RADIOGROUP_LABEL}
      onKeyDown={handleKeyDown}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-card bg-muted p-[3px]",
        containerSize,
        className,
      )}
    >
      <button
        ref={campoRef}
        type="button"
        // biome-ignore lint/a11y/useSemanticElements: REQ-ES-005 exige role="radio" en el pill (segmented control con roving tabIndex + flechas)
        role="radio"
        aria-checked={value === "campo"}
        aria-label="Campo"
        tabIndex={value === "campo" ? 0 : -1}
        onClick={() => setValue("campo")}
        className={cn(
          "min-w-[79px] rounded-[10px] px-3 inline-flex items-center justify-center transition-none",
          pillSize,
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted",
          value === "campo" ? "bg-card text-primary font-semibold" : "text-secondary font-normal",
        )}
      >
        Campo
      </button>
      <button
        ref={modernaRef}
        type="button"
        // biome-ignore lint/a11y/useSemanticElements: mismo motivo que el pill Campo (segmented control pattern, ver bloque del radiogroup)
        role="radio"
        aria-checked={value === "moderna"}
        aria-label="Moderna"
        tabIndex={value === "moderna" ? 0 : -1}
        onClick={() => setValue("moderna")}
        className={cn(
          "min-w-[79px] rounded-[10px] px-3 inline-flex items-center justify-center transition-none",
          pillSize,
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted",
          value === "moderna" ? "bg-card text-primary font-semibold" : "text-secondary font-normal",
        )}
      >
        Moderna
      </button>
    </div>
  )
}
