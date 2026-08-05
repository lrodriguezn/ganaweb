/**
 * Server functions del almacén de sanidad (Issue #210, RF-SANIDAD v0.2 §7).
 *
 * PE-002/SAN-061: toda invocación (aunque sea directa, sin pasar por la UI)
 * revalida en el servidor la sesión, la finca del recurso y el permiso —
 * nunca por nombre de rol. SAN-063: el `fincaId` del input se confronta con
 * la finca activa de la sesión; jamás se confía.
 *
 * Operaciones:
 * - `registrarEntradaAlmacenFn`: caso de uso `registrarEntradaAlmacen`
 *   (SAN-030, T-002). Gatea por `sanidad:crear`; la unión del caso de uso
 *   (registrada | validacion | conflicto | error) pasa 1:1 a la respuesta.
 * - `listarEntradasAlmacenFn`: listado de entradas por finca (SAN-014).
 *   Gatea por `sanidad:ver`; no hay caso de uso de lectura — el harness
 *   revalida y llama al puerto.
 *
 * Append-only (SAN-032/D-008): no existen server functions de edición ni
 * anulación de entradas en v1; las correcciones son entradas nuevas.
 *
 * Patrón de harness inyectable (`deps`, `getSession`) idéntico a
 * `animal-actions.server.ts`: el contract test tsx inyecta fakes; el runtime
 * usa el adaptador Drizzle real y la sesión de `auth.ts`.
 */

import type {
  EntradaAlmacenListada,
  RegistrarEntradaAlmacenDeps,
  ResultadoRegistrarEntradaAlmacen,
  SesionAutorizada,
} from "@ganaweb/aplicacion"
import { registrarEntradaAlmacen } from "@ganaweb/aplicacion"
import type { DbClient } from "@ganaweb/db/client"
import { db } from "@ganaweb/db/client"
import { DrizzleSanidadAdapter } from "@ganaweb/db/sanidad-infrastructure"
import { createServerFn } from "@tanstack/react-start"

export type SanidadAlmacenPermiso = "ver" | "crear"

export type SanidadAlmacenDenial =
  | { readonly tipo: "no_autenticado" }
  | { readonly tipo: "finca_no_autorizada" }
  | { readonly tipo: "permiso_denegado"; readonly permiso: `sanidad:${SanidadAlmacenPermiso}` }

/** Las mismas dependencias del caso de uso: lectura, escritura y reloj. */
export type SanidadAlmacenDeps = RegistrarEntradaAlmacenDeps

export function createSanidadAlmacenDeps(client: DbClient): SanidadAlmacenDeps {
  const adaptador = new DrizzleSanidadAdapter(client)
  return { lectura: adaptador, escritura: adaptador, reloj: { ahora: () => new Date() } }
}

export function hasSanidadPermission(
  session: SesionAutorizada,
  accion: SanidadAlmacenPermiso,
): boolean {
  return session.permisos.some(
    (permiso) => permiso.modulo === "sanidad" && permiso.accion === accion,
  )
}

export function denySanidadAlmacenAccess(
  session: SesionAutorizada | null,
  fincaId: string,
  accion: SanidadAlmacenPermiso,
): SanidadAlmacenDenial | null {
  if (!session) return { tipo: "no_autenticado" }
  if (session.fincaActivaId !== fincaId) return { tipo: "finca_no_autorizada" }
  if (!hasSanidadPermission(session, accion)) {
    return { tipo: "permiso_denegado", permiso: `sanidad:${accion}` }
  }
  return null
}

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

interface SanidadAlmacenHarnessDeps {
  readonly deps: SanidadAlmacenDeps
  readonly getSession: (fincaId?: string) => Promise<SesionAutorizada | null>
}

export function createSanidadAlmacenActionHarness({ deps, getSession }: SanidadAlmacenHarnessDeps) {
  return {
    async registrar(
      input: RegistrarEntradaAlmacenWebInput,
    ): Promise<RegistrarEntradaAlmacenServerResult> {
      const session = await getSession(input.fincaId)
      const denied = denySanidadAlmacenAccess(session, input.fincaId, "crear")
      if (denied) return denied
      // Denegado nulo implica sesión presente; guarda defensiva para el tipo.
      if (!session) return { tipo: "no_autenticado" }

      // SesionAutorizada es estructuralmente assignable a SesionSanidad.
      return registrarEntradaAlmacen(deps)({
        sesion: session,
        productoId: input.productoId,
        fecha: input.fecha,
        dosis: input.dosis,
        precioPorDosis: input.precioPorDosis ?? null,
        comentario: input.comentario ?? null,
      })
    },

    async listar(input: { readonly fincaId: string }): Promise<ListarEntradasAlmacenServerResult> {
      const session = await getSession(input.fincaId)
      const denied = denySanidadAlmacenAccess(session, input.fincaId, "ver")
      if (denied) return denied

      const entradas = await deps.lectura.listarEntradasAlmacen(input.fincaId)
      return { tipo: "lista", entradas }
    },
  }
}

type SanidadAlmacenRuntimeDepsFactory = () => SanidadAlmacenDeps

let sanidadAlmacenRuntimeDepsFactory: SanidadAlmacenRuntimeDepsFactory | null = () =>
  createSanidadAlmacenDeps(db)

export function configureSanidadAlmacenRuntimeDeps(factory: SanidadAlmacenRuntimeDepsFactory | null) {
  sanidadAlmacenRuntimeDepsFactory = factory
}

async function getAuthorizedSession(fincaId?: string): Promise<SesionAutorizada | null> {
  const { getAuthDeps } = await import("./auth-deps.server.js")
  const { readFincaActivaCookie, readSessionToken } = await import("./session-cookie.server.js")
  const { obtenerSesionActual } = await import("@ganaweb/aplicacion")
  // La finca solicitada es preferencia suave (patrón animal-actions, #144):
  // la autorización real exige que la sesión activa coincida con el recurso.
  const decision = await obtenerSesionActual(getAuthDeps())(
    readSessionToken(),
    null,
    fincaId ?? readFincaActivaCookie(),
  )
  return decision.tipo === "autorizado" ? decision.sesion : null
}

export function createSanidadAlmacenRuntimeHarness({
  depsFactory = sanidadAlmacenRuntimeDepsFactory,
  getSession = getAuthorizedSession,
}: {
  readonly depsFactory?: SanidadAlmacenRuntimeDepsFactory | null
  readonly getSession?: (fincaId?: string) => Promise<SesionAutorizada | null>
} = {}) {
  const runWithHarness = async <Result>(
    work: (harness: ReturnType<typeof createSanidadAlmacenActionHarness>) => Promise<Result>,
  ) => {
    if (!depsFactory) {
      throw new Error(
        "Sanidad almacén persistence adapters are not configured for apps/web. Register real deps with configureSanidadAlmacenRuntimeDeps; demo harnesses are test-only.",
      )
    }
    return work(
      createSanidadAlmacenActionHarness({
        deps: depsFactory(),
        getSession,
      }),
    )
  }

  return {
    registrar: (input: RegistrarEntradaAlmacenWebInput) =>
      runWithHarness((harness) => harness.registrar(input)),
    listar: (input: { readonly fincaId: string }) =>
      runWithHarness((harness) => harness.listar(input)),
  }
}

function getRuntimeHarness() {
  return createSanidadAlmacenRuntimeHarness()
}

export const registrarEntradaAlmacenFn = createServerFn({ method: "POST" })
  .validator((data: RegistrarEntradaAlmacenWebInput) => data)
  .handler(({ data }) => getRuntimeHarness().registrar(data))

export const listarEntradasAlmacenFn = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string }) => data)
  .handler(({ data }) => getRuntimeHarness().listar(data))
