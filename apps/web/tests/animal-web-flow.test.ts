import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { AnimalUseCaseDeps, SesionAutorizada } from "@ganaweb/aplicacion"
import { buildUpdateAnimalInputFromFormData } from "../src/routes/_app/fincas/$fincaId/animales/$animalId/editar.js"
import { buildCreateAnimalInputFromFormData } from "../src/routes/_app/fincas/$fincaId/animales/nuevo.js"
import {
  buildAnimalRouteViewModel,
  createAnimalActionHarness,
  createAnimalRuntimeHarness,
  denyAnimalRouteAccess,
  resolveAnimalPermissions,
} from "../src/server/animal-actions.server.js"

const WEB_ROOT = join(import.meta.dirname, "..")
const ROUTES_DIR = join(WEB_ROOT, "src", "routes", "_app", "fincas", "$fincaId")

function session(overrides: Partial<SesionAutorizada> = {}): SesionAutorizada {
  return {
    usuarioId: "usuario-1",
    nombre: "Operario",
    email: "operario@ganaweb.test",
    fincaActivaId: "finca-1",
    rol: "Mayordomo",
    permisos: [
      { modulo: "animales", accion: "ver" },
      { modulo: "animales", accion: "crear" },
      { modulo: "animales", accion: "editar" },
      { modulo: "animales", accion: "inactivar" },
    ],
    ...overrides,
  }
}

function deps(): AnimalUseCaseDeps {
  const animals = new Map([
    [
      "animal-active-1",
      {
        id: "animal-active-1",
        fincaId: "finca-1",
        codigo: "AA-001",
        nombre: "Activa Sana",
        nombreAnimal: "Activa Sana",
        sexo: "hembra" as const,
        sexoKey: 1 as const,
        estadoActual: "activo" as const,
        salud: "sano" as const,
        potreroId: "potrero-norte",
        loteId: "lote-a",
        version: 1,
        activo: true,
        usuarioCreadoPor: "usuario-1",
        creadoEn: new Date("2026-07-12T10:00:00.000Z"),
      },
    ],
    [
      "animal-sold-1",
      {
        id: "animal-sold-1",
        fincaId: "finca-1",
        codigo: "VV-001",
        nombre: "Vendida",
        nombreAnimal: "Vendida",
        sexo: "hembra" as const,
        sexoKey: 1 as const,
        estadoActual: "vendido" as const,
        salud: "sano" as const,
        potreroId: "potrero-norte",
        loteId: "lote-a",
        version: 1,
        activo: true,
        usuarioCreadoPor: "usuario-1",
        creadoEn: new Date("2026-07-12T10:00:00.000Z"),
      },
    ],
    [
      "animal-inactive-1",
      {
        id: "animal-inactive-1",
        fincaId: "finca-1",
        codigo: "II-001",
        nombre: "Inactiva",
        nombreAnimal: "Inactiva",
        sexo: "hembra" as const,
        sexoKey: 1 as const,
        estadoActual: "activo" as const,
        salud: "enfermo" as const,
        potreroId: "potrero-sur",
        loteId: "lote-b",
        version: 1,
        activo: false,
        usuarioCreadoPor: "usuario-1",
        creadoEn: new Date("2026-07-12T10:00:00.000Z"),
      },
    ],
    [
      "animal-1",
      {
        id: "animal-1",
        fincaId: "finca-1",
        codigo: "MT-122",
        nombre: "Matilda",
        nombreAnimal: "Matilda",
        sexo: "hembra" as const,
        sexoKey: 1 as const,
        estadoActual: "activo" as const,
        salud: "sano" as const,
        version: 1,
        activo: true,
        usuarioCreadoPor: "usuario-1",
        creadoEn: new Date("2026-07-12T10:00:00.000Z"),
      },
    ],
    [
      "animal-2",
      {
        id: "animal-2",
        fincaId: "finca-2",
        codigo: "CR-404",
        nombre: "Cross Finca",
        nombreAnimal: "Cross Finca",
        sexo: "macho" as const,
        sexoKey: 0 as const,
        estadoActual: "activo" as const,
        salud: "sano" as const,
        version: 1,
        activo: true,
        usuarioCreadoPor: "usuario-2",
        creadoEn: new Date("2026-07-12T10:00:00.000Z"),
      },
    ],
  ])
  const images = new Map<
    string,
    { id: string; esPrincipal: boolean; estadoSubida: "pendiente" | "subida" | "error" }[]
  >([["animal-1", [{ id: "image-1", esPrincipal: true, estadoSubida: "pendiente" }]]])

  return {
    animales: {
      async buscarPorCodigoYFinca(codigo, fincaId) {
        return (
          [...animals.values()].find(
            (animal) => animal.fincaId === fincaId && animal.codigo === codigo,
          ) ?? null
        )
      },
      async obtenerPorIdYFinca(animalId, fincaId) {
        const animal = animals.get(animalId)
        return animal?.fincaId === fincaId ? animal : null
      },
      async listarPorFinca(fincaId) {
        return [...animals.values()].filter((animal) => animal.fincaId === fincaId)
      },
      async guardar(animal) {
        animals.set(animal.id, {
          ...animal,
          sexoKey: animal.sexo === "hembra" ? 1 : 0,
          version: 1,
          activo: true,
          usuarioCreadoPor: "usuario-1",
          creadoEn: new Date("2026-07-12T10:00:00.000Z"),
        })
      },
      async actualizar(animalId, fincaId, cambios) {
        const animal = animals.get(animalId)
        if (animal?.fincaId === fincaId)
          animals.set(animalId, {
            ...animal,
            codigo: cambios.codigo ?? animal.codigo,
            version: animal.version + 1,
          })
      },
      async inactivar(animalId, fincaId) {
        const animal = animals.get(animalId)
        if (animal?.fincaId === fincaId) animals.set(animalId, { ...animal, activo: false })
      },
      async reactivar(animalId, fincaId, codigo) {
        const animal = animals.get(animalId)
        if (animal?.fincaId === fincaId) animals.set(animalId, { ...animal, activo: true, codigo })
      },
      async eliminarFisico(animalId, fincaId) {
        const animal = animals.get(animalId)
        if (animal?.fincaId === fincaId) animals.delete(animalId)
      },
    },
    referencias: {
      async summarize(animalId) {
        return animalId === "animal-1"
          ? { eventCount: 3, offspringCount: 0, blocksCodeChange: true }
          : { eventCount: 0, offspringCount: 0, blocksCodeChange: false }
      },
    },
    timeline: {
      async listarPagina() {
        return {
          items: Array.from({ length: 21 }, (_, index) => ({
            id: `timeline-${index}`,
            fecha: `202${index % 4}-01-01`,
            titulo: `Evento ${index}`,
          })),
          nextCursor: "cursor-2",
        }
      },
    },
    archivos: {
      async listarImagenes(animalId) {
        return images.get(animalId) ?? []
      },
      async vincularImagenPendiente(entrada) {
        const current = images.get(entrada.animalId) ?? []
        images.set(entrada.animalId, [
          ...current,
          {
            id: entrada.id,
            esPrincipal: entrada.esPrincipal,
            estadoSubida: entrada.estadoSubida,
          },
        ])
      },
    },
    colaBinarios: { async encolar() {} },
    outbox: { async append() {} },
    transacciones: {
      async run(work) {
        return work()
      },
    },
  }
}

async function testProductionRuntimeRequiresAdapters() {
  const harness = createAnimalRuntimeHarness({
    depsFactory: null,
    getSession: async () => session(),
  })
  await assert.rejects(
    () => harness.list({ fincaId: "finca-1" }),
    /Animal persistence adapters are not configured/,
  )
}

async function testServerGuards() {
  const authorized = session()
  assert.deepEqual(resolveAnimalPermissions(authorized), {
    canView: true,
    canCreate: true,
    canEdit: true,
    canInactivate: true,
    canDelete: false,
  })
  assert.deepEqual(denyAnimalRouteAccess(authorized, "finca-1", "ver"), null)
  assert.deepEqual(denyAnimalRouteAccess(authorized, "finca-2", "ver"), {
    tipo: "finca_no_autorizada",
  })
  assert.deepEqual(
    denyAnimalRouteAccess(
      session({ permisos: [{ modulo: "animales", accion: "ver" }] }),
      "finca-1",
      "crear",
    ),
    { tipo: "permiso_denegado", permiso: "animales:crear" },
  )

  const harness = createAnimalActionHarness({ deps: deps(), getSession: async () => authorized })
  assert.deepEqual(
    await harness.update({
      fincaId: "finca-2",
      animalId: "animal-1",
      cambios: { codigo: "X", versionLeida: 1 },
    }),
    { tipo: "finca_no_autorizada" },
  )
  assert.deepEqual(
    await harness.update({
      fincaId: "finca-1",
      animalId: "animal-2",
      cambios: { codigo: "X", versionLeida: 1 },
    }),
    { tipo: "animal_no_encontrado" },
  )

  const readOnlyHarness = createAnimalActionHarness({
    deps: deps(),
    getSession: async () => session({ permisos: [{ modulo: "animales", accion: "ver" }] }),
  })
  assert.deepEqual(
    await readOnlyHarness.create({
      fincaId: "finca-1",
      datos: { codigo: "N-1", nombre: "Nueva", sexoKey: 1 },
    }),
    { tipo: "permiso_denegado", permiso: "animales:crear" },
  )

  const deleteOnlyHarness = createAnimalActionHarness({
    deps: deps(),
    getSession: async () => session({ permisos: [{ modulo: "animales", accion: "eliminar" }] }),
  })
  const deleteOnlyResult = await deleteOnlyHarness.delete({
    fincaId: "finca-1",
    animalId: "animal-1",
    online: true,
  })
  assert.notDeepEqual(deleteOnlyResult, {
    tipo: "permiso_denegado",
    permiso: "animales:inactivar",
  })
}

async function testRouteViewModelsAndFlows() {
  const harness = createAnimalActionHarness({ deps: deps(), getSession: async () => session() })
  const list = await harness.list({ fincaId: "finca-1" })
  assert.equal(list.tipo, "lista")
  assert.deepEqual(
    list.animales.map((animal) => animal.codigoAnimal),
    ["AA-001", "MT-122"],
    "default list must only include active EN_FINCA animals sorted by code",
  )

  const filtered = await harness.list({
    fincaId: "finca-1",
    search: "activa",
    filters: { salud: "sano", potreroId: "potrero-norte", loteId: "lote-a" },
  })
  assert.equal(filtered.tipo, "lista")
  assert.deepEqual(
    filtered.animales.map((animal) => animal.codigoAnimal),
    ["AA-001"],
    "search and filters must match all criteria within the finca",
  )

  const created = await harness.create({
    fincaId: "finca-1",
    datos: { codigo: "NV-10", nombre: "Novilla", sexoKey: 1 },
    imagenes: [{ id: "blob-1", mimeType: "image/webp", bytes: 1000 }],
  })
  assert.equal(created.tipo, "creado")
  assert.equal(created.imagenes?.[0]?.estadoSubida, "pendiente")

  const attached = await harness.attachImage({
    fincaId: "finca-1",
    animalId: "animal-1",
    imagen: { id: "blob-2", mimeType: "image/webp", bytes: 1000 },
  })
  assert.equal(attached.tipo, "imagen_vinculada")

  assert.deepEqual(
    await harness.attachImage({
      fincaId: "finca-1",
      animalId: "animal-1",
      imagen: { id: "not-image", mimeType: "application/pdf", bytes: 1000 },
    }),
    {
      tipo: "validacion",
      errores: [{ campo: "imagenes", mensaje: "Tipo de imagen no permitido: application/pdf" }],
    },
  )

  const ficha = await harness.ficha({ fincaId: "finca-1", animalId: "animal-1" })
  assert.equal(ficha.tipo, "ficha")
  assert.equal(ficha.timeline.items.length, 21)
  assert.equal(ficha.timeline.nextCursor, "cursor-2")

  const deletion = await harness.delete({ fincaId: "finca-1", animalId: "animal-1", online: true })
  assert.deepEqual(deletion, { tipo: "inactivado", eventos: 3 })

  const model = buildAnimalRouteViewModel({
    sesion: session({ permisos: [{ modulo: "animales", accion: "ver" }] }),
    animales: list.animales,
  })
  assert.equal(model.permissions.canCreate, false)
  assert.equal(model.animales[0]?.codigoAnimal, "AA-001")
}

async function testCreateMapsSplitLocationToUbicacionInicial() {
  const ubicacionesIniciales: Array<{
    readonly potreroId?: string
    readonly sectorId?: string
    readonly loteId?: string
  }> = []
  const harness = createAnimalActionHarness({
    deps: {
      ...deps(),
      ubicaciones: {
        async registrarInicial(entrada) {
          ubicacionesIniciales.push({
            ...(entrada.potreroId !== undefined ? { potreroId: entrada.potreroId } : {}),
            ...(entrada.sectorId !== undefined ? { sectorId: entrada.sectorId } : {}),
            ...(entrada.loteId !== undefined ? { loteId: entrada.loteId } : {}),
          })
        },
      },
    },
    getSession: async () => session(),
  })
  const created = await harness.create({
    fincaId: "finca-1",
    datos: {
      codigo: "MAP-1",
      nombre: "Mapeada",
      sexoKey: 1,
      potreroId: "potrero-norte",
      sectorId: "sector-cria",
      loteId: "lote-a",
      grupoId: "grupo-hato",
    },
  })
  assert.equal(created.tipo, "creado", "create harness must return creado when all checks pass")
  assert.deepEqual(
    ubicacionesIniciales,
    [{ potreroId: "potrero-norte", sectorId: "sector-cria", loteId: "lote-a" }],
    "create harness must forward split location ids from datos into ubicacionInicial on the use case call",
  )

  const ubicacionesEnVacio: typeof ubicacionesIniciales = []
  const sinUbicacionHarness = createAnimalActionHarness({
    deps: {
      ...deps(),
      ubicaciones: {
        async registrarInicial(entrada) {
          ubicacionesEnVacio.push({
            ...(entrada.potreroId !== undefined ? { potreroId: entrada.potreroId } : {}),
            ...(entrada.sectorId !== undefined ? { sectorId: entrada.sectorId } : {}),
            ...(entrada.loteId !== undefined ? { loteId: entrada.loteId } : {}),
          })
        },
      },
    },
    getSession: async () => session(),
  })
  const sinUbicacion = await sinUbicacionHarness.create({
    fincaId: "finca-1",
    datos: { codigo: "MAP-2", nombre: "Sin Ubicacion", sexoKey: 1 },
  })
  assert.equal(
    sinUbicacion.tipo,
    "creado",
    "create harness must still create when no location ids are provided",
  )
  assert.deepEqual(
    ubicacionesEnVacio,
    [],
    "create harness must not call ubicaciones.registrarInicial when no split location ids are provided",
  )
}

async function testRouteFormPayloadBuilders() {
  const createForm = new FormData()
  createForm.set("codigo", " NV-42 ")
  createForm.set("nombre", " Novilla 42 ")
  createForm.set("sexoKey", "0")
  createForm.set("potreroId", "potrero-norte")
  createForm.set("sectorId", "sector-cria")
  createForm.set("loteId", "lote-a")
  createForm.set("grupoId", "grupo-hato")
  assert.deepEqual(buildCreateAnimalInputFromFormData("finca-1", createForm), {
    fincaId: "finca-1",
    datos: {
      codigo: "NV-42",
      nombre: "Novilla 42",
      sexoKey: 0,
      potreroId: "potrero-norte",
      sectorId: "sector-cria",
      loteId: "lote-a",
      grupoId: "grupo-hato",
    },
  })

  const updateForm = new FormData()
  updateForm.set("codigo", " MT-999 ")
  updateForm.set("versionLeida", "7")
  assert.deepEqual(buildUpdateAnimalInputFromFormData("finca-1", "animal-1", updateForm), {
    fincaId: "finca-1",
    animalId: "animal-1",
    cambios: { codigo: "MT-999", versionLeida: 7 },
  })
}

async function testRouteFilesWireUiAndActions() {
  const files = [
    "animales.tsx",
    join("animales", "nuevo.tsx"),
    join("animales", "$animalId.tsx"),
    join("animales", "$animalId", "editar.tsx"),
    join("animales", "$animalId", "imagenes.tsx"),
  ]
  const sources = await Promise.all(files.map((file) => readFile(join(ROUTES_DIR, file), "utf8")))
  const all = sources.join("\n")
  const createRoute = sources[1] ?? ""
  const editRoute = sources[3] ?? ""
  assert.ok(all.includes("AnimalDesktopScreen"), "list route must compose PR3 desktop UI")
  assert.ok(all.includes("AnimalListMobile"), "list route must compose PR3 mobile UI")
  assert.ok(all.includes("AnimalFormScreen"), "create/edit routes must compose PR3 form UI")
  assert.ok(
    createRoute.includes('formVariant="create"'),
    "create route must render the form with create-mode location semantics",
  )
  assert.ok(
    editRoute.includes('formVariant="edit"'),
    "edit route must render the form with edit-mode location semantics",
  )
  assert.ok(
    editRoute.includes("currentLocation"),
    "edit route must pass read-only current location context into AnimalFormScreen",
  )
  assert.ok(all.includes("AnimalFichaDesktopScreen"), "ficha route must compose PR3 ficha UI")
  assert.ok(all.includes("AnimalFichaMobileScreen"), "ficha route must compose PR3 mobile ficha UI")
  assert.ok(all.includes("listAnimalsAction"), "routes must use server actions/loaders")
  assert.ok(all.includes("createAnimalAction"), "create route must use server action")
  assert.ok(!all.includes('codigo: "TEMP"'), "create route must not submit a hard-coded code")
  assert.ok(
    !all.includes('nombre: "Nuevo animal"'),
    "create route must not submit a hard-coded name",
  )
  assert.ok(all.includes("deleteAnimalAction"), "ficha route must expose delete/inactivate action")
  assert.ok(all.includes("reactivateAnimalAction"), "ficha route must expose reactivate action")
  assert.ok(!all.includes('method="get"'), "destructive animal actions must not use GET forms")
  assert.ok(!all.includes('search.get("delete")'), "ficha loader must not mutate from query params")
  assert.ok(
    !all.includes('search.get("codigo")'),
    "create loader must not mutate from query params",
  )
  assert.ok(!all.includes("onMouseDown"), "delete/inactivate must use one clear mutation trigger")
  assert.ok(!all.includes("addEventListener"), "create form must not duplicate click interception")
  assert.ok(!all.includes("onClickCapture"), "create form must not intercept save clicks")
  assert.ok(
    !all.includes('closest("button")'),
    "create form must not locate submit buttons through DOM traversal",
  )
  assert.ok(
    !all.includes("textContent?.trim()"),
    "create form must not identify submit by visible button text",
  )
  assert.ok(
    !all.includes("onMarkPrincipal={() => {}}"),
    "image controls must not expose no-op actions",
  )
  assert.ok(!all.includes("onUnlink={() => {}}"), "image controls must not expose no-op actions")
  assert.ok(
    all.includes("attachAnimalImageAction"),
    "image route must expose an image attach action",
  )

  const shell = await readFile(join(WEB_ROOT, "src", "routes", "_app.tsx"), "utf8")
  assert.ok(
    shell.includes("fincaActivaId") && shell.includes("/fincas/") && shell.includes("/animales"),
    "app shell must route Animales navigation through the active finca scoped path",
  )
  assert.ok(
    shell.includes('return "animales"'),
    "active navigation mapping must highlight Animales for finca-scoped animal paths",
  )
}

async function testCreateRouteWiresCatalogOptions() {
  const createRoute = await readFile(join(ROUTES_DIR, "animales", "nuevo.tsx"), "utf8")
  assert.ok(
    createRoute.includes("catalogOptions"),
    "create route must pass catalogOptions into AnimalFormScreen so origen and split location selectors are not empty",
  )
  assert.ok(
    createRoute.includes("origen") &&
      createRoute.includes("potrero") &&
      createRoute.includes("sector") &&
      createRoute.includes("lote") &&
      createRoute.includes("grupo"),
    "create route must provide origin and all four split location catalog keys",
  )
  assert.ok(
    !createRoute.includes("catalogOptions={undefined}"),
    "create route must not pass an undefined catalogOptions prop",
  )
}

async function testE2eFixtureRequiresSafeRuntimeGuard() {
  const source = await readFile(
    join(WEB_ROOT, "src", "server", "e2e-animals-fixture.server.ts"),
    "utf8",
  )
  assert.ok(source.includes("isSafeAnimalE2eRuntime"), "fixture gate must include runtime guard")
  assert.ok(
    source.includes("NODE_ENV") && source.includes("CI") && source.includes("VITEST"),
    "fixture mode must only enable in local/test runtimes, not deployed production",
  )
}

async function testActionForwardsValidacionErrores() {
  // Behavioral anchor: the harness's create() returns the verbatim validacion shape
  // (including `errores`). The web handler must forward that shape unchanged.
  const harness = createAnimalActionHarness({ deps: deps(), getSession: async () => session() })
  // animal-1 has codigo "MT-122" — duplicate triggers validacion in the dominio use case
  const validacionResult = await harness.create({
    fincaId: "finca-1",
    datos: { codigo: "MT-122", nombre: "Duplicada", sexoKey: 1 },
  })
  assert.equal(validacionResult.tipo, "validacion")
  assert.ok(
    Array.isArray(validacionResult.errores),
    "harness validacion arm must carry an errores array for the action to forward",
  )
  assert.ok(
    validacionResult.errores.some((e) => e.campo === "codigo"),
    "duplicate codigo must surface a codigo error so the create route can map it to fieldErrors",
  )

  // Source-level pin: the createAnimalAction handler at animal-actions.ts must return
  // the full harness result, not a narrowed `{ tipo: result.tipo }` shape that would
  // drop the errores array before the route can read it.
  const actionSource = await readFile(
    join(WEB_ROOT, "src", "server", "animal-actions.ts"),
    "utf8",
  )
  assert.ok(
    !actionSource.includes("return { tipo: result.tipo }"),
    "createAnimalAction must not narrow the harness result — it drops the errores field",
  )
  assert.ok(
    /return\s+result\s*$/m.test(actionSource),
    "createAnimalAction must return the full harness result on the non-e2e path",
  )
  assert.ok(
    actionSource.includes("createAnimalAction"),
    "createAnimalAction export name must stay — the web route imports it by string",
  )
}

async function testActionE2eFastPathReturnsCreatedOnly() {
  // Source-level pin: the e2e fast-path (when isAnimalE2eEnabled() is true) must return
  // exactly { tipo: "creado" as const } with no errores key, so the e2e path is never
  // confused with a validacion result.
  const actionSource = await readFile(
    join(WEB_ROOT, "src", "server", "animal-actions.ts"),
    "utf8",
  )
  assert.ok(
    actionSource.includes('return { tipo: "creado" as const }'),
    'e2e fast-path must return exactly { tipo: "creado" as const } with no errores key',
  )
  // The fast-path early return must live above the harness return so the harness path
  // cannot shadow it after the fix.
  const fastReturnIndex = actionSource.indexOf('return { tipo: "creado" as const }')
  const harnessReturnIndex = actionSource.indexOf("return result")
  assert.ok(
    fastReturnIndex > 0 && harnessReturnIndex > 0 && fastReturnIndex < harnessReturnIndex,
    "e2e fast-path early return must be ordered before the harness-path return so the fix does not regress it",
  )
}

async function testRouteBranchesOnResultTipo() {
  const createRoute = await readFile(join(ROUTES_DIR, "animales", "nuevo.tsx"), "utf8")

  // 2.1: creado must navigate to the finca-scoped animales list.
  // The previous try/finally/assign was the bug — it navigated unconditionally.
  assert.ok(
    !/}\s*finally\s*\{[\s\S]*window\.location\.assign/m.test(createRoute),
    "create route must not wrap the action in a try/finally/assign — it navigated on validacion and thrown errors too",
  )
  assert.ok(
    /window\.location\.assign\(`\/fincas\/\$\{fincaId\}\/animales`\)/.test(createRoute),
    "creado result must navigate to /fincas/{fincaId}/animales (not on validacion or thrown errors)",
  )
  assert.ok(
    /result\.tipo\s*===\s*"creado"/.test(createRoute),
    "create route must branch on result.tipo === 'creado' before navigating",
  )
  // The navigate call must live after the creado check, so the JSX guard ordering is
  // preserved.
  const tipoCheck = createRoute.indexOf('result.tipo === "creado"')
  const navigateCall = createRoute.indexOf("window.location.assign")
  assert.ok(
    tipoCheck > 0 && navigateCall > 0 && tipoCheck < navigateCall,
    "navigate call must be ordered after the creado check so validacion and thrown errors do not redirect",
  )

  // 2.2: validacion must NOT navigate and must pass fieldErrors to AnimalFormScreen.
  assert.ok(
    /useState<Record<string,\s*string>>/.test(createRoute) ||
      /useState\(\{\}\)/.test(createRoute) ||
      /useState<Record<string,\s*string>\(/.test(createRoute) ||
      /useState\(/.test(createRoute),
    "create route must hold fieldErrors in useState so values survive the rerender on validacion",
  )
  // The route must read the errores array off the validacion result and pass it through
  // the mapper. The mapper is the local buildCreateAnimalFieldErrors helper exported
  // below; the route just feeds the errores into it.
  assert.ok(
    /buildCreateAnimalFieldErrors\(/.test(createRoute),
    "create route must use the buildCreateAnimalFieldErrors mapper to translate errores to fieldErrors",
  )
  // fieldErrors must be threaded into BOTH the desktop and mobile <AnimalFormScreen>
  // renders — a single render leaves the other mode blind to validation feedback.
  const formScreenMatches = createRoute.match(/<AnimalFormScreen\b/g) ?? []
  assert.ok(
    formScreenMatches.length >= 2,
    "create route must render AnimalFormScreen in both desktop and mobile layouts (found <2)",
  )
  // After the validacion branch sets fieldErrors, the two renders must each receive
  // it as a prop. We assert that `fieldErrors=` appears at least twice.
  const fieldErrorsPropMatches = createRoute.match(/fieldErrors=/g) ?? []
  assert.ok(
    fieldErrorsPropMatches.length >= 2,
    "create route must pass fieldErrors to both <AnimalFormScreen> renders (found <2)",
  )

  // 2.3: thrown errors must NOT navigate and must NOT produce a field error.
  // The fix removes the unconditional finally-block navigation; the action call is
  // awaited inside a try/catch that swallows the rejection and leaves fieldErrors
  // untouched (banner is out of scope per design.md).
  assert.ok(
    /catch\s*\{/.test(createRoute) || /catch\s*\(\s*_/.test(createRoute) || /catch\s*\(\s*\)/.test(createRoute),
    "create route must catch the action rejection so a thrown error keeps the form mounted and does not navigate",
  )
  // After the catch, there must be no window.location.assign before the catch's closing
  // brace. A simple proxy: count the number of window.location.assign calls in the
  // route — exactly one, inside the creado branch.
  const assignCalls = createRoute.match(/window\.location\.assign\(/g) ?? []
  assert.equal(
    assignCalls.length,
    1,
    "create route must call window.location.assign exactly once — inside the creado branch only",
  )
}

async function testMapperBuildsFieldErrorsAndDropsFechaCompra() {
  // Import the mapper directly. It is the route boundary that translates the
  // dominio's ErrorValidacionAnimal[] into the UI's Record<string, string>.
  const { buildCreateAnimalFieldErrors } = await import(
    "../src/routes/_app/fincas/$fincaId/animales/nuevo.js"
  )

  // 2.4 spec line 34: sexo_key → sexoKey; fecha_compra has no form field and is
  // dropped silently per spec line 32 (design R1 follow-up).
  const mapped = buildCreateAnimalFieldErrors([
    { campo: "sexo_key", regla: "CA-CRE-001", detalle: "El sexo es obligatorio." },
    { campo: "fecha_compra", regla: "CA-CRE-002", detalle: "La compra requiere fecha de compra." },
  ])
  assert.deepEqual(mapped, {
    sexoKey: "El sexo es obligatorio.",
  })
  assert.ok(
    !("fechaCompra" in mapped),
    "fecha_compra must be dropped because no fechaCompra form field exists (design R1 follow-up)",
  )

  // All other spec line 34 mappings round-trip.
  const allMapped = buildCreateAnimalFieldErrors([
    { campo: "codigo", regla: "CA-CRE-001", detalle: "Requerido" },
    { campo: "nombre", regla: "CA-CRE-001", detalle: "Requerido" },
    { campo: "fecha_nacimiento", regla: "CA-CRE-002", detalle: "Requerido" },
    { campo: "madre_id", regla: "CA-CRE-003", detalle: "Madre inválida" },
    { campo: "padre_id", regla: "CA-CRE-004", detalle: "Padre inválido" },
  ])
  assert.deepEqual(allMapped, {
    codigo: "Requerido",
    nombre: "Requerido",
    fechaNacimiento: "Requerido",
    madre: "Madre inválida",
    padre: "Padre inválido",
  })

  // First error wins per field (later duplicates are ignored) so the user sees the
  // first message the use case raised.
  const firstWins = buildCreateAnimalFieldErrors([
    { campo: "codigo", regla: "CA-CRE-001", detalle: "Primero" },
    { campo: "codigo", regla: "CA-CRE-001", detalle: "Segundo" },
  ])
  assert.deepEqual(firstWins, { codigo: "Primero" })

  // Local Array.isArray guard (design R2): non-array inputs return {}.
  assert.deepEqual(buildCreateAnimalFieldErrors(undefined), {})
  assert.deepEqual(buildCreateAnimalFieldErrors(null), {})
  assert.deepEqual(buildCreateAnimalFieldErrors("errores"), {})
  assert.deepEqual(buildCreateAnimalFieldErrors({ campo: "codigo" }), {})
  assert.deepEqual(buildCreateAnimalFieldErrors([]), {})

  // Items with missing or wrong-typed fields are skipped, not coerced.
  const mixed = buildCreateAnimalFieldErrors([
    null,
    { campo: "codigo", detalle: "OK" },
    { campo: 123, detalle: "x" },
    { campo: "codigo" },
    "string item",
    { campo: "sexo_key", regla: "CA-CRE-001", detalle: "Sexo requerido" },
  ])
  assert.deepEqual(mixed, {
    codigo: "OK",
    sexoKey: "Sexo requerido",
  })
}

async function run() {
  await testProductionRuntimeRequiresAdapters()
  await testServerGuards()
  await testRouteViewModelsAndFlows()
  await testCreateMapsSplitLocationToUbicacionInicial()
  await testRouteFormPayloadBuilders()
  await testRouteFilesWireUiAndActions()
  await testCreateRouteWiresCatalogOptions()
  await testE2eFixtureRequiresSafeRuntimeGuard()
  await testActionForwardsValidacionErrores()
  await testActionE2eFastPathReturnsCreatedOnly()
  await testRouteBranchesOnResultTipo()
  await testMapperBuildsFieldErrorsAndDropsFechaCompra()
  // biome-ignore lint/suspicious/noConsole: focused harness progress output
  console.log("✅ animal-web-flow.test.ts passed")
}

await run()
