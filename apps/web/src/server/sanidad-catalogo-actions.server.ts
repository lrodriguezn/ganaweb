/**
 * Harness de servidor del catálogo de productos sanitarios (Issue #209,
 * RF-SANIDAD v0.2 §2/§6, PE-002).
 *
 * Capa de re-validación RBAC sobre los casos de uso de
 * `@ganaweb/aplicacion` (que NO verifican permisos): cada método resuelve
 * la sesión, aplica `denySanidadAccess` (SAN-061/063, PE-001/PE-002) y sólo
 * entonces delega. Todos devuelven uniones serializables (CM-042); las
 * denegaciones se retornan como valores, nunca como excepciones.
 *
 * Permisos del módulo (SAN-060, matriz seed §1.3): `sanidad:ver`,
 * `sanidad:crear`, `sanidad:editar`, `sanidad:anular` — no se solicitan
 * acciones nuevas. El cambio de estado del catálogo (inactivar/reactivar,
 * RN-050) se protege con `sanidad:anular`: es la única baja posible del
 * catálogo (SAN-021, patrón CM-045) y el esquema de permisos no define
 * acción "inactivar" para el módulo.
 */

import type { CatalogoProductoSanitarioPort, SesionAutorizada } from "@ganaweb/aplicacion"
import {
  cambiarEstadoProductoSanitario,
  crearProductoSanitario,
  editarProductoSanitario,
  listarCatalogoProductoSanitario,
} from "@ganaweb/aplicacion"
import { DrizzleCatalogoProductoSanitarioAdapter } from "@ganaweb/db/catalogo-producto-sanitario-infrastructure"
import { type DbClient, db } from "@ganaweb/db/client"

export type SanidadCatalogoPermiso = "ver" | "crear" | "editar" | "anular"

export type SanidadDenial =
  | { readonly tipo: "no_autenticado" }
  | { readonly tipo: "finca_no_autorizada" }
  | { readonly tipo: "permiso_denegado"; readonly permiso: `sanidad:${SanidadCatalogoPermiso}` }

export interface SanidadCatalogoDeps {
  readonly catalogo: CatalogoProductoSanitarioPort
}

export function createSanidadCatalogoDeps(client: DbClient): SanidadCatalogoDeps {
  return { catalogo: new DrizzleCatalogoProductoSanitarioAdapter(client) }
}

/**
 * PE-001/SAN-061: la decisión es por PERMISO, nunca por nombre de rol. El
 * comodín `*:*` cubre los roles con todos los permisos del módulo.
 */
export function hasSanidadPermission(
  session: SesionAutorizada,
  accion: SanidadCatalogoPermiso,
): boolean {
  return session.permisos.some(
    (permiso) =>
      (permiso.modulo === "sanidad" && permiso.accion === accion) ||
      (permiso.modulo === "*" && permiso.accion === "*"),
  )
}

/**
 * PE-002/SAN-063: revalida en el servidor sesión, finca y permiso. El
 * `fincaId` del input (URL) jamás se confía: debe coincidir con la finca
 * activa resuelta por la sesión (PE-003).
 */
export function denySanidadAccess(
  session: SesionAutorizada | null,
  fincaId: string,
  accion: SanidadCatalogoPermiso,
): SanidadDenial | null {
  if (!session) return { tipo: "no_autenticado" }
  if (session.fincaActivaId !== fincaId) return { tipo: "finca_no_autorizada" }
  if (!hasSanidadPermission(session, accion)) {
    return { tipo: "permiso_denegado", permiso: `sanidad:${accion}` }
  }
  return null
}

export interface ListarCatalogoSanidadInput {
  readonly fincaId: string
  /** SAN-021: true para selects de captura; false para históricos/panel. */
  readonly soloActivos: boolean
}

export interface CrearProductoSanitarioInput {
  readonly fincaId: string
  readonly datos: Readonly<Record<string, unknown>>
}

export interface EditarProductoSanitarioInput {
  readonly fincaId: string
  readonly id: string
  readonly datos: Readonly<Record<string, unknown>>
}

export interface CambiarEstadoProductoSanitarioInput {
  readonly fincaId: string
  readonly id: string
  readonly activo: boolean
}

interface SanidadCatalogoActionHarnessDeps {
  readonly deps: SanidadCatalogoDeps
  readonly getSession: (fincaId?: string) => Promise<SesionAutorizada | null>
}

export function createSanidadCatalogoActionHarness({
  deps,
  getSession,
}: SanidadCatalogoActionHarnessDeps) {
  return {
    async listar(input: ListarCatalogoSanidadInput) {
      const session = await getSession(input.fincaId)
      const denied = denySanidadAccess(session, input.fincaId, "ver")
      if (denied) return denied

      return listarCatalogoProductoSanitario(deps.catalogo)({
        fincaId: input.fincaId,
        soloActivos: input.soloActivos,
      })
    },

    async crear(input: CrearProductoSanitarioInput) {
      const session = await getSession(input.fincaId)
      const denied = denySanidadAccess(session, input.fincaId, "crear")
      if (denied) return denied

      return crearProductoSanitario(deps.catalogo)({
        fincaId: input.fincaId,
        datos: input.datos,
      })
    },

    async editar(input: EditarProductoSanitarioInput) {
      const session = await getSession(input.fincaId)
      const denied = denySanidadAccess(session, input.fincaId, "editar")
      if (denied) return denied

      return editarProductoSanitario(deps.catalogo)({
        fincaId: input.fincaId,
        id: input.id,
        datos: input.datos,
      })
    },

    async cambiarEstado(input: CambiarEstadoProductoSanitarioInput) {
      const session = await getSession(input.fincaId)
      const denied = denySanidadAccess(session, input.fincaId, "anular")
      if (denied) return denied

      return cambiarEstadoProductoSanitario(deps.catalogo)({
        fincaId: input.fincaId,
        id: input.id,
        activo: input.activo,
      })
    },
  }
}

export type SanidadCatalogoRuntimeDepsFactory = () => SanidadCatalogoDeps

let sanidadCatalogoRuntimeDepsFactory: SanidadCatalogoRuntimeDepsFactory | null = () =>
  createSanidadCatalogoDeps(db)

export function configureSanidadCatalogoRuntimeDeps(
  factory: SanidadCatalogoRuntimeDepsFactory | null,
) {
  sanidadCatalogoRuntimeDepsFactory = factory
}

function getConfiguredSanidadCatalogoDeps(
  factory: SanidadCatalogoRuntimeDepsFactory | null,
): SanidadCatalogoDeps {
  if (!factory) {
    throw new Error(
      "Sanidad catalog persistence adapters are not configured for apps/web. Register real SanidadCatalogoDeps with configureSanidadCatalogoRuntimeDeps; demo harnesses are test-only.",
    )
  }
  return factory()
}

async function getAuthorizedSession(fincaId?: string): Promise<SesionAutorizada | null> {
  // Hook E2E (patrón de `configuracion-actions.server.ts`): la sesión sale
  // del fixture (header `x-ganaweb-e2e-role`); los datos viven en la BD real
  // bajo finca-1, cuya existencia se garantiza de forma idempotente (FK
  // finca_id del catálogo).
  const { getAnimalE2eSession, isAnimalE2eEnabled } = await import(
    "./e2e-animals-fixture.server.js"
  )
  if (isAnimalE2eEnabled()) {
    const { ensureConfiguracionE2eFinca } = await import("./e2e-configuracion-fixture.server.js")
    await ensureConfiguracionE2eFinca()
    return getAnimalE2eSession()
  }

  const { getAuthDeps } = await import("./auth-deps.server.js")
  const { readFincaActivaCookie, readSessionToken } = await import("./session-cookie.server.js")
  const { obtenerSesionActual } = await import("@ganaweb/aplicacion")
  // La finca solicitada es preferencia suave, NO un permiso;
  // `denySanidadAccess` exige `fincaActivaId === fincaId` (SAN-063).
  const decision = await obtenerSesionActual(getAuthDeps())(
    readSessionToken(),
    null,
    fincaId ?? readFincaActivaCookie(),
  )
  return decision.tipo === "autorizado" ? decision.sesion : null
}

interface SanidadCatalogoRuntimeHarnessOptions {
  readonly depsFactory?: SanidadCatalogoRuntimeDepsFactory | null
  readonly getSession?: (fincaId?: string) => Promise<SesionAutorizada | null>
}

export function createSanidadCatalogoRuntimeHarness({
  depsFactory = sanidadCatalogoRuntimeDepsFactory,
  getSession = getAuthorizedSession,
}: SanidadCatalogoRuntimeHarnessOptions = {}) {
  const runWithHarness = async <Result>(
    work: (harness: ReturnType<typeof createSanidadCatalogoActionHarness>) => Promise<Result>,
  ) =>
    work(
      createSanidadCatalogoActionHarness({
        deps: getConfiguredSanidadCatalogoDeps(depsFactory),
        getSession,
      }),
    )

  return {
    listar: (input: ListarCatalogoSanidadInput) =>
      runWithHarness((harness) => harness.listar(input)),
    crear: (input: CrearProductoSanitarioInput) =>
      runWithHarness((harness) => harness.crear(input)),
    editar: (input: EditarProductoSanitarioInput) =>
      runWithHarness((harness) => harness.editar(input)),
    cambiarEstado: (input: CambiarEstadoProductoSanitarioInput) =>
      runWithHarness((harness) => harness.cambiarEstado(input)),
  }
}
