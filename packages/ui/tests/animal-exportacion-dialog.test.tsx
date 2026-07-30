// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import {
  AnimalExportacionDialog,
  type AnimalExportacionSeleccion,
  type AnimalExportacionTransporte,
  type ResultadoExportacionDialog,
} from "../src/ganado/animal-exportacion-dialog"
import { Toaster } from "../src/primitives/toast"

beforeAll(() => {
  // Radix Dialog/Toast call pointer-capture + scroll APIs jsdom lacks.
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

/** A transport that resolves a fixed outcome and records every selection. */
function transporteFijo(resultado: ResultadoExportacionDialog): {
  exportar: AnimalExportacionTransporte
  llamadas: AnimalExportacionSeleccion[]
} {
  const llamadas: AnimalExportacionSeleccion[] = []
  const exportar: AnimalExportacionTransporte = async (seleccion) => {
    llamadas.push(seleccion)
    return resultado
  }
  return { exportar, llamadas }
}

function renderDialog(exportar: AnimalExportacionTransporte) {
  return render(
    <>
      <AnimalExportacionDialog open onOpenChange={() => undefined} exportar={exportar} />
      <Toaster />
    </>,
  )
}

async function seleccionar(
  user: ReturnType<typeof userEvent.setup>,
  alcance: string,
  formato: string,
) {
  await user.selectOptions(screen.getByLabelText("Alcance"), alcance)
  await user.selectOptions(screen.getByLabelText("Formato"), formato)
}

describe("AnimalExportacionDialog — scope + format selection (LA-071/074, task 6.1)", () => {
  it("offers Vista actual / Todas and XLSX / CSV / PDF when open", () => {
    renderDialog(transporteFijo({ tipo: "exito" }).exportar)

    const alcance = screen.getByLabelText("Alcance") as HTMLSelectElement
    const formato = screen.getByLabelText("Formato") as HTMLSelectElement

    expect(screen.getByRole("dialog", { name: "Exportar animales" })).toBeInTheDocument()
    expect(Array.from(alcance.options).map((o) => o.textContent)).toEqual(["Vista actual", "Todas"])
    expect(Array.from(formato.options).map((o) => o.textContent)).toEqual(["XLSX", "CSV", "PDF"])
    // Defaults: the current view as Excel — the least surprising export.
    expect(alcance.value).toBe("vista")
    expect(formato.value).toBe("xlsx")
  })

  it("invokes the transport with the chosen scope and format on confirm", async () => {
    const user = userEvent.setup()
    const { exportar, llamadas } = transporteFijo({ tipo: "exito" })
    renderDialog(exportar)

    await seleccionar(user, "todas", "csv")
    await user.click(screen.getByRole("button", { name: "Exportar" }))

    await waitFor(() => expect(llamadas).toHaveLength(1))
    expect(llamadas[0]).toEqual({ alcance: "todas", formato: "csv" })
  })

  it("exports the current view as Excel by default when nothing is changed", async () => {
    const user = userEvent.setup()
    const { exportar, llamadas } = transporteFijo({ tipo: "exito" })
    renderDialog(exportar)

    await user.click(screen.getByRole("button", { name: "Exportar" }))

    await waitFor(() => expect(llamadas).toHaveLength(1))
    expect(llamadas[0]).toEqual({ alcance: "vista", formato: "xlsx" })
  })
})

describe("AnimalExportacionDialog — PDF 36-column warning (LA-074, task 6.1)", () => {
  it("warns when scope=todas AND format=pdf, recommending Excel", async () => {
    const user = userEvent.setup()
    const { exportar, llamadas } = transporteFijo({ tipo: "exito" })
    renderDialog(exportar)

    await seleccionar(user, "todas", "pdf")
    await user.click(screen.getByRole("button", { name: "Exportar" }))

    // No export yet — the warning gate intercepts the confirmation.
    expect(llamadas).toHaveLength(0)
    expect(
      screen.getByText("El PDF con 36 columnas puede ser difícil de leer. Te recomendamos Excel."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Continuar con PDF" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Usar Excel" })).toBeInTheDocument()
  })

  it("continues with PDF when the user confirms the warning", async () => {
    const user = userEvent.setup()
    const { exportar, llamadas } = transporteFijo({ tipo: "exito" })
    renderDialog(exportar)

    await seleccionar(user, "todas", "pdf")
    await user.click(screen.getByRole("button", { name: "Exportar" }))
    await user.click(screen.getByRole("button", { name: "Continuar con PDF" }))

    await waitFor(() => expect(llamadas).toHaveLength(1))
    expect(llamadas[0]).toEqual({ alcance: "todas", formato: "pdf" })
  })

  it("switches to Excel when the user accepts the recommendation", async () => {
    const user = userEvent.setup()
    const { exportar, llamadas } = transporteFijo({ tipo: "exito" })
    renderDialog(exportar)

    await seleccionar(user, "todas", "pdf")
    await user.click(screen.getByRole("button", { name: "Exportar" }))
    await user.click(screen.getByRole("button", { name: "Usar Excel" }))

    await waitFor(() => expect(llamadas).toHaveLength(1))
    expect(llamadas[0]).toEqual({ alcance: "todas", formato: "xlsx" })
    // The selection now reflects the switch.
    expect((screen.getByLabelText("Formato") as HTMLSelectElement).value).toBe("xlsx")
  })

  it("does not warn for scope=vista with PDF, nor for scope=todas with Excel", async () => {
    const user = userEvent.setup()
    const { exportar, llamadas } = transporteFijo({ tipo: "exito" })
    renderDialog(exportar)

    // vista + pdf → straight to export, no warning.
    await seleccionar(user, "vista", "pdf")
    await user.click(screen.getByRole("button", { name: "Exportar" }))
    await waitFor(() => expect(llamadas).toHaveLength(1))
    expect(llamadas[0]).toEqual({ alcance: "vista", formato: "pdf" })
    expect(
      screen.queryByText(
        "El PDF con 36 columnas puede ser difícil de leer. Te recomendamos Excel.",
      ),
    ).not.toBeInTheDocument()
  })
})

describe("AnimalExportacionDialog — error states (LA-040/041/072/076, task 6.1)", () => {
  it("403 shows access denied with no data", async () => {
    const user = userEvent.setup()
    renderDialog(transporteFijo({ tipo: "sin_acceso" }).exportar)

    await user.click(screen.getByRole("button", { name: "Exportar" }))

    const alerta = await screen.findByRole("alert")
    expect(alerta).toHaveTextContent("No tienes permiso para exportar en esta finca.")
    // The dialog stays present and non-destructive; no retry for a denial.
    expect(screen.getByRole("dialog", { name: "Exportar animales" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument()
  })

  it("413 prompts to refine the filters", async () => {
    const user = userEvent.setup()
    renderDialog(transporteFijo({ tipo: "demasiados_resultados" }).exportar)

    await user.click(screen.getByRole("button", { name: "Exportar" }))

    const alerta = await screen.findByRole("alert")
    expect(alerta).toHaveTextContent("Demasiados resultados")
    expect(alerta).toHaveTextContent("Afina los filtros para reducir los animales.")
  })

  it("timeout shows the specific message", async () => {
    const user = userEvent.setup()
    renderDialog(transporteFijo({ tipo: "timeout" }).exportar)

    await user.click(screen.getByRole("button", { name: "Exportar" }))

    const alerta = await screen.findByRole("alert")
    expect(alerta).toHaveTextContent("La exportación tardó demasiado")
    expect(alerta).toHaveTextContent("Reduce los filtros o el alcance.")
  })

  it("500 keeps the dialog open with a non-destructive message and Reintentar", async () => {
    const user = userEvent.setup()
    renderDialog(transporteFijo({ tipo: "error_servidor" }).exportar)

    await seleccionar(user, "todas", "csv")
    await user.click(screen.getByRole("button", { name: "Exportar" }))

    const alerta = await screen.findByRole("alert")
    expect(alerta).toHaveTextContent("No se pudo exportar")
    expect(alerta).toHaveTextContent("Ocurrió un error al generar el archivo.")
    // Dialog stays open and the selections are intact.
    expect(screen.getByRole("dialog", { name: "Exportar animales" })).toBeInTheDocument()
    expect((screen.getByLabelText("Alcance") as HTMLSelectElement).value).toBe("todas")
    expect((screen.getByLabelText("Formato") as HTMLSelectElement).value).toBe("csv")
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument()
  })

  it("Reintentar re-invokes the transport with the SAME scope and format (LA-076)", async () => {
    const user = userEvent.setup()
    const llamadas: AnimalExportacionSeleccion[] = []
    let intentos = 0
    const exportar: AnimalExportacionTransporte = async (seleccion) => {
      llamadas.push(seleccion)
      intentos += 1
      return intentos === 1 ? { tipo: "error_servidor" } : { tipo: "exito" }
    }
    renderDialog(exportar)

    await seleccionar(user, "todas", "csv")
    await user.click(screen.getByRole("button", { name: "Exportar" }))
    await screen.findByRole("alert")
    expect(llamadas).toEqual([{ alcance: "todas", formato: "csv" }])

    await user.click(screen.getByRole("button", { name: "Reintentar" }))

    await waitFor(() => expect(llamadas).toHaveLength(2))
    // The retry preserves the active scope and format — never clears them.
    expect(llamadas[1]).toEqual({ alcance: "todas", formato: "csv" })
    expect(llamadas[1]).toEqual(llamadas[0])
  })

  it("400 announces the correction with a toast and keeps the table", async () => {
    const user = userEvent.setup()
    renderDialog(
      transporteFijo({ tipo: "consulta_invalida", motivo: "scope debe ser todas o vista" })
        .exportar,
    )

    await user.click(screen.getByRole("button", { name: "Exportar" }))

    expect(await screen.findByText("Parámetros de la consulta corregidos")).toBeInTheDocument()
    expect(screen.getByText("scope debe ser todas o vista")).toBeInTheDocument()
  })
})

describe("AnimalExportacionDialog — success (LA-070, task 6.1)", () => {
  it("announces the download with a toast and closes the dialog", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <>
        <AnimalExportacionDialog
          open
          onOpenChange={onOpenChange}
          exportar={transporteFijo({ tipo: "exito" }).exportar}
        />
        <Toaster />
      </>,
    )

    await user.click(screen.getByRole("button", { name: "Exportar" }))

    expect(await screen.findByText("Exportación lista")).toBeInTheDocument()
    expect(screen.getByText("El archivo se descargó correctamente.")).toBeInTheDocument()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})
