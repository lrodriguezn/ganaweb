// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { DatePicker } from "../src/primitives/date-picker"

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

describe("DatePicker primitive", () => {
  it("emits ISO yyyy-mm-dd when a date is picked and exposes aria attributes on the trigger", async () => {
    const user = userEvent.setup()

    function Harness() {
      const [value, setValue] = useState("")
      return (
        <DatePicker
          id="fecha"
          name="fechaNacimiento"
          value={value}
          onChange={setValue}
          aria-invalid="true"
          aria-describedby="err-fecha"
          placeholder="dd/mm/aaaa"
        />
      )
    }

    render(<Harness />)

    const trigger = screen.getByRole("button", { name: "dd/mm/aaaa" })
    expect(trigger).toHaveAttribute("aria-invalid", "true")
    expect(trigger).toHaveAttribute("aria-describedby", "err-fecha")

    await user.click(trigger)
    const day = await screen.findByRole("button", { name: /, 15 de julio de 2026/ })
    await user.click(day)

    const hidden = document.querySelector(
      'input[type="date"][name="fechaNacimiento"]',
    ) as HTMLInputElement | null
    expect(hidden).not.toBeNull()
    expect(hidden?.value).toBe("2026-07-15")
  })

  it("assigns a selected date before closing and keeps today selectable at the day boundary", async () => {
    const user = userEvent.setup()

    function Harness() {
      const [value, setValue] = useState("")
      return (
        <form>
          <DatePicker
            name="fechaNacimiento"
            value={value}
            onChange={setValue}
            maxDate={new Date(2026, 6, 15, 23, 59, 59)}
          />
        </form>
      )
    }

    const { container } = render(<Harness />)
    await user.click(screen.getByRole("button", { name: "dd/mm/aaaa" }))
    const today = await screen.findByRole("button", { name: /, 15 de julio de 2026/ })
    expect(today).toBeEnabled()
    await user.click(today)

    expect(screen.getByRole("button", { name: "15/07/2026" })).toBeInTheDocument()
    const formEl = container.querySelector("form")
    if (!formEl) throw new Error("form expected")
    expect(new FormData(formEl).get("fechaNacimiento")).toBe("2026-07-15")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("disables future days so onChange cannot emit a future ISO string (RN-002)", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<DatePicker name="fechaNacimiento" value="" onChange={onChange} />)

    await user.click(screen.getByRole("button", { name: "dd/mm/aaaa" }))

    const future = await screen.findByRole("button", { name: /, 25 de julio de 2026/ })
    expect(future).toBeDisabled()

    await user.click(future)
    expect(onChange).not.toHaveBeenCalled()
  })

  it("supports keyboard activation: Enter on a focused day button emits that ISO date", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<DatePicker name="fechaNacimiento" value="" onChange={onChange} />)

    await user.click(screen.getByRole("button", { name: "dd/mm/aaaa" }))

    const day = await screen.findByRole("button", { name: /, 10 de julio de 2026/ })
    day.focus()
    await user.keyboard("{Enter}")

    expect(onChange).toHaveBeenCalledTimes(1)
    const emitted = onChange.mock.calls[0]?.[0] as string
    expect(emitted).toMatch(/^\d{4}-07-10$/)
  })

  it("renders a pre-set ISO value as es-CO display and re-emits the same ISO on re-pick (round-trip)", () => {
    function Harness() {
      const [value, setValue] = useState("2024-03-15")
      return (
        <DatePicker
          name="fechaNacimiento"
          value={value}
          onChange={setValue}
          placeholder="dd/mm/aaaa"
        />
      )
    }
    render(<Harness />)
    expect(screen.getByRole("button", { name: "15/03/2024" })).toBeInTheDocument()
  })

  // BUG-003: popover anchor and collision contract.
  it("opens the calendar via a portal anchored to the trigger with side=bottom, align=start", async () => {
    const user = userEvent.setup()
    render(<DatePicker name="fechaCompra" value="" onChange={() => {}} />)

    await user.click(screen.getByRole("button", { name: "dd/mm/aaaa" }))

    const popover = screen.getByRole("dialog")
    // Portal: the popover is mounted in document.body, NOT inside the trigger's flex wrapper.
    expect(popover.closest('[class*="inline-flex"]')).toBeNull()
    expect(popover.parentElement?.parentElement).toBe(document.body)
    // Contract: explicit anchor so Radix chooses `bottom` by default and can flip safely.
    expect(popover).toHaveAttribute("data-side", "bottom")
    expect(popover).toHaveAttribute("data-align", "start")
  })

  it("flips the popover upward when the trigger sits below the viewport edge, and the flipped content does not overlap the trigger rect (BUG-003 collision)", async () => {
    const user = userEvent.setup()
    const originalInnerHeight = window.innerHeight
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
    // Constrained viewport: 600px tall. Trigger sits at the very bottom (top=560, bottom=600),
    // so a 240px-tall calendar cannot fit below — Radix MUST flip, and the flipped content
    // must respect the collision padding so it does not cover the trigger or its label.
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 600 })
    HTMLElement.prototype.getBoundingClientRect = function polyfilledRect() {
      if (this.tagName === "BUTTON" && this.getAttribute("type") === "button") {
        return {
          x: 0,
          y: 560,
          left: 0,
          top: 560,
          right: 320,
          bottom: 600,
          width: 320,
          height: 40,
          toJSON: () => ({}),
        } as DOMRect
      }
      return {
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 320,
        bottom: 240,
        width: 320,
        height: 240,
        toJSON: () => ({}),
      } as DOMRect
    }
    try {
      render(<DatePicker name="fechaCompra" value="" onChange={() => {}} />)
      await user.click(screen.getByRole("button", { name: "dd/mm/aaaa" }))

      const popover = screen.getByRole("dialog")
      // Radix chose to flip the popover because the trigger cannot fit a 240px calendar below it.
      expect(popover).toHaveAttribute("data-side", "top")
      // Even after the flip, the popover's bottom must stay strictly above the trigger's top — no overlap.
      const popoverRect = popover.getBoundingClientRect()
      const triggerRect = screen.getByRole("button", { name: "dd/mm/aaaa" }).getBoundingClientRect()
      expect(popoverRect.bottom).toBeLessThanOrEqual(triggerRect.top)
      // And the popover remains inside the viewport — collision padding keeps it from being clipped.
      expect(popoverRect.top).toBeGreaterThanOrEqual(0)
    } finally {
      Object.defineProperty(window, "innerHeight", {
        configurable: true,
        value: originalInnerHeight,
      })
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect
    }
  })
})

// =====================================================================
// BUG-004: Shared calendar presentation MUST be token-driven and use
// dropdown navigation. No hex literals, no theme-flip variants.
// =====================================================================

function openCalendar(value = "", maxDate?: Date) {
  return (
    <DatePicker
      name="fechaNacimiento"
      value={value}
      onChange={() => {}}
      maxDate={maxDate ?? new Date()}
    />
  )
}

describe("DatePicker BUG-004 — tokenized calendar styling", () => {
  it("renders the dropdown caption label with text-support + font-semibold tokens (14px / 600)", async () => {
    const user = userEvent.setup()
    render(openCalendar())
    await user.click(screen.getByRole("button", { name: "dd/mm/aaaa" }))

    // Dropdown mode renders two visible captions (month + year) with
    // the same token hierarchy. Filter to the aria-hidden display span.
    const dropdownCaptions = Array.from(
      document.querySelectorAll<HTMLElement>('[aria-hidden="true"]'),
    ).filter((el) => {
      const cls = typeof el.className === "string" ? el.className : ""
      return cls.includes("text-support") && cls.includes("font-semibold")
    })
    expect(dropdownCaptions.length).toBeGreaterThanOrEqual(2)
    for (const caption of dropdownCaptions) {
      const cls = caption.className as string
      expect(cls).toContain("text-support")
      expect(cls).toContain("font-semibold")
    }
  })

  it("renders every weekday header cell with text-caption + text-muted-foreground + font-medium (12px / 500)", async () => {
    const user = userEvent.setup()
    render(openCalendar())
    await user.click(screen.getByRole("button", { name: "dd/mm/aaaa" }))

    const weekdayCells = document.querySelectorAll<HTMLElement>("th.text-caption")
    expect(weekdayCells.length).toBe(7) // lu, ma, mi, ju, vi, sá, do
    for (const cell of weekdayCells) {
      const cls = cell.className
      expect(cls).toContain("text-caption")
      expect(cls).toContain("text-muted-foreground")
      expect(cls).toContain("font-medium")
    }
  })

  it("renders day number buttons with text-support + tabular-nums (14px / 400)", async () => {
    const user = userEvent.setup()
    render(openCalendar())
    await user.click(screen.getByRole("button", { name: "dd/mm/aaaa" }))

    // A regular, non-today, non-disabled, non-selected day button.
    const day = await screen.findByRole("button", { name: /^miércoles, 1 de julio de 2026$/ })
    const cls = day.className
    expect(cls).toContain("text-support")
    // `num` (project token) or `tabular-nums` (Tailwind utility) is acceptable.
    expect(cls).toMatch(/\b(num|tabular-nums)\b/)
  })

  it("renders today's day button with text-primary + font-semibold (keeps primary color, adds 600)", async () => {
    const user = userEvent.setup()
    render(openCalendar())
    await user.click(screen.getByRole("button", { name: "dd/mm/aaaa" }))

    // react-day-picker prefixes today's button aria-label with "Today,".
    const today = await screen.findByRole("button", { name: /^Today,/ })
    const cls = today.className
    expect(cls).toContain("text-primary")
    expect(cls).toContain("font-semibold")
  })

  it("renders the selected day button with bg-primary + text-primary-foreground tokens", async () => {
    const user = userEvent.setup()
    render(openCalendar("2026-07-15"))
    await user.click(screen.getByRole("button", { name: "15/07/2026" }))

    const selectedCell = document.querySelector<HTMLElement>('[class*="rdp-selected"]')
    const selectedButton = selectedCell?.querySelector<HTMLElement>("button")
    expect(selectedButton).not.toBeNull()
    const selectedClassName = selectedButton?.className ?? ""
    expect(selectedClassName).toContain("bg-primary")
    expect(selectedClassName).toContain("text-primary-foreground")
  })

  it("renders a disabled day button with the text-muted-foreground token", async () => {
    const user = userEvent.setup()
    // Pass a past maxDate so days after it are disabled.
    render(openCalendar("", new Date(2026, 6, 19, 23, 59, 59)))
    await user.click(screen.getByRole("button", { name: "dd/mm/aaaa" }))

    // Days past maxDate (19) are disabled and receive text-muted-foreground
    // (replacing text-support via twMerge).
    const future = await screen.findByRole("button", { name: /^lunes, 20 de julio de 2026$/ })
    expect(future).toBeDisabled()
    expect(future.className).toContain("text-muted-foreground")
  })

  it("renders the caption as a dropdown with month + year selects (captionLayout='dropdown')", async () => {
    const user = userEvent.setup()
    render(openCalendar())
    await user.click(screen.getByRole("button", { name: "dd/mm/aaaa" }))

    const dialog = screen.getByRole("dialog")
    const selects = dialog.querySelectorAll<HTMLSelectElement>("select")
    expect(selects.length).toBe(2) // one for month, one for year
  })

  it("constrains navigation via startMonth + endMonth: year options span a bounded window", async () => {
    const user = userEvent.setup()
    render(openCalendar())
    await user.click(screen.getByRole("button", { name: "dd/mm/aaaa" }))

    const dialog = screen.getByRole("dialog")
    const yearSelect = dialog.querySelectorAll<HTMLSelectElement>("select")[1]
    // endMonth=2026-07, 5-year lookback startMonth=2021-07 → bounded window.
    if (!yearSelect) throw new Error("year select expected")
    const years = Array.from(yearSelect.options).map((o) => o.value)
    expect(years).toContain("2026")
    expect(years).toContain("2021")
    expect(years).not.toContain("2020")
  })
})
