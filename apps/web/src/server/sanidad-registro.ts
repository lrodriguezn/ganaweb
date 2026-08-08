/**
 * Server functions públicas del registro de aplicación de sanidad
 * (Issue #211, RF-SANIDAD v0.2 §8).
 *
 * Mismo patrón que `sanidad-almacen.ts` (#210): tipos de resultado
 * serializables DECLARADOS LOCALMENTE (la web no importa dominio; los tipos
 * de payload llegan vía `@ganaweb/aplicacion` sólo como `import type`) y
 * handler vía lazy import del runtime harness para que este módulo sea
 * bundleable en el cliente. RBAC (PE-002/SAN-061/063) lo aplica el harness
 * en `sanidad-registro.server.ts`; acá nunca se importa ese módulo en el
 * top-level (import-protection prohíbe `**\/*.server.*` en el cliente).
 *
 * Operaciones:
 * - `registrarAplicacionFn` (POST): caso de uso `aplicarProductoSanitario`
 *   (SAN-040..SAN-047, T-002/RN-060).
 * - `listarAnimalesSanidadFn` (GET): animales EN_FINCA a la fecha del evento
 *   para la selección del drawer (SAN-043).
 */

import type { AnimalSanidadListado, ResultadoAplicarProductoSanitario } from "@ganaweb/aplicacion"
import { createServerFn } from "@tanstack/react-start"

export type SanidadRegistroPermiso = "ver" | "crear"

export type SanidadRegistroDenial =
  | { readonly tipo: "no_autenticado" }
  | { readonly tipo: "finca_no_autorizada" }
  | { readonly tipo: "permiso_denegado"; readonly permiso: `sanidad:${SanidadRegistroPermiso}` }

export interface RegistrarAplicacionWebInput {
  readonly fincaId: string
  readonly productoId: string
  /** Valor común para el grupo (SAN-041). */
  readonly dosis: number
  /** ISO YYYY-MM-DD; nunca futura (RN-002). */
  readonly fecha: string
  /** ISO YYYY-MM-DD opcional; única fecha que puede ser futura (RN-002). */
  readonly proximaDosis?: string | null
  /** 1..N animales EN_FINCA a la fecha (SAN-040/SAN-043). */
  readonly animalIds: readonly string[]
  readonly comentarios?: string | null
}

export type RegistrarAplicacionServerResult =
  | SanidadRegistroDenial
  | ResultadoAplicarProductoSanitario

export type ListarAnimalesSanidadServerResult =
  | SanidadRegistroDenial
  | { readonly tipo: "lista"; readonly animales: readonly AnimalSanidadListado[] }

async function getRuntimeHarness() {
  const { createSanidadRegistroRuntimeHarness } = await import("./sanidad-registro.server.js")
  return createSanidadRegistroRuntimeHarness()
}

export const registrarAplicacionFn = createServerFn({ method: "POST" })
  .validator((data: RegistrarAplicacionWebInput) => data)
  .handler(
    async ({ data }) =>
      (await (await getRuntimeHarness()).registrar(data)) as RegistrarAplicacionServerResult,
  )

export const listarAnimalesSanidadFn = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string; fecha: string }) => data)
  .handler(
    async ({ data }) =>
      (await (await getRuntimeHarness()).listarAnimales(data)) as ListarAnimalesSanidadServerResult,
  )
