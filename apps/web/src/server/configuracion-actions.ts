/**
 * Server functions públicas de Configuración · Maestros (issue #148,
 * RF-CONFIG-MAESTROS v1.0).
 *
 * Mismo patrón que `animal-actions.ts`: tipos de resultado serializables
 * DECLARADOS LOCALMENTE (la web no importa dominio; precedente
 * `CreateAnimalServerResult`) y handler vía lazy import del runtime harness
 * para que este módulo sea bundleable en el cliente. RBAC (PE-002) lo
 * aplica el harness en `configuracion-actions.server.ts`.
 */

import type {
  CatalogoGlobalConfiguracion,
  FamiliaMaestro,
  FilaCatalogoGlobalConfiguracion,
  MaestroFila,
  MaestroListadoOpciones,
} from "@ganaweb/aplicacion"
import type { MaestroResumen } from "@ganaweb/ui"
import { createServerFn } from "@tanstack/react-start"

export type ConfiguracionPermisoAccion = "ver" | "crear" | "editar" | "inactivar"

export type ConfiguracionServerDenial =
  | { readonly tipo: "no_autenticado" }
  | { readonly tipo: "finca_no_autorizada" }
  | {
      readonly tipo: "permiso_denegado"
      readonly permiso: `configuracion:${ConfiguracionPermisoAccion}`
    }

/**
 * Superficie serializable de `ErrorValidacionMaestro` (dominio, vía
 * `@ganaweb/aplicacion`): {campo, detalle, regla?}. Se declara local porque
 * apps/web tiene prohibido importar `packages/dominio` (dependency-cruiser).
 */
export interface ConfiguracionServerError {
  readonly campo: string
  readonly detalle: string
  readonly regla?: string
}

/**
 * CM-025 también a nivel de tipos: crear/editar/cambiarEstado aceptan las
 * familias escribibles o "inseminadores"; los catálogos globales y el predio
 * quedan fuera de la unión.
 */
export type MaestroEditableId = FamiliaMaestro | "inseminadores"

export interface ResumenMaestrosWebInput {
  readonly fincaId: string
}

export interface ListarMaestroWebInput {
  readonly fincaId: string
  readonly maestro: MaestroEditableId
  readonly opciones?: MaestroListadoOpciones
}

export interface ListarCatalogoGlobalWebInput {
  readonly catalogo: CatalogoGlobalConfiguracion
  readonly busqueda?: string
}

export interface CrearMaestroWebInput {
  readonly fincaId: string
  readonly maestro: MaestroEditableId
  readonly datos: Readonly<Record<string, string | number | null>>
  readonly origen?: "veterinarios" | "inseminadores"
}

export interface EditarMaestroWebInput {
  readonly fincaId: string
  readonly maestro: MaestroEditableId
  readonly id: string
  readonly datos: Readonly<Record<string, string | number | null>>
}

export interface CambiarEstadoMaestroWebInput {
  readonly fincaId: string
  readonly maestro: MaestroEditableId
  readonly id: string
  readonly activo: boolean
}

export interface EditarFincaWebInput {
  readonly fincaId: string
  readonly datos: Readonly<Record<string, string | number | null>>
}

export type ResumenMaestrosServerResult =
  | ConfiguracionServerDenial
  | { readonly tipo: "resumen"; readonly items: readonly MaestroResumen[] }

export type ListarMaestroServerResult =
  | ConfiguracionServerDenial
  | {
      readonly tipo: "lista"
      readonly filas: readonly MaestroFila[]
      readonly total: number
      readonly pagina: number
      readonly pageSize: number
    }

export type ListarCatalogoGlobalServerResult =
  | ConfiguracionServerDenial
  | { readonly tipo: "lista"; readonly filas: readonly FilaCatalogoGlobalConfiguracion[] }

export type CrearMaestroServerResult =
  | ConfiguracionServerDenial
  | { readonly tipo: "creado"; readonly id: string }
  | { readonly tipo: "validacion"; readonly errores: readonly ConfiguracionServerError[] }
  | { readonly tipo: "conflicto"; readonly campo: string }
  | { readonly tipo: "error"; readonly detalle: string }

export type EditarMaestroServerResult =
  | ConfiguracionServerDenial
  | { readonly tipo: "actualizado" }
  | { readonly tipo: "validacion"; readonly errores: readonly ConfiguracionServerError[] }
  | { readonly tipo: "no_encontrado" }
  | { readonly tipo: "conflicto"; readonly campo: string }
  | { readonly tipo: "error"; readonly detalle: string }

export type CambiarEstadoMaestroServerResult =
  | ConfiguracionServerDenial
  | { readonly tipo: "estado_actualizado"; readonly activo: boolean }
  | { readonly tipo: "no_encontrado" }
  | { readonly tipo: "error"; readonly detalle: string }

export type EditarFincaServerResult =
  | ConfiguracionServerDenial
  | { readonly tipo: "actualizado" }
  | { readonly tipo: "validacion"; readonly errores: readonly ConfiguracionServerError[] }
  | { readonly tipo: "no_encontrado" }
  | { readonly tipo: "error"; readonly detalle: string }

async function getRuntimeHarness() {
  const { createConfiguracionRuntimeHarness } = await import("./configuracion-actions.server.js")
  return createConfiguracionRuntimeHarness()
}

export const resumenMaestrosAction = createServerFn({ method: "GET" })
  .validator((data: ResumenMaestrosWebInput) => data)
  .handler(
    async ({ data }) =>
      (await (await getRuntimeHarness()).resumen(data)) as ResumenMaestrosServerResult,
  )

export const listarMaestroAction = createServerFn({ method: "GET" })
  .validator((data: ListarMaestroWebInput) => data)
  .handler(
    async ({ data }) =>
      (await (await getRuntimeHarness()).listar(data)) as ListarMaestroServerResult,
  )

export const listarCatalogoGlobalAction = createServerFn({ method: "GET" })
  .validator((data: ListarCatalogoGlobalWebInput) => data)
  .handler(
    async ({ data }) =>
      (await (
        await getRuntimeHarness()
      ).listarCatalogoGlobal(data)) as ListarCatalogoGlobalServerResult,
  )

export const crearMaestroAction = createServerFn({ method: "POST" })
  .validator((data: CrearMaestroWebInput) => data)
  .handler(
    async ({ data }) => (await (await getRuntimeHarness()).crear(data)) as CrearMaestroServerResult,
  )

export const editarMaestroAction = createServerFn({ method: "POST" })
  .validator((data: EditarMaestroWebInput) => data)
  .handler(
    async ({ data }) =>
      (await (await getRuntimeHarness()).editar(data)) as EditarMaestroServerResult,
  )

export const cambiarEstadoMaestroAction = createServerFn({ method: "POST" })
  .validator((data: CambiarEstadoMaestroWebInput) => data)
  .handler(
    async ({ data }) =>
      (await (await getRuntimeHarness()).cambiarEstado(data)) as CambiarEstadoMaestroServerResult,
  )

export const editarFincaAction = createServerFn({ method: "POST" })
  .validator((data: EditarFincaWebInput) => data)
  .handler(
    async ({ data }) =>
      (await (await getRuntimeHarness()).editarFinca(data)) as EditarFincaServerResult,
  )
