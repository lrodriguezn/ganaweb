// @vitest-environment jsdom
/**
 * PR2.T-002.4 — EstiloSwitcher behavior (REQ-ES-001..005, D4, T-003).
 *
 * Spec: estilo-switcher.md.
 *
 * `EstiloSwitcher` is a segmented radio-group that toggles the `.theme-b`
 * class on `<html>` and persists the choice to `localStorage` under the
 * `ganaweb-estilo` key. The component is INDEPENDENT from `ThemeToggle`:
 * it must never touch the `dark` class or the `ganaweb-theme` key (PD-6,
 * REQ-TTC-001, REQ-ES-004). It must support arrow-key roving and Home/End
 * jumps for keyboard accessibility (REQ-ES-005).
 *
 * The test file is structured around the 4 spec scenarios from T-002.4 +
 * one triangulation case (Campo when already on Campo is a no-op) + a
 * Home/End roving check. Every assertion calls production code and
 * produces a SPECIFIC expected value — no smoke tests, no tautologies.
 */

import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { EstiloSwitcher } from "../src/ganado/estilo-switcher"

const ESTILO_KEY = "ganaweb-estilo"

beforeEach(() => {
  // Each test starts from a clean <html> + empty localStorage so initial
  // state mirrors a first-time visitor (Campo, no theme-b, no dark).
  document.documentElement.className = ""
  localStorage.clear()
})

afterEach(() => {
  document.documentElement.className = ""
  localStorage.clear()
  cleanup()
})

describe("PR2.T-002.4 — EstiloSwitcher (REQ-ES-001..005, D4, T-003)", () => {
  it("REQ-ES-001 — first visit: Campo is selected, no `theme-b` on <html>, no localStorage write", () => {
    render(<EstiloSwitcher />)

    // Radio group: aria-label comes from D4 spec.
    const group = screen.getByRole("radiogroup", { name: "Estilo visual" })
    expect(group).toBeInTheDocument()

    // Campo is the default selection. We assert it via aria-checked (the
    // accessible state for role="radio") — this is the user-visible
    // contract, not an implementation detail.
    const campo = screen.getByRole("radio", { name: "Campo" })
    const moderna = screen.getByRole("radio", { name: "Moderna" })
    expect(campo).toHaveAttribute("aria-checked", "true")
    expect(moderna).toHaveAttribute("aria-checked", "false")

    // Side effect: <html> stays clean. We assert the absence of theme-b
    // (not just that the className equals "" — toggling anywhere could
    // leave a stray class; we want the SPECIFIC contract).
    expect(document.documentElement.classList.contains("theme-b")).toBe(false)

    // No localStorage write happened at mount — first visit is read-only.
    expect(localStorage.getItem(ESTILO_KEY)).toBeNull()
  })

  it("REQ-ES-001/002 — Moderna selected from storage: mounts in B with `theme-b` on <html>", () => {
    // Simulate a returning Moderna user. The component MUST honor the
    // persisted choice on mount (REQ-AFS-002 anti-flash already painted
    // B before hydration; this is the React side reading the same state).
    localStorage.setItem(ESTILO_KEY, "moderna")
    document.documentElement.classList.add("theme-b")

    render(<EstiloSwitcher />)

    const moderna = screen.getByRole("radio", { name: "Moderna" })
    const campo = screen.getByRole("radio", { name: "Campo" })
    expect(moderna).toHaveAttribute("aria-checked", "true")
    expect(campo).toHaveAttribute("aria-checked", "false")
  })

  it("REQ-ES-002/003 — click Moderna: adds `theme-b` to <html> and persists `ganaweb-estilo=moderna`", async () => {
    const user = userEvent.setup()
    render(<EstiloSwitcher />)

    const moderna = screen.getByRole("radio", { name: "Moderna" })
    await user.click(moderna)

    // B is applied.
    expect(document.documentElement.classList.contains("theme-b")).toBe(true)
    // And persisted. The exact value "moderna" is the contract — a
    // different spelling (e.g. "Moderna", "b") would silently break
    // the anti-flash script on next reload.
    expect(localStorage.getItem(ESTILO_KEY)).toBe("moderna")
    // UI reflects the new state.
    expect(moderna).toHaveAttribute("aria-checked", "true")
    expect(screen.getByRole("radio", { name: "Campo" })).toHaveAttribute("aria-checked", "false")
  })

  it("REQ-ES-002/003 — click Campo while in B: removes `theme-b` and persists `ganaweb-estilo=campo` (TRIANGULATE)", async () => {
    localStorage.setItem(ESTILO_KEY, "moderna")
    document.documentElement.classList.add("theme-b")
    const user = userEvent.setup()
    render(<EstiloSwitcher />)

    // Precondition: B is active.
    expect(document.documentElement.classList.contains("theme-b")).toBe(true)

    await user.click(screen.getByRole("radio", { name: "Campo" }))

    // A is restored.
    expect(document.documentElement.classList.contains("theme-b")).toBe(false)
    expect(localStorage.getItem(ESTILO_KEY)).toBe("campo")
    expect(screen.getByRole("radio", { name: "Campo" })).toHaveAttribute("aria-checked", "true")
  })

  it("REQ-ES-004 + PD-6 — toggling EstiloSwitcher does NOT touch the `dark` class or `ganaweb-theme`", async () => {
    // B-dark user: both classes coexist. Toggling estilo must leave dark
    // alone (and must not write to ganaweb-theme).
    document.documentElement.classList.add("theme-b", "dark")
    localStorage.setItem("ganaweb-theme", "dark")
    const user = userEvent.setup()
    render(<EstiloSwitcher />)

    // Switch to Campo.
    await user.click(screen.getByRole("radio", { name: "Campo" }))
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(localStorage.getItem("ganaweb-theme")).toBe("dark")

    // Switch back to Moderna.
    await user.click(screen.getByRole("radio", { name: "Moderna" }))
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(localStorage.getItem("ganaweb-theme")).toBe("dark")
  })

  it("REQ-ES-005 — Right arrow on Campo moves focus+selection to Moderna; Left returns to Campo", async () => {
    const user = userEvent.setup()
    render(<EstiloSwitcher />)

    const campo = screen.getByRole("radio", { name: "Campo" })
    campo.focus()
    expect(campo).toHaveFocus()
    expect(campo).toHaveAttribute("aria-checked", "true")

    await user.keyboard("{ArrowRight}")

    const moderna = screen.getByRole("radio", { name: "Moderna" })
    expect(moderna).toHaveFocus()
    expect(moderna).toHaveAttribute("aria-checked", "true")
    expect(campo).toHaveAttribute("aria-checked", "false")
    // Side effects fire on roving selection (same as click).
    expect(document.documentElement.classList.contains("theme-b")).toBe(true)
    expect(localStorage.getItem(ESTILO_KEY)).toBe("moderna")

    // Left arrow returns to Campo and removes the class.
    await user.keyboard("{ArrowLeft}")
    expect(campo).toHaveFocus()
    expect(campo).toHaveAttribute("aria-checked", "true")
    expect(document.documentElement.classList.contains("theme-b")).toBe(false)
    expect(localStorage.getItem(ESTILO_KEY)).toBe("campo")
  })

  it("REQ-ES-005 — Home/End jump to first/last pill (TRIANGULATE roving)", async () => {
    const user = userEvent.setup()
    render(<EstiloSwitcher />)

    const campo = screen.getByRole("radio", { name: "Campo" })
    const moderna = screen.getByRole("radio", { name: "Moderna" })

    // Focus Moderna first, then End must keep it (already last) and Home
    // must jump back to Campo. We use focus() directly because Tab order
    // in a radiogroup is implementation-defined.
    moderna.focus()
    expect(moderna).toHaveFocus()

    await user.keyboard("{Home}")
    expect(campo).toHaveFocus()
    expect(campo).toHaveAttribute("aria-checked", "true")

    await user.keyboard("{End}")
    expect(moderna).toHaveFocus()
    expect(moderna).toHaveAttribute("aria-checked", "true")
  })

  it("REQ-ES-005 — radiogroup is exposed with the canonical aria-label and each pill is a radio", () => {
    render(<EstiloSwitcher />)

    // Single radiogroup with the D4-mandated label.
    const groups = screen.getAllByRole("radiogroup", { name: "Estilo visual" })
    expect(groups).toHaveLength(1)

    // Exactly two radios.
    const radios = screen.getAllByRole("radio")
    expect(radios).toHaveLength(2)
  })

  it("D4 — `size` prop is accepted and forwarded without breaking the radiogroup contract", () => {
    // We don't assert specific class names (T-004 / design discipline:
    // CSS classes are implementation details). We DO assert the group
    // still works and both options are present.
    render(<EstiloSwitcher size="sm" />)

    expect(screen.getByRole("radiogroup", { name: "Estilo visual" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Campo" })).toHaveAttribute("aria-checked", "true")
    expect(screen.getByRole("radio", { name: "Moderna" })).toHaveAttribute("aria-checked", "false")
  })

  it("REQ-ES-004 + PD-6 — localStorage write is wrapped: throwing storage does NOT break the toggle", async () => {
    // Defensive: the spec's D4 contract says writes are in try/catch so
    // a private-mode browser or quota error doesn't lock the user out of
    // B. We spy on setItem and make it throw; the click must still
    // update <html> (the in-memory state) and not throw.
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError")
    })

    const user = userEvent.setup()
    render(<EstiloSwitcher />)

    await expect(user.click(screen.getByRole("radio", { name: "Moderna" }))).resolves.not.toThrow()
    // In-memory state still applied (this is the part the user sees).
    expect(document.documentElement.classList.contains("theme-b")).toBe(true)
    // And the write was attempted (with the correct key).
    expect(setItemSpy).toHaveBeenCalledWith(ESTILO_KEY, "moderna")
  })
})
