import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

/**
 * SAN-071: verificación del token de color --dom-sanidad.
 *
 * Spec: requisito_sanidad.md §13 ítem 2 + §15 riesgo 2 (D1 sync MVP).
 * Token: --dom-sanidad: #c7643b en :root (tema A, globals.css:71).
 * Uso: Ficha Animal (animal-crud.tsx, timeline.tsx) usa bg-dom-sanidad-bg
 *      text-dom-sanidad para el tab/timeline de Sanidad.
 *
 * SAN-071 = verificación pura: el token existe y los componentes lo usan
 * correctamente. No hay reimplementación — los componentes ya lo usan.
 */

const ROOT = fileURLToPath(new URL("..", import.meta.url))
const SRC = join(ROOT, "src")
const GLOBALS_CSS = join(SRC, "styles", "globals.css")

describe("SAN-071 — --dom-sanidad token (theme A)", () => {
  const css = readFileSync(GLOBALS_CSS, "utf8")

  it("defines --dom-sanidad in :root with value #c7643b", () => {
    // El token --dom-sanidad debe existir en :root con el valor #c7643b
    expect(css).toMatch(/--dom-sanidad:\s*#c7643b/)
  })

  it("defines --dom-sanidad-bg in :root for tab background", () => {
    // El token --dom-sanidad-bg debe existir para el fondo del tab
    expect(css).toMatch(/--dom-sanidad-bg:\s*#faebe3/)
  })

  it("maps --dom-sanidad to Tailwind color token", () => {
    // El token debe estar mapeado en @theme inline para uso con Tailwind
    const themeInline = css.match(/@theme inline\s*\{([\s\S]*?)\n\}/m)
    expect(themeInline).not.toBeNull()
    if (themeInline) {
      expect(themeInline[1]).toMatch(/--color-dom-sanidad:\s*var\(--dom-sanidad\)/)
    }
  })
})

describe("SAN-071 — Ficha Animal uses dom-sanidad tokens", () => {
  it("animal-crud.tsx uses bg-dom-sanidad-bg and text-dom-sanidad for sanidad tab", () => {
    const animalCrudPath = join(SRC, "ganado", "animal-crud.tsx")
    const content = readFileSync(animalCrudPath, "utf8")

    // El tab de Sanidad en la Ficha Animal debe usar los tokens de color
    expect(content).toMatch(/bg-dom-sanidad-bg/)
    expect(content).toMatch(/text-dom-sanidad/)
  })

  it("timeline.tsx uses dom-sanidad tokens for health timeline", () => {
    const timelinePath = join(SRC, "ganado", "timeline.tsx")
    const content = readFileSync(timelinePath, "utf8")

    // El timeline de Sanidad debe usar los tokens de color
    expect(content).toMatch(/dom-sanidad/)
  })
})
