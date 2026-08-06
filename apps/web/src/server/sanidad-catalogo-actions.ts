/**
 * Server functions públicas del catálogo de productos sanitarios (Issue #209,
 * RF-SANIDAD v0.2 §2/§6).
 *
 * Mismo patrón que `configuracion-actions.ts`: tipos de resultado
 * serializables DECLARADOS LOCALMENTE (la web no importa dominio; los tipos
 * de payload llegan vía `@ganaweb/aplicacion` sólo como `import type`) y
 * handler vía lazy import del runtime harness para que este módulo sea
 * bundleable en el cliente. RBAC (PE-002/SAN-061/063) lo aplica el harness
 * en `sanidad-catalogo-actions.server.ts`; acá nunca se importa ese módulo en
 * el top-level (import-protection prohíbe `**\/*.server.*` en el cliente).
 *
 * Issue #212 (SAN-003/SAN-014): el listado del catálogo alimenta los
 * formularios de captura del panel (select de producto + chip de stock) y el
 * filtro del historial. El panel es el primer consumidor ruteado del catálogo
 * (#209 no ruteó sus componentes). Gatea por `sanidad:ver` vía el harness.
 */

import type { ResultadoListarCatalogoProductoSanitario } from "@ganaweb/aplicacion"
import { createServerFn } from "@tanstack/react-start"

export type SanidadCatalogoPermiso = "ver" | "crear" | "editar" | "anular"

export type SanidadDenial =
  | { readonly tipo: "no_autenticado" }
  | { readonly tipo: "finca_no_autorizada" }
  | { readonly tipo: "permiso_denegado"; readonly permiso: `sanidad:${SanidadCatalogoPermiso}` }

export interface ListarCatalogoSanidadInput {
  readonly fincaId: string
  /** SAN-021: true para selects de captura; false para históricos/panel. */
  readonly soloActivos: boolean
}

export type ListarCatalogoSanidadServerResult =
  | SanidadDenial
  | ResultadoListarCatalogoProductoSanitario

async function getRuntimeHarness() {
  const { createSanidadCatalogoRuntimeHarness } = await import(
    "./sanidad-catalogo-actions.server.js"
  )
  return createSanidadCatalogoRuntimeHarness()
}

export const listarCatalogoSanidadFn = createServerFn({ method: "GET" })
  .validator((data: ListarCatalogoSanidadInput) => data)
  .handler(
    async ({ data }) =>
      (await (await getRuntimeHarness()).listar(data)) as ListarCatalogoSanidadServerResult,
  )
