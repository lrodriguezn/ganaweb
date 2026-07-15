// @vitest-environment jsdom

/**
 * End-to-end test for the create route's validacion surfacing.
 *
 * Spec scenario: spec.md lines 36-40 (Validation result renders per-field errors)
 * and lines 62-66 (validacion preserves the form).
 *
 * Phase 4 of openspec/changes/2026-07-14-fix-issue-48-error-handling/tasks.md.
 * Asserts the three integration-level outcomes:
 *   1. No window.location.assign call when the action returns validacion
 *   2. The codigo input has aria-invalid="true"
 *   3. A role="alert" with the error text sits under the codigo input
 *
 * The route is exercised through the exported `NewAnimalRouteView` so we can
 * pin fincaId without mocking @tanstack/react-router. The action is stubbed
 * via vi.mock so the test does not need a server runtime.
 */

import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { NewAnimalRouteView } from "../src/routes/_app/fincas/$fincaId/animales/nuevo.js"

const createAnimalActionMock = vi.fn()
const assignSpy = vi.fn()

// Stub the server action so the test does not need a TanStack Start runtime.
// The route imports `createAnimalAction` from `../../../../../server/animal-actions.js`
// (resolved to apps/web/src/server/animal-actions.js). The mock key uses the
// absolute path so vitest resolves the same module instance the route loads.
vi.mock("../src/server/animal-actions.js", () => ({
  createAnimalAction: (input: unknown) => createAnimalActionMock(input),
}))

beforeAll(() => {
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false
  }
  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = () => undefined
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = () => undefined
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => undefined
  }
})

afterEach(() => {
  cleanup()
  createAnimalActionMock.mockReset()
  assignSpy.mockReset()
  // Restore a clean window.location.assign between tests so a leaked spy
  // does not bleed into the next case.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, assign: assignSpy },
  })
})

function stubActionValidacion(codigoDetalle: string) {
  createAnimalActionMock.mockResolvedValueOnce({
    tipo: "validacion",
    errores: [{ campo: "codigo", regla: "CA-CRE-001", detalle: codigoDetalle }],
  })
}

describe("create route — harness validacion surfacing in form", () => {
  it("mounts the create route, submits the form, and surfaces codigo error with ARIA wiring", async () => {
    stubActionValidacion("Requerido")

    const user = userEvent.setup()
    render(<NewAnimalRouteView fincaId="finca-1" />)

    // The route renders BOTH desktop and mobile forms (CSS hides one based on
    // breakpoint). We exercise the desktop form so the test stays deterministic
    // in jsdom (no responsive logic). The desktop Guardar is the first button.
    const guardarButtons = screen.getAllByRole("button", { name: "Guardar" })
    expect(guardarButtons.length).toBeGreaterThanOrEqual(1)

    // Type the form so the submission payload has real values — this is the
    // "user typed codigo = 'MT-122' and nombre = 'Matilda'" anchor from
    // spec.md lines 62-66 (validacion preserves the form).
    const codigoInput = screen.getByLabelText("Código *")
    const nombreInput = screen.getByLabelText("Nombre")
    await user.type(codigoInput, "MT-122")
    await user.type(nombreInput, "Matilda")

    // Submit the form. The action stub resolves with the validacion union
    // including the structured errores array — exactly what the harness would
    // return after Phase 1's `return result` fix.
    await user.click(guardarButtons[0])

    // 1. No window.location.assign call when validacion is returned.
    //    The previous try/finally/assign navigated unconditionally; the
    //    branch-on-result.tipo fix removes that. We assert on the spy itself
    //    after the async save resolves, not on window.location.assign being
    //    replaced — the spy is the contract.
    await waitFor(() => {
      expect(createAnimalActionMock).toHaveBeenCalledTimes(1)
    })
    expect(assignSpy).not.toHaveBeenCalled()

    // Debug: inspect the DOM after the save resolves
    // (removed debug logs — keeping the structure for future regressions)

    // 2. The codigo input has aria-invalid="true" — the spec scenario at
    //    spec.md lines 46-50 says the input is marked invalid.
    await waitFor(() => {
      expect(codigoInput).toHaveAttribute("aria-invalid", "true")
    })
    // Form values are preserved on the mounted form (spec.md lines 62-66).
    expect(codigoInput).toHaveValue("MT-122")
    expect(nombreInput).toHaveValue("Matilda")

    // 3. A role="alert" with the error text sits under the codigo input,
    //    linked via aria-describedby (spec.md lines 36-40 + 46-50).
    const describedBy = codigoInput.getAttribute("aria-describedby")
    expect(describedBy).toBeTruthy()
    const alertEl = describedBy ? document.getElementById(describedBy) : null
    expect(alertEl).not.toBeNull()
    expect(alertEl).toHaveAttribute("role", "alert")
    expect(alertEl).toHaveTextContent("Requerido")

    // Sibling fields (nombre) must NOT pick up the codigo error.
    expect(nombreInput).not.toHaveAttribute("aria-invalid", "true")
  })
})
