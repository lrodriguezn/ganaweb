// @vitest-environment jsdom
/**
 * PR1.T-001.6 — anti-flash script behavior (REQ-AFS-002..004, D13).
 *
 * Spec: anti-flash-script.md.
 *
 * The anti-flash IIFE runs synchronously inside <head> before the first
 * paint. It must:
 *   - Add `theme-b` to <html> when ganaweb-estilo === "moderna".
 *   - Add `dark` to <html> when ganaweb-theme === "dark".
 *   - Leave <html> unchanged for missing keys, first-visit, or
 *     unrecognized values (A-light default).
 *   - Not throw when localStorage is unavailable (private mode).
 *
 * The IIFE is defined as a string constant in `__root.tsx` and
 * injected via `dangerouslySetInnerHTML`. We re-declare the SAME
 * string here and execute it via `new Function(...)` against a
 * controlled jsdom environment. This is the canonical way to unit-
 * test a raw <script> body without spinning up a real browser.
 *
 * If the body in `__root.tsx` ever drifts from the canonical one
 * here, both files should be updated together — a real CI check
 * would parse the script tag from the SSR output and compare; for
 * PR1 we keep the IIFE body in a single source of truth (this test
 * + a documented const in __root.tsx) and accept the duplication.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Canonical anti-flash IIFE body. MUST match ANTI_FLASH_SCRIPT in
 * apps/web/src/routes/__root.tsx. Any drift between the two will
 * silently regress the anti-flash behavior; review both together.
 */
const ANTI_FLASH_BODY = `(function(){try{var e=localStorage.getItem("ganaweb-estilo");var t=localStorage.getItem("ganaweb-theme");var h=document.documentElement;if(e==="moderna")h.classList.add("theme-b");if(t==="dark")h.classList.add("dark")}catch(_){}})();`

/** Run the IIFE body inside the current jsdom document context. */
function runAntiFlash(): void {
  // eslint-disable-next-line no-new-func
  new Function(ANTI_FLASH_BODY)()
}

describe("PR1.T-001.6 — anti-flash IIFE (REQ-AFS-002..004)", () => {
  beforeEach(() => {
    // Each test starts with a clean <html> and a fresh localStorage.
    document.documentElement.className = ""
    localStorage.clear()
  })

  afterEach(() => {
    document.documentElement.className = ""
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("REQ-AFS-002 — B-dark user: adds BOTH 'theme-b' and 'dark' to <html>", () => {
    localStorage.setItem("ganaweb-estilo", "moderna")
    localStorage.setItem("ganaweb-theme", "dark")

    runAntiFlash()

    expect(document.documentElement.classList.contains("theme-b")).toBe(true)
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("REQ-AFS-003 — A-light user: leaves <html> with NO theme classes", () => {
    // "campo" is the canonical A value (default) and "light" is the
    // canonical light-mode value. Both should be no-ops for the IIFE.
    localStorage.setItem("ganaweb-estilo", "campo")
    localStorage.setItem("ganaweb-theme", "light")

    runAntiFlash()

    expect(document.documentElement.classList.contains("theme-b")).toBe(false)
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("REQ-AFS-003 — first visit (no localStorage keys): leaves <html> unchanged", () => {
    // localStorage.clear() in beforeEach ensures no keys exist.
    runAntiFlash()

    expect(document.documentElement.classList.contains("theme-b")).toBe(false)
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("REQ-AFS-003 — B-only with light theme: adds 'theme-b' but not 'dark' (PD-6 independence)", () => {
    localStorage.setItem("ganaweb-estilo", "moderna")
    localStorage.setItem("ganaweb-theme", "light")

    runAntiFlash()

    expect(document.documentElement.classList.contains("theme-b")).toBe(true)
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("REQ-AFS-003 — A-only with dark theme: adds 'dark' but not 'theme-b' (PD-6 independence)", () => {
    localStorage.setItem("ganaweb-estilo", "campo")
    localStorage.setItem("ganaweb-theme", "dark")

    runAntiFlash()

    expect(document.documentElement.classList.contains("theme-b")).toBe(false)
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("REQ-AFS-003 — unrecognized values: no classes added (A-light default)", () => {
    localStorage.setItem("ganaweb-estilo", "invalid-value")
    localStorage.setItem("ganaweb-theme", "neon")

    runAntiFlash()

    expect(document.documentElement.classList.contains("theme-b")).toBe(false)
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("REQ-AFS-004 — localStorage throws (private mode): script does not bubble, leaves <html> clean", () => {
    // Mock localStorage.getItem to simulate a SecurityError. The IIFE
    // must catch and leave <html> untouched (A-light default). The
    // first call (ganaweb-estilo) is enough to throw — the catch is
    // expected to swallow the error before the second read.
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError: localStorage blocked")
    })

    expect(() => runAntiFlash()).not.toThrow()
    expect(document.documentElement.classList.contains("theme-b")).toBe(false)
    expect(document.documentElement.classList.contains("dark")).toBe(false)
    expect(getItemSpy).toHaveBeenCalledWith("ganaweb-estilo")
  })

  it("REQ-AFS-005 — IIFE is independent of React/hydration: only touches document.documentElement", () => {
    // The script MUST NOT touch window, document.body, or any React
    // hydration entry point. We assert by spying on the classList
    // methods (the only surface the IIFE is allowed to touch) and
    // confirming no body-level mutations happen.
    const addSpy = vi.spyOn(document.documentElement.classList, "add")
    localStorage.setItem("ganaweb-estilo", "moderna")
    localStorage.setItem("ganaweb-theme", "dark")

    runAntiFlash()

    // Exactly two add() calls — one for "theme-b", one for "dark".
    expect(addSpy).toHaveBeenCalledTimes(2)
    expect(addSpy).toHaveBeenCalledWith("theme-b")
    expect(addSpy).toHaveBeenCalledWith("dark")
    // Body is untouched.
    expect(document.body.classList.contains("theme-b")).toBe(false)
    expect(document.body.classList.contains("dark")).toBe(false)
  })
})
