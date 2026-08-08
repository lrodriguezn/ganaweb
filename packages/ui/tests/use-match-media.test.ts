// @vitest-environment jsdom

/**
 * useMatchMedia — hook compartido para detectar viewport (Issue #213,
 * decisión D11; modelo `useEsMovil()` de `apps/web/src/configuracion/
 * maestro-form.tsx:128`).
 *
 * Reglas cubiertas (TS-001):
 * - SSR-safe: el primer render devuelve `true` (default desktop) para que
 *   el markup del servidor coincida con el primer render del cliente.
 * - Suscripción a `change` de `MediaQueryList`; cleanup del listener.
 * - En jsdom, `window.matchMedia` se mockea para producir un `mql.matches`
 *   determinista y exponer los handlers añadidos.
 */

import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useMatchMedia } from "../src/lib/use-match-media"

type Listener = (event: { matches: boolean; media: string }) => void

interface FakeMql {
  matches: boolean
  media: string
  listeners: Listener[]
  addEventListener: (type: "change", handler: Listener) => void
  removeEventListener: (type: "change", handler: Listener) => void
}

function instalarMatchMedia(inicial: boolean): {
  cambiar: (siguiente: boolean) => void
  getMql: () => FakeMql
} {
  let mql: FakeMql = {
    matches: inicial,
    media: "(max-width: 767px)",
    listeners: [],
    addEventListener: (_t, h) => {
      mql.listeners.push(h)
    },
    removeEventListener: (_t, h) => {
      mql.listeners = mql.listeners.filter((l) => l !== h)
    },
  }
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: () => mql,
  })
  return {
    getMql: () => mql,
    cambiar: (siguiente: boolean) => {
      mql = { ...mql, matches: siguiente }
      const eventos = [...mql.listeners]
      for (const h of eventos) h({ matches: siguiente, media: mql.media })
    },
  }
}

function desinstalarMatchMedia() {
  try {
    Reflect.deleteProperty(window, "matchMedia")
  } catch {
    // ignore
  }
}

beforeEach(() => {
  desinstalarMatchMedia()
})

afterEach(() => {
  desinstalarMatchMedia()
})

describe("useMatchMedia — SSR-safe default + suscripción a cambios", () => {
  it("primer render devuelve true cuando matchMedia inicial matches=true", () => {
    instalarMatchMedia(true)
    const { result } = renderHook(() => useMatchMedia("(max-width: 767px)"))
    expect(result.current).toBe(true)
  })

  it("primer render devuelve false cuando matchMedia inicial matches=false (mobile)", () => {
    instalarMatchMedia(false)
    const { result } = renderHook(() => useMatchMedia("(max-width: 767px)"))
    expect(result.current).toBe(false)
  })

  it("reacciona al evento change del MediaQueryList (desktop → mobile)", () => {
    const { cambiar } = instalarMatchMedia(true)
    const { result } = renderHook(() => useMatchMedia("(max-width: 767px)"))
    expect(result.current).toBe(true)

    act(() => {
      cambiar(false)
    })
    expect(result.current).toBe(false)
  })

  it("reacciona al evento change del MediaQueryList (mobile → desktop)", () => {
    const { cambiar } = instalarMatchMedia(false)
    const { result } = renderHook(() => useMatchMedia("(max-width: 767px)"))
    expect(result.current).toBe(false)

    act(() => {
      cambiar(true)
    })
    expect(result.current).toBe(true)
  })

  it("remueve el listener en el cleanup (no recibe eventos tras unmount)", () => {
    const mql = instalarMatchMedia(true)
    const { unmount, result } = renderHook(() => useMatchMedia("(max-width: 767px)"))
    expect(result.current).toBe(true)
    const listenersAntes = mql.getMql().listeners.length
    expect(listenersAntes).toBeGreaterThan(0)

    unmount()
    expect(mql.getMql().listeners.length).toBe(0)
  })
})

describe("useMatchMedia — sin window.matchMedia (entorno sin DOM)", () => {
  it("devuelve el default true cuando matchMedia no existe en window", () => {
    desinstalarMatchMedia()
    const { result } = renderHook(() => useMatchMedia("(max-width: 767px)"))
    expect(result.current).toBe(true)
  })
})
