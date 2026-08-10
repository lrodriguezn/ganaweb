import { createServerFn } from "@tanstack/react-start"

/**
 * Product-approved risk policy for the event wizard.
 *
 * The large-group threshold is intentionally omitted until finca-level
 * configuration exists; omission disables that trigger and is not a default.
 */
export const POLITICA_RIESGO_EVENTOS = {
  tiposSensibles: ["revision_veterinaria", "parto", "servicio", "palpacion"],
} as const satisfies import("@ganaweb/ui").EventoWizardPoliticaRiesgo

/**
 * Public API del shell de captura de eventos (Issue #229).
 *
 * Re-exporta los `createServerFn` actions del módulo `.server` y los tipos
 * públicos del wizard. Las rutas importan SOLO este archivo — el módulo
 * `.server` queda restringido a tests y al runtime server (regla
 * "*.server.*" del plugin de import-protection de TanStack Start).
 *
 * Patrón equivalente a `animal-actions.ts` (público) vs
 * `animal-actions.server.ts` (DB + harnesses).
 */

export type {
  EventoAnulacionInput,
  EventoAnulacionResultado,
  EventoWizardResultado,
  EventoWizardResultadoIds,
  EventoWizardWebInput,
} from "./eventos-wizard.server.js"

export interface CatalogosAlcanceDto {
  readonly lotes: ReadonlyArray<{ readonly id: string; readonly nombre: string }>
  readonly potreros: ReadonlyArray<{ readonly id: string; readonly nombre: string }>
  readonly grupos: ReadonlyArray<{ readonly id: string; readonly nombre: string }>
  readonly sectores?: ReadonlyArray<{ readonly id: string; readonly nombre: string }>
  readonly padres?: ReadonlyArray<{
    readonly id: string
    readonly nombre: string
    readonly codigo?: string
  }>
  readonly pajuelas?: ReadonlyArray<{
    readonly id: string
    readonly nombre: string
    readonly codigo?: string
  }>
  readonly inseminadores?: ReadonlyArray<{ readonly id: string; readonly nombre: string }>
  readonly veterinarios?: ReadonlyArray<{ readonly id: string; readonly nombre: string }>
  readonly diagnosticos?: ReadonlyArray<{ readonly id: string; readonly nombre: string }>
  readonly productosSanitarios?: ReadonlyArray<{
    readonly id: string
    readonly nombre: string
    readonly codigo?: string
  }>
  readonly motivosVenta?: ReadonlyArray<{ readonly id: string; readonly nombre: string }>
  readonly lugaresVenta?: ReadonlyArray<{ readonly id: string; readonly nombre: string }>
  readonly causasMuerte?: ReadonlyArray<{ readonly id: string; readonly nombre: string }>
}

export type ListarCatalogosAlcanceResultado =
  | { readonly tipo: "lista"; readonly catalogos?: CatalogosAlcanceDto }
  | { readonly tipo: "finca_no_autorizada" }

export interface ListarAnimalesPorOrigenWebInput {
  readonly fincaId: string
  readonly origen: "manual" | "lote" | "potrero" | "grupo"
  readonly id: string
}

export interface AnimalesPorOrigenDto {
  readonly animales: ReadonlyArray<{ readonly id: string; readonly codigoAnimal: string }>
}

export type {
  RevisarMembresiaResultado,
  RevisarMembresiaWebInput,
} from "./eventos-wizard.server.js"

/**
 * Server function POST: shell captura individual/grupal. Mapea errores a
 * 403 via `mapEventoBoundaryToHttp` y deja pasar el resto al cliente.
 * El handler hace un dynamic import del módulo `.server` para evitar que
 * la DB y el harness transaccional entren en el bundle del cliente.
 */
export const capturarEventoFn = createServerFn({ method: "POST" })
  .validator((data: import("./eventos-wizard.server.js").EventoWizardWebInput) => data)
  .handler(async ({ data }) => {
    const { createEventosWizardRuntimeHarness } = await import("./eventos-wizard.server.js")
    const resultado = await createEventosWizardRuntimeHarness().capturar(data)
    if (resultado.tipo === "capturado") {
      return Response.json(resultado, { status: 200 })
    }
    if (
      resultado.tipo === "permiso_denegado" ||
      resultado.tipo === "alcance_invalido" ||
      resultado.tipo === "no_autenticado" ||
      resultado.tipo === "finca_no_autorizada"
    ) {
      return Response.json(resultado, { status: 403 })
    }
    if (resultado.tipo === "validacion") {
      return Response.json(resultado, { status: 422 })
    }
    return Response.json(resultado, { status: 500 })
  })

export const anularEventoFn = createServerFn({ method: "POST" })
  .validator((data: import("./eventos-wizard.server.js").EventoAnulacionInput) => data)
  .handler(async ({ data }) => {
    const { createEventoAnnulmentDeps, createEventoAnnulmentHarness } = await import(
      "./eventos-wizard.server.js"
    )
    return createEventoAnnulmentHarness(createEventoAnnulmentDeps()).anular(data)
  })

export const listarCatalogosAlcanceFn = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string }) => data)
  .handler(async ({ data }) => {
    const { listarCatalogosAlcance } = await import("./eventos-wizard.server.js")
    const { getAuthorizedSession } = await import("./eventos-wizard.server.js")
    const sesion = await getAuthorizedSession(data.fincaId)
    return listarCatalogosAlcance(data.fincaId, sesion)
  })

export const listarCatalogosEventoFn = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string }) => data)
  .handler(async ({ data }) => {
    const { listarCatalogosEvento, getAuthorizedSession } = await import(
      "./eventos-wizard.server.js"
    )
    return listarCatalogosEvento(data.fincaId, await getAuthorizedSession(data.fincaId))
  })

export const listarAnimalesPorOrigenFn = createServerFn({ method: "GET" })
  .validator((data: ListarAnimalesPorOrigenWebInput) => data)
  .handler(async ({ data }) => {
    const { listarAnimalesPorOrigen } = await import("./eventos-wizard.server.js")
    const { getAuthorizedSession } = await import("./eventos-wizard.server.js")
    const sesion = await getAuthorizedSession(data.fincaId)
    return listarAnimalesPorOrigen(data, sesion)
  })

export const revisarMembresiaActualFn = createServerFn({ method: "GET" })
  .validator((data: import("./eventos-wizard.server.js").RevisarMembresiaWebInput) => data)
  .handler(async ({ data }) => {
    const { revisarMembresiaActual, getAuthorizedSession } = await import(
      "./eventos-wizard.server.js"
    )
    return revisarMembresiaActual(data, await getAuthorizedSession(data.fincaId))
  })

export const buscarAnimalPorCodigoFn = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string; codigo: string }) => data)
  .handler(async ({ data }) => {
    const { buscarAnimalPorCodigoEnRuntime } = await import("./eventos-wizard.server.js")
    return buscarAnimalPorCodigoEnRuntime(data)
  })
