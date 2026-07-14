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

async function run() {
  await testProductionRuntimeRequiresAdapters()
  await testServerGuards()
  await testRouteViewModelsAndFlows()
  await testCreateMapsSplitLocationToUbicacionInicial()
  await testRouteFormPayloadBuilders()
  await testRouteFilesWireUiAndActions()
  await testCreateRouteWiresCatalogOptions()
  await testE2eFixtureRequiresSafeRuntimeGuard()
  // biome-ignore lint/suspicious/noConsole: focused harness progress output
  console.log("✅ animal-web-flow.test.ts passed")
}

await run()
