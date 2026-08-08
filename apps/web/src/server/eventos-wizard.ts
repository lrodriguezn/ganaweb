import { createServerFn } from "@tanstack/react-start"

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
  EventoWizardResultado,
  EventoWizardResultadoIds,
  EventoWizardWebInput,
} from "./eventos-wizard.server.js"

export interface CatalogosAlcanceDto {
  readonly lotes: ReadonlyArray<{ readonly id: string; readonly nombre: string }>
  readonly potreros: ReadonlyArray<{ readonly id: string; readonly nombre: string }>
  readonly grupos: ReadonlyArray<{ readonly id: string; readonly nombre: string }>
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

export const listarCatalogosAlcanceFn = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string }) => data)
  .handler(async ({ data }) => {
    const { listarCatalogosAlcance } = await import("./eventos-wizard.server.js")
    const { getAuthorizedSession } = await import("./eventos-wizard.server.js")
    const sesion = await getAuthorizedSession(data.fincaId)
    return listarCatalogosAlcance(data.fincaId, sesion)
  })

export const listarAnimalesPorOrigenFn = createServerFn({ method: "GET" })
  .validator((data: ListarAnimalesPorOrigenWebInput) => data)
  .handler(async ({ data }) => {
    const { listarAnimalesPorOrigen } = await import("./eventos-wizard.server.js")
    const { getAuthorizedSession } = await import("./eventos-wizard.server.js")
    const sesion = await getAuthorizedSession(data.fincaId)
    return listarAnimalesPorOrigen(data, sesion)
  })

export const buscarAnimalPorCodigoFn = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string; codigo: string }) => data)
  .handler(async ({ data }) => {
    const { buscarAnimalPorCodigoEnRuntime } = await import("./eventos-wizard.server.js")
    return buscarAnimalPorCodigoEnRuntime(data)
  })
