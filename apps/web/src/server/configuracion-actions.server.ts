/**
 * Harness de servidor de Configuración · Maestros (issue #148,
 * RF-CONFIG-MAESTROS v1.0, PE-002).
 *
 * Capa de re-validación RBAC sobre los casos de uso de
 * `@ganaweb/aplicacion` (que NO verifican permisos): cada método resuelve
 * la sesión, aplica `denyConfiguracionAccess` (CM-022/CM-024) y sólo
 * entonces delega. Todos devuelven uniones serializables (CM-042); las
 * denegaciones se retornan como valores, nunca como excepciones.
 */

import type {
  CatalogoGlobalConfiguracion,
  CatalogoGlobalConfiguracionPort,
  ConteoCatalogoGlobalClave,
  ConteoFamiliaClave,
  ConteosMaestrosPort,
  ConteosMaestrosResultado,
  DatosBasicosFinca,
  FamiliaMaestro,
  FincaEscrituraPort,
  FincaLecturaPort,
  MaestroEscrituraPort,
  MaestroListadoOpciones,
  MaestroListadoPort,
  SesionAutorizada,
} from "@ganaweb/aplicacion"
import { cambiarEstadoMaestro, crearMaestro, editarFinca, editarMaestro } from "@ganaweb/aplicacion"
import { DrizzleCatalogoAnimalMaestroAdapter } from "@ganaweb/db/catalogo-animal-maestro-infrastructure"
import { type DbClient, db } from "@ganaweb/db/client"
import { DrizzleConteosMaestrosAdapter } from "@ganaweb/db/conteos-maestros-infrastructure"
import { DrizzleMaestroEscrituraAdapter } from "@ganaweb/db/maestro-escritura-infrastructure"
import { DrizzleMaestroListadoAdapter } from "@ganaweb/db/maestro-listado-infrastructure"
import type { MaestroResumen } from "@ganaweb/ui"
import {
  type DefinicionMaestroHub,
  MAESTROS_HUB,
  type MaestroHubId,
  rutaConfiguracionMaestro,
} from "../configuracion/definicion-maestros.js"

export type ConfiguracionPermiso = "ver" | "crear" | "editar" | "inactivar"

export type ConfiguracionDenial =
  | { readonly tipo: "no_autenticado" }
  | { readonly tipo: "finca_no_autorizada" }
  | { readonly tipo: "permiso_denegado"; readonly permiso: `configuracion:${ConfiguracionPermiso}` }

export interface ConfiguracionDeps {
  readonly escritura: MaestroEscrituraPort
  readonly finca: FincaEscrituraPort
  /** Issue #151 (CM-050): lectura de los datos básicos de la finca. */
  readonly fincaLectura: FincaLecturaPort
  readonly conteos: ConteosMaestrosPort
  readonly listado: MaestroListadoPort
  readonly catalogos: CatalogoGlobalConfiguracionPort
}

export function createConfiguracionDeps(client: DbClient): ConfiguracionDeps {
  const escritura = new DrizzleMaestroEscrituraAdapter(client)
  return {
    escritura,
    finca: escritura,
    // CM-061: el mismo adaptador implementa la lectura de la finca.
    fincaLectura: escritura,
    conteos: new DrizzleConteosMaestrosAdapter(client),
    listado: new DrizzleMaestroListadoAdapter(client),
    catalogos: new DrizzleCatalogoAnimalMaestroAdapter(client),
  }
}

export function hasConfiguracionPermission(
  session: SesionAutorizada,
  accion: ConfiguracionPermiso,
): boolean {
  return session.permisos.some(
    (permiso) =>
      (permiso.modulo === "configuracion" && permiso.accion === accion) ||
      (permiso.modulo === "*" && permiso.accion === "*"),
  )
}

export function denyConfiguracionAccess(
  session: SesionAutorizada | null,
  fincaId: string,
  accion: ConfiguracionPermiso,
): ConfiguracionDenial | null {
  if (!session) return { tipo: "no_autenticado" }
  if (session.fincaActivaId !== fincaId) return { tipo: "finca_no_autorizada" }
  if (!hasConfiguracionPermission(session, accion)) {
    return { tipo: "permiso_denegado", permiso: `configuracion:${accion}` }
  }
  return null
}

/**
 * Maestro sobre los que el CRUD puede escribir (CM-025): las 11 familias de
 * `FamiliaMaestro` más "inseminadores" (vista de veterinarios con
 * es_inseminador=1, CM-040). Los catálogos globales y el predio quedan
 * fuera de la escritura.
 */
export type MaestroEscribibleId = FamiliaMaestro | "inseminadores"

export interface ListarMaestroInput {
  readonly fincaId: string
  readonly maestro: MaestroEscribibleId
  readonly opciones?: MaestroListadoOpciones
}

export interface ListarCatalogoGlobalInput {
  readonly catalogo: CatalogoGlobalConfiguracion
  readonly busqueda?: string
}

export interface CrearMaestroInput {
  readonly fincaId: string
  readonly maestro: MaestroEscribibleId
  readonly datos: Readonly<Record<string, unknown>>
  readonly origen?: "veterinarios" | "inseminadores"
}

export interface EditarMaestroInput {
  readonly fincaId: string
  readonly maestro: MaestroEscribibleId
  readonly id: string
  readonly datos: Readonly<Record<string, unknown>>
}

export interface CambiarEstadoMaestroInput {
  readonly fincaId: string
  readonly maestro: MaestroEscribibleId
  readonly id: string
  readonly activo: boolean
}

export interface EditarFincaInput {
  readonly fincaId: string
  readonly datos: Readonly<Record<string, unknown>>
}

export interface ObtenerDatosFincaInput {
  readonly fincaId: string
}

interface ConfiguracionActionHarnessDeps {
  readonly deps: ConfiguracionDeps
  readonly getSession: (fincaId?: string) => Promise<SesionAutorizada | null>
}

/** Las 11 familias de maestros por finca (CM-025: únicas escribibles). */
const FAMILIAS_MAESTRO: readonly FamiliaMaestro[] = [
  "veterinarios",
  "propietarios",
  "potreros",
  "sectores",
  "lotes",
  "grupos",
  "hierros",
  "diagnosticos",
  "motivos_ventas",
  "causas_muerte",
  "lugares_compras",
]

/** Clave de `porMaestro` por hub id (los ids de hub difieren del nombre de familia). */
const FAMILIA_POR_HUB: Partial<Record<MaestroHubId, FamiliaMaestro>> = {
  veterinarios: "veterinarios",
  propietarios: "propietarios",
  potreros: "potreros",
  sectores: "sectores",
  hierros: "hierros",
  diagnosticos: "diagnosticos",
  motivosVentas: "motivos_ventas",
  causasMuerte: "causas_muerte",
  lugaresCompras: "lugares_compras",
}

const MAESTRO_SIN_ESCRITURA = {
  tipo: "error",
  detalle: "El maestro indicado no permite escritura.",
} as const

/**
 * Guardia CM-025: resuelve la familia del caso de uso para un maestro del
 * CRUD. "inseminadores" es una vista de veterinarios (CM-040) y fuerza
 * `origen: "inseminadores"`; cualquier otro valor fuera de las familias
 * escribibles (p. ej. un global casteado) devuelve null SIN tocar puertos.
 */
function resolverFamiliaEscribible(
  maestro: string,
): { readonly familia: FamiliaMaestro; readonly origen?: "veterinarios" | "inseminadores" } | null {
  if (maestro === "inseminadores") return { familia: "veterinarios", origen: "inseminadores" }
  if ((FAMILIAS_MAESTRO as readonly string[]).includes(maestro)) {
    return { familia: maestro as FamiliaMaestro }
  }
  return null
}

function esConteo(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor)
}

type ItemResumenBase = Omit<MaestroResumen, "registros">

/**
 * CM-007 (issue #151): la card Predios del hub refleja el estado de los
 * datos básicos de la finca — "1 registro" si están completos, o
 * registros 0 + `etiquetaVacio: "Incompleto"` (MaestroCard lo renderiza
 * en vez de "Vacío").
 */
const ETIQUETA_PREDIO_INCOMPLETO = "Incompleto"

function itemPredio(base: ItemResumenBase, completa: boolean): MaestroResumen {
  return completa
    ? { ...base, registros: 1 }
    : { ...base, registros: 0, etiquetaVacio: ETIQUETA_PREDIO_INCOMPLETO }
}

function itemBase(definicion: DefinicionMaestroHub, fincaId: string): ItemResumenBase {
  return {
    id: definicion.id,
    nombre: definicion.nombre,
    grupo: definicion.grupo,
    ...(definicion.requeridoPara ? { requeridoPara: definicion.requeridoPara } : {}),
    ruta: rutaConfiguracionMaestro(fincaId, definicion.id),
  }
}

function itemConConteo(base: ItemResumenBase, valor: unknown): MaestroResumen {
  return esConteo(valor)
    ? { ...base, registros: valor }
    : { ...base, registros: 0, degradado: true }
}

function itemDesdeConteos(
  definicion: DefinicionMaestroHub,
  fincaId: string,
  conteos: ConteosMaestrosResultado,
): MaestroResumen {
  const base = itemBase(definicion, fincaId)
  switch (definicion.id) {
    case "inseminadores":
      return itemConConteo(base, conteos.inseminadores)
    case "predio":
      return typeof conteos.fincaCompleta === "boolean"
        ? itemPredio(base, conteos.fincaCompleta)
        : { ...base, registros: 0, degradado: true }
    case "lotesGrupos": {
      const lotes = conteos.porMaestro?.lotes
      const grupos = conteos.porMaestro?.grupos
      if (!esConteo(lotes) || !esConteo(grupos)) {
        return { ...base, registros: 0, registrosSecundario: 0, degradado: true }
      }
      return { ...base, registros: lotes, registrosSecundario: grupos }
    }
    case "razas":
    case "tiposExplotacion":
    case "calidades":
      return itemConConteo(base, conteos.catalogosGlobales?.[definicion.id])
    default: {
      const familia = FAMILIA_POR_HUB[definicion.id]
      return itemConConteo(base, familia ? conteos.porMaestro?.[familia] : undefined)
    }
  }
}

async function conteoFamiliaSeguro(
  conteos: ConteosMaestrosPort,
  fincaId: string,
  clave: ConteoFamiliaClave,
): Promise<number | null> {
  try {
    const valor = await conteos.contarPorFamilia(fincaId, clave)
    return esConteo(valor) ? valor : null
  } catch {
    return null
  }
}

async function conteoGlobalSeguro(
  conteos: ConteosMaestrosPort,
  catalogo: ConteoCatalogoGlobalClave,
): Promise<number | null> {
  try {
    const valor = await conteos.contarCatalogoGlobal(catalogo)
    return esConteo(valor) ? valor : null
  } catch {
    return null
  }
}

/**
 * CM-014: degradación por card cuando `contarTodo` falla. Cada item pide su
 * conteo individual de forma aislada; un fallo (null o excepción) degrada
 * SÓLO ese item (registros 0, degradado true) y el hub sigue renderizando
 * los 15.
 */
async function itemEnDegradacion(
  definicion: DefinicionMaestroHub,
  fincaId: string,
  conteos: ConteosMaestrosPort,
): Promise<MaestroResumen> {
  const base = itemBase(definicion, fincaId)
  const degradado: MaestroResumen = { ...base, registros: 0, degradado: true }
  switch (definicion.id) {
    case "inseminadores": {
      const valor = await conteoFamiliaSeguro(conteos, fincaId, "inseminadores")
      return valor === null ? degradado : { ...base, registros: valor }
    }
    case "predio": {
      const valor = await conteoFamiliaSeguro(conteos, fincaId, "fincaCompleta")
      return valor === null ? degradado : itemPredio(base, valor === 1)
    }
    case "lotesGrupos": {
      const [lotes, grupos] = await Promise.all([
        conteoFamiliaSeguro(conteos, fincaId, "lotes"),
        conteoFamiliaSeguro(conteos, fincaId, "grupos"),
      ])
      if (lotes === null || grupos === null) {
        return { ...base, registros: 0, registrosSecundario: 0, degradado: true }
      }
      return { ...base, registros: lotes, registrosSecundario: grupos }
    }
    case "razas":
    case "tiposExplotacion":
    case "calidades": {
      const valor = await conteoGlobalSeguro(conteos, definicion.id)
      return valor === null ? degradado : { ...base, registros: valor }
    }
    default: {
      const familia = FAMILIA_POR_HUB[definicion.id]
      const valor = familia ? await conteoFamiliaSeguro(conteos, fincaId, familia) : null
      return valor === null ? degradado : { ...base, registros: valor }
    }
  }
}

export function createConfiguracionActionHarness({
  deps,
  getSession,
}: ConfiguracionActionHarnessDeps) {
  return {
    async resumen(input: { readonly fincaId: string }) {
      const session = await getSession(input.fincaId)
      const denied = denyConfiguracionAccess(session, input.fincaId, "ver")
      if (denied) return denied

      let conteos: ConteosMaestrosResultado | null = null
      try {
        conteos = await deps.conteos.contarTodo(input.fincaId)
      } catch {
        conteos = null
      }

      const items = conteos
        ? MAESTROS_HUB.map((definicion) => itemDesdeConteos(definicion, input.fincaId, conteos))
        : await Promise.all(
            MAESTROS_HUB.map((definicion) =>
              itemEnDegradacion(definicion, input.fincaId, deps.conteos),
            ),
          )

      return { tipo: "resumen" as const, items }
    },

    async listar(input: ListarMaestroInput) {
      const session = await getSession(input.fincaId)
      const denied = denyConfiguracionAccess(session, input.fincaId, "ver")
      if (denied) return denied

      const resultado = await deps.listado.listar(input.maestro, input.fincaId, input.opciones)
      return {
        tipo: "lista" as const,
        filas: resultado.filas,
        total: resultado.total,
        pagina: resultado.pagina,
        pageSize: resultado.pageSize,
      }
    },

    async listarCatalogoGlobal(input: ListarCatalogoGlobalInput) {
      const session = await getSession()
      if (!session) return { tipo: "no_autenticado" as const }
      const denied = denyConfiguracionAccess(session, session.fincaActivaId, "ver")
      if (denied) return denied

      const filas = await deps.catalogos.listarParaConfiguracion(
        input.catalogo,
        input.busqueda !== undefined ? { busqueda: input.busqueda } : undefined,
      )
      return { tipo: "lista" as const, filas }
    },

    async crear(input: CrearMaestroInput) {
      const session = await getSession(input.fincaId)
      const denied = denyConfiguracionAccess(session, input.fincaId, "crear")
      if (denied) return denied

      const resuelto = resolverFamiliaEscribible(input.maestro)
      if (!resuelto) return MAESTRO_SIN_ESCRITURA

      const origen = resuelto.origen ?? input.origen
      return crearMaestro(deps.escritura)({
        familia: resuelto.familia,
        fincaId: input.fincaId,
        datos: input.datos,
        ...(origen ? { origen } : {}),
      })
    },

    async editar(input: EditarMaestroInput) {
      const session = await getSession(input.fincaId)
      const denied = denyConfiguracionAccess(session, input.fincaId, "editar")
      if (denied) return denied

      const resuelto = resolverFamiliaEscribible(input.maestro)
      if (!resuelto) return MAESTRO_SIN_ESCRITURA

      return editarMaestro(deps.escritura)({
        familia: resuelto.familia,
        fincaId: input.fincaId,
        id: input.id,
        datos: input.datos,
      })
    },

    async cambiarEstado(input: CambiarEstadoMaestroInput) {
      const session = await getSession(input.fincaId)
      const denied = denyConfiguracionAccess(session, input.fincaId, "inactivar")
      if (denied) return denied

      const resuelto = resolverFamiliaEscribible(input.maestro)
      if (!resuelto) return MAESTRO_SIN_ESCRITURA

      return cambiarEstadoMaestro(deps.escritura)({
        familia: resuelto.familia,
        fincaId: input.fincaId,
        id: input.id,
        activo: input.activo,
      })
    },

    async editarFinca(input: EditarFincaInput) {
      const session = await getSession(input.fincaId)
      const denied = denyConfiguracionAccess(session, input.fincaId, "editar")
      if (denied) return denied

      return editarFinca(deps.finca)({ fincaId: input.fincaId, datos: input.datos })
    },

    /**
     * Issue #151 (CM-050): datos básicos de la finca para precargar la
     * vista del predio. Gate `configuracion:ver` + scope de la finca
     * activa; unión serializable (CM-042). Un fallo del puerto degrada a
     * `{tipo:"error"}` con mensaje fijo (sin filtrar detalles internos).
     */
    async obtenerDatosFinca(
      input: ObtenerDatosFincaInput,
    ): Promise<
      | ConfiguracionDenial
      | { readonly tipo: "finca"; readonly datos: DatosBasicosFinca }
      | { readonly tipo: "no_encontrado" }
      | { readonly tipo: "error"; readonly detalle: string }
    > {
      const session = await getSession(input.fincaId)
      const denied = denyConfiguracionAccess(session, input.fincaId, "ver")
      if (denied) return denied

      try {
        const datos = await deps.fincaLectura.obtenerDatosBasicos(input.fincaId)
        if (!datos) return { tipo: "no_encontrado" }
        return { tipo: "finca", datos }
      } catch {
        return { tipo: "error", detalle: "No se pudieron cargar los datos de la finca." }
      }
    },
  }
}

export type ConfiguracionRuntimeDepsFactory = () => ConfiguracionDeps

let configuracionRuntimeDepsFactory: ConfiguracionRuntimeDepsFactory | null = () =>
  createConfiguracionDeps(db)

export function configureConfiguracionRuntimeDeps(factory: ConfiguracionRuntimeDepsFactory | null) {
  configuracionRuntimeDepsFactory = factory
}

function getConfiguredConfiguracionDeps(
  factory: ConfiguracionRuntimeDepsFactory | null,
): ConfiguracionDeps {
  if (!factory) {
    throw new Error(
      "Configuracion persistence adapters are not configured for apps/web. Register real ConfiguracionDeps with configureConfiguracionRuntimeDeps; demo harnesses are test-only.",
    )
  }
  return factory()
}

async function getAuthorizedSession(fincaId?: string): Promise<SesionAutorizada | null> {
  // Issue #152: hook E2E (patrón de `animal-actions.server.ts`). La sesión
  // sale del fixture (header `x-ganaweb-e2e-role`: admin/readonly/default);
  // los datos NO — los maestros del E2E viven en la BD real bajo finca-1,
  // cuya existencia se garantiza aquí de forma idempotente (FK finca_id).
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
  // Issue #144 (deep links): la finca solicitada es preferencia suave, NO un
  // permiso; `denyConfiguracionAccess` exige `fincaActivaId === fincaId`.
  const decision = await obtenerSesionActual(getAuthDeps())(
    readSessionToken(),
    null,
    fincaId ?? readFincaActivaCookie(),
  )
  return decision.tipo === "autorizado" ? decision.sesion : null
}

interface ConfiguracionRuntimeHarnessOptions {
  readonly depsFactory?: ConfiguracionRuntimeDepsFactory | null
  readonly getSession?: (fincaId?: string) => Promise<SesionAutorizada | null>
}

export function createConfiguracionRuntimeHarness({
  depsFactory = configuracionRuntimeDepsFactory,
  getSession = getAuthorizedSession,
}: ConfiguracionRuntimeHarnessOptions = {}) {
  const runWithHarness = async <Result>(
    work: (harness: ReturnType<typeof createConfiguracionActionHarness>) => Promise<Result>,
  ) =>
    work(
      createConfiguracionActionHarness({
        deps: getConfiguredConfiguracionDeps(depsFactory),
        getSession,
      }),
    )

  return {
    resumen: (input: { readonly fincaId: string }) =>
      runWithHarness((harness) => harness.resumen(input)),
    listar: (input: ListarMaestroInput) => runWithHarness((harness) => harness.listar(input)),
    listarCatalogoGlobal: (input: ListarCatalogoGlobalInput) =>
      runWithHarness((harness) => harness.listarCatalogoGlobal(input)),
    crear: (input: CrearMaestroInput) => runWithHarness((harness) => harness.crear(input)),
    editar: (input: EditarMaestroInput) => runWithHarness((harness) => harness.editar(input)),
    cambiarEstado: (input: CambiarEstadoMaestroInput) =>
      runWithHarness((harness) => harness.cambiarEstado(input)),
    editarFinca: (input: EditarFincaInput) =>
      runWithHarness((harness) => harness.editarFinca(input)),
    obtenerDatosFinca: (input: ObtenerDatosFincaInput) =>
      runWithHarness((harness) => harness.obtenerDatosFinca(input)),
  }
}
