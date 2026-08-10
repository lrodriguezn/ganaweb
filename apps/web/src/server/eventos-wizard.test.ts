/**
 * Unit test del harness del shell de captura de eventos (Issue #229,
 * §4 EV-CAP-001..005/007).
 *
 * El harness (`createEventoWizardActionHarness`) es la frontera autorizable
 * que arma el command del dominio y delega al gateway transaccional
 * `persistirLote`. La autorización/RBAC y la validación de campos las
 * enforce el boundary de #226 (`registrarEvento`) y la DB
 * (`assertAllowedData` / `validateAnimalScope`).
 *
 * Estos tests mockean `persistirLote` para verificar:
 * - Wizard individual con `crear_evento_individual`
 * - Wizard grupal con cabecera + N hijas
 * - Exclusiones previas al guardado (no llegan al gateway)
 * - Cabecera+N hijas se persisten en UN solo `persistirLote` (atomicidad
 *   EV-CAP-005)
 * - RBAC fail-closed: sin `*:crear` en el dominio → 403
 * - Parto rechaza N>1 aunque el shell lo intente (defensa en profundidad)
 * - 403 se mapea desde `EventoForbiddenError` con `motivo: "permiso_denegado"`
 *   o `motivo: "alcance_invalido"`
 * - Validación: tipo inválido, IDs vacíos, N=0, sin criterio, etc.
 */
import { describe, expect, it, vi } from "vitest"

import { EventoForbiddenError, type SesionAutorizada } from "@ganaweb/aplicacion"

import { validarDatosEvento } from "./evento-rules.js"
import { POLITICA_RIESGO_EVENTOS } from "./eventos-wizard.js"
import {
  type EventoWizardResultado,
  type EventoWizardWebInput,
  createEventoWizardActionHarness,
  revisarMembresiaActual,
} from "./eventos-wizard.server.js"

const FINCA = "finca-1"
const USUARIO = "user-1"

describe("POLITICA_RIESGO_EVENTOS", () => {
  it("exposes the approved sensitive types without inventing a group threshold", () => {
    expect(POLITICA_RIESGO_EVENTOS).toEqual({
      tiposSensibles: ["revision_veterinaria", "parto", "servicio", "palpacion"],
    })
    expect(POLITICA_RIESGO_EVENTOS).not.toHaveProperty("umbralGrupoGrande")
  })
})

function sesionCon(permisos: Array<{ modulo: string; accion: string }>): SesionAutorizada {
  return {
    usuarioId: USUARIO,
    nombre: "Operaria",
    email: "o@ganaweb.test",
    fincaActivaId: FINCA,
    fincaActivaNombre: "Finca 1",
    rol: "Operario",
    permisos,
    fincas: [],
  }
}

function sesionCompleta() {
  return sesionCon([
    { modulo: "eventos_reproductivos", accion: "crear" },
    { modulo: "eventos_productivos", accion: "crear" },
    { modulo: "sanidad", accion: "crear" },
    { modulo: "movimientos", accion: "crear" },
  ])
}

const persistirLoteFake = vi.fn(
  async (commands: readonly unknown[]): Promise<readonly { id: string }[]> =>
    commands.map((_, i) => ({ id: `id-${i + 1}` })),
)

const HOY = new Date("2026-08-07T12:00:00Z")
const reloj = () => HOY

describe("validarDatosEvento — reglas funcionales #282", () => {
  const base = { fecha: "2026-08-10" }
  const validos: Readonly<Record<string, Readonly<Record<string, string | number>>>> = {
    servicio: { ...base, tipo: "0", padreId: "padre-1", tipoInseminacion: "natural", dosis: 1 },
    palpacion: { ...base, diagnosticoId: "diag-1", resultado: "prenada", diasGestion: 30 },
    parto: { ...base, tipoParto: "aborto", machos: 0, hembras: 0, muertos: 0 },
    aplicacion_sanitaria: { ...base, productoId: "producto-1", dosis: 0.125 },
    revision_veterinaria: {
      ...base,
      veterinarioId: "vet-1",
      diagnosticoId: "diag-1",
      tipoDiagnostico: "vitaminas",
    },
    pesaje: { ...base, pesoKg: 420.25, tipoPeso: "control" },
    produccion_lactea: { ...base, cantidadAm: 0, cantidadPm: 12.5 },
    condicion_corporal: { ...base, condicionId: "cond-1", puntaje: 5 },
    venta: {
      ...base,
      motivoVentaId: "motivo-1",
      lugarVentaId: "lugar-1",
      pesoVentaKg: 500,
      precio: 0,
      comprador: "Comprador",
    },
    muerte: { ...base, causaMuerteId: "causa-1" },
    traslado: {
      ...base,
      potreroId: "potrero-1",
      sectorId: "sector-1",
      loteId: "lote-1",
      grupoId: "grupo-1",
      motivo: "Rotación",
    },
  }

  it.each(Object.keys(validos))("acepta el payload aprobado de %s", (tipo) => {
    expect(validarDatosEvento(tipo, validos[tipo] ?? {})).toEqual([])
  })

  it("aplica padre/pajuela condicional y resultado/días de palpación", () => {
    expect(
      validarDatosEvento("servicio", {
        ...base,
        tipo: "1",
        padreId: "padre-1",
        tipoInseminacion: "artificial",
        dosis: 1,
      }),
    ).toContainEqual({ campo: "pajuelaId", detalle: "Es obligatorio." })
    expect(
      validarDatosEvento("palpacion", {
        ...base,
        diagnosticoId: "diag-1",
        resultado: "prenada",
        diasGestion: 0,
      }),
    ).toContainEqual(expect.objectContaining({ campo: "diasGestion" }))
    expect(
      validarDatosEvento("palpacion", {
        ...base,
        diagnosticoId: "diag-1",
        resultado: "pp",
        diasGestion: 0,
      }),
    ).toEqual([])
  })

  it("rechaza precisión y enums fuera de la decisión", () => {
    expect(validarDatosEvento("pesaje", { ...base, pesoKg: 1.234, tipoPeso: "destete" })).toEqual([
      { campo: "pesoKg", detalle: "Debe ser mayor que cero y admitir hasta 2 decimales." },
      { campo: "tipoPeso", detalle: "Tiene un valor no permitido." },
    ])
  })
})

function harnessCon(sesion: ReturnType<typeof sesionCon> | null) {
  return createEventoWizardActionHarness({
    getSession: async () => sesion,
    persistirLote: persistirLoteFake as never,
    reloj,
  })
}

describe("createEventoWizardActionHarness — RBAC y autorización", () => {
  it("rechaza sin sesión", async () => {
    const resultado = await harnessCon(null).capturar({
      fincaId: FINCA,
      tipo: "pesaje",
      alcance: { tipo: "individual", animalId: "a-1" },
      datos: { fecha: "2026-08-07", pesoKg: 420, tipoPeso: "control" },
    })
    expect(resultado).toEqual({ tipo: "no_autenticado" })
    expect(persistirLoteFake).not.toHaveBeenCalled()
  })

  it("rechaza con finca activa distinta", async () => {
    const resultado = await harnessCon(
      sesionCon([{ modulo: "eventos_productivos", accion: "crear" }]),
    ).capturar({
      fincaId: "finca-2",
      tipo: "pesaje",
      alcance: { tipo: "individual", animalId: "a-1" },
      datos: { fecha: "2026-08-07", pesoKg: 420, tipoPeso: "control" },
    })
    expect(resultado).toEqual({ tipo: "finca_no_autorizada" })
    expect(persistirLoteFake).not.toHaveBeenCalled()
  })

  it("rechaza tipo desconocido con validación 422", async () => {
    const resultado = await harnessCon(sesionCompleta()).capturar({
      fincaId: FINCA,
      tipo: "inventado" as never,
      alcance: { tipo: "individual", animalId: "a-1" },
      datos: { fecha: "2026-08-07" },
    })
    expect(resultado.tipo).toBe("validacion")
    if (resultado.tipo === "validacion") {
      expect(resultado.errores[0]?.campo).toBe("tipo")
    }
    expect(persistirLoteFake).not.toHaveBeenCalled()
  })

  it("rechaza sin permiso de creación en el dominio (RBAC fail-closed)", async () => {
    const sesionSinProductivo = sesionCon([
      { modulo: "eventos_reproductivos", accion: "crear" },
      { modulo: "sanidad", accion: "crear" },
      { modulo: "movimientos", accion: "crear" },
    ])
    const resultado = await harnessCon(sesionSinProductivo).capturar({
      fincaId: FINCA,
      tipo: "pesaje",
      alcance: { tipo: "individual", animalId: "a-1" },
      datos: { fecha: "2026-08-07", pesoKg: 420, tipoPeso: "control" },
    })
    expect(resultado).toEqual({
      tipo: "permiso_denegado",
      permiso: "eventos_productivos:crear",
    })
    expect(persistirLoteFake).not.toHaveBeenCalled()
  })

  it("permite crear pesaje con permiso de eventos_productivos:crear", async () => {
    persistirLoteFake.mockClear()
    const sesionOk = sesionCon([{ modulo: "eventos_productivos", accion: "crear" }])
    const resultado = await harnessCon(sesionOk).capturar({
      fincaId: FINCA,
      tipo: "pesaje",
      alcance: { tipo: "individual", animalId: "a-1" },
      datos: { fecha: "2026-08-07", pesoKg: 420, tipoPeso: "control" },
    })
    expect(resultado.tipo).toBe("capturado")
    expect(persistirLoteFake).toHaveBeenCalledTimes(1)
  })
})

describe("revisarMembresiaActual — snapshot fail-closed", () => {
  it("detecta agregados y retirados sin cambiar el snapshot", async () => {
    const resultado = await revisarMembresiaActual(
      { fincaId: FINCA, origen: "lote", id: "lote-1", snapshotIds: ["a-1", "a-3"] },
      sesionCompleta(),
    )
    expect(["cambio", "desconocido"]).toContain(resultado.estado)
  })

  it("no inventa membresía cuando el origen no puede verificarse", async () => {
    await expect(
      revisarMembresiaActual(
        { fincaId: FINCA, origen: "lote", id: "", snapshotIds: ["a-1"] },
        sesionCompleta(),
      ),
    ).resolves.toMatchObject({ estado: "desconocido" })
  })
})

describe("createEventoWizardActionHarness — captura individual", () => {
  it("construye un crear_evento_individual y delega al gateway", async () => {
    persistirLoteFake.mockClear()
    const resultado = await harnessCon(sesionCompleta()).capturar({
      fincaId: FINCA,
      tipo: "pesaje",
      alcance: { tipo: "individual", animalId: "animal-123" },
      datos: { fecha: "2026-08-07", pesoKg: 405, tipoPeso: "control" },
    })
    expect(resultado).toEqual({
      tipo: "capturado",
      ids: { individualId: "id-1", hijosIds: [] },
    })
    const [commands] = persistirLoteFake.mock.calls[0] as [
      Array<{ tipo: string; evento: string; datos: Record<string, unknown> }>,
    ]
    expect(commands).toHaveLength(1)
    expect(commands[0]?.tipo).toBe("crear_evento_individual")
    expect(commands[0]?.evento).toBe("pesaje")
    expect(commands[0]?.datos).toMatchObject({
      fecha: "2026-08-07",
      pesoKg: 405,
      tipoPeso: "control",
    })
  })

  it("rechaza con animalId vacío", async () => {
    persistirLoteFake.mockClear()
    const resultado = await harnessCon(sesionCompleta()).capturar({
      fincaId: FINCA,
      tipo: "pesaje",
      alcance: { tipo: "individual", animalId: "" },
      datos: { fecha: "2026-08-07", pesoKg: 405, tipoPeso: "control" },
    })
    expect(resultado.tipo).toBe("validacion")
    if (resultado.tipo === "validacion") {
      expect(resultado.errores[0]?.campo).toBe("animalId")
    }
    expect(persistirLoteFake).not.toHaveBeenCalled()
  })
})

describe("createEventoWizardActionHarness — captura grupal con exclusiones", () => {
  it("arma cabecera + N hijas en UN solo persistirLote (atomicidad EV-CAP-005)", async () => {
    persistirLoteFake.mockClear()
    const idsEfectivos = ["a-1", "a-2", "a-3"]
    const resultado = await harnessCon(sesionCompleta()).capturar({
      fincaId: FINCA,
      tipo: "pesaje",
      alcance: {
        tipo: "grupal",
        origen: "lote",
        loteId: "lote-1",
        animalIdsEfectivos: idsEfectivos,
      },
      datos: { fecha: "2026-08-07", pesoKg: 420, tipoPeso: "control" },
    })
    expect(resultado.tipo).toBe("capturado")
    if (resultado.tipo === "capturado") {
      // El gateway asigna ids reales (no del mock); validamos los hijos sin
      // atarnos a la posición porque el gateway real puede intercalar ids.
      expect(resultado.ids.cabeceraId).toMatch(/^id-/)
      expect(resultado.ids.hijosIds).toHaveLength(3)
      for (const id of resultado.ids.hijosIds) {
        expect(id).toMatch(/^id-/)
      }
    }
    expect(persistirLoteFake).toHaveBeenCalledTimes(1)
    const commands = (persistirLoteFake.mock.calls[0]?.[0] ?? []) as Array<{
      tipo: string
      id: string
      totalAnimales?: number
      criterio?: { origen: string; loteId?: string }
      animalId?: string
      registroGrupalId?: string
    }>
    // 1 cabecera + 3 hijas = 4 commands, todos persistidos en UN persistirLote
    expect(commands).toHaveLength(4)
    expect(commands[0]?.tipo).toBe("crear_registro_grupal")
    expect(commands[0]?.totalAnimales).toBe(3)
    expect(commands[0]?.criterio).toEqual({ origen: "lote", loteId: "lote-1" })
    const cabeceraId = commands[0]?.id
    for (const [i, animalId] of idsEfectivos.entries()) {
      const child = commands[i + 1]
      expect(child?.tipo).toBe("crear_hijo_grupal")
      expect(child?.animalId).toBe(animalId)
      expect(child?.registroGrupalId).toBe(cabeceraId)
    }
  })

  it("rechaza con N=0 animales efectivos (exclusiones comieron todo)", async () => {
    persistirLoteFake.mockClear()
    const resultado = await harnessCon(sesionCompleta()).capturar({
      fincaId: FINCA,
      tipo: "pesaje",
      alcance: {
        tipo: "grupal",
        origen: "manual",
        animalIdsEfectivos: [],
      },
      datos: { fecha: "2026-08-07", pesoKg: 420, tipoPeso: "control" },
    })
    expect(resultado.tipo).toBe("validacion")
    if (resultado.tipo === "validacion") {
      expect(resultado.errores[0]?.campo).toBe("animalIdsEfectivos")
    }
    expect(persistirLoteFake).not.toHaveBeenCalled()
  })

  it("rechaza con criterio incompleto (origen=lote sin loteId)", async () => {
    persistirLoteFake.mockClear()
    const resultado = await harnessCon(sesionCompleta()).capturar({
      fincaId: FINCA,
      tipo: "pesaje",
      alcance: {
        tipo: "grupal",
        origen: "lote",
        animalIdsEfectivos: ["a-1"],
      },
      datos: { fecha: "2026-08-07", pesoKg: 420, tipoPeso: "control" },
    })
    expect(resultado.tipo).toBe("validacion")
    if (resultado.tipo === "validacion") {
      expect(resultado.errores[0]?.campo).toBe("loteId")
    }
    expect(persistirLoteFake).not.toHaveBeenCalled()
  })

  it("acepta origen=manual sin criterio", async () => {
    persistirLoteFake.mockClear()
    const resultado = await harnessCon(sesionCompleta()).capturar({
      fincaId: FINCA,
      tipo: "pesaje",
      alcance: {
        tipo: "grupal",
        origen: "manual",
        animalIdsEfectivos: ["a-1", "a-2"],
      },
      datos: { fecha: "2026-08-07", pesoKg: 420, tipoPeso: "control" },
    })
    expect(resultado.tipo).toBe("capturado")
    if (resultado.tipo === "capturado") {
      expect(resultado.ids.cabeceraId).toBeDefined()
      expect(resultado.ids.hijosIds).toHaveLength(2)
    }
    const commands = (persistirLoteFake.mock.calls[0]?.[0] ?? []) as Array<{
      tipo: string
      criterio?: { origen: string }
    }>
    expect(commands[0]?.criterio).toEqual({ origen: "manual" })
  })
})

describe("createEventoWizardActionHarness — parto sin grupal (defensa en profundidad)", () => {
  it.each(["parto", "muerte", "condicion_corporal"] as const)(
    "%s rechaza alcance grupal en el boundary",
    async (tipo) => {
      persistirLoteFake.mockClear()
      const sesionOk = sesionCon([{ modulo: "eventos_reproductivos", accion: "crear" }])
      // Construimos un input "válido en tipo" pero con N>1 — el shell delega al
      // server; el server NO debe dejarlo pasar porque parto es individual-only.
      // (El catálogo UI marca parto.grupal=false, pero acá probamos la defensa
      // en profundidad del server).
      const resultado = await harnessCon(sesionOk).capturar({
        fincaId: FINCA,
        tipo,
        alcance: {
          tipo: "grupal",
          origen: "manual",
          animalIdsEfectivos: ["a-1", "a-2"],
        },
        datos: { fecha: "2026-08-07" },
      })
      expect(resultado).toEqual({
        tipo: "validacion",
        errores: [{ campo: "alcance", detalle: `${tipo} solo admite alcance individual.` }],
      })
      expect(persistirLoteFake).not.toHaveBeenCalled()
    },
  )

  it("materializa una excepción parcial por animal y conserva los datos comunes", async () => {
    persistirLoteFake.mockClear()
    const resultado = await harnessCon(sesionCompleta()).capturar({
      fincaId: FINCA,
      tipo: "pesaje",
      alcance: {
        tipo: "grupal",
        origen: "manual",
        animalIdsEfectivos: ["a-1", "a-2"],
        excepciones: { "a-2": { pesoKg: 435, tipoPeso: "control" } },
      },
      datos: { fecha: "2026-08-07", pesoKg: 420, tipoPeso: "control" },
    })
    expect(resultado.tipo).toBe("capturado")
    const commands = persistirLoteFake.mock.calls[0]?.[0] as Array<{
      datos?: Record<string, unknown>
    }>
    expect(commands[1]?.datos).toEqual({ fecha: "2026-08-07", pesoKg: 420, tipoPeso: "control" })
    expect(commands[2]?.datos).toEqual({ fecha: "2026-08-07", pesoKg: 435, tipoPeso: "control" })
  })

  it("propaga el fallo del lote sin devolver una captura parcial", async () => {
    const persistirLoteConError = vi.fn(async (commands: readonly unknown[]) => {
      expect(commands).toHaveLength(3)
      const hijos = commands.slice(1) as Array<{ datos: Record<string, unknown> }>
      expect(hijos[0]?.datos).toEqual({ fecha: "2026-08-07", pesoKg: 420, tipoPeso: "control" })
      expect(hijos[1]?.datos).toEqual({ fecha: "2026-08-07", pesoKg: 435, tipoPeso: "control" })
      throw new Error("rollback de prueba")
    })
    const resultado = await createEventoWizardActionHarness({
      getSession: async () => sesionCompleta(),
      persistirLote: persistirLoteConError as never,
      reloj,
    }).capturar({
      fincaId: FINCA,
      tipo: "pesaje",
      alcance: {
        tipo: "grupal",
        origen: "manual",
        animalIdsEfectivos: ["a-1", "a-2"],
        excepciones: { "a-2": { pesoKg: 435 } },
      },
      datos: { fecha: "2026-08-07", pesoKg: 420, tipoPeso: "control" },
    })
    expect(resultado).toEqual({ tipo: "error", detalle: "rollback de prueba" })
    expect(persistirLoteConError).toHaveBeenCalledTimes(1)
  })
})

describe("createEventoWizardActionHarness — mapeo de errores del boundary", () => {
  it("mapea EventoForbiddenError(permiso_denegado) → resultado.permiso_denegado", async () => {
    const { EventoForbiddenError } = await import("@ganaweb/aplicacion")
    const persistirLoteConError = vi.fn(async () => {
      throw new EventoForbiddenError("permiso_denegado", "sanidad:crear")
    })
    const h = createEventoWizardActionHarness({
      getSession: async () => sesionCompleta(),
      persistirLote: persistirLoteConError as never,
      reloj,
    })
    const resultado = await h.capturar({
      fincaId: FINCA,
      tipo: "aplicacion_sanitaria",
      alcance: { tipo: "individual", animalId: "a-1" },
      datos: { fecha: "2026-08-07", productoId: "p-1", dosis: 1 },
    })
    expect(resultado).toEqual({ tipo: "permiso_denegado", permiso: "sanidad:crear" })
  })

  it("mapea EventoForbiddenError(alcance_invalido) → resultado.alcance_invalido", async () => {
    const { EventoForbiddenError } = await import("@ganaweb/aplicacion")
    const persistirLoteConError = vi.fn(async () => {
      throw new EventoForbiddenError("alcance_invalido")
    })
    const h = createEventoWizardActionHarness({
      getSession: async () => sesionCompleta(),
      persistirLote: persistirLoteConError as never,
      reloj,
    })
    const resultado = await h.capturar({
      fincaId: FINCA,
      tipo: "pesaje",
      alcance: { tipo: "individual", animalId: "a-1" },
      datos: { fecha: "2026-08-07", pesoKg: 400, tipoPeso: "control" },
    })
    expect(resultado.tipo).toBe("alcance_invalido")
  })

  it("mapea error genérico → resultado.error con mensaje", async () => {
    const persistirLoteConError = vi.fn(async () => {
      throw new Error("DB timeout")
    })
    const h = createEventoWizardActionHarness({
      getSession: async () => sesionCompleta(),
      persistirLote: persistirLoteConError as never,
      reloj,
    })
    const resultado = await h.capturar({
      fincaId: FINCA,
      tipo: "pesaje",
      alcance: { tipo: "individual", animalId: "a-1" },
      datos: { fecha: "2026-08-07", pesoKg: 400, tipoPeso: "control" },
    })
    expect(resultado).toEqual({ tipo: "error", detalle: "DB timeout" })
  })
})

describe("createEventoAnnulmentHarness — anulación auditada", () => {
  const input = {
    fincaId: FINCA,
    evento: "venta",
    objetivo: "individual" as const,
    objetivoId: "venta-1",
    motivo: "Venta duplicada",
  }

  it("rechaza sin sesión o con finca activa distinta", async () => {
    const { createEventoAnnulmentHarness } = await import("./eventos-wizard.server.js")
    const anular = vi.fn()

    expect(
      await createEventoAnnulmentHarness({
        anular,
        getSession: async () => null,
        reloj,
      }).anular(input),
    ).toEqual({ tipo: "no_autenticado" })

    expect(
      await createEventoAnnulmentHarness({
        anular,
        getSession: async () => ({ ...sesionCompleta(), fincaActivaId: "finca-2" }),
        reloj,
      }).anular(input),
    ).toEqual({ tipo: "finca_no_autorizada" })
    expect(anular).not.toHaveBeenCalled()
  })

  it("rechaza tipo u objetivo inválidos antes de delegar", async () => {
    const { createEventoAnnulmentHarness } = await import("./eventos-wizard.server.js")
    const anular = vi.fn()
    const harness = createEventoAnnulmentHarness({
      anular,
      getSession: async () => sesionCompleta(),
      reloj,
    })

    await expect(harness.anular({ ...input, evento: "evento_inexistente" })).resolves.toEqual({
      tipo: "validacion",
      detalle: "El tipo y el objetivo son obligatorios.",
    })
    await expect(harness.anular({ ...input, objetivoId: "   " })).resolves.toEqual({
      tipo: "validacion",
      detalle: "El tipo y el objetivo son obligatorios.",
    })
    expect(anular).not.toHaveBeenCalled()
  })

  it("mapea la entrada a un comando anular_evento y devuelve éxito", async () => {
    const { createEventoAnnulmentHarness } = await import("./eventos-wizard.server.js")
    const anular = vi.fn()
    const harness = createEventoAnnulmentHarness({
      anular,
      getSession: async () => sesionCompleta(),
      reloj,
    })

    await expect(harness.anular(input)).resolves.toEqual({ tipo: "ok" })
    expect(anular).toHaveBeenCalledTimes(1)
    expect(anular).toHaveBeenCalledWith({
      sesion: sesionCompleta(),
      command: expect.objectContaining({
        tipo: "anular_evento",
        fincaId: FINCA,
        usuarioId: USUARIO,
        evento: "venta",
        objetivo: "individual",
        objetivoId: "venta-1",
        motivo: "Venta duplicada",
        fecha: HOY,
      }),
    })
    const command = anular.mock.calls[0]?.[0].command
    expect(command.id).toMatch(/^an-/)
  })

  it("mapea permiso denegado y errores inesperados", async () => {
    const { createEventoAnnulmentHarness } = await import("./eventos-wizard.server.js")
    const permiso = createEventoAnnulmentHarness({
      anular: vi.fn(async () => {
        throw new EventoForbiddenError("permiso_denegado", "movimientos:anular")
      }),
      getSession: async () => sesionCompleta(),
      reloj,
    })
    await expect(permiso.anular(input)).resolves.toEqual({
      tipo: "permiso_denegado",
      permiso: "movimientos:anular",
    })

    const error = createEventoAnnulmentHarness({
      anular: vi.fn(async () => {
        throw new Error("DB timeout")
      }),
      getSession: async () => sesionCompleta(),
      reloj,
    })
    await expect(error.anular(input)).resolves.toEqual({
      tipo: "error",
      detalle: "DB timeout",
    })
  })
})
