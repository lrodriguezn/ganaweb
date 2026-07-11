// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { EstiloSwitcher } from "../src/ganado/estilo-switcher"

const ESTILO_KEY = "ganaweb-estilo"
const THEME_KEY = "ganaweb-theme"
const STYLE_CLASSES = ["theme-b", "theme-moderna", "theme-indigo", "theme-cielo", "theme-grafito"]

beforeEach(() => {
  document.documentElement.className = ""
  localStorage.clear()
})

afterEach(() => {
  document.documentElement.className = ""
  localStorage.clear()
  cleanup()
})

describe("EstiloSwitcher five-style selector", () => {
  it("renders one accessible radio card per Spanish style label with Campo selected by default", () => {
    render(<EstiloSwitcher />)

    expect(screen.getByRole("radiogroup", { name: "Estilo visual" })).toBeInTheDocument()

    const labels = ["Campo", "Moderna", "Índigo", "Cielo", "Grafito"]
    const radios = screen.getAllByRole("radio")
    expect(radios).toHaveLength(labels.length)

    for (const label of labels) {
      const radio = screen.getByRole("radio", { name: label })
      expect(radio.closest("label")).toHaveTextContent(label)
      expect(radio.closest("label")).toHaveStyle({ minHeight: "44px" })
    }

    expect(screen.getByRole("radio", { name: "Campo" })).toBeChecked()
    expect(screen.getByRole("radio", { name: "Grafito" })).not.toBeChecked()
    expect(localStorage.getItem(ESTILO_KEY)).toBeNull()
  })

  it("selects Grafito without changing claro/oscuro state or the theme storage key", async () => {
    document.documentElement.classList.add("dark")
    localStorage.setItem(THEME_KEY, "dark")
    const user = userEvent.setup()
    render(<EstiloSwitcher />)

    await user.click(screen.getByRole("radio", { name: "Grafito" }))

    expect(screen.getByRole("radio", { name: "Grafito" })).toBeChecked()
    expect(document.documentElement.classList.contains("theme-grafito")).toBe(true)
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(localStorage.getItem(ESTILO_KEY)).toBe("grafito")
    expect(localStorage.getItem(THEME_KEY)).toBe("dark")
  })

  it("cleans legacy and stale style classes before applying the selected non-Campo style", async () => {
    document.documentElement.classList.add("theme-b", "theme-moderna", "theme-cielo", "dark")
    localStorage.setItem(ESTILO_KEY, "moderna")
    const user = userEvent.setup()
    render(<EstiloSwitcher />)

    await user.click(screen.getByRole("radio", { name: "Índigo" }))

    expect(document.documentElement.classList.contains("theme-indigo")).toBe(true)
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    for (const className of STYLE_CLASSES.filter((className) => className !== "theme-indigo")) {
      expect(document.documentElement.classList.contains(className)).toBe(false)
    }
    expect(localStorage.getItem(ESTILO_KEY)).toBe("indigo")
  })

  it("falls back to Campo for invalid stored values and removes legacy style classes", () => {
    document.documentElement.classList.add("theme-b", "theme-grafito")
    localStorage.setItem(ESTILO_KEY, "unknown-style")

    render(<EstiloSwitcher />)

    expect(screen.getByRole("radio", { name: "Campo" })).toBeChecked()
    for (const className of STYLE_CLASSES) {
      expect(document.documentElement.classList.contains(className)).toBe(false)
    }
    expect(localStorage.getItem(ESTILO_KEY)).toBe("campo")
  })

  it("maps legacy stored Moderna values to the scalable theme-moderna class", () => {
    localStorage.setItem(ESTILO_KEY, "theme-b")
    document.documentElement.classList.add("theme-b")

    render(<EstiloSwitcher />)

    expect(screen.getByRole("radio", { name: "Moderna" })).toBeChecked()
    expect(document.documentElement.classList.contains("theme-moderna")).toBe(true)
    expect(document.documentElement.classList.contains("theme-b")).toBe(false)
  })

  it("uses roving keyboard selection with visible focus for Índigo and Home/End boundaries", async () => {
    const user = userEvent.setup()
    render(<EstiloSwitcher />)

    const campo = screen.getByRole("radio", { name: "Campo" })
    campo.focus()
    expect(campo).toHaveFocus()

    await user.keyboard("{ArrowRight}{ArrowRight}")
    const indigo = screen.getByRole("radio", { name: "Índigo" })
    expect(indigo).toHaveFocus()
    expect(indigo).toBeChecked()
    expect(localStorage.getItem(ESTILO_KEY)).toBe("indigo")

    await user.keyboard("{End}")
    const grafito = screen.getByRole("radio", { name: "Grafito" })
    expect(grafito).toHaveFocus()
    expect(grafito).toBeChecked()

    await user.keyboard("{Home}")
    expect(campo).toHaveFocus()
    expect(campo).toBeChecked()
  })

  it("keeps the UI usable when localStorage writes fail", async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError")
    })
    const user = userEvent.setup()
    render(<EstiloSwitcher />)

    await expect(user.click(screen.getByRole("radio", { name: "Cielo" }))).resolves.not.toThrow()

    expect(screen.getByRole("radio", { name: "Cielo" })).toBeChecked()
    expect(document.documentElement.classList.contains("theme-cielo")).toBe(true)
    expect(setItemSpy).toHaveBeenCalledWith(ESTILO_KEY, "cielo")
  })

  it("accepts the sm size without dropping any style option", () => {
    render(<EstiloSwitcher size="sm" />)

    expect(screen.getAllByRole("radio")).toHaveLength(5)
    expect(screen.getByRole("radio", { name: "Campo" })).toBeChecked()
    expect(screen.getByRole("radio", { name: "Grafito" })).not.toBeChecked()
  })
})
