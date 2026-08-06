/**
 * Server functions públicas del almacén de sanidad (Issue #210,
 * RF-SANIDAD v0.2 §7).
 *
 * Mismo patrón que `configuracion-actions.ts`: tipos de resultado
 * serializables DECLARADOS LOCALMENTE (la web no importa dominio; los tipos
 * de payload llegan vía `@ganaweb/aplicacion` sólo como `import type`) y
 * handler vía lazy import del runtime harness para que este módulo sea
 * bundleable en el cliente. RBAC (PE-002/SAN-061/063) lo aplica el harness
 * en `sanidad-almacen.server.ts`; acá nunca se importa ese módulo en el
 * top-level (import-protection prohíbe `**\/*.server.*` en el cliente).
 *
 * Append-only (SAN-032/D-008): no hay server functions de edición ni
 * anulación en v1; las correcciones son entradas nuevas.
 */

import type { EntradaAlmacenListada, ResultadoRegistrarEntradaAlmacen } from "@ganaweb/aplicacion"
import { createServerFn } from "@tanstack/react-start"

export type SanidadAlmacenPermiso = "ver" | "crear"

export type SanidadAlmacenDenial =
  | { readonly tipo: "no_autenticado" }
  | { readonly tipo: "finca_no_autorizada" }
  | { readonly tipo: "permiso_denegado"; readonly permiso: `sanidad:${SanidadAlmacenPermiso}` }

export interface RegistrarEntradaAlmacenWebInput {
  readonly fincaId: string
  readonly productoId: string
  /** ISO YYYY-MM-DD; nunca futura (RN-002). */
  readonly fecha: string
  /** Entero > 0 (SAN-030). */
  readonly dosis: number
  readonly precioPorDosis?: number | null
  readonly comentario?: string | null
}

export type RegistrarEntradaAlmacenServerResult =
  | SanidadAlmacenDenial
  | ResultadoRegistrarEntradaAlmacen

export type ListarEntradasAlmacenServerResult =
  | SanidadAlmacenDenial
  | { readonly tipo: "lista"; readonly entradas: readonly EntradaAlmacenListada[] }

async function getRuntimeHarness() {
  const { createSanidadAlmacenRuntimeHarness } = await import("./sanidad-almacen.server.js")
  return createSanidadAlmacenRuntimeHarness()
}

export const registrarEntradaAlmacenFn = createServerFn({ method: "POST" })
  .validator((data: RegistrarEntradaAlmacenWebInput) => data)
  .handler(
    async ({ data }) =>
      (await (await getRuntimeHarness()).registrar(data)) as RegistrarEntradaAlmacenServerResult,
  )

export const listarEntradasAlmacenFn = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string }) => data)
  .handler(
    async ({ data }) =>
      (await (await getRuntimeHarness()).listar(data)) as ListarEntradasAlmacenServerResult,
  )
