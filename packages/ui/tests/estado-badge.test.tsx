// @vitest-environment jsdom
/**
 * PR3.T-003.4 — EstadoBadge withDot (REQ-BVA-005, D11).
 *
 * Spec: specs/b-visual-adaptations.md §REQ-BVA-005.
 * Design: design.md §D11.
 *
 * The dot element is ALWAYS rendered; CSS controls visibility (T-001.3 already
 * defines the cascade in globals.css):
 *
 *   .estado-badge .estado-dot { display: none; }                                 (A default)
 *   .estado-badge[data-with-dot="true"] .estado-dot { display: inline-block; }   (explicit opt-in)
 *   .theme-b .estado-badge .estado-dot { display: inline-block; }                (B override)
 *
 * API contract this file pins:
 *   (i)   The dot `<span class="estado-dot" />` is always in the DOM
 *   (ii)  The root carries `data-with-dot="true"` when withDot=true, else
 *         `"false"` — and the default is `"false"`
 *   (iii) Convenience wrappers (CategoriaBadge, SaludBadge, EstadoAnimalBadge,
 *         StockBadge) never pass `withDot`, so their root has data-with-dot
 *         `"false"` and the dot is hidden in A / shown in B (via the
 *         .theme-b override) automatically — no code change in the wrappers.
 *
 * The CSS visibility matrix (A hidden / B shown) is verified separately by
 * `tokens.test.ts` (PR1 T-001.4) — the rule set is structural and lives in
 * globals.css, not in the component.
 */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  CategoriaBadge,
  EstadoAnimalBadge,
  EstadoBadge,
  SaludBadge,
  StockBadge,
} from "../src/ganado/estado-badge"

beforeEach(() => {
  // Each test starts from a clean <html> (no .theme-b) so the contract
  // mirrors a first-time Campo visitor. The B-context tests set the
  // class on documentElement directly before rendering.
  document.documentElement.className = ""
})

afterEach(() => {
  document.documentElement.className = ""
  cleanup()
})

describe("PR3.T-003.4 — EstadoBadge withDot contract (REQ-BVA-005, D11)", () => {
  it("(i) always emits the .estado-dot element — default withDot=false (TRIANGULATE)", () => {
    // Default mount: no `withDot` prop, no `<html class="theme-b">`. The
    // dot MUST still be in the DOM (CSS hides it in A; in B the cascade
    // shows it). We assert the element contract, not the visibility.
    render(<EstadoBadge>Preñada</EstadoBadge>)
    const badge = screen.getByText("Preñada")
    const dot = badge.querySelector(".estado-dot")
    expect(dot).not.toBeNull()
    expect(dot?.tagName).toBe("SPAN")
  })

  it("(i) always emits the .estado-dot element — withDot=true", () => {
    render(<EstadoBadge withDot>Activo</EstadoBadge>)
    const badge = screen.getByText("Activo")
    const dot = badge.querySelector(".estado-dot")
    expect(dot).not.toBeNull()
  })

  it("root carries the .estado-badge class (D11 marker)", () => {
    render(<EstadoBadge>Activo</EstadoBadge>)
    const badge = screen.getByText("Activo")
    expect(badge).toHaveClass("estado-badge")
  })

  it("(ii) data-with-dot reflects the withDot prop — false → 'false', true → 'true'", () => {
    const { rerender } = render(<EstadoBadge withDot={false}>Activo</EstadoBadge>)
    expect(screen.getByText("Activo")).toHaveAttribute("data-with-dot", "false")

    rerender(<EstadoBadge withDot={true}>Activo</EstadoBadge>)
    expect(screen.getByText("Activo")).toHaveAttribute("data-with-dot", "true")
  })

  it("(ii) default (no withDot prop) keeps data-with-dot='false'", () => {
    render(<EstadoBadge>Activo</EstadoBadge>)
    expect(screen.getByText("Activo")).toHaveAttribute("data-with-dot", "false")
  })

  it("(iii) CategoriaBadge is a convenience wrapper — no withDot, dot hidden in A", () => {
    render(<CategoriaBadge categoria="prenada" />)
    const badge = screen.getByText("Preñada")
    expect(badge).toHaveClass("estado-badge")
    expect(badge).toHaveAttribute("data-with-dot", "false")
  })

  it("(iii) SaludBadge is a convenience wrapper — no withDot", () => {
    render(<SaludBadge salud="sano" />)
    const badge = screen.getByText("Sana")
    expect(badge).toHaveClass("estado-badge")
    expect(badge).toHaveAttribute("data-with-dot", "false")
  })

  it("(iii) EstadoAnimalBadge is a convenience wrapper — no withDot", () => {
    render(<EstadoAnimalBadge estado="activo" />)
    const badge = screen.getByText("Activo")
    expect(badge).toHaveClass("estado-badge")
    expect(badge).toHaveAttribute("data-with-dot", "false")
  })

  it("(iii) StockBadge (>0 dosis) is a convenience wrapper — no withDot", () => {
    render(<StockBadge dosis={50} />)
    const badge = screen.getByText("50 dosis")
    expect(badge).toHaveClass("estado-badge")
    expect(badge).toHaveAttribute("data-with-dot", "false")
  })

  it("(iii) StockBadge (dosis=0) is a convenience wrapper — no withDot", () => {
    render(<StockBadge dosis={0} />)
    const badge = screen.getByText("Agotado")
    expect(badge).toHaveClass("estado-badge")
    expect(badge).toHaveAttribute("data-with-dot", "false")
  })

  it("(iii) StockBadge (dosis<20, alerta) is a convenience wrapper — no withDot", () => {
    render(<StockBadge dosis={10} />)
    const badge = screen.getByText("10 dosis")
    expect(badge).toHaveClass("estado-badge")
    expect(badge).toHaveAttribute("data-with-dot", "false")
  })
})
