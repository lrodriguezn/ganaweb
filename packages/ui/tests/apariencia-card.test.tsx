// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { AparienciaCard } from "../src/ganado/apariencia-card"

const ESTILOS = ["Campo", "Moderna", "Índigo", "Cielo", "Grafito"]
const ESTILO_IDS = ["campo", "moderna", "indigo", "cielo", "grafito"] as const

beforeEach(() => {
  document.documentElement.className = ""
  localStorage.clear()
})

afterEach(() => {
  document.documentElement.className = ""
  localStorage.clear()
  cleanup()
})

describe("AparienciaCard — five-style mobile /mas surface", () => {
  it("renders five visual style cards for mobile appearance", () => {
    render(<AparienciaCard />)

    expect(screen.getByText("APARIENCIA")).toBeInTheDocument()
    const radios = screen.getAllByRole("radio")
    expect(radios).toHaveLength(5)

    for (const estilo of ESTILOS) {
      expect(screen.getByRole("radio", { name: estilo })).toBeInTheDocument()
    }
  })

  it("shows product guidance for all five Spanish style labels", () => {
    render(<AparienciaCard />)

    expect(screen.getByText("Campo: contraste máximo para trabajar al sol")).toBeInTheDocument()
    expect(screen.getByText("Moderna: SaaS esmeralda con gradiente")).toBeInTheDocument()
    expect(screen.getByText("Índigo: SaaS clásico con acento violeta")).toBeInTheDocument()
    expect(screen.getByText("Cielo: agro-tech azul confianza")).toBeInTheDocument()
    expect(screen.getByText("Grafito: premium sobrio con acento ámbar")).toBeInTheDocument()
  })

  it("marks the active claro/oscuro mode button as pressed", async () => {
    const user = userEvent.setup()
    render(<AparienciaCard />)

    const sunButton = screen.getByRole("button", { name: "Cambiar a modo claro" })
    const moonButton = screen.getByRole("button", { name: "Cambiar a modo oscuro" })

    expect(sunButton).toHaveAttribute("aria-pressed", "true")
    expect(moonButton).toHaveAttribute("aria-pressed", "false")

    await user.click(moonButton)
    expect(sunButton).toHaveAttribute("aria-pressed", "false")
    expect(moonButton).toHaveAttribute("aria-pressed", "true")

    await user.click(sunButton)
    expect(sunButton).toHaveAttribute("aria-pressed", "true")
    expect(moonButton).toHaveAttribute("aria-pressed", "false")
  })

  it.each(ESTILO_IDS)(
    "keeps stored %s style while toggling claro/oscuro through mobile mode controls",
    async (estiloId) => {
      localStorage.setItem("ganaweb-estilo", estiloId)
      const user = userEvent.setup()
      render(<AparienciaCard />)

      const sunButton = screen.getByRole("button", { name: "Cambiar a modo claro" })
      const moonButton = screen.getByRole("button", { name: "Cambiar a modo oscuro" })

      await user.click(moonButton)
      expect(document.documentElement.classList.contains("dark")).toBe(true)
      expect(localStorage.getItem("ganaweb-theme")).toBe("dark")
      expect(localStorage.getItem("ganaweb-estilo")).toBe(estiloId)
      expect(moonButton).toHaveAttribute("aria-pressed", "true")

      await user.click(sunButton)
      expect(document.documentElement.classList.contains("dark")).toBe(false)
      expect(localStorage.getItem("ganaweb-theme")).toBe("light")
      expect(localStorage.getItem("ganaweb-estilo")).toBe(estiloId)
      expect(sunButton).toHaveAttribute("aria-pressed", "true")
    },
  )
})
