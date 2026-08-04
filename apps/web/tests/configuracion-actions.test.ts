import assert from "node:assert/strict"
import type {
  CatalogoGlobalConfiguracion,
  ConteoCatalogoGlobalClave,
  ConteoFamiliaClave,
  ConteosMaestrosResultado,
  FamiliaMaestro,
  FilaCatalogoGlobalConfiguracion,
  MaestroListadoOpciones,
  MaestroListadoResultado,
  SesionAutorizada,
} from "@ganaweb/aplicacion"
import { MAESTROS_HUB, rutaConfiguracionMaestro } from "../src/configuracion/definicion-maestros.js"
import {
  type ConfiguracionDeps,
  createConfiguracionActionHarness,
  createConfiguracionRuntimeHarness,
  denyConfiguracionAccess,
  hasConfiguracionPermission,
} from "../src/server/configuracion-actions.server.js"

function session(overrides: Partial<SesionAutorizada> = {}): SesionAutorizada {
  return {
    usuarioId: "usuario-1",
    nombre: "Administradora",
    email: "admin@ganaweb.test",
    fincaActivaId: "finca-1",
    fincaActivaNombre: "Finca 1",
    rol: "Administrador",
    permisos: [
      { modulo: "configuracion", accion: "ver" },
      { modulo: "configuracion", accion: "crear" },
      { modulo: "configuracion", accion: "editar" },
      { modulo: "configuracion", accion: "inactivar" },
    ],
    fincas: [
      {
        fincaId: "finca-1",
        nombre: "Finca 1",
        rol: "Administrador",
        activo: true,
        permisos: [
          { modulo: "configuracion", accion: "ver" },
          { modulo: "configuracion", accion: "crear" },
          { modulo: "configuracion", accion: "editar" },
          { modulo: "configuracion", accion: "inactivar" },
        ],
      },
    ],
    ...overrides,
  }
}

function conteosCompletos(): ConteosMaestrosResultado {
  return {
    porMaestro: {
      veterinarios: 3,
      propietarios: 2,
      potreros: 4,
      sectores: 5,
      lotes: 6,
      grupos: 7,
      hierros: 8,
      diagnosticos: 9,
      motivos_ventas: 10,
      causas_muerte: 11,
      lugares_compras: 12,
    },
    inseminadores: 2,
    fincaCompleta: true,
    catalogosGlobales: { razas: 13, tiposExplotacion: 14, calidades: 15 },
  }
}

interface LlamadaEscritura {
  readonly metodo: "obtenerPorId" | "listarNombresActivos" | "crear" | "editar" | "cambiarEstado"
  readonly args: readonly unknown[]
}

interface LlamadaListado {
  readonly maestro: FamiliaMaestro | "inseminadores"
  readonly fincaId: string
  readonly opciones?: MaestroListadoOpciones
}

interface LlamadaCatalogo {
  readonly catalogo: CatalogoGlobalConfiguracion
  readonly opciones?: { readonly busqueda?: string }
}

interface FakeConfiguracion {
  readonly deps: ConfiguracionDeps
  readonly llamadasEscritura: LlamadaEscritura[]
  readonly llamadasFinca: readonly unknown[][]
  readonly llamadasListado: LlamadaListado[]
  readonly llamadasCatalogo: LlamadaCatalogo[]
  readonly llamadasConteos: { readonly metodo: string; readonly args: readonly unknown[] }[]
}

interface FakeOverrides {
  readonly contarTodo?: (fincaId: string) => Promise<ConteosMaestrosResultado>
  readonly contarPorFamilia?: (
    fincaId: string,
    familia: ConteoFamiliaClave,
  ) => Promise<number | null>
  readonly contarCatalogoGlobal?: (catalogo: ConteoCatalogoGlobalClave) => Promise<number | null>
  readonly listar?: (
    maestro: FamiliaMaestro | "inseminadores",
    fincaId: string,
    opciones?: MaestroListadoOpciones,
  ) => Promise<MaestroListadoResultado>
  readonly listarParaConfiguracion?: (
    catalogo: CatalogoGlobalConfiguracion,
    opciones?: { readonly busqueda?: string },
  ) => Promise<readonly FilaCatalogoGlobalConfiguracion[]>
  readonly registros?: ReadonlyMap<string, { readonly id: string; readonly fincaId: string }>
  readonly nombresActivos?: readonly { readonly id: string; readonly nombre: string }[]
  readonly crear?: (
    familia: FamiliaMaestro,
    fincaId: string,
    datos: Readonly<Record<string, unknown>>,
  ) => Promise<
    | { readonly tipo: "creado"; readonly id: string }
    | { readonly tipo: "conflicto"; readonly campo: string }
    | { readonly tipo: "error"; readonly detalle: string }
  >
  readonly editar?: (
    familia: FamiliaMaestro,
    fincaId: string,
    id: string,
    datos: Readonly<Record<string, unknown>>,
  ) => Promise<
    | { readonly tipo: "actualizado" }
    | { readonly tipo: "no_encontrado" }
    | { readonly tipo: "conflicto"; readonly campo: string }
    | { readonly tipo: "error"; readonly detalle: string }
  >
  readonly cambiarEstado?: (
    familia: FamiliaMaestro,
    fincaId: string,
    id: string,
    activo: 0 | 1,
  ) => Promise<
    | { readonly tipo: "estado_actualizado" }
    | { readonly tipo: "no_encontrado" }
    | { readonly tipo: "error"; readonly detalle: string }
  >
  readonly actualizarFinca?: (
    fincaId: string,
    datos: Readonly<Record<string, unknown>>,
  ) => Promise<
    | { readonly tipo: "actualizado" }
    | { readonly tipo: "no_encontrado" }
    | { readonly tipo: "error"; readonly detalle: string }
  >
}

function fakeDeps(overrides: FakeOverrides = {}): FakeConfiguracion {
  const llamadasEscritura: LlamadaEscritura[] = []
  const llamadasFinca: unknown[][] = []
  const llamadasListado: LlamadaListado[] = []
  const llamadasCatalogo: LlamadaCatalogo[] = []
  const llamadasConteos: { metodo: string; args: readonly unknown[] }[] = []
  const registros =
    overrides.registros ?? new Map([["maestro-1", { id: "maestro-1", fincaId: "finca-1" }]])

  const deps: ConfiguracionDeps = {
    escritura: {
      async obtenerPorId(familia, id) {
        llamadasEscritura.push({ metodo: "obtenerPorId", args: [familia, id] })
        return registros.get(id) ?? null
      },
      async listarNombresActivos(familia, fincaId) {
        llamadasEscritura.push({ metodo: "listarNombresActivos", args: [familia, fincaId] })
        return overrides.nombresActivos ?? []
      },
      async crear(familia, fincaId, datos) {
        llamadasEscritura.push({ metodo: "crear", args: [familia, fincaId, datos] })
        return overrides.crear
          ? overrides.crear(familia, fincaId, datos)
          : { tipo: "creado", id: "maestro-nuevo-1" }
      },
      async editar(familia, fincaId, id, datos) {
        llamadasEscritura.push({ metodo: "editar", args: [familia, fincaId, id, datos] })
        return overrides.editar
          ? overrides.editar(familia, fincaId, id, datos)
          : { tipo: "actualizado" }
      },
      async cambiarEstado(familia, fincaId, id, activo) {
        llamadasEscritura.push({ metodo: "cambiarEstado", args: [familia, fincaId, id, activo] })
        return overrides.cambiarEstado
          ? overrides.cambiarEstado(familia, fincaId, id, activo)
          : { tipo: "estado_actualizado" }
      },
    },
    finca: {
      async actualizarDatosBasicos(fincaId, datos) {
        llamadasFinca.push([fincaId, datos])
        return overrides.actualizarFinca
          ? overrides.actualizarFinca(fincaId, datos)
          : { tipo: "actualizado" }
      },
    },
    conteos: {
      async contarTodo(fincaId) {
        llamadasConteos.push({ metodo: "contarTodo", args: [fincaId] })
        return overrides.contarTodo ? overrides.contarTodo(fincaId) : conteosCompletos()
      },
      async contarPorFamilia(fincaId, familia) {
        llamadasConteos.push({ metodo: "contarPorFamilia", args: [fincaId, familia] })
        return overrides.contarPorFamilia ? overrides.contarPorFamilia(fincaId, familia) : 0
      },
      async contarCatalogoGlobal(catalogo) {
        llamadasConteos.push({ metodo: "contarCatalogoGlobal", args: [catalogo] })
        return overrides.contarCatalogoGlobal ? overrides.contarCatalogoGlobal(catalogo) : 0
      },
    },
    listado: {
      async listar(maestro, fincaId, opciones) {
        llamadasListado.push({ maestro, fincaId, ...(opciones ? { opciones } : {}) })
        return overrides.listar
          ? overrides.listar(maestro, fincaId, opciones)
          : {
              filas: [{ id: "fila-1", nombre: "Registro 1", activo: 1 }],
              total: 1,
              pagina: opciones?.pagina ?? 1,
              pageSize: opciones?.pageSize ?? 25,
            }
      },
    },
    catalogos: {
      async listarParaConfiguracion(catalogo, opciones) {
        llamadasCatalogo.push({ catalogo, ...(opciones ? { opciones } : {}) })
        return overrides.listarParaConfiguracion
          ? overrides.listarParaConfiguracion(catalogo, opciones)
          : [{ id: "catalogo-1", nombre: "Raza 1", descripcion: null }]
      },
    },
  }

  return {
    deps,
    llamadasEscritura,
    llamadasFinca,
    llamadasListado,
    llamadasCatalogo,
    llamadasConteos,
  }
}

function harnessCon(
  fakes: FakeConfiguracion,
  getSesion: (fincaId?: string) => Promise<SesionAutorizada | null> = async () => session(),
) {
  return createConfiguracionActionHarness({ deps: fakes.deps, getSession: getSesion })
}

async function testDefinicionMaestrosHub() {
  assert.equal(MAESTROS_HUB.length, 15, "el hub declara los 15 items del requisito §4")
  assert.deepEqual(
    MAESTROS_HUB.map((d) => d.id),
    [
      "veterinarios",
      "propietarios",
      "inseminadores",
      "predio",
      "potreros",
      "sectores",
      "lotesGrupos",
      "hierros",
      "diagnosticos",
      "motivosVentas",
      "causasMuerte",
      "lugaresCompras",
      "razas",
      "tiposExplotacion",
      "calidades",
    ],
    "los ids quedan en el orden exacto del requisito §4",
  )
  assert.deepEqual(
    MAESTROS_HUB.map((d) => d.nombre),
    [
      "Veterinarios",
      "Propietarios",
      "Inseminadores",
      "Predios",
      "Potreros",
      "Sectores",
      "Lotes · Grupos",
      "Hierros",
      "Diagnósticos",
      "Motivos de venta",
      "Causas de muerte",
      "Lugares de compra",
      "Razas",
      "Tipos de explotación",
      "Calidades",
    ],
    "los nombres son los exactos del requisito §4",
  )
  assert.deepEqual(
    MAESTROS_HUB.map((d) => d.grupo),
    [
      "personas",
      "personas",
      "personas",
      "ubicacion",
      "ubicacion",
      "ubicacion",
      "ubicacion",
      "clasificacion",
      "clasificacion",
      "clasificacion",
      "clasificacion",
      "clasificacion",
      "clasificacion",
      "clasificacion",
      "clasificacion",
    ],
    "los grupos agrupan personas / ubicación / clasificación",
  )
  assert.deepEqual(
    MAESTROS_HUB.map((d) => d.slug),
    [
      "veterinarios",
      "propietarios",
      "inseminadores",
      "predio",
      "potreros",
      "sectores",
      "lotes-grupos",
      "hierros",
      "diagnosticos",
      "motivos-ventas",
      "causas-muerte",
      "lugares-compras",
      "razas",
      "tipos-explotacion",
      "calidades",
    ],
    "los slugs alimentan la ruta del CRUD (CM-001)",
  )

  const conRequerido = MAESTROS_HUB.filter((d) => d.requeridoPara !== undefined)
  assert.deepEqual(
    Object.fromEntries(conRequerido.map((d) => [d.id, d.requeridoPara])),
    {
      veterinarios: "Revisiones sanitarias",
      propietarios: "Registro de animales",
      inseminadores: "Servicios IA",
      potreros: "Ubicación / manejo",
      hierros: "Registro de animales",
      diagnosticos: "Sanidad",
      motivosVentas: "Ventas",
      causasMuerte: "Bajas",
    },
    "requeridoPara presente exactamente en los 8 maestros de R-5 (CM-011/§3.3)",
  )

  assert.deepEqual(
    MAESTROS_HUB.filter((d) => d.soloLectura).map((d) => d.id),
    ["razas", "tiposExplotacion", "calidades"],
    "sólo los catálogos globales son solo lectura (CM-025/CM-053)",
  )

  assert.equal(
    rutaConfiguracionMaestro("finca-1", "lotesGrupos"),
    "/fincas/finca-1/configuracion/lotes-grupos",
  )
  assert.equal(rutaConfiguracionMaestro("finca-9", "razas"), "/fincas/finca-9/configuracion/razas")
}

async function testResumenHubCompleto() {
  const fakes = fakeDeps()
  const harness = harnessCon(fakes)
  const resultado = await harness.resumen({ fincaId: "finca-1" })
  assert.equal(resultado.tipo, "resumen")
  if (resultado.tipo !== "resumen") return

  assert.equal(resultado.items.length, 15, "el hub renderiza los 15 items")
  assert.deepEqual(
    resultado.items.map((item) => item.id),
    MAESTROS_HUB.map((d) => d.id),
    "los items quedan en el orden de MAESTROS_HUB",
  )
  assert.deepEqual(
    resultado.items.map((item) => item.nombre),
    MAESTROS_HUB.map((d) => d.nombre),
  )
  assert.deepEqual(
    resultado.items.map((item) => item.grupo),
    MAESTROS_HUB.map((d) => d.grupo),
  )
  assert.deepEqual(
    resultado.items.map((item) => item.ruta),
    MAESTROS_HUB.map((d) => `/fincas/finca-1/configuracion/${d.slug}`),
    "la ruta queda scoped a la finca (CM-001)",
  )
  assert.equal(
    resultado.items.filter((item) => item.requeridoPara !== undefined).length,
    8,
    "requeridoPara viaja en exactamente 8 items",
  )

  const porId = new Map(resultado.items.map((item) => [item.id, item]))
  assert.equal(porId.get("veterinarios")?.registros, 3)
  assert.equal(porId.get("propietarios")?.registros, 2)
  assert.equal(porId.get("inseminadores")?.registros, 2, "inseminadores usa el conteo CM-040")
  assert.equal(porId.get("predio")?.registros, 1, "predio cuenta 1 si la finca está completa")
  assert.equal(porId.get("lotesGrupos")?.registros, 6, "lotesGrupos: registros = lotes")
  assert.equal(
    porId.get("lotesGrupos")?.registrosSecundario,
    7,
    "lotesGrupos: registrosSecundario = grupos (CM-008)",
  )
  assert.equal(porId.get("razas")?.registros, 13, "globales mapean de catalogosGlobales")
  assert.equal(porId.get("tiposExplotacion")?.registros, 14)
  assert.equal(porId.get("calidades")?.registros, 15)
  assert.ok(
    resultado.items.every((item) => item.degradado === undefined),
    "sin conteos fallidos ningún item queda degradado",
  )
  assert.deepEqual(
    fakes.llamadasConteos.map((l) => l.metodo),
    ["contarTodo"],
  )

  const fakesIncompleta = fakeDeps({
    contarTodo: async () => ({ ...conteosCompletos(), fincaCompleta: false }),
  })
  const resultadoIncompleto = await harnessCon(fakesIncompleta).resumen({ fincaId: "finca-1" })
  assert.equal(resultadoIncompleto.tipo, "resumen")
  if (resultadoIncompleto.tipo !== "resumen") return
  assert.equal(
    resultadoIncompleto.items.find((item) => item.id === "predio")?.registros,
    0,
    "predio cuenta 0 si la finca está incompleta (CM-007)",
  )
}

async function testResumenDegradacionPorItem() {
  const fakes = fakeDeps({
    contarTodo: async () => {
      throw new Error("aggregate count failed")
    },
    contarPorFamilia: async (_fincaId, familia) => {
      if (familia === "hierros") throw new Error("hierros count failed")
      if (familia === "diagnosticos") return null
      if (familia === "fincaCompleta") return 1
      if (familia === "inseminadores") return 2
      if (familia === "lotes") return 6
      if (familia === "grupos") return 7
      return 1
    },
    contarCatalogoGlobal: async (catalogo) => (catalogo === "calidades" ? null : 5),
  })
  const resultado = await harnessCon(fakes).resumen({ fincaId: "finca-1" })
  assert.equal(resultado.tipo, "resumen", "contarTodo fallando nunca lanza: degrada por item")
  if (resultado.tipo !== "resumen") return

  assert.equal(resultado.items.length, 15, "el hub SIEMPRE renderiza los 15 items (CM-014)")
  const porId = new Map(resultado.items.map((item) => [item.id, item]))
  assert.deepEqual(
    { registros: porId.get("hierros")?.registros, degradado: porId.get("hierros")?.degradado },
    { registros: 0, degradado: true },
    "contarPorFamilia que lanza degrada sólo ese item",
  )
  assert.deepEqual(
    {
      registros: porId.get("diagnosticos")?.registros,
      degradado: porId.get("diagnosticos")?.degradado,
    },
    { registros: 0, degradado: true },
    "contarPorFamilia que devuelve null degrada sólo ese item",
  )
  assert.deepEqual(
    { registros: porId.get("calidades")?.registros, degradado: porId.get("calidades")?.degradado },
    { registros: 0, degradado: true },
    "contarCatalogoGlobal null degrada el catálogo global",
  )
  assert.deepEqual(
    resultado.items
      .filter((item) => item.degradado === true)
      .map((item) => item.id)
      .sort(),
    ["calidades", "diagnosticos", "hierros"],
    "el resto de los items conserva sus datos",
  )
  assert.equal(porId.get("veterinarios")?.registros, 1)
  assert.equal(porId.get("veterinarios")?.degradado, undefined)
  assert.equal(porId.get("inseminadores")?.registros, 2)
  assert.equal(porId.get("predio")?.registros, 1)
  assert.equal(porId.get("lotesGrupos")?.registros, 6)
  assert.equal(porId.get("lotesGrupos")?.registrosSecundario, 7)
  assert.equal(porId.get("razas")?.registros, 5)

  const fakesLotesRoto = fakeDeps({
    contarTodo: async () => {
      throw new Error("aggregate count failed")
    },
    contarPorFamilia: async (_fincaId, familia) => (familia === "grupos" ? null : 4),
  })
  const resultadoLotes = await harnessCon(fakesLotesRoto).resumen({ fincaId: "finca-1" })
  assert.equal(resultadoLotes.tipo, "resumen")
  if (resultadoLotes.tipo !== "resumen") return
  const lotesGrupos = resultadoLotes.items.find((item) => item.id === "lotesGrupos")
  assert.deepEqual(
    {
      registros: lotesGrupos?.registros,
      registrosSecundario: lotesGrupos?.registrosSecundario,
      degradado: lotesGrupos?.degradado,
    },
    { registros: 0, registrosSecundario: 0, degradado: true },
    "si una de las dos familias de Lotes · Grupos falla, la card completa degrada",
  )
}

async function testRbacDenegaciones() {
  assert.deepEqual(denyConfiguracionAccess(null, "finca-1", "ver"), { tipo: "no_autenticado" })
  assert.deepEqual(denyConfiguracionAccess(session(), "finca-2", "ver"), {
    tipo: "finca_no_autorizada",
  })
  assert.deepEqual(
    denyConfiguracionAccess(
      session({ permisos: [{ modulo: "configuracion", accion: "ver" }] }),
      "finca-1",
      "crear",
    ),
    { tipo: "permiso_denegado", permiso: "configuracion:crear" },
  )
  assert.equal(hasConfiguracionPermission(session(), "ver"), true)
  assert.equal(hasConfiguracionPermission(session({ permisos: [] }), "ver"), false)
  assert.equal(
    hasConfiguracionPermission(
      session({ permisos: [{ modulo: "animales", accion: "ver" }] }),
      "ver",
    ),
    false,
    "permisos de otro módulo no conceden configuracion",
  )
  const wildcard = session({ permisos: [{ modulo: "*", accion: "*" }] })
  for (const accion of ["ver", "crear", "editar", "inactivar"] as const) {
    assert.equal(hasConfiguracionPermission(wildcard, accion), true, `wildcard concede ${accion}`)
    assert.deepEqual(denyConfiguracionAccess(wildcard, "finca-1", accion), null)
  }

  const sinSesion = harnessCon(fakeDeps(), async () => null)
  assert.deepEqual(await sinSesion.resumen({ fincaId: "finca-1" }), { tipo: "no_autenticado" })
  assert.deepEqual(await sinSesion.listar({ fincaId: "finca-1", maestro: "veterinarios" }), {
    tipo: "no_autenticado",
  })
  assert.deepEqual(await sinSesion.listarCatalogoGlobal({ catalogo: "razas" }), {
    tipo: "no_autenticado",
  })
  assert.deepEqual(
    await sinSesion.crear({ fincaId: "finca-1", maestro: "veterinarios", datos: { nombre: "X" } }),
    { tipo: "no_autenticado" },
  )

  const otraFinca = harnessCon(fakeDeps(), async () => session({ fincaActivaId: "finca-2" }))
  assert.deepEqual(await otraFinca.resumen({ fincaId: "finca-1" }), {
    tipo: "finca_no_autorizada",
  })
  assert.deepEqual(
    await otraFinca.crear({ fincaId: "finca-1", maestro: "hierros", datos: { nombre: "X" } }),
    { tipo: "finca_no_autorizada" },
  )

  const fakesSoloVer = fakeDeps()
  const soloVer = harnessCon(fakesSoloVer, async () =>
    session({ permisos: [{ modulo: "configuracion", accion: "ver" }] }),
  )
  assert.deepEqual(
    await soloVer.crear({ fincaId: "finca-1", maestro: "veterinarios", datos: { nombre: "X" } }),
    { tipo: "permiso_denegado", permiso: "configuracion:crear" },
    "crear sin configuracion:crear devuelve la denegación sin lanzar",
  )
  assert.deepEqual(
    await soloVer.editar({
      fincaId: "finca-1",
      maestro: "veterinarios",
      id: "maestro-1",
      datos: { nombre: "X" },
    }),
    { tipo: "permiso_denegado", permiso: "configuracion:editar" },
  )
  assert.deepEqual(
    await soloVer.cambiarEstado({
      fincaId: "finca-1",
      maestro: "veterinarios",
      id: "maestro-1",
      activo: false,
    }),
    { tipo: "permiso_denegado", permiso: "configuracion:inactivar" },
  )
  assert.deepEqual(await soloVer.editarFinca({ fincaId: "finca-1", datos: { nombre: "X" } }), {
    tipo: "permiso_denegado",
    permiso: "configuracion:editar",
  })
  assert.equal(fakesSoloVer.llamadasEscritura.length, 0, "la denegación no toca los puertos")
  assert.equal(fakesSoloVer.llamadasFinca.length, 0, "la denegación no toca los puertos")

  const sinVer = harnessCon(fakeDeps(), async () =>
    session({ permisos: [{ modulo: "configuracion", accion: "crear" }] }),
  )
  assert.deepEqual(await sinVer.resumen({ fincaId: "finca-1" }), {
    tipo: "permiso_denegado",
    permiso: "configuracion:ver",
  })
  assert.deepEqual(await sinVer.listar({ fincaId: "finca-1", maestro: "veterinarios" }), {
    tipo: "permiso_denegado",
    permiso: "configuracion:ver",
  })
  assert.deepEqual(await sinVer.listarCatalogoGlobal({ catalogo: "razas" }), {
    tipo: "permiso_denegado",
    permiso: "configuracion:ver",
  })

  const wildcardHarness = harnessCon(fakeDeps(), async () => wildcard)
  const resumenWildcard = await wildcardHarness.resumen({ fincaId: "finca-1" })
  assert.equal(resumenWildcard.tipo, "resumen", "el wildcard *:* permite leer el hub")
}

async function testScopeFincaPrimero() {
  const fakes = fakeDeps({
    registros: new Map([["maestro-ajeno", { id: "maestro-ajeno", fincaId: "finca-2" }]]),
  })
  const harness = harnessCon(fakes)
  assert.deepEqual(
    await harness.editar({
      fincaId: "finca-1",
      maestro: "veterinarios",
      id: "maestro-ajeno",
      datos: { nombre: "X" },
    }),
    { tipo: "no_encontrado" },
    "editar un registro de otra finca reporta no_encontrado (CM-024)",
  )
  assert.deepEqual(
    await harness.cambiarEstado({
      fincaId: "finca-1",
      maestro: "veterinarios",
      id: "maestro-ajeno",
      activo: false,
    }),
    { tipo: "no_encontrado" },
    "cambiarEstado un registro de otra finca reporta no_encontrado (CM-024)",
  )
  assert.ok(
    fakes.llamadasEscritura.every((l) => l.metodo !== "editar" && l.metodo !== "cambiarEstado"),
    "el scope se verifica antes de persistir",
  )
}

async function testGuardiaEscrituraCM025() {
  const fakes = fakeDeps()
  const harness = harnessCon(fakes)
  const esperado = { tipo: "error", detalle: "El maestro indicado no permite escritura." }
  assert.deepEqual(
    await harness.crear({ fincaId: "finca-1", maestro: "razas" as never, datos: { nombre: "X" } }),
    esperado,
    "crear sobre un catálogo global casteado se rechaza (CM-025)",
  )
  assert.deepEqual(
    await harness.crear({ fincaId: "finca-1", maestro: "predio" as never, datos: { nombre: "X" } }),
    esperado,
    "el predio no es un maestro editable del CRUD",
  )
  assert.deepEqual(
    await harness.editar({
      fincaId: "finca-1",
      maestro: "calidades" as never,
      id: "maestro-1",
      datos: { nombre: "X" },
    }),
    esperado,
  )
  assert.deepEqual(
    await harness.cambiarEstado({
      fincaId: "finca-1",
      maestro: "tiposExplotacion" as never,
      id: "maestro-1",
      activo: false,
    }),
    esperado,
  )
  assert.equal(fakes.llamadasEscritura.length, 0, "la guardia CM-025 no toca los puertos")
}

async function testEscrituraMapeoUnoAUno() {
  const fakes = fakeDeps()
  const harness = harnessCon(fakes)

  const creado = await harness.crear({
    fincaId: "finca-1",
    maestro: "veterinarios",
    datos: { nombre: "Dra. Ana" },
  })
  assert.deepEqual(creado, { tipo: "creado", id: "maestro-nuevo-1" })
  const ultimaCreacion = fakes.llamadasEscritura.at(-1)
  assert.equal(ultimaCreacion?.metodo, "crear")
  assert.equal(ultimaCreacion?.args[0], "veterinarios")
  assert.equal(ultimaCreacion?.args[1], "finca-1")
  assert.equal((ultimaCreacion?.args[2] as { nombre: string }).nombre, "Dra. Ana")

  await harness.crear({ fincaId: "finca-1", maestro: "inseminadores", datos: { nombre: "Dr. IA" } })
  const creacionInseminador = fakes.llamadasEscritura.at(-1)
  assert.equal(creacionInseminador?.args[0], "veterinarios", "inseminadores escribe veterinarios")
  assert.equal(
    (creacionInseminador?.args[2] as { es_inseminador: number }).es_inseminador,
    1,
    "origen inseminadores fuerza es_inseminador=1 (CM-040)",
  )

  const duplicado = await harnessCon(
    fakeDeps({ nombresActivos: [{ id: "otro", nombre: "Dra. Ana" }] }),
  ).crear({ fincaId: "finca-1", maestro: "veterinarios", datos: { nombre: "DRA. ANA" } })
  assert.equal(duplicado.tipo, "validacion", "nombre duplicado entre activos (CM-041)")
  if (duplicado.tipo === "validacion") {
    assert.ok(duplicado.errores.some((e) => e.campo === "nombre" && e.regla === "CM-041"))
  }

  const validacion = await harness.crear({
    fincaId: "finca-1",
    maestro: "potreros",
    datos: { nombre: "Potrero Norte" },
  })
  assert.equal(validacion.tipo, "validacion", "potreros requiere codigo (CM-026)")
  if (validacion.tipo === "validacion") {
    assert.ok(validacion.errores.some((e) => e.campo === "codigo"))
  }

  const fakesConflicto = fakeDeps({
    crear: async () => ({ tipo: "conflicto", campo: "codigo" }),
  })
  assert.deepEqual(
    await harnessCon(fakesConflicto).crear({
      fincaId: "finca-1",
      maestro: "potreros",
      datos: { codigo: "P-1", nombre: "Potrero" },
    }),
    { tipo: "conflicto", campo: "codigo" },
    "el conflicto del puerto pasa 1:1 (CM-032)",
  )

  const fakesError = fakeDeps({ crear: async () => ({ tipo: "error", detalle: "fallo db" }) })
  assert.deepEqual(
    await harnessCon(fakesError).crear({
      fincaId: "finca-1",
      maestro: "veterinarios",
      datos: { nombre: "X" },
    }),
    { tipo: "error", detalle: "fallo db" },
  )

  const editado = await harness.editar({
    fincaId: "finca-1",
    maestro: "veterinarios",
    id: "maestro-1",
    datos: { nombre: "Dra. Ana María" },
  })
  assert.deepEqual(editado, { tipo: "actualizado" })
  const ultimaEdicion = fakes.llamadasEscritura.at(-1)
  assert.equal(ultimaEdicion?.metodo, "editar")
  assert.deepEqual(ultimaEdicion?.args.slice(0, 3), ["veterinarios", "finca-1", "maestro-1"])

  const edicionInvalida = await harness.editar({
    fincaId: "finca-1",
    maestro: "veterinarios",
    id: "maestro-1",
    datos: {},
  })
  assert.equal(edicionInvalida.tipo, "validacion")
  assert.deepEqual(
    await harness.editar({
      fincaId: "finca-1",
      maestro: "veterinarios",
      id: "inexistente",
      datos: { nombre: "X" },
    }),
    { tipo: "no_encontrado" },
  )
  const fakesEditarConflicto = fakeDeps({
    editar: async () => ({ tipo: "conflicto", campo: "nombre" }),
  })
  assert.deepEqual(
    await harnessCon(fakesEditarConflicto).editar({
      fincaId: "finca-1",
      maestro: "veterinarios",
      id: "maestro-1",
      datos: { nombre: "X" },
    }),
    { tipo: "conflicto", campo: "nombre" },
  )

  const inactivado = await harness.cambiarEstado({
    fincaId: "finca-1",
    maestro: "veterinarios",
    id: "maestro-1",
    activo: false,
  })
  assert.deepEqual(inactivado, { tipo: "estado_actualizado", activo: false })
  const ultimoEstado = fakes.llamadasEscritura.at(-1)
  assert.equal(ultimoEstado?.metodo, "cambiarEstado")
  assert.equal(ultimoEstado?.args[3], 0, "el puerto recibe el flag 0|1 del esquema")

  const reactivado = await harness.cambiarEstado({
    fincaId: "finca-1",
    maestro: "veterinarios",
    id: "maestro-1",
    activo: true,
  })
  assert.deepEqual(reactivado, { tipo: "estado_actualizado", activo: true })
  assert.equal(fakes.llamadasEscritura.at(-1)?.args[3], 1)

  assert.deepEqual(
    await harness.cambiarEstado({
      fincaId: "finca-1",
      maestro: "veterinarios",
      id: "inexistente",
      activo: false,
    }),
    { tipo: "no_encontrado" },
  )
  const fakesEstadoError = fakeDeps({
    cambiarEstado: async () => ({ tipo: "error", detalle: "fallo db" }),
  })
  assert.deepEqual(
    await harnessCon(fakesEstadoError).cambiarEstado({
      fincaId: "finca-1",
      maestro: "veterinarios",
      id: "maestro-1",
      activo: false,
    }),
    { tipo: "error", detalle: "fallo db" },
  )

  const fincaEditada = await harness.editarFinca({
    fincaId: "finca-1",
    datos: { nombre: "Finca La Esperanza", municipio: "Manizales" },
  })
  assert.deepEqual(fincaEditada, { tipo: "actualizado" })
  assert.equal(fakes.llamadasFinca.length, 1)
  assert.equal(fakes.llamadasFinca[0]?.[0], "finca-1")

  const fincaInvalida = await harness.editarFinca({ fincaId: "finca-1", datos: {} })
  assert.equal(fincaInvalida.tipo, "validacion", "la finca requiere nombre (CM-050)")
  const fakesFincaNoEncontrada = fakeDeps({
    actualizarFinca: async () => ({ tipo: "no_encontrado" }),
  })
  assert.deepEqual(
    await harnessCon(fakesFincaNoEncontrada).editarFinca({
      fincaId: "finca-1",
      datos: { nombre: "X" },
    }),
    { tipo: "no_encontrado" },
  )
}

async function testListarPassThrough() {
  const fakes = fakeDeps()
  const harness = harnessCon(fakes)
  const opciones: MaestroListadoOpciones = {
    busqueda: "ana",
    incluirInactivos: true,
    pagina: 2,
    pageSize: 50,
  }
  const resultado = await harness.listar({ fincaId: "finca-1", maestro: "veterinarios", opciones })
  assert.equal(resultado.tipo, "lista")
  if (resultado.tipo !== "lista") return
  assert.deepEqual(resultado.filas, [{ id: "fila-1", nombre: "Registro 1", activo: 1 }])
  assert.equal(resultado.total, 1)
  assert.equal(resultado.pagina, 2)
  assert.equal(resultado.pageSize, 50)
  assert.deepEqual(fakes.llamadasListado, [
    { maestro: "veterinarios", fincaId: "finca-1", opciones },
  ])

  await harness.listar({ fincaId: "finca-1", maestro: "inseminadores" })
  assert.equal(
    fakes.llamadasListado.at(-1)?.maestro,
    "inseminadores",
    "inseminadores pasa directo al adaptador (CM-040)",
  )
  assert.equal(fakes.llamadasListado.at(-1)?.opciones, undefined)

  const fakesCatalogo = fakeDeps()
  const harnessCatalogo = harnessCon(fakesCatalogo)
  const listadoGlobal = await harnessCatalogo.listarCatalogoGlobal({
    catalogo: "razas",
    busqueda: "hol",
  })
  assert.equal(listadoGlobal.tipo, "lista")
  if (listadoGlobal.tipo !== "lista") return
  assert.deepEqual(listadoGlobal.filas, [{ id: "catalogo-1", nombre: "Raza 1", descripcion: null }])
  assert.deepEqual(fakesCatalogo.llamadasCatalogo, [
    { catalogo: "razas", opciones: { busqueda: "hol" } },
  ])

  await harnessCatalogo.listarCatalogoGlobal({ catalogo: "calidades" })
  assert.deepEqual(fakesCatalogo.llamadasCatalogo.at(-1), { catalogo: "calidades" })
}

async function testRuntimeHarnessRequiereAdaptadores() {
  const sinAdaptadores = createConfiguracionRuntimeHarness({
    depsFactory: null,
    getSession: async () => session(),
  })
  await assert.rejects(
    () => sinAdaptadores.resumen({ fincaId: "finca-1" }),
    /Configuracion persistence adapters are not configured/,
  )

  const fakes = fakeDeps()
  const runtime = createConfiguracionRuntimeHarness({
    depsFactory: () => fakes.deps,
    getSession: async () => session(),
  })
  const resumen = await runtime.resumen({ fincaId: "finca-1" })
  assert.equal(resumen.tipo, "resumen")
  const creado = await runtime.crear({
    fincaId: "finca-1",
    maestro: "veterinarios",
    datos: { nombre: "Runtime" },
  })
  assert.equal(creado.tipo, "creado")
}

async function testSerializabilidadDeResultados() {
  const fakes = fakeDeps({
    registros: new Map([["maestro-1", { id: "maestro-1", fincaId: "finca-1" }]]),
  })
  const harness = harnessCon(fakes)
  const fakesDegradado = fakeDeps({
    contarTodo: async () => {
      throw new Error("aggregate count failed")
    },
    contarPorFamilia: async () => null,
    contarCatalogoGlobal: async () => null,
  })

  const resultados: unknown[] = [
    await harness.resumen({ fincaId: "finca-1" }),
    await harnessCon(fakesDegradado).resumen({ fincaId: "finca-1" }),
    await harness.listar({
      fincaId: "finca-1",
      maestro: "veterinarios",
      opciones: { busqueda: "a", pagina: 1, pageSize: 25 },
    }),
    await harness.listarCatalogoGlobal({ catalogo: "razas", busqueda: "x" }),
    await harness.crear({ fincaId: "finca-1", maestro: "veterinarios", datos: { nombre: "S" } }),
    await harness.crear({ fincaId: "finca-1", maestro: "potreros", datos: { nombre: "S" } }),
    await harness.crear({ fincaId: "finca-1", maestro: "razas" as never, datos: {} }),
    await harness.editar({
      fincaId: "finca-1",
      maestro: "veterinarios",
      id: "maestro-1",
      datos: { nombre: "S" },
    }),
    await harness.editar({
      fincaId: "finca-1",
      maestro: "veterinarios",
      id: "inexistente",
      datos: { nombre: "S" },
    }),
    await harness.cambiarEstado({
      fincaId: "finca-1",
      maestro: "veterinarios",
      id: "maestro-1",
      activo: false,
    }),
    await harness.editarFinca({ fincaId: "finca-1", datos: { nombre: "S" } }),
    await harnessCon(fakeDeps(), async () => null).resumen({ fincaId: "finca-1" }),
    await harnessCon(fakeDeps(), async () => session({ fincaActivaId: "finca-2" })).resumen({
      fincaId: "finca-1",
    }),
    await harnessCon(fakeDeps(), async () => session({ permisos: [] })).crear({
      fincaId: "finca-1",
      maestro: "veterinarios",
      datos: { nombre: "S" },
    }),
  ]

  for (const resultado of resultados) {
    assert.deepEqual(
      JSON.parse(JSON.stringify(resultado)),
      resultado,
      "cada unión de resultado sobrevive la serialización JSON idéntica (CM-042)",
    )
  }
}

async function run() {
  await testDefinicionMaestrosHub()
  await testResumenHubCompleto()
  await testResumenDegradacionPorItem()
  await testRbacDenegaciones()
  await testScopeFincaPrimero()
  await testGuardiaEscrituraCM025()
  await testEscrituraMapeoUnoAUno()
  await testListarPassThrough()
  await testRuntimeHarnessRequiereAdaptadores()
  await testSerializabilidadDeResultados()
  // biome-ignore lint/suspicious/noConsole: focused harness progress output
  console.log("✅ configuracion-actions.test.ts passed")
}

await run()
