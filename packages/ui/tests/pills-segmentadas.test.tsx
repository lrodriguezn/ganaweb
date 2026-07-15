// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { PillsSegmentadas } from "../src/primitives/pills-segmentadas"

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

afterEach(() => cleanup())

const OPTIONS = [
  { value: "nacido", label: "Nacido en finca" },
  { value: "comprado", label: "Comprado" },
] as const

describe("PillsSegmentadas primitive", () => {
  it("emits the clicked option's value and surfaces aria-invalid on the group", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    function Harness() {
      const [value, setValue] = useState("nacido")
      return (
        <PillsSegmentadas
          id="origen"
          name="origen"
          value={value}
          onChange={(next) => {
            onChange(next)
            setValue(next)
          }}
          options={OPTIONS}
          aria-invalid="true"
          aria-describedby="err-origen"
        />
      )
    }

    render(<Harness />)

    const group = screen.getByRole("radiogroup", { name: /origen/i })
    expect(group).toHaveAttribute("aria-invalid", "true")
    expect(group).toHaveAttribute("aria-describedby", "err-origen")

    const nacidoPill = screen.getByRole("radio", { name: "Nacido en finca" })
    const compradoPill = screen.getByRole("radio", { name: "Comprado" })
    expect(nacidoPill).toHaveAttribute("aria-checked", "true")
    expect(compradoPill).toHaveAttribute("aria-checked", "false")

    await user.click(compradoPill)

    expect(onChange).toHaveBeenCalledWith("comprado")
  })

  it("supports keyboard navigation: ArrowRight moves focus, Enter confirms", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    function Harness() {
      const [value, setValue] = useState("nacido")
      return (
        <PillsSegmentadas
          value={value}
          onChange={(next) => {
            onChange(next)
            setValue(next)
          }}
          options={OPTIONS}
        />
      )
    }

    render(<Harness />)

    const nacidoPill = screen.getByRole("radio", { name: "Nacido en finca" })
    nacidoPill.focus()
    await user.keyboard("{ArrowRight}")
    const compradoPill = screen.getByRole("radio", { name: "Comprado" })
    expect(compradoPill).toHaveFocus()

    await user.keyboard("{Enter}")
    expect(onChange).toHaveBeenCalledWith("comprado")
    // After confirming, the active pill carries aria-pressed="true".
    expect(compradoPill).toHaveAttribute("aria-pressed", "true")
  })
})
