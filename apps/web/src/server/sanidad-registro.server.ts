/**
 * Server functions del registro de aplicación de sanidad (Issue #211,
 * RF-SANIDAD v0.2 §8).
 *
 * PE-002/SAN-061: toda invocación (aunque sea directa, sin pasar por la UI)
 * revalida en el servidor la sesión, la finca del recurso y el permiso —
 * nunca por nombre de rol. SAN-063: el `fincaId` del input se confronta con
 * la finca activa de la sesión; jamás se confía.
 *
 * Operaciones:
 * - `registrarAplicacionFn`: caso de uso `aplicarProductoSanitario`
 *   (SAN-040..SAN-047, T-002/RN-060). Gatea por `sanidad:crear`; la unión
 *   del caso de uso (aplicado | validacion | conflicto | error) pasa 1:1 a
 *   la respuesta (CM-042).
 * - `listarAnimalesSanidadFn`: animales EN_FINCA a la fecha del evento
 *   (SAN-043/RN-003) para la selección del drawer. Gatea por `sanidad:ver`;
 *   no hay caso de uso de lectura — el harness revalida y llama al puerto
 *   (patrón `listarEntradasAlmacenFn` de #210).
 *
 * Patrón de harness inyectable (`deps`, `getSession`) idéntico a
 * `sanidad-almacen.server.ts` (#210): el contract test tsx inyecta fakes;
 * el runtime usa el adaptador Drizzle real y la sesión de `auth.ts`.
 */

import type {
  AnimalSanidadListado,
  AplicarProductoSanitarioDeps,
  ResultadoAplicarProductoSanitario,
  SesionAutorizada,
} from "@ganaweb/aplicacion"
import { aplicarProductoSanitario } from "@ganaweb/aplicacion"
import type { DbClient } from "@ganaweb/db/client"
import { db } from "@ganaweb/db/client"
import { DrizzleNotificacionesAdapter } from "@ganaweb/db/notificaciones-infrastructure"
import { DrizzleSanidadAdapter } from "@ganaweb/db/sanidad-infrastructure"
import { createServerFn } from "@tanstack/react-start"

export type SanidadRegistroPermiso = "ver" | "crear"

export type SanidadRegistroDenial =
  | { readonly tipo: "no_autenticado" }
  | { readonly tipo: "finca_no_autorizada" }
  | { readonly tipo: "permiso_denegado"; readonly permiso: `sanidad:${SanidadRegistroPermiso}` }

/** Las mismas dependencias del caso de uso: lectura, escritura y reloj. */
export type SanidadRegistroDeps = AplicarProductoSanitarioDeps

export function createSanidadRegistroDeps(client: DbClient): SanidadRegistroDeps {
  const adaptador = new DrizzleSanidadAdapter(client)
  const notificaciones = new DrizzleNotificacionesAdapter(client)
  return {
    lectura: adaptador,
    escritura: adaptador,
    notificaciones,
    reloj: { ahora: () => new Date() },
  }
}

export function hasSanidadRegistroPermission(
  session: SesionAutorizada,
  accion: SanidadRegistroPermiso,
): boolean {
  return session.permisos.some(
    (permiso) => permiso.modulo === "sanidad" && permiso.accion === accion,
  )
}

export function denySanidadRegistroAccess(
  session: SesionAutorizada | null,
  fincaId: string,
  accion: SanidadRegistroPermiso,
): SanidadRegistroDenial | null {
  if (!session) return { tipo: "no_autenticado" }
  if (session.fincaActivaId !== fincaId) return { tipo: "finca_no_autorizada" }
  if (!hasSanidadRegistroPermission(session, accion)) {
    return { tipo: "permiso_denegado", permiso: `sanidad:${accion}` }
  }
  return null
}

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

interface SanidadRegistroHarnessDeps {
  readonly deps: SanidadRegistroDeps
  readonly getSession: (fincaId?: string) => Promise<SesionAutorizada | null>
}

export function createSanidadRegistroActionHarness({
  deps,
  getSession,
}: SanidadRegistroHarnessDeps) {
  return {
    async registrar(input: RegistrarAplicacionWebInput): Promise<RegistrarAplicacionServerResult> {
      const session = await getSession(input.fincaId)
      const denied = denySanidadRegistroAccess(session, input.fincaId, "crear")
      if (denied) return denied
      // Denegado nulo implica sesión presente; guarda defensiva para el tipo.
      if (!session) return { tipo: "no_autenticado" }

      // SesionAutorizada es estructuralmente assignable a SesionSanidad.
      return aplicarProductoSanitario(deps)({
        sesion: session,
        productoId: input.productoId,
        dosis: input.dosis,
        fecha: input.fecha,
        proximaDosis: input.proximaDosis ?? null,
        animalIds: [...input.animalIds],
        comentarios: input.comentarios ?? null,
      })
    },

    async listarAnimales(input: {
      readonly fincaId: string
      /** ISO YYYY-MM-DD — la fecha del evento (SAN-043). */
      readonly fecha: string
    }): Promise<ListarAnimalesSanidadServerResult> {
      const session = await getSession(input.fincaId)
      const denied = denySanidadRegistroAccess(session, input.fincaId, "ver")
      if (denied) return denied

      const animales = await deps.lectura.listarAnimalesEnFinca(input.fincaId, input.fecha)
      return { tipo: "lista", animales }
    },
  }
}

type SanidadRegistroRuntimeDepsFactory = () => SanidadRegistroDeps

let sanidadRegistroRuntimeDepsFactory: SanidadRegistroRuntimeDepsFactory | null = () =>
  createSanidadRegistroDeps(db)

export function configureSanidadRegistroRuntimeDeps(
  factory: SanidadRegistroRuntimeDepsFactory | null,
) {
  sanidadRegistroRuntimeDepsFactory = factory
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

export function createSanidadRegistroRuntimeHarness({
  depsFactory = sanidadRegistroRuntimeDepsFactory,
  getSession = getAuthorizedSession,
}: {
  readonly depsFactory?: SanidadRegistroRuntimeDepsFactory | null
  readonly getSession?: (fincaId?: string) => Promise<SesionAutorizada | null>
} = {}) {
  const runWithHarness = async <Result>(
    work: (harness: ReturnType<typeof createSanidadRegistroActionHarness>) => Promise<Result>,
  ) => {
    if (!depsFactory) {
      throw new Error(
        "Sanidad registro persistence adapters are not configured for apps/web. Register real deps with configureSanidadRegistroRuntimeDeps; demo harnesses are test-only.",
      )
    }
    return work(
      createSanidadRegistroActionHarness({
        deps: depsFactory(),
        getSession,
      }),
    )
  }

  return {
    registrar: (input: RegistrarAplicacionWebInput) =>
      runWithHarness((harness) => harness.registrar(input)),
    listarAnimales: (input: { readonly fincaId: string; readonly fecha: string }) =>
      runWithHarness((harness) => harness.listarAnimales(input)),
  }
}

function getRuntimeHarness() {
  return createSanidadRegistroRuntimeHarness()
}

export const registrarAplicacionFn = createServerFn({ method: "POST" })
  .validator((data: RegistrarAplicacionWebInput) => data)
  .handler(({ data }) => getRuntimeHarness().registrar(data))

export const listarAnimalesSanidadFn = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string; fecha: string }) => data)
  .handler(({ data }) => getRuntimeHarness().listarAnimales(data))
