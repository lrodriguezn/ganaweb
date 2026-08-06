// @vitest-environment jsdom

/**
 * Wiring del shell para Sanidad (Issue #212, SAN-001/D-006).
 *
 * El shell `_app.tsx` ya renderiza el sidebar estándar con el ítem "Sanidad"
 * (D-006). Este change cablea:
 * - `deriveActivoId`: `/fincas/$fincaId/sanidad` (y su historial) resaltan el
 *   ítem "sanidad".
 * - El href del ítem se remapea a `/fincas/${fincaActivaId}/sanidad` (igual
 *   que "animales").
 *
 * Se prueba la función pura `deriveActivoId` exportada, mockeando el runtime
 * de TanStack Start y el módulo de auth (patrón configuracion-hub-route).
 */

import { describe, expect, it, vi } from "vitest"

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const chain: Record<string, unknown> = {}
    chain.validator = () => chain
    chain.handler = (fn: unknown) => fn
    return chain
  },
}))

vi.mock("../src/server/auth.js", () => ({
  getCurrentSession: vi.fn(),
  initials: (nombre: string) => nombre.slice(0, 2).toUpperCase(),
  logoutAction: vi.fn(),
  protectedRouteRedirect: () => null,
  switchFincaAction: vi.fn(),
}))

import { deriveActivoId } from "../src/routes/_app.js"

describe("_app shell — SAN-001/D-006: ítem activo de sanidad", () => {
  it("la ruta del panel y el historial resaltan 'sanidad'", () => {
    expect(deriveActivoId("/fincas/finca-1/sanidad")).toBe("sanidad")
    expect(deriveActivoId("/fincas/finca-1/sanidad/historial")).toBe("sanidad")
  })

  it("los demás casos se conservan", () => {
    expect(deriveActivoId("/")).toBe("inicio")
    expect(deriveActivoId("")).toBe("inicio")
    expect(deriveActivoId("/fincas/finca-1/animales")).toBe("animales")
    expect(deriveActivoId("/fincas/finca-1/animales/animal-1")).toBe("animales")
    expect(deriveActivoId("/mas")).toBe("mas")
  })
})
