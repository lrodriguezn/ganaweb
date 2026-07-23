// @vitest-environment jsdom

import { readFileSync } from "node:fs"
import { renderToString } from "react-dom/server"

import { act, cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import {
  AnimalDesktopScreen,
  AnimalFichaDesktopScreen,
  AnimalFichaHeader,
  AnimalFichaMobileScreen,
  AnimalFormScreen,
  AnimalGallery,
  AnimalGenealogy,
  AnimalListMobile,
  AnimalTimeline,
} from "../src"
import {
  DETAIL_FIELD_NAMES,
  SECTION_LAYOUT,
  sectionFor,
  useOnlineStatus,
} from "../src/ganado/animal-crud-infra"

const animal = {
  id: "a-1",
  codigoAnimal: "MT-122",
  nombreAnimal: "Luna",
  sexo: "hembra" as const,
  categoriaReproductiva: "novilla" as const,
  salud: "sano" as const,
  estadoActual: "activo" as const,
  potrero: "Potrero 4",
  lote: "Lote Norte",
  imagenPrincipalUrl: "/luna.webp",
}

const nav = [
  { id: "inicio", label: "Inicio", href: "/", icon: () => null },
  { id: "animales", label: "Animales", href: "/animales", icon: () => null },
  { id: "tareas", label: "Tareas", href: "/tareas", icon: () => null },
  { id: "mas", label: "Más", href: "/mas", icon: () => null },
]

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

describe("PR3 animal UI OpenPencil parity", () => {
  it("renders mobile animal cards with image, badges, location, selection state, and empty action", () => {
    const onPress = vi.fn()
    const { rerender } = render(
      <AnimalListMobile
        animales={[animal]}
        selectedIds={["a-1"]}
        onPressAnimal={onPress}
        onNuevoAnimal={vi.fn()}
        bottomNavItems={nav}
      />,
    )

    const card = screen.getByRole("button", { name: /MT-122 Luna/i })
    expect(card).toHaveAttribute("aria-pressed", "true")
    expect(within(card).getByRole("img", { name: /foto principal de Luna/i })).toHaveAttribute(
      "src",
      "/luna.webp",
    )
    expect(within(card).getByText("Novilla")).toBeInTheDocument()
    expect(within(card).getByText("Potrero 4 · Lote Norte")).toBeInTheDocument()

    rerender(
      <AnimalListMobile
        animales={[]}
        onPressAnimal={onPress}
        onNuevoAnimal={vi.fn()}
        bottomNavItems={nav}
      />,
    )
    expect(screen.getByText("No hay animales con estos filtros")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Registrar animal" })).toBeInTheDocument()
  })

  it("groups ficha timeline by year, keeps descending order, and exposes non-color pending state", () => {
    render(
      <AnimalTimeline
        eventos={[
          {
            id: "e-2026",
            dominio: "manejo",
            tipo: "foto",
            fecha: "2026-07-10",
            titulo: "Foto agregada",
            detalle: "Pendiente de subir",
            estadoLocal: "pendiente",
          },
          {
            id: "e-2025",
            dominio: "produccion",
            tipo: "peso",
            fecha: "2025-03-01",
            titulo: "Peso registrado",
            detalle: "320 kg",
          },
        ]}
      />,
    )

    const groups = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)
    expect(groups).toEqual(["2026", "2025"])
    expect(screen.getByText("Pendiente de subir")).toBeInTheDocument()
    expect(
      screen.getByText("Guardado local · se sincronizará al recuperar señal"),
    ).toBeInTheDocument()
  })

  it("shows persistent inactive/sold/dead banners and hides event actions on ficha header", () => {
    render(
      <AnimalFichaHeader
        animal={{ ...animal, estadoActual: "vendido" }}
        metrics={[{ label: "Edad", value: "3 años" }]}
        canEdit={true}
        canCreateEvents={true}
      />,
    )

    expect(screen.getByRole("status")).toHaveTextContent(
      "Animal vendido · la historia se conserva y las acciones de evento están ocultas",
    )
    expect(screen.queryByRole("button", { name: /Registrar evento/i })).not.toBeInTheDocument()
    expect(screen.getByText("3 años")).toBeInTheDocument()
  })

  it("enforces the five-image gallery limit and marks pending upload without color-only state", () => {
    render(
      <AnimalGallery
        images={[0, 1, 2, 3, 4].map((index) => ({
          id: `img-${index}`,
          src: `/animal-${index}.webp`,
          alt: `Foto ${index + 1}`,
          principal: index === 0,
          pendingUpload: index === 4,
        }))}
        onAddImage={vi.fn()}
        onMarkPrincipal={vi.fn()}
        onUnlink={vi.fn()}
      />,
    )

    expect(screen.getByText("5 de 5 fotos activas")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Límite de 5 fotos alcanzado" })).toBeDisabled()
    expect(screen.getByText("Principal")).toBeInTheDocument()
    expect(screen.getByText("Pendiente de subir")).toBeInTheDocument()
  })

  it("renders desktop/mobile form labels, contextual raza hint, offline note, and sticky save footer", () => {
    const { rerender } = render(
      <AnimalFormScreen mode="desktop" onSave={vi.fn()} onCancel={vi.fn()} />,
    )
    for (const label of [
      "Código *",
      "Nombre",
      "Nº de arete",
      "Sexo",
      "Raza",
      "Fecha de nacimiento",
      "Color",
      "Calidad",
      "Origen",
      "Madre",
      "Padre",
      "Potrero",
      "Sector",
      "Lote",
      "Grupo",
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }

    // 3.2 — when fieldErrors is omitted, no role="alert" and no aria-invalid="true"
    // renders on any input/select. Existing edit-mode test (:336) relies on the same
    // prop being undefined by default; this is the explicit omit assertion.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    for (const input of screen.getAllByRole("textbox")) {
      expect(input).not.toHaveAttribute("aria-invalid", "true")
    }
    for (const combobox of screen.getAllByRole("combobox")) {
      expect(combobox).not.toHaveAttribute("aria-invalid", "true")
    }

    rerender(<AnimalFormScreen mode="mobile" onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(
      screen.getByText("¿No encuentras la raza? Créala sin salir del formulario."),
    ).toBeInTheDocument()
    expect(screen.queryByText("Se sincronizará al recuperar señal")).not.toBeInTheDocument()
    expect(screen.getByRole("contentinfo")).toHaveAttribute("data-sticky-save", "true")
    // Same omit-by-default pin on the mobile layout — alert markup must not render
    // when the create route does not supply fieldErrors.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("submits the animal form through onSave exactly once per Guardar click", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <AnimalFormScreen
        mode="desktop"
        onSave={onSave}
        onCancel={vi.fn()}
        catalogOptions={{ sexo: [{ value: "1", label: "Hembra" }] }}
      />,
    )
    await user.type(screen.getByLabelText("Código *"), "NV-42")
    await user.type(screen.getByLabelText("Nombre"), "Novilla 42")
    await user.click(screen.getByRole("button", { name: "Guardar" }))

    expect(onSave).toHaveBeenCalledTimes(1)
    const [formData] = onSave.mock.calls[0] as [FormData]
    expect(formData.get("codigo")).toBe("NV-42")
    expect(formData.get("nombre")).toBe("Novilla 42")
    expect(formData.get("sexoKey")).toBe("1")
  })

  it("keeps server-rendered controls disabled until hydration enables the interactive form", () => {
    const props = { mode: "desktop" as const, onSave: vi.fn(), onCancel: vi.fn() }
    const serverMarkup = renderToString(<AnimalFormScreen {...props} />)

    expect(serverMarkup).toContain('aria-busy="true"')
    expect(serverMarkup).toContain('disabled=""')

    render(<AnimalFormScreen {...props} />)
    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled()
    expect(screen.getByLabelText("Código *")).toBeEnabled()
  })

  it("renders per-field error under the named input with ARIA wiring when fieldErrors is supplied", () => {
    render(
      <AnimalFormScreen
        mode="desktop"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        fieldErrors={{ codigo: "Requerido" }}
      />,
    )

    // The codigo input must be marked invalid and point at the alert id via aria-describedby.
    const codigoInput = screen.getByLabelText("Código *")
    expect(codigoInput).toHaveAttribute("aria-invalid", "true")
    const describedBy = codigoInput.getAttribute("aria-describedby")
    expect(describedBy).toBeTruthy()
    const alert = describedBy ? document.getElementById(describedBy) : null
    expect(alert).not.toBeNull()
    expect(alert).toHaveAttribute("role", "alert")
    expect(alert).toHaveTextContent("Requerido")

    // The error text lives under the input (not somewhere unrelated) — getByText
    // scans from the form root, so the placement is implicit; the explicit ARIA
    // association above is the spec's authoritative contract.
    expect(screen.getByText("Requerido")).toBeInTheDocument()

    // Other fields without an error must NOT be marked invalid (no blanket aria-invalid).
    const nombreInput = screen.getByLabelText("Nombre")
    expect(nombreInput).not.toHaveAttribute("aria-invalid", "true")
    expect(nombreInput).not.toHaveAttribute("aria-describedby")

    // Sibling fields must not pick up the codigo alert id.
    const allAlerts = screen.getAllByRole("alert")
    expect(allAlerts).toHaveLength(1)
    expect(allAlerts[0]).toHaveTextContent("Requerido")
  })

  it("renders per-field error under named CatalogSelectField (Sexo) with ARIA wiring", () => {
    render(
      <AnimalFormScreen
        mode="desktop"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        fieldErrors={{ sexoKey: "Sexo requerido" }}
      />,
    )

    // Sexo is rendered via CatalogSelectField (Radix Select). The trigger carries the
    // aria-invalid / aria-describedby wiring — the alert <p> lives next to it.
    const sexoTrigger = screen.getByRole("combobox", { name: "Sexo" })
    expect(sexoTrigger).toHaveAttribute("aria-invalid", "true")
    const describedBy = sexoTrigger.getAttribute("aria-describedby")
    expect(describedBy).toBeTruthy()
    const alert = describedBy ? document.getElementById(describedBy) : null
    expect(alert).not.toBeNull()
    expect(alert).toHaveAttribute("role", "alert")
    expect(alert).toHaveTextContent("Sexo requerido")
  })

  it("uses labeled catalog selectors for CA-UI-001/003 while preserving form payload keys", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <AnimalFormScreen
        mode="desktop"
        onSave={onSave}
        onCancel={vi.fn()}
        initialValues={{ origen: "origen-compra", sexoKey: 1 }}
        catalogOptions={{
          sexo: [
            { value: "0", label: "Macho" },
            { value: "1", label: "Hembra" },
            { value: "2", label: "Pajuela" },
          ],
          origen: [{ value: "origen-compra", label: "Compra externa" }],
        }}
      />,
    )

    expect(screen.getByRole("combobox", { name: "Sexo" })).toHaveTextContent("Hembra")
    expect(screen.getByRole("combobox", { name: "Origen" })).toHaveTextContent("Compra externa")
    expect(screen.queryByText(/^1$/)).not.toBeInTheDocument()

    await user.type(screen.getByLabelText("Código *"), "NV-43")
    await user.type(screen.getByLabelText("Nombre"), "Novilla 43")
    await user.click(screen.getByRole("combobox", { name: "Sexo" }))
    expect(screen.getByRole("option", { name: "Macho" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Hembra" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Pajuela" })).toBeInTheDocument()
    await user.click(screen.getByRole("option", { name: "Macho" }))

    await user.click(screen.getByRole("button", { name: "Guardar" }))
    const [formData] = onSave.mock.calls[0] as [FormData]
    expect(formData.get("sexoKey")).toBe("0")
    expect(formData.get("origen")).toBe("origen-compra")
  })

  it("uses dynamic sexo options, serializes selection, and fails closed without a catalog", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const { rerender } = render(
      <>
        <AnimalFormScreen
          mode="desktop"
          onSave={onSave}
          onCancel={vi.fn()}
          catalogOptions={{
            sexo: [
              { value: "0", label: "Macho" },
              { value: "1", label: "Hembra" },
            ],
          }}
        />
        <AnimalFormScreen
          mode="mobile"
          onSave={vi.fn()}
          onCancel={vi.fn()}
          catalogOptions={{
            sexo: [
              { value: "0", label: "Macho" },
              { value: "1", label: "Hembra" },
            ],
          }}
        />
      </>,
    )
    // Desktop renders Sexo as a combobox (Select), mobile as a radiogroup (PillsSegmentadas)
    const sexoComboboxes = screen.getAllByRole("combobox", { name: "Sexo" })
    expect(sexoComboboxes).toHaveLength(1) // only desktop
    const sexoRadiogroups = screen.getAllByRole("radiogroup", { name: "Sexo" })
    expect(sexoRadiogroups).toHaveLength(1) // only mobile
    const firstSexo = sexoComboboxes[0]
    if (!firstSexo) throw new Error("first sexo control expected")
    await user.click(firstSexo)
    await user.click(screen.getByRole("option", { name: "Macho" }))
    const codigoInputs = screen.getAllByLabelText("Código *")
    const firstCodigo = codigoInputs[0]
    if (!firstCodigo) throw new Error("first codigo input expected")
    await user.type(firstCodigo, "SX-1")
    const nombreInputs = screen.getAllByLabelText("Nombre")
    const firstNombre = nombreInputs[0]
    if (!firstNombre) throw new Error("first nombre input expected")
    await user.type(firstNombre, "Sexo dinámico")
    const guardarButtons = screen.getAllByRole("button", { name: "Guardar" })
    const firstGuardar = guardarButtons[0]
    if (!firstGuardar) throw new Error("first guardar button expected")
    await user.click(firstGuardar)
    const firstCall = onSave.mock.calls[0]
    const firstArg = firstCall?.[0]
    if (!(firstArg instanceof FormData)) throw new Error("expected FormData as first arg")
    expect(firstArg.get("sexoKey")).toBe("0")

    rerender(
      <AnimalFormScreen
        mode="desktop"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        catalogOptions={{ sexo: [] }}
      />,
    )
    expect(screen.getByRole("combobox", { name: "Sexo" })).toBeDisabled()
    expect(screen.getByRole("combobox", { name: "Sexo" })).toHaveTextContent("Sexo")
  })

  it("shows the field label as placeholder when catalog values are missing (CA-UI-001/003)", () => {
    render(
      <AnimalFormScreen
        mode="desktop"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        initialValues={{ origen: "origen-legacy" }}
        catalogOptions={{ origen: [] }}
      />,
    )

    expect(screen.getByRole("combobox", { name: "Origen" })).toHaveTextContent("Origen")
    expect(screen.queryByText("origen-legacy")).not.toBeInTheDocument()
  })

  it("shows field label as placeholder for create-mode location selectors when catalog options are missing (CA-UI-001/003/005)", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="create"
        onSave={onSave}
        onCancel={vi.fn()}
        catalogOptions={{}}
      />,
    )

    for (const label of ["Potrero", "Sector", "Lote", "Grupo"] as const) {
      expect(screen.getByRole("combobox", { name: label })).toHaveTextContent(label)
    }

    await user.type(screen.getByLabelText("Código *"), "NV-46")
    await user.type(screen.getByLabelText("Nombre"), "Novilla 46")
    await user.click(screen.getByRole("button", { name: "Guardar" }))

    expect(onSave).toHaveBeenCalledTimes(1)
    const [formData] = onSave.mock.calls[0] as [FormData]
    for (const name of ["potreroId", "sectorId", "loteId", "grupoId"] as const) {
      expect(formData.get(name)).toBe("")
    }
    expect(formData.get("codigo")).toBe("NV-46")
    expect(formData.get("nombre")).toBe("Novilla 46")
    expect(formData.has("ubicacion")).toBe(false)
  })

  it("renders split CA-UI-005 location controls in create mode and submits selected ids", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="create"
        onSave={onSave}
        onCancel={vi.fn()}
        catalogOptions={{
          potrero: [{ value: "potrero-4", label: "Potrero 4" }],
          sector: [{ value: "sector-norte", label: "Sector Norte" }],
          lote: [{ value: "lote-cria", label: "Lote Cría" }],
          grupo: [{ value: "grupo-novillas", label: "Grupo Novillas" }],
        }}
      />,
    )

    expect(screen.queryByLabelText("Potrero/Sector/Lote/Grupo")).not.toBeInTheDocument()

    for (const [label, option] of [
      ["Potrero", "Potrero 4"],
      ["Sector", "Sector Norte"],
      ["Lote", "Lote Cría"],
      ["Grupo", "Grupo Novillas"],
    ] as const) {
      await user.click(screen.getByRole("combobox", { name: label }))
      await user.click(screen.getByRole("option", { name: option }))
    }

    await user.type(screen.getByLabelText("Código *"), "NV-44")
    await user.type(screen.getByLabelText("Nombre"), "Novilla 44")
    await user.click(screen.getByRole("button", { name: "Guardar" }))

    const [formData] = onSave.mock.calls[0] as [FormData]
    expect(formData.get("potreroId")).toBe("potrero-4")
    expect(formData.get("sectorId")).toBe("sector-norte")
    expect(formData.get("loteId")).toBe("lote-cria")
    expect(formData.get("grupoId")).toBe("grupo-novillas")
    expect(formData.has("ubicacion")).toBe(false)
  })

  it("renders edit-mode CA-UI-005 location as read-only and excludes direct mutations", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="edit"
        onSave={onSave}
        onCancel={vi.fn()}
        currentLocation={{
          potrero: "Potrero 4",
          sector: "Sector Norte",
          lote: "Lote Cría",
          grupo: "Grupo Novillas",
        }}
      />,
    )

    const location = screen.getByRole("region", { name: "Ubicación actual" })
    expect(within(location).getByText("Potrero 4")).toBeInTheDocument()
    expect(within(location).getByText("Sector Norte")).toBeInTheDocument()
    expect(within(location).getByText("Lote Cría")).toBeInTheDocument()
    expect(within(location).getByText("Grupo Novillas")).toBeInTheDocument()
    expect(within(location).getByRole("button", { name: "Mover animal" })).toBeInTheDocument()
    expect(screen.queryByLabelText("Potrero/Sector/Lote/Grupo")).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: "Potrero" })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText("Código *"), "NV-45")
    await user.type(screen.getByLabelText("Nombre"), "Novilla 45")
    await user.click(screen.getByRole("button", { name: "Guardar" }))

    const [formData] = onSave.mock.calls[0] as [FormData]
    expect(formData.has("potreroId")).toBe(false)
    expect(formData.has("sectorId")).toBe(false)
    expect(formData.has("loteId")).toBe(false)
    expect(formData.has("grupoId")).toBe(false)
    expect(formData.has("ubicacion")).toBe(false)
  })

  it("composes desktop list and ficha structures named after OpenPencil frames", () => {
    render(
      <>
        <AnimalDesktopScreen animales={[animal]} selectedIds={["a-1"]} onNuevoAnimal={vi.fn()} />
        <AnimalFichaDesktopScreen animal={animal} timeline={[]} />
      </>,
    )

    expect(screen.getByTestId("op-f-300165")).toHaveAccessibleName("18 Animales · Desktop")
    expect(screen.getByRole("table", { name: "Animales" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Nuevo animal" })).toBeInTheDocument()
    expect(screen.getByText("1 seleccionado")).toBeInTheDocument()
    expect(screen.getByTestId("op-f-400107")).toHaveAccessibleName("19 Ficha Animal · Desktop")
    for (const card of ["Datos", "Reproducción", "Peso", "Timeline"]) {
      expect(screen.getByRole("region", { name: card })).toBeInTheDocument()
    }
  })

  it("guards the UI package test runner against focused tests in scripts and config", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>
    }
    const vitestConfig = readFileSync("vitest.config.ts", "utf8")

    expect(packageJson.scripts.test).toContain("--allowOnly=false")
    expect(vitestConfig).toMatch(/allowOnly:\s*false/)
  })

  it("renders mobile ficha frame 04 with header metrics, tabs, timeline, and bottom navigation", () => {
    render(
      <AnimalFichaMobileScreen
        animal={animal}
        timeline={[
          {
            id: "e-1",
            dominio: "manejo",
            tipo: "foto",
            fecha: "2026-07-10",
            titulo: "Foto agregada",
            detalle: "Imagen principal actualizada",
          },
        ]}
        metrics={[
          { label: "Edad", value: "3 años" },
          { label: "Último peso", value: "320 kg" },
        ]}
        bottomNavItems={nav}
        onRegistrarEvento={vi.fn()}
      />,
    )

    expect(screen.getByTestId("op-frame-0232")).toHaveAccessibleName("04 Ficha Animal · Mobile")
    expect(screen.getAllByText("MT-122").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("3 años")).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Timeline" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tab", { name: "Datos" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Fotos" })).toBeInTheDocument()
    expect(screen.getByText("Foto agregada")).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "Navegación inferior" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Registrar evento" })).toBeInTheDocument()
  })

  it("renders the v1.3 field set with the new primitives and gates '+ Crear nuevo' on configuracion:crear (CA-UI-001/002/004)", () => {
    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="create"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        catalogOptions={{
          raza: [
            { value: "r1", label: "Angus" },
            { value: "r2", label: "Brahman" },
          ],
          color: [{ value: "c1", label: "Negro" }],
          calidad: [{ value: "q1", label: "Excelente" }],
          madre: [
            { value: "a-100", codigo: "MT-100", nombre: "Lola" },
            { value: "a-200", codigo: "MT-200", nombre: "Maya" },
          ],
          padre: [{ value: "a-300", codigo: "MT-300", nombre: "Roble" }],
          canCreateCatalog: { raza: true, color: true, lugarCompra: true },
        }}
      />,
    )

    // fechaNacimiento is a DatePicker — trigger is a button labelled by the "Fecha de nacimiento" <Label htmlFor>.
    const fechaTrigger = screen.getByRole("button", { name: "Fecha de nacimiento" })
    expect(fechaTrigger).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "Fecha de nacimiento" })).not.toBeInTheDocument()

    // Raza / Color are SelectConCreacion (combobox role) with label association.
    expect(screen.getByRole("combobox", { name: "Raza" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Color" })).toBeInTheDocument()

    // Calidad is also a SelectConCreacion (per spec the form MUST NOT display raw keys
    // for calidad either), but `+ Crear nuevo` must NOT render — the spec is explicit
    // that calidad is a read-only catalog.
    const calidadCombobox = screen.getByRole("combobox", { name: "Calidad" })
    expect(calidadCombobox).toBeInTheDocument()

    // Origen is a PillsSegmentadas — radiogroup with 2 options, not a combobox.
    const origenGroup = screen.getByRole("radiogroup", { name: "Origen" })
    expect(origenGroup).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Nacido en finca" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Comprado" })).toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: "Origen" })).not.toBeInTheDocument()

    // Default origen = nacido_en_finca → parents visible, purchase fields not.
    expect(screen.getByRole("combobox", { name: "Madre" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Padre" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Fecha de nacimiento" })).toBeInTheDocument() // only fechaNacimiento trigger
    expect(screen.queryByRole("combobox", { name: "Lugar de compra" })).not.toBeInTheDocument()
  })

  it("gates '+ Crear nuevo' inside Raza, Color, Lugar de compra on canCreateCatalog; Calidad never shows it (CA-UI-002)", async () => {
    const user = userEvent.setup()

    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="create"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        catalogOptions={{
          raza: [{ value: "r1", label: "Angus" }],
          color: [{ value: "c1", label: "Negro" }],
          calidad: [{ value: "q1", label: "Excelente" }],
          lugarCompra: [{ value: "l1", label: "Feria local" }],
          canCreateCatalog: { raza: true, color: false, lugarCompra: true },
        }}
      />,
    )

    // Switch to comprado so lugarCompra renders
    await user.click(screen.getByRole("radio", { name: "Comprado" }))

    // Raza (canCreate) — `+ Crear nuevo` last item
    await user.click(screen.getByRole("combobox", { name: "Raza" }))
    const razaList = await screen.findByRole("listbox")
    expect(within(razaList).getByText("+ Crear nuevo")).toBeInTheDocument()
    await user.keyboard("{Escape}")
    // close popover
    await user.click(document.body)
    cleanup()

    // Re-render to reset popover state — this is the cleanest way to test the
    // next field without dealing with stacked Radix popovers in jsdom.
    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="create"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        catalogOptions={{
          raza: [{ value: "r1", label: "Angus" }],
          color: [{ value: "c1", label: "Negro" }],
          calidad: [{ value: "q1", label: "Excelente" }],
          lugarCompra: [{ value: "l1", label: "Feria local" }],
          canCreateCatalog: { raza: true, color: false, lugarCompra: true },
        }}
      />,
    )
    await user.click(screen.getByRole("radio", { name: "Comprado" }))

    // Color (canCreate=false) — `+ Crear nuevo` NOT present
    await user.click(screen.getByRole("combobox", { name: "Color" }))
    const colorList = await screen.findByRole("listbox")
    expect(within(colorList).queryByText("+ Crear nuevo")).not.toBeInTheDocument()
    await user.click(document.body)
    cleanup()

    // Calidad (canCreate always false per spec) — `+ Crear nuevo` NOT present
    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="create"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        catalogOptions={{
          raza: [{ value: "r1", label: "Angus" }],
          calidad: [{ value: "q1", label: "Excelente" }],
          canCreateCatalog: { raza: true, color: false, lugarCompra: true },
        }}
      />,
    )
    await user.click(screen.getByRole("combobox", { name: "Calidad" }))
    const calidadList = await screen.findByRole("listbox")
    expect(within(calidadList).queryByText("+ Crear nuevo")).not.toBeInTheDocument()
    await user.click(document.body)
    cleanup()

    // Lugar de compra (canCreate=true) — `+ Crear nuevo` present
    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="create"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        catalogOptions={{
          raza: [{ value: "r1", label: "Angus" }],
          lugarCompra: [{ value: "l1", label: "Feria local" }],
          canCreateCatalog: { raza: true, color: false, lugarCompra: true },
        }}
      />,
    )
    await user.click(screen.getByRole("radio", { name: "Comprado" }))
    await user.click(screen.getByRole("combobox", { name: "Lugar de compra" }))
    const lugarList = await screen.findByRole("listbox")
    expect(within(lugarList).getByText("+ Crear nuevo")).toBeInTheDocument()
  })

  it("shows purchase fields (fechaCompra/precioCompra/pesoCompra/lugarCompra) ONLY when origen='comprado' (CA-UI-007)", async () => {
    const user = userEvent.setup()

    render(
      <AnimalFormScreen mode="desktop" formVariant="create" onSave={vi.fn()} onCancel={vi.fn()} />,
    )

    // Default: nacido_en_finca → purchase fields NOT visible
    expect(screen.queryByRole("button", { name: "Fecha de nacimiento" })).toBeInTheDocument() // only fechaNacimiento
    expect(screen.queryByLabelText("Fecha de compra")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Precio")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Peso compra")).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: "Lugar de compra" })).not.toBeInTheDocument()

    // Toggle to comprado
    await user.click(screen.getByRole("radio", { name: "Comprado" }))

    // Purchase fields visible
    expect(screen.getByLabelText("Fecha de compra")).toBeInTheDocument()
    expect(screen.getByLabelText("Precio")).toBeInTheDocument()
    expect(screen.getByLabelText("Peso compra")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Lugar de compra" })).toBeInTheDocument()

    // Parents NOT visible
    expect(screen.queryByRole("combobox", { name: "Madre" })).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: "Padre" })).not.toBeInTheDocument()
  })

  it("discards abandoned purchase-field values when origen flips back to 'nacido_en_finca' (CA-UI-007)", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <AnimalFormScreen mode="desktop" formVariant="create" onSave={onSave} onCancel={vi.fn()} />,
    )

    // Switch to comprado
    await user.click(screen.getByRole("radio", { name: "Comprado" }))

    // Type a value in Precio
    const precio = screen.getByLabelText("Precio")
    await user.type(precio, "1500,75")

    // Switch back to nacido_en_finca
    await user.click(screen.getByRole("radio", { name: "Nacido en finca" }))

    // Switch to comprado again — the previous value should NOT be there
    await user.click(screen.getByRole("radio", { name: "Comprado" }))
    const precioAfter = screen.getByLabelText("Precio")
    expect(precioAfter).toHaveValue("")

    // Submit and verify the FormData does NOT carry the abandoned value
    await user.type(screen.getByLabelText("Código *"), "NV-99")
    await user.type(screen.getByLabelText("Nombre"), "Novilla 99")
    await user.click(screen.getByRole("button", { name: "Guardar" }))

    const [formData] = onSave.mock.calls[0] as [FormData]
    // CA-UI-007: the purchase-field input may still be in the DOM
    // (uncontrolled), but its VALUE must be empty so the FormData
    // does not carry the abandoned user input.
    expect(formData.get("precioCompra")).toBe("")
  })

  it("serializes controlled birth and purchase dates while rejecting purchase dates before birth", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <AnimalFormScreen mode="desktop" formVariant="create" onSave={onSave} onCancel={vi.fn()} />,
    )

    await user.click(screen.getByRole("button", { name: "Fecha de nacimiento" }))
    await user.click(await screen.findByRole("button", { name: /, 10 de julio de 2026/ }))
    await user.click(screen.getByRole("radio", { name: "Comprado" }))
    await user.click(screen.getByRole("button", { name: "Fecha de compra" }))

    const beforeBirth = await screen.findByRole("button", { name: /, 9 de julio de 2026/ })
    expect(beforeBirth).toBeDisabled()
    await user.click(await screen.findByRole("button", { name: /, 15 de julio de 2026/ }))
    expect(screen.getByRole("button", { name: "Fecha de compra" })).toHaveTextContent("15/07/2026")

    await user.type(screen.getByLabelText("Código *"), "NV-DATE")
    await user.type(screen.getByLabelText("Nombre"), "Fecha controlada")
    await user.click(screen.getByRole("button", { name: "Guardar" }))
    const [formData] = onSave.mock.calls[0] as [FormData]
    expect(formData.get("fechaNacimiento")).toBe("2026-07-10")
    expect(formData.get("fechaCompra")).toBe("2026-07-15")
  })

  it("filters out the current animal from the madre/padre options to prevent self-parenting", async () => {
    const user = userEvent.setup()

    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="edit"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        currentAnimalId="a-200"
        catalogOptions={{
          madre: [
            { value: "a-100", codigo: "MT-100", nombre: "Lola" },
            { value: "a-200", codigo: "MT-200", nombre: "Maya" },
          ],
          padre: [{ value: "a-300", codigo: "MT-300", nombre: "Roble" }],
        }}
      />,
    )

    // open madre combobox
    await user.click(screen.getByRole("combobox", { name: "Madre" }))
    const list = await screen.findByRole("listbox")
    expect(within(list).queryByText("MT-200 · Maya")).not.toBeInTheDocument()
    expect(within(list).getByText("MT-100 · Lola")).toBeInTheDocument()
  })

  it("'Estimar por edad' produces an ISO date and appends '[fecha estimada]' to comentarios (CA-CRE-004)", async () => {
    const user = userEvent.setup()

    render(
      <AnimalFormScreen mode="desktop" formVariant="create" onSave={vi.fn()} onCancel={vi.fn()} />,
    )

    // Open the DatePicker popover to find the "Estimar por edad" link in the footer
    await user.click(screen.getByRole("button", { name: "Fecha de nacimiento" }))
    const estimarLink = await screen.findByRole("button", { name: /Estimar por edad/i })
    await user.click(estimarLink)

    // The age input appears inside the popover footer
    const ageInput = await screen.findByRole("spinbutton", { name: /a[ñn]os/i })
    await user.clear(ageInput)
    await user.type(ageInput, "3")

    // Confirm
    await user.click(screen.getByRole("button", { name: /Aplicar/i }))

    // The DatePicker trigger now shows the formatted date (3 years ago)
    const today = new Date()
    const threeYearsAgo = new Date(today)
    threeYearsAgo.setFullYear(today.getFullYear() - 3)
    const dd = String(threeYearsAgo.getDate()).padStart(2, "0")
    const mm = String(threeYearsAgo.getMonth() + 1).padStart(2, "0")
    const yyyy = threeYearsAgo.getFullYear()
    const expectedDisplay = `${dd}/${mm}/${yyyy}`
    expect(screen.getByText(expectedDisplay)).toBeInTheDocument()

    // comentarios ends with [fecha estimada]
    const comentarios = screen.getByLabelText("Comentarios")
    expect(comentarios).toHaveValue("[fecha estimada]")
  })

  it("rejects future dates on fechaNacimiento with aria-invalid='true' and the error message (RN-002)", () => {
    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="create"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        fieldErrors={{ fechaNacimiento: "La fecha no puede ser futura" }}
      />,
    )

    const trigger = screen.getByRole("button", { name: "Fecha de nacimiento" })
    expect(trigger).toHaveAttribute("aria-invalid", "true")
    const describedBy = trigger.getAttribute("aria-describedby")
    expect(describedBy).toBeTruthy()
    const alert = describedBy ? document.getElementById(describedBy) : null
    expect(alert).not.toBeNull()
    expect(alert).toHaveAttribute("role", "alert")
    expect(alert).toHaveTextContent("La fecha no puede ser futura")
  })

  it("submit button shows 'Guardando…' and preserves width when isSubmitting is true (CA-UI-006)", () => {
    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="create"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        isSubmitting
      />,
    )

    const btn = screen.getByRole("button", { name: "Guardando…" })
    expect(btn).toBeInTheDocument()
    expect(btn).toBeDisabled()
    // Width preservation — a fixed minimum that resists collapsing to fit the new label.
    // Asserted via class because jsdom does not compute layout-derived properties.
    expect(btn).toHaveClass("min-w-[120px]")
  })

  it("exports and renders genealogy relationships for animal ficha composition", () => {
    render(
      <AnimalGenealogy
        parents={{
          mother: { codigoAnimal: "MT-010", nombreAnimal: "Aurora" },
          father: { codigoAnimal: "TR-020", nombreAnimal: "Roble" },
        }}
        offspring={[
          { codigoAnimal: "CR-301", nombreAnimal: "Nube", relation: "Hija" },
          { codigoAnimal: "CR-302", relation: "Hijo" },
        ]}
      />,
    )

    expect(screen.getByRole("region", { name: "Genealogía" })).toBeInTheDocument()
    expect(screen.getByText("Madre")).toBeInTheDocument()
    expect(screen.getByText("MT-010 · Aurora")).toBeInTheDocument()
    expect(screen.getByText("Padre")).toBeInTheDocument()
    expect(screen.getByText("TR-020 · Roble")).toBeInTheDocument()
    expect(screen.getByText("Hija · CR-301 · Nube")).toBeInTheDocument()
    expect(screen.getByText("Hijo · CR-302")).toBeInTheDocument()
  })

  /**
   * BUG-001 regression tests.
   *
   * These tests use canonical DB seed IDs (not the mock fixture IDs) to
   * determine whether the selection bug was caused by mock ID prefix mismatch
   * (col- vs color-) or by a deeper issue in the SelectConCreacion primitive.
   *
   * Root cause: SelectConCreacionField had a no-op onChange, making the hidden
   * native input never update after selection. Fix: controlled state via
   * useState + onChange → setSelectedValue.
   */
  describe("BUG-001 selection contract with real-data IDs", () => {
    it("raza click → FormData carries canonical id (raza-angus, not mock prefix)", async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()

      render(
        <AnimalFormScreen
          mode="desktop"
          formVariant="create"
          onSave={onSave}
          onCancel={vi.fn()}
          catalogOptions={{
            raza: [
              { value: "raza-angus", label: "Angus" },
              { value: "raza-brahman", label: "Brahman" },
              { value: "raza-holstein", label: "Holstein" },
            ],
            sexo: [{ value: "1", label: "Hembra" }],
            canCreateCatalog: { raza: true },
          }}
        />,
      )

      await user.click(screen.getByRole("combobox", { name: "Raza" }))
      await user.click(await screen.findByRole("option", { name: "Angus" }))

      await user.type(screen.getByLabelText("Código *"), "NV-BUG001-R")
      await user.type(screen.getByLabelText("Nombre"), "BUG-001 Raza")
      await user.click(screen.getByRole("button", { name: "Guardar" }))

      const [formData] = onSave.mock.calls[0] as [FormData]
      expect(formData.get("raza")).toBe("raza-angus")
    })

    it("color click → FormData carries canonical id (col-negro, not color-negro)", async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()

      render(
        <AnimalFormScreen
          mode="desktop"
          formVariant="create"
          onSave={onSave}
          onCancel={vi.fn()}
          catalogOptions={{
            color: [
              { value: "col-negro", label: "Negro", meta: { hex: "#1a1a1a" } },
              { value: "col-blanco", label: "Blanco", meta: { hex: "#f5f5f5" } },
            ],
            sexo: [{ value: "1", label: "Hembra" }],
            canCreateCatalog: { color: true },
          }}
        />,
      )

      await user.click(screen.getByRole("combobox", { name: "Color" }))
      await user.click(await screen.findByRole("option", { name: "Negro" }))

      await user.type(screen.getByLabelText("Código *"), "NV-BUG001-C")
      await user.type(screen.getByLabelText("Nombre"), "BUG-001 Color")
      await user.click(screen.getByRole("button", { name: "Guardar" }))

      const [formData] = onSave.mock.calls[0] as [FormData]
      expect(formData.get("color")).toBe("col-negro")
    })

    it("keyboard navigation (Enter) selects the first option with canonical id", async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()

      render(
        <AnimalFormScreen
          mode="desktop"
          formVariant="create"
          onSave={onSave}
          onCancel={vi.fn()}
          catalogOptions={{
            raza: [
              { value: "raza-angus", label: "Angus" },
              { value: "raza-brahman", label: "Brahman" },
            ],
            sexo: [{ value: "1", label: "Hembra" }],
          }}
        />,
      )

      const razaCombo = screen.getByRole("combobox", { name: "Raza" })
      await user.click(razaCombo)
      await user.keyboard("{Enter}")

      await user.type(screen.getByLabelText("Código *"), "NV-BUG001-K")
      await user.type(screen.getByLabelText("Nombre"), "BUG-001 Kbd")
      await user.click(screen.getByRole("button", { name: "Guardar" }))

      const [formData] = onSave.mock.calls[0] as [FormData]
      expect(formData.get("raza")).toBe("raza-angus")
    })
  })

  describe("viewport-flip state preservation (issue #59)", () => {
    type ChangeHandler = (event: { matches: boolean }) => void

    function installMatchMediaWithEvents(initial: "mobile" | "desktop") {
      const listeners = new Set<ChangeHandler>()
      let currentMatches = initial === "desktop"

      Object.defineProperty(window, "matchMedia", {
        writable: true,
        configurable: true,
        value: (query: string) => ({
          matches: currentMatches,
          media: query,
          onchange: null,
          addEventListener: (_type: string, handler: ChangeHandler) => {
            listeners.add(handler)
          },
          removeEventListener: (_type: string, handler: ChangeHandler) => {
            listeners.delete(handler)
          },
        }),
      })

      return {
        setViewport(viewport: "mobile" | "desktop") {
          currentMatches = viewport === "desktop"
          for (const handler of [...listeners]) {
            handler({ matches: currentMatches })
          }
        },
      }
    }

    function uninstallMatchMedia() {
      try {
        Reflect.deleteProperty(window, "matchMedia")
      } catch {
        // ignore
      }
    }

    afterEach(() => {
      uninstallMatchMedia()
    })

    it("preserves comentarios and fechaNacimiento when viewport flips desktop → mobile", async () => {
      const mock = installMatchMediaWithEvents("desktop")
      const user = userEvent.setup()

      // @ts-expect-error — mode is required until task 1.1 makes it optional (RED)
      render(<AnimalFormScreen onSave={vi.fn()} onCancel={vi.fn()} />)

      // Desktop initially
      expect(screen.getByTestId("op-f-400191")).toBeInTheDocument()

      // Type into comentarios
      await user.type(screen.getByLabelText("Comentarios"), "animal enfermo")

      // Set fechaNacimiento via DatePicker
      await user.click(screen.getByRole("button", { name: "Fecha de nacimiento" }))
      await user.click(await screen.findByRole("button", { name: /, 10 de julio de 2026/ }))

      // Flip viewport to mobile
      mock.setViewport("mobile")

      // Should re-render as mobile variant (RED: current code has no matchMedia listener)
      const mobileSection = await screen.findByTestId("op-f-400233")
      expect(mobileSection).toBeInTheDocument()

      // State must survive the re-render
      expect(screen.getByLabelText("Comentarios")).toHaveValue("animal enfermo")
      expect(screen.getByRole("button", { name: "Fecha de nacimiento" })).toHaveTextContent(
        "10/07/2026",
      )
    })

    it("preserves state on mobile → desktop flip and formId is stable", async () => {
      const mock = installMatchMediaWithEvents("mobile")
      const user = userEvent.setup()

      // @ts-expect-error — mode is required until task 1.1 makes it optional (RED)
      render(<AnimalFormScreen onSave={vi.fn()} onCancel={vi.fn()} />)

      // Wait for the matchMedia effect to flip to mobile
      const mobileSection = await screen.findByTestId("op-f-400233")
      expect(mobileSection).toBeInTheDocument()

      // Type into comentarios in mobile
      await user.type(screen.getByLabelText("Comentarios"), "dato móvil")

      // Flip to desktop
      mock.setViewport("desktop")

      // Should render desktop variant
      const desktopSection = await screen.findByTestId("op-f-400191")
      expect(desktopSection).toBeInTheDocument()

      // State preserved
      expect(screen.getByLabelText("Comentarios")).toHaveValue("dato móvil")

      // formId is stable across variants (no mode segment)
      const form = document.querySelector("form")
      expect(form).toHaveAttribute("id", "animal-form-new")
    })

    it("explicit mode prop overrides the media query", () => {
      const mock = installMatchMediaWithEvents("desktop")

      render(<AnimalFormScreen mode="mobile" onSave={vi.fn()} onCancel={vi.fn()} />)

      // Mobile variant rendered because mode overrides
      expect(screen.getByTestId("op-f-400233")).toBeInTheDocument()

      // Flip viewport — component should NOT change
      mock.setViewport("desktop")

      // Still mobile because mode="mobile" takes precedence
      expect(screen.getByTestId("op-f-400233")).toBeInTheDocument()
    })

    it("SSR markup is desktop when mode is not provided", () => {
      // @ts-expect-error — mode is required until task 1.1 makes it optional (RED)
      const markup = renderToString(<AnimalFormScreen onSave={vi.fn()} onCancel={vi.fn()} />)
      expect(markup).toContain("op-f-400191")
      expect(markup).toContain("20 Nuevo Animal · Desktop")
    })
  })

  describe("WU-2: support infrastructure (useOnlineStatus, SECTION_LAYOUT, sectionFor, DETAIL_FIELD_NAMES)", () => {
    describe("useOnlineStatus hook", () => {
      it("returns true by default (online) and flips to false on 'offline' event", async () => {
        function Harness() {
          const online = useOnlineStatus()
          return <span data-testid="online-status">{String(online)}</span>
        }
        render(<Harness />)
        expect(screen.getByTestId("online-status")).toHaveTextContent("true")

        // Simulate offline event
        await act(async () => {
          window.dispatchEvent(new Event("offline"))
        })
        expect(screen.getByTestId("online-status")).toHaveTextContent("false")
      })

      it("flips back to true on 'online' event after going offline", async () => {
        function Harness() {
          const online = useOnlineStatus()
          return <span data-testid="online-status">{String(online)}</span>
        }
        render(<Harness />)
        // Go offline
        await act(async () => {
          window.dispatchEvent(new Event("offline"))
        })
        expect(screen.getByTestId("online-status")).toHaveTextContent("false")
        // Come back online
        await act(async () => {
          window.dispatchEvent(new Event("online"))
        })
        expect(screen.getByTestId("online-status")).toHaveTextContent("true")
      })
    })

    describe("SECTION_LAYOUT config", () => {
      it("has exactly 5 entries with correct ids and titles", () => {
        expect(SECTION_LAYOUT).toHaveLength(5)
        expect(SECTION_LAYOUT.map((s) => s.id)).toEqual([
          "identificacion",
          "caracteristicas",
          "origen",
          "ubicacion",
          "detalles",
        ])
        expect(SECTION_LAYOUT[0]?.title).toBe("Identificación")
        expect(SECTION_LAYOUT[4]?.title).toBe("Detalles adicionales")
      })

      it("assigns gridClasses for non-collapsible sections and kind='collapsible' for detalles", () => {
        const identificacion = SECTION_LAYOUT.find((s) => s.id === "identificacion")
        expect(identificacion?.gridClasses).toContain("1fr")
        expect(identificacion?.gridClasses).toContain("1.4fr")

        const detalles = SECTION_LAYOUT.find((s) => s.id === "detalles")
        expect(detalles?.kind).toBe("collapsible")
      })
    })

    describe("sectionFor resolver", () => {
      it("maps 'codigo' to 'identificacion' and 'sexoKey' to 'caracteristicas'", () => {
        expect(sectionFor("codigo")).toBe("identificacion")
        expect(sectionFor("nombre")).toBe("identificacion")
        expect(sectionFor("codigoArete")).toBe("identificacion")
        expect(sectionFor("sexoKey")).toBe("caracteristicas")
        expect(sectionFor("raza")).toBe("caracteristicas")
      })

      it("maps 'origen' to 'origen' and location fields to 'ubicacion'", () => {
        expect(sectionFor("origen")).toBe("origen")
        expect(sectionFor("potreroId")).toBe("ubicacion")
        expect(sectionFor("sectorId")).toBe("ubicacion")
        expect(sectionFor("loteId")).toBe("ubicacion")
        expect(sectionFor("grupoId")).toBe("ubicacion")
      })

      it("maps detail fields to 'detalles'", () => {
        expect(sectionFor("codigoRfid")).toBe("detalles")
        expect(sectionFor("tipoExplotacionId")).toBe("detalles")
        expect(sectionFor("propietarioId")).toBe("detalles")
        expect(sectionFor("comentarios")).toBe("detalles")
      })
    })

    describe("DETAIL_FIELD_NAMES set", () => {
      it("contains all fields rendered inside the collapsible block", () => {
        expect(DETAIL_FIELD_NAMES.has("codigoRfid")).toBe(true)
        expect(DETAIL_FIELD_NAMES.has("tipoExplotacionId")).toBe(true)
        expect(DETAIL_FIELD_NAMES.has("propietarioId")).toBe(true)
        expect(DETAIL_FIELD_NAMES.has("hierroId")).toBe(true)
        expect(DETAIL_FIELD_NAMES.has("numeroPezones")).toBe(true)
        expect(DETAIL_FIELD_NAMES.has("tatuado")).toBe(true)
        expect(DETAIL_FIELD_NAMES.has("herrado")).toBe(true)
        expect(DETAIL_FIELD_NAMES.has("descornado")).toBe(true)
        expect(DETAIL_FIELD_NAMES.has("esDeMonta")).toBe(true)
        expect(DETAIL_FIELD_NAMES.has("comentarios")).toBe(true)
      })

      it("does NOT contain non-detail fields", () => {
        expect(DETAIL_FIELD_NAMES.has("codigo")).toBe(false)
        expect(DETAIL_FIELD_NAMES.has("sexoKey")).toBe(false)
        expect(DETAIL_FIELD_NAMES.has("origen")).toBe(false)
        expect(DETAIL_FIELD_NAMES.has("potreroId")).toBe(false)
      })
    })
  })

  describe("WU-3: 4-section layout restructure", () => {
    it("renders exactly 4 <section> elements with uppercase headers in order", () => {
      render(
        <AnimalFormScreen mode="desktop" onSave={vi.fn()} onCancel={vi.fn()} />,
      )
      const form = document.querySelector("form")
      expect(form).not.toBeNull()
      const sections = form?.querySelectorAll(":scope > fieldset > section")
      expect(sections?.length).toBe(4)

      // Headers should be uppercase with correct titles
      const headers = form?.querySelectorAll("h2")
      expect(headers?.length).toBeGreaterThanOrEqual(4)
      const headerTexts = Array.from(headers ?? []).map((h) => h.textContent?.trim())
      expect(headerTexts).toContain("IDENTIFICACIÓN")
      expect(headerTexts).toContain("CARACTERÍSTICAS")
      expect(headerTexts).toContain("ORIGEN")
      expect(headerTexts).toContain("UBICACIÓN")
    })

    it("uses per-section grids (no global grid-cols-2 on the form)", () => {
      render(
        <AnimalFormScreen mode="desktop" onSave={vi.fn()} onCancel={vi.fn()} />,
      )
      const form = document.querySelector("form")
      expect(form).not.toBeNull()
      // The form element itself should NOT have grid-cols-2
      const formClass = form?.className ?? ""
      expect(formClass).not.toContain("grid-cols-2")

      // Section grids are on inner divs — check all descendant grid classes
      const allClasses = Array.from(form?.querySelectorAll("*") ?? []).map(
        (el) => el.className,
      )
      const allClassesStr = allClasses.join(" ")
      // IDENTIFICACIÓN section has grid with 1.4fr
      expect(allClassesStr).toContain("1.4fr")
      // UBICACIÓN section has 4-column grid
      expect(allClassesStr).toContain("1fr_1fr_1fr_1fr")
    })

    it("constrains the card to max-w-[720px] (not max-w-3xl)", () => {
      render(
        <AnimalFormScreen mode="desktop" onSave={vi.fn()} onCancel={vi.fn()} />,
      )
      const form = document.querySelector("form")
      expect(form).not.toBeNull()
      const formClass = form?.className ?? ""
      expect(formClass).toContain("max-w-[720px]")
      expect(formClass).not.toContain("max-w-3xl")
    })

    it("preserves all existing form field labels within the sections", () => {
      render(
        <AnimalFormScreen mode="desktop" onSave={vi.fn()} onCancel={vi.fn()} />,
      )
      // All fields still present
      for (const label of [
        "Código *",
        "Nombre",
        "Nº de arete",
        "Sexo",
        "Raza",
        "Fecha de nacimiento",
        "Color",
        "Calidad",
        "Origen",
        "Madre",
        "Padre",
        "Potrero",
        "Sector",
        "Lote",
        "Grupo",
      ]) {
        expect(screen.getByLabelText(label)).toBeInTheDocument()
      }
    })
  })

  describe("WU-4: Collapsible 'Detalles adicionales'", () => {
    it("is closed on create with no count suffix", () => {
      render(
        <AnimalFormScreen mode="desktop" formVariant="create" onSave={vi.fn()} onCancel={vi.fn()} />,
      )
      const trigger = screen.getByRole("button", { name: /Detalles adicionales/i })
      expect(trigger).toBeInTheDocument()
      // Trigger text should NOT contain a count suffix
      expect(trigger.textContent).not.toMatch(/con datos/)
      // The content should be collapsed — detail fields hidden (forceMounted)
      const rfidInput = screen.queryByLabelText("RFID")
      if (rfidInput) {
        // With forceMount, element is in DOM but hidden via data-state="closed"
        expect(rfidInput.closest('[data-state="closed"]')).not.toBeNull()
      }
    })

    it("auto-opens on edit when detail fields have data, with count badge", () => {
      render(
        <AnimalFormScreen
          mode="desktop"
          formVariant="edit"
          onSave={vi.fn()}
          onCancel={vi.fn()}
          initialValues={{
            codigoRfid: "RFID-123",
            propietarioId: "prop-1",
            comentarios: "Some notes",
          }}
        />,
      )
      const trigger = screen.getByRole("button", { name: /Detalles adicionales/i })
      // Should show count badge
      expect(trigger.textContent).toMatch(/3 con datos/)
      // Content should be visible (collapsible is open)
      expect(screen.getByLabelText("Comentarios")).toBeInTheDocument()
    })

    it("forces open when a detail field has a validation error", () => {
      render(
        <AnimalFormScreen
          mode="desktop"
          formVariant="create"
          onSave={vi.fn()}
          onCancel={vi.fn()}
          fieldErrors={{ codigoRfid: "RFID inválido" }}
        />,
      )
      // Collapsible should be forced open
      expect(screen.getByLabelText("RFID")).toBeInTheDocument()
      // Error should be visible
      expect(screen.getByText("RFID inválido")).toBeInTheDocument()
    })

    it("excludes esDeMonta from count when sexoKey !== 0 (Hembra)", () => {
      render(
        <AnimalFormScreen
          mode="desktop"
          formVariant="edit"
          onSave={vi.fn()}
          onCancel={vi.fn()}
          initialValues={{
            sexoKey: 1, // Hembra
            esDeMonta: true,
            comentarios: "test",
          }}
        />,
      )
      const trigger = screen.getByRole("button", { name: /Detalles adicionales/i })
      // esDeMonta should NOT be counted for Hembra → only comentarios counts
      expect(trigger.textContent).toMatch(/1 con datos/)
    })

    it("hides esDeMonta switch when sexoKey is not 0 (Macho)", () => {
      render(
        <AnimalFormScreen
          mode="desktop"
          formVariant="edit"
          onSave={vi.fn()}
          onCancel={vi.fn()}
          initialValues={{ sexoKey: 1 }} // Hembra
          fieldErrors={{ esDeMonta: "dummy" }} // force open
        />,
      )
      // esDeMonta switch should NOT be in the DOM
      expect(screen.queryByLabelText("Es de monta")).not.toBeInTheDocument()
    })

    it("shows esDeMonta switch when sexoKey is 0 (Macho)", () => {
      render(
        <AnimalFormScreen
          mode="desktop"
          formVariant="edit"
          onSave={vi.fn()}
          onCancel={vi.fn()}
          initialValues={{ sexoKey: 0 }} // Macho
          fieldErrors={{ codigoRfid: "dummy" }} // force open
        />,
      )
      expect(screen.getByLabelText("Es de monta")).toBeInTheDocument()
    })
  })

  describe("WU-5: Mobile parity", () => {
    it("renders Sexo as PillsSegmentadas on mobile (not Select)", () => {
      render(
        <AnimalFormScreen
          mode="mobile"
          onSave={vi.fn()}
          onCancel={vi.fn()}
          catalogOptions={{
            sexo: [
              { value: "0", label: "Macho" },
              { value: "1", label: "Hembra" },
            ],
          }}
        />,
      )
      // On mobile, Sexo should be a radiogroup (PillsSegmentadas)
      expect(screen.getByRole("radiogroup", { name: "Sexo" })).toBeInTheDocument()
      // No combobox for Sexo on mobile
      expect(screen.queryByRole("combobox", { name: "Sexo" })).not.toBeInTheDocument()
    })

    it("renders mobile ✕ close button in header calling onCancel", async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      render(
        <AnimalFormScreen mode="mobile" onSave={vi.fn()} onCancel={onCancel} />,
      )
      const closeBtn = screen.getByRole("button", { name: /cerrar/i })
      expect(closeBtn).toBeInTheDocument()
      await user.click(closeBtn)
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it("renders sticky full-width footer with 'Guardar animal' on mobile", () => {
      render(<AnimalFormScreen mode="mobile" onSave={vi.fn()} onCancel={vi.fn()} />)
      const footer = screen.getByRole("contentinfo")
      expect(footer).toHaveAttribute("data-sticky-save", "true")
      // Primary button text includes "animal" on mobile
      expect(screen.getByRole("button", { name: /Guardar animal/ })).toBeInTheDocument()
    })
  })

  describe("WU-6: Fixes (sync hint, required, estimar)", () => {
    it("hides sync hint when online, shows it when offline (CA-UI-005)", async () => {
      render(<AnimalFormScreen mode="desktop" onSave={vi.fn()} onCancel={vi.fn()} />)
      // By default online → hint hidden
      expect(screen.queryByText("Se sincronizará al recuperar señal")).not.toBeInTheDocument()

      // Go offline → hint visible
      await act(async () => {
        window.dispatchEvent(new Event("offline"))
      })
      expect(screen.getByText("Se sincronizará al recuperar señal")).toBeInTheDocument()

      // Come back online → hint hidden again
      await act(async () => {
        window.dispatchEvent(new Event("online"))
      })
      expect(screen.queryByText("Se sincronizará al recuperar señal")).not.toBeInTheDocument()
    })

    it("Tipo de explotación has NO asterisk and NO aria-required (CA-UI-014)", () => {
      render(
        <AnimalFormScreen
          mode="desktop"
          formVariant="create"
          onSave={vi.fn()}
          onCancel={vi.fn()}
          catalogOptions={{
            tipoExplotacion: [{ value: "t1", label: "Lechería" }],
          }}
          fieldErrors={{ codigoRfid: "dummy" }} // force collapsible open
        />,
      )
      const trigger = screen.getByRole("combobox", { name: "Tipo de explotación" })
      expect(trigger).toBeInTheDocument()
      expect(trigger).not.toHaveAttribute("aria-required", "true")
      // Label should NOT have an asterisk
      const label = trigger.closest(".space-y-1\\.5")?.querySelector("label")
      expect(label?.textContent).not.toMatch(/\*/)
    })

    it("renders 'Estimar por edad' link inside DatePicker popover footer, NOT as sibling button (CA-UI-013)", async () => {
      const user = userEvent.setup()
      render(
        <AnimalFormScreen mode="desktop" formVariant="create" onSave={vi.fn()} onCancel={vi.fn()} />,
      )
      // There should be NO standalone "Estimar por edad" button outside the popover
      const estimarButtons = screen.queryAllByRole("button", { name: /Estimar por edad/i })
      expect(estimarButtons).toHaveLength(0)

      // Open the DatePicker popover
      await user.click(screen.getByRole("button", { name: "Fecha de nacimiento" }))
      // The "Estimar por edad" link should be inside the popover footer
      const dialog = screen.getByRole("dialog")
      const footerEl = dialog.querySelector(".border-t")
      expect(footerEl).not.toBeNull()
      expect(footerEl).toHaveTextContent("Estimar por edad")
    })
  })
})
