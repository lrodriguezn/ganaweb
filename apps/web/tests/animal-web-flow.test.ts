import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { AnimalUseCaseDeps, CatalogoGlobalPort, SesionAutorizada } from "@ganaweb/aplicacion"
import { buildUpdateAnimalInputFromFormData } from "../src/routes/_app/fincas/$fincaId/animales/$animalId/editar.js"
import { buildCreateAnimalInputFromFormData } from "../src/routes/_app/fincas/$fincaId/animales/nuevo.js"
import {
  buildAnimalRouteViewModel,
  createAnimalActionHarness,
  createAnimalRuntimeHarness,
  denyAnimalRouteAccess,
  resolveAnimalPermissions,
} from "../src/server/animal-actions.server.js"
import { isAnimalE2eEnabled } from "../src/server/e2e-animals-fixture.server.js"

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

async function testCreatePreservesFechaCompra() {
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

  // PR 2b (v1.3 — spec line 50): the v1.0 schema dropped fechaCompra from the
  // create form (CA-CRE-002 used to surface as a generic `fecha_compra` error
  // that the form had no input for). v1.3 brings it back: when `origen ===
  // "comprado"` the form submits fechaCompra and the harness must forward it
  // to the dominio so `validarOrigen` accepts the create.
  const fechaCompraInvalido = await sinUbicacionHarness.create({
    fincaId: "finca-1",
    datos: {
      codigo: "MAP-3",
      nombre: "Sin fecha de compra",
      sexoKey: 1,
      origen: "comprado",
    },
  })
  assert.equal(
    fechaCompraInvalido.tipo,
    "validacion",
    "create harness must surface validacion when origen=comprado and fechaCompra is missing — the field must reach validarOrigen",
  )
  assert.ok(
    fechaCompraInvalido.tipo === "validacion" &&
      fechaCompraInvalido.errores.some((e) => e.campo === "fecha_compra"),
    "validacion errores must include fecha_compra so the mapper can route it back to the v1.3 fechaCompra form field",
  )

  const fechaCompraValido = await sinUbicacionHarness.create({
    fincaId: "finca-1",
    datos: {
      codigo: "MAP-4",
      nombre: "Con fecha de compra",
      sexoKey: 1,
      origen: "comprado",
      fechaCompra: "2025-03-15",
    },
  })
  assert.equal(
    fechaCompraValido.tipo,
    "creado",
    "create harness must succeed when origen=comprado and fechaCompra is provided — the field is preserved end-to-end",
  )
}

async function testCreateRejectsCrossFincaUbicaciones() {
  const fincas = new Map([
    ["finca-1", new Set(["potrero-norte", "sector-cria", "lote-a", "grupo-hato"])],
    ["finca-2", new Set(["potrero-otro", "sector-otro", "lote-otro", "grupo-otro"])],
  ])
  const verificar = async (entrada: { fincaId: string; [k: string]: string | undefined }) => {
    const ok = fincas.get(entrada.fincaId) ?? new Set<string>()
    const out: { campo: string; regla: string; detalle: string }[] = []
    for (const [k, campo, nombre] of ([["potreroId", "potrero_id", "potrero"], ["sectorId", "sector_id", "sector"], ["loteId", "lote_id", "lote"], ["grupoId", "grupo_id", "grupo"]] as const)) {
      const id = entrada[k]
      if (typeof id === "string" && !ok.has(id)) {
        out.push({ campo, regla: "CA-CRE-008", detalle: `La ubicación (${nombre}) no pertenece a la finca activa.` })
      }
    }
    return out
  }
  const harness = createAnimalActionHarness({
    deps: { ...deps(), ubicaciones: { async registrarInicial() {}, verificarPropiedadEnFinca: verificar } },
    getSession: async () => session(),
  })
  const bundle = (codigo: string, mismoFinca: boolean, grupoId?: string) => ({
    fincaId: "finca-1" as const,
    datos: {
      codigo, nombre: codigo, sexoKey: 1 as const,
      potreroId: mismoFinca ? "potrero-norte" : "potrero-otro",
      sectorId: mismoFinca ? "sector-cria" : "sector-otro",
      loteId: mismoFinca ? "lote-a" : "lote-otro",
      grupoId: grupoId ?? (mismoFinca ? "grupo-hato" : "grupo-otro"),
    },
  })
  const mismo = await harness.create(bundle("CR-OK", true))
  assert.equal(mismo.tipo, "creado", "same-finca bundle must reach creado (CA-CRE-008 silent)")
  const cross = await harness.create(bundle("CR-X", false))
  assert.equal(cross.tipo, "validacion", "all-cross-finca must return validacion with 4 CA-CRE-008 errors")
  assert.ok(cross.tipo === "validacion" && cross.errores.filter((e) => e.regla === "CA-CRE-008").length === 4, "cross-finca must surface one CA-CRE-008 error per split-location id")
  const parcial = await harness.create(bundle("CR-P", true, "grupo-otro"))
  assert.equal(parcial.tipo, "validacion", "partial (only grupoId cross-finca) must surface exactly one error")
  assert.ok(parcial.tipo === "validacion" && parcial.errores.length === 1 && parcial.errores[0]?.campo === "grupo_id", "partial cross-finca must surface exactly one CA-CRE-008 error for the offending grupoId")
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
      // v1.3 spec (BUG-001..BUG-004): the route mapper surfaces the
      // raw FormData string so the lower-level action harness can
      // revalidate it against the sexo catalog. The action harness
      // narrows it to `0 | 1 | 2` (testActionHarnessRevalidatesSexoKey
      // exercises the path).
      sexoKey: "0",
      potreroId: "potrero-norte",
      sectorId: "sector-cria",
      loteId: "lote-a",
      grupoId: "grupo-hato",
    },
  })

  // PR 2b (CA-UPD-001): the edit form submits the same 11 v1.3 keys as the
  // create form (minus `codigo` which is immutable when the animal has
  // events, per spec §5). The update mapper MUST read each one into the
  // `cambios` object so the dominio can later consume the subset it knows
  // about (per animal-actions.server.ts:170 — the harness picks a subset
  // for the dominio; the rest of the keys are kept in the web contract
  // for form-to-datos symmetry, just like the create route).
  const updateForm = new FormData()
  updateForm.set("codigo", " MT-999 ")
  updateForm.set("versionLeida", "7")
  updateForm.set("origen", "nacido_en_finca")
  updateForm.set("fechaNacimiento", "2024-03-15")
  updateForm.set("fechaCompra", "")
  updateForm.set("raza", "raza-angus")
  updateForm.set("color", "color-negro")
  updateForm.set("calidad", "calidad-extra")
  updateForm.set("lugarCompra", "lugar-feria-manizales")
  updateForm.set("madreId", "animal-mt-100")
  updateForm.set("padreId", "animal-toro-1")
  updateForm.set("precioCompra", "")
  updateForm.set("pesoCompra", "")
  const updateResult = buildUpdateAnimalInputFromFormData("finca-1", "animal-1", updateForm)
  assert.equal(updateResult.fincaId, "finca-1", "update result carries fincaId unchanged")
  assert.equal(updateResult.animalId, "animal-1", "update result carries animalId unchanged")
  assert.equal(updateResult.cambios.codigo, "MT-999", "update mapper must read codigo")
  assert.equal(
    updateResult.cambios.versionLeida,
    7,
    "update mapper must parse versionLeida as number",
  )
  assert.equal(
    updateResult.cambios.origen,
    "nacido_en_finca",
    "update mapper must read the v1.3 origen pill value",
  )
  assert.equal(
    updateResult.cambios.fechaNacimiento,
    "2024-03-15",
    "update mapper must read fechaNacimiento",
  )
  assert.equal(
    updateResult.cambios.razaId,
    "raza-angus",
    "update mapper must translate the 'raza' form key to razaId in cambios",
  )
  assert.equal(
    updateResult.cambios.colorId,
    "color-negro",
    "update mapper must translate the 'color' form key to colorId in cambios",
  )
  assert.equal(
    updateResult.cambios.calidadId,
    "calidad-extra",
    "update mapper must translate the 'calidad' form key to calidadId in cambios",
  )
  assert.equal(
    updateResult.cambios.lugarCompraId,
    "lugar-feria-manizales",
    "update mapper must translate the 'lugarCompra' form key to lugarCompraId in cambios",
  )
  assert.equal(updateResult.cambios.madreId, "animal-mt-100", "update mapper must read madreId")
  assert.equal(updateResult.cambios.padreId, "animal-toro-1", "update mapper must read padreId")
  // Empty fechaCompra / precioCompra / pesoCompra are dropped from cambios
  // (the form's CA-UI-007 toggle may have mounted the comprado block but
  // left the inputs blank — those must not travel to the harness).
  assert.ok(
    !("fechaCompra" in updateResult.cambios),
    "update mapper must drop empty fechaCompra from cambios",
  )
  assert.ok(
    !("precioCompra" in updateResult.cambios),
    "update mapper must drop empty precioCompra from cambios",
  )
  assert.ok(
    !("pesoCompra" in updateResult.cambios),
    "update mapper must drop empty pesoCompra from cambios",
  )

  // A minimal update (only codigo + versionLeida) still works — the mapper
  // is backwards-compatible with the v1.0 two-field contract.
  const minimalUpdate = new FormData()
  minimalUpdate.set("codigo", "MT-122")
  minimalUpdate.set("versionLeida", "1")
  const minimalResult = buildUpdateAnimalInputFromFormData("finca-1", "animal-1", minimalUpdate)
  assert.deepEqual(minimalResult.cambios, { codigo: "MT-122", versionLeida: 1 })
}

async function testCreateRouteNormalizesEsCOCompraNumerics() {
  // v1.3 spec §3.5: precio_compra and peso_compra accept es-CO formatting
  // (`.` thousand, `,` decimal). The form submits the raw string; the
  // route mapper MUST normalize to a JavaScript number so the dominio
  // use case receives a typed value (AnimalFormScreen applies the same
  // Intl.NumberFormat("es-CO") round-trip for display, but FormData
  // carries the raw user input).
  const form = new FormData()
  form.set("codigo", "CP-1")
  form.set("nombre", "Comprada 1")
  form.set("sexoKey", "1")
  form.set("origen", "comprado")
  form.set("precioCompra", "1.500,75")
  form.set("pesoCompra", "450,30")
  const result = buildCreateAnimalInputFromFormData("finca-1", form)
  assert.equal(result.datos.precioCompra, 1500.75, "precioCompra must be 1500.75 after es-CO parse")
  assert.equal(result.datos.pesoCompra, 450.3, "pesoCompra must be 450.30 after es-CO parse")

  // Round-trip identity: the display formatter should reproduce the same
  // string the user typed, so the form can rehydrate the field on blur.
  const displayFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 })
  assert.equal(
    displayFormatter.format(1500.75),
    "1.500,75",
    "Intl.NumberFormat('es-CO') round-trip must reproduce the user's input verbatim",
  )
  assert.equal(
    displayFormatter.format(450.3),
    "450,3",
    "Intl.NumberFormat('es-CO') round-trip must produce 450,3 for 450.3 (single decimal, no trailing zero)",
  )

  // Empty / whitespace / zero inputs must NOT produce NaN or throw.
  const empty = new FormData()
  empty.set("codigo", "CP-2")
  empty.set("nombre", "Comprada 2")
  empty.set("sexoKey", "1")
  const emptyResult = buildCreateAnimalInputFromFormData("finca-1", empty)
  assert.equal(
    emptyResult.datos.precioCompra,
    undefined,
    "missing precioCompra must be undefined, not NaN",
  )
  assert.equal(
    emptyResult.datos.pesoCompra,
    undefined,
    "missing pesoCompra must be undefined, not NaN",
  )
}

async function testEditRouteMapperNormalizesEsCOCompraNumerics() {
  // v1.3 spec §3.5: precio_compra and peso_compra accept es-CO formatting
  // in BOTH the create and edit routes. The update mapper MUST apply the
  // same es-CO parser so an animal being edited (origen=comprado, the
  // user typed a fresh price after a peso change) round-trips correctly
  // through the dominio. The PR 2a contract treats the form's raw string
  // identically in create and edit; PR 2b extends the update mapper to
  // share the parser.
  const form = new FormData()
  form.set("codigo", "ED-1")
  form.set("versionLeida", "3")
  form.set("origen", "comprado")
  form.set("precioCompra", "1.500,75")
  form.set("pesoCompra", "450,30")
  const result = buildUpdateAnimalInputFromFormData("finca-1", "animal-1", form)
  assert.equal(
    result.cambios.precioCompra,
    1500.75,
    "update mapper must parse precioCompra from es-CO string to 1500.75",
  )
  assert.equal(
    result.cambios.pesoCompra,
    450.3,
    "update mapper must parse pesoCompra from es-CO string to 450.3",
  )

  // Empty inputs must NOT produce NaN or throw on the update path.
  const empty = new FormData()
  empty.set("codigo", "ED-2")
  empty.set("versionLeida", "1")
  empty.set("origen", "comprado")
  const emptyResult = buildUpdateAnimalInputFromFormData("finca-1", "animal-1", empty)
  assert.equal(
    emptyResult.cambios.precioCompra,
    undefined,
    "missing precioCompra on update must be undefined, not NaN",
  )
  assert.equal(
    emptyResult.cambios.pesoCompra,
    undefined,
    "missing pesoCompra on update must be undefined, not NaN",
  )

  // The shared helper (es-co-number.ts) is the single source of truth for
  // the parser — a source-level pin prevents the create and edit routes
  // from drifting (PR 1, design.md R2: dominio has zero deps; the web
  // layer owns its own lib). The path depth differs by one segment
  // (edit route is one level deeper), so we use a regex that accepts
  // either depth.
  const editRoute = await readFile(join(ROUTES_DIR, "animales", "$animalId", "editar.tsx"), "utf8")
  const createRoute = await readFile(join(ROUTES_DIR, "animales", "nuevo.tsx"), "utf8")
  const sharedImportPattern = /from\s+"\.\.(\/\.\.)+\/lib\/parsers\/es-co-number\.js"/
  assert.ok(
    sharedImportPattern.test(editRoute),
    "edit route must import the shared es-CO parser so the update mapper shares the create route's semantics",
  )
  assert.ok(
    !editRoute.includes("function parseEsCONumber("),
    "edit route must not declare its own parseEsCONumber — the shared helper is the single source of truth",
  )
  assert.ok(
    sharedImportPattern.test(createRoute),
    "create route must import the shared es-CO parser (the inline duplicate was extracted in PR 2b)",
  )
  assert.ok(
    !createRoute.includes("function parseEsCONumber("),
    "create route must not declare its own parseEsCONumber — the shared helper is the single source of truth",
  )
}

async function testEditRoutePassesInitialValuesToForm() {
  // v1.3 spec §5 (CA-UPD-001): the edit form must pre-populate the
  // 11 v1.3 fields from the current animal so the user does not retype
  // them. The route carries the values to <AnimalFormScreen> via the
  // `initialValues` prop; without the loader wiring, the form would
  // render with empty inputs and the user would have to retype every
  // field on each save — a regression from the v1.0 two-field contract.
  const editRoute = await readFile(join(ROUTES_DIR, "animales", "$animalId", "editar.tsx"), "utf8")
  const editRouteModule = await import(
    "../src/routes/_app/fincas/$fincaId/animales/$animalId/editar.js"
  )

  // Source-level pin: the route must wire `initialValues` to BOTH the
  // desktop and mobile <AnimalFormScreen> renders. Mirrors the
  // `fieldErrors` wiring in testRouteBranchesOnResultTipo.
  const initialValuesMatches = editRoute.match(/initialValues=/g) ?? []
  assert.ok(
    initialValuesMatches.length >= 2,
    `edit route must pass initialValues to both <AnimalFormScreen> renders (found ${initialValuesMatches.length})`,
  )

  // The route must call a fetcher (loader or a server function like
  // `getAnimalFichaAction`) that returns the current animal's data shape.
  // Source-level pin: any of the accepted patterns is fine, as long as
  // the loader's return value is threaded into the form.
  const usesLoader =
    /loader\s*:\s*async\s*\(/.test(editRoute) || /loader\s*:\s*async\s*\{/.test(editRoute)
  const usesGetFicha = editRoute.includes("getAnimalFichaAction")
  assert.ok(
    usesLoader || usesGetFicha,
    "edit route must declare a loader or call getAnimalFichaAction so initialValues is sourced from the current animal, not a hard-coded demo object",
  )

  // currentLocation must also be wired (CA-UPD-001: location is read-only
  // with a "Mover animal" link). The current code passes an empty
  // `{}`; the loader wiring should replace it with a real location.
  assert.ok(
    /currentLocation=\{[^}]+\}/.test(editRoute) ||
      /currentLocation=\{currentLocation\}/.test(editRoute),
    "edit route must pass a non-empty currentLocation object so the read-only location block renders the real values",
  )
  // The route must not pass an empty literal `currentLocation={{}}`
  // because that regresses the read-only location to a blank card.
  assert.ok(
    !/currentLocation=\{\{\}\}/.test(editRoute),
    "edit route must not pass an empty currentLocation={{}} — the loader must source the real values",
  )

  // The 11 v1.3 keys must appear somewhere in the edit route's loader
  // return value (or in a `mapAnimalToInitialValues` helper it imports).
  // We assert the keys are present in the form props (the loader's return
  // shape matches `AnimalFormInitialValues`).
  for (const key of [
    "origen",
    "fechaNacimiento",
    "razaId",
    "colorId",
    "calidadId",
    "lugarCompraId",
    "madreId",
    "padreId",
  ]) {
    assert.ok(
      editRoute.includes(key) || editRouteModule.mapAnimalFichaToInitialValues !== undefined,
      `edit route's loader/initialValues wiring must include the v1.3 key '${key}'`,
    )
  }

  // canCreateCatalog must be threaded to both screens (the v1.3 + Crear
  // affordance gates on this flag per CA-UI-002).
  const canCreateCatalogMatches = editRoute.match(/canCreateCatalog/g) ?? []
  assert.ok(
    canCreateCatalogMatches.length >= 2,
    `edit route must pass canCreateCatalog to both <AnimalFormScreen> renders (found ${canCreateCatalogMatches.length})`,
  )

  // catalogOptions must be threaded to both screens.
  const catalogOptionsMatches = editRoute.match(/catalogOptions/g) ?? []
  assert.ok(
    catalogOptionsMatches.length >= 2,
    `edit route must pass catalogOptions to both <AnimalFormScreen> renders (found ${catalogOptionsMatches.length})`,
  )
}

async function testCreatePersistsDatesRoundTripIntoEditLoader() {
  const editModule = await import("../src/routes/_app/fincas/$fincaId/animales/$animalId/editar.js")
  // The catalog is the only port the revalidation path uses.
  const catalogoSexo: CatalogoGlobalPort = {
    async listarActivos() {
      return [
        { id: "sexo-macho", key: "Macho", value: "0" },
        { id: "sexo-hembra", key: "Hembra", value: "1" },
        { id: "sexo-pajuela", key: "Pajuela", value: "2" },
      ]
    },
  }
  const harness = createAnimalActionHarness({ deps: deps(), getSession: async () => session(), catalogoSexo })

  // String non-canonical sexoKey: lower-level revalidation surfaces
  // validacion instead of throwing the previous defensive error.
  const stringSexo = await harness.create({
    fincaId: "finca-1",
    datos: { codigo: "RT-001", nombre: "Persistente", sexoKey: "9", origen: "comprado", fechaNacimiento: "2026-07-10", fechaCompra: "2026-07-15" },
  })
  assert.equal(stringSexo.tipo, "validacion", "string non-canonical sexoKey must return validacion from the lower-level action harness")
  assert.ok(
    stringSexo.tipo === "validacion" && stringSexo.errores.some((e) => e.campo === "sexo_key"),
    "validacion errores must include campo: 'sexo_key'",
  )

  // Numeric sexoKey: 1 (happy path): create succeeds, dates round-trip
  // into the edit loader, the new animalId is recorded in the store.
  const creado = await harness.create({
    fincaId: "finca-1",
    datos: { codigo: "RT-002", nombre: "Numerica", sexoKey: 1, origen: "comprado", fechaNacimiento: "2026-07-10", fechaCompra: "2026-07-15" },
  })
  assert.equal(creado.tipo, "creado", "numeric sexoKey: 1 must reach creado (happy path)")
  if (creado.tipo !== "creado") return
  const ficha = await harness.ficha({ fincaId: "finca-1", animalId: creado.animalId })
  if (ficha.tipo !== "ficha") throw new Error("ficha must be available")
  const loader = editModule.mapAnimalFichaToLoaderData(ficha)
  assert.equal(loader.initialValues.fechaNacimiento, "2026-07-10")
  assert.equal(loader.initialValues.fechaCompra, "2026-07-15")
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

async function testCreateRouteWiresNewCatalogOptions() {
  // PR 2b: the v1.3 form expects six new catalog keys plus canCreateCatalog so the
  // SelectConCreacion primitives (raza/color/calidad/lugarCompra) and ComboboxBuscable
  // primitives (madre/padre) can render. The source-level pin keeps the wiring honest
  // even if the route component refactors.
  const createRoute = await readFile(join(ROUTES_DIR, "animales", "nuevo.tsx"), "utf8")
  for (const key of ["raza", "color", "calidad", "lugarCompra", "madre", "padre"]) {
    assert.ok(
      createRoute.includes(key),
      `create route must pass catalog option '${key}' to AnimalFormScreen so the v1.3 form fields render non-empty`,
    )
  }
  assert.ok(
    createRoute.includes("canCreateCatalog"),
    "create route must pass canCreateCatalog to AnimalFormScreen so the '+ Crear' affordance is gated on configuracion:crear",
  )

  // The fixture must hold demo data for each catalog. At least 3 entries per catalog so
  // the SelectConCreacion/ComboboxBuscable primitives exercise a meaningful list.
  const fixture = await import("../src/lib/fixtures/animal-form-catalog.js")
  const options = fixture.getAnimalFormCatalogOptions()
  for (const key of ["raza", "color", "calidad", "lugarCompra", "madre", "padre"] as const) {
    const arr = options[key]
    assert.ok(Array.isArray(arr), `fixture must expose ${key} as an array`)
    assert.ok(
      Array.isArray(arr) && arr.length >= 3,
      `fixture must provide ≥3 demo options for '${key}' (found ${Array.isArray(arr) ? arr.length : "n/a"})`,
    )
  }
  // Color swatch metadata — the swatch rendering requires `meta: { hex: string }` on
  // each color option so the form can render a color circle next to the label.
  assert.ok(
    Array.isArray(options.color) &&
      options.color.every(
        (c) =>
          typeof (c as { meta?: { hex?: string } }).meta?.hex === "string" &&
          (c as { meta: { hex: string } }).meta.hex.length > 0,
      ),
    "fixture color options must carry meta.hex so the swatch renders",
  )
  // canCreateCatalog must be a non-null object so the form can read individual flags.
  assert.ok(
    options.canCreateCatalog !== undefined && typeof options.canCreateCatalog === "object",
    "fixture must expose canCreateCatalog so the '+ Crear' gating has a source",
  )
}

async function testE2eFixtureRequiresSafeRuntimeGuard() {
  const originalEnv = { ...process.env }
  try {
    process.env.GANAWEB_E2E_ANIMALS = "1"
    process.env.NODE_ENV = "production"
    process.env.PLAYWRIGHT_TEST = "1"
    assert.equal(isAnimalE2eEnabled(), false, "production must never enable fixtures")

    process.env.NODE_ENV = "development"
    Reflect.deleteProperty(process.env, "PLAYWRIGHT_TEST")
    assert.equal(isAnimalE2eEnabled(), false, "ordinary development must not enable fixtures")
    process.env.CI = "true"
    assert.equal(isAnimalE2eEnabled(), false, "CI alone must not enable fixtures")

    process.env.NODE_ENV = "test"
    assert.equal(
      isAnimalE2eEnabled(),
      true,
      "test runtime must enable an explicitly flagged fixture",
    )
    process.env.NODE_ENV = "development"
    process.env.PLAYWRIGHT_TEST = "1"
    const harness = createAnimalRuntimeHarness({
      depsFactory: () => {
        throw new Error("production dependencies must not run in E2E mode")
      },
    })
    const result = await harness.list({ fincaId: "finca-1" })
    assert.equal(result.tipo, "lista")
    assert.equal(result.animales[0]?.codigoAnimal, "MT-122")

    const config = await readFile(join(WEB_ROOT, "..", "..", "playwright.config.ts"), "utf8")
    assert.ok(config.includes("pnpm --filter @ganaweb/ui build &&"))
    assert.ok(config.includes("PLAYWRIGHT_TEST=1 GANAWEB_E2E_ANIMALS=1"))
    assert.ok(config.includes("reuseExistingServer: false"))
    assert.ok(config.includes("retries: 0"))
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) Reflect.deleteProperty(process.env, key)
    }
    Object.assign(process.env, originalEnv)
  }
}

async function testActionForwardsValidacionErrores() {
  // Behavioral anchor: the harness's create() returns the verbatim validacion shape
  // (including `errores`). The web handler must forward that shape unchanged.
  const harness = createAnimalActionHarness({ deps: deps(), getSession: async () => session() })
  // animal-1 has codigo "MT-122" — duplicate triggers validacion in el dominio
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
  const actionSource = await readFile(join(WEB_ROOT, "src", "server", "animal-actions.ts"), "utf8")
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
  const actionSource = await readFile(join(WEB_ROOT, "src", "server", "animal-actions.ts"), "utf8")
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
    /catch\s*\{/.test(createRoute) ||
      /catch\s*\(\s*_/.test(createRoute) ||
      /catch\s*\(\s*\)/.test(createRoute),
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

async function testMapperBuildsFieldErrorsAndPreservesFechaCompra() {
  // Import the mapper directly. It is the route boundary that translates the
  // dominio's ErrorValidacionAnimal[] into the UI's Record<string, string>.
  const { buildCreateAnimalFieldErrors } = await import(
    "../src/routes/_app/fincas/$fincaId/animales/nuevo.js"
  )

  // PR 2b INVERSION: in v1.0 fecha_compra had no form field and the mapper
  // dropped the error silently. v1.3 brings the fechaCompra input back, so
  // the mapper MUST now route `campo: "fecha_compra"` errors to the form's
  // `fechaCompra` key. The regression-guard at tasks.md:3.8 keeps the route
  // honest (no `// fecha_compra intentionally absent` literal returns to
  // nuevo.tsx).
  const mapped = buildCreateAnimalFieldErrors([
    { campo: "sexo_key", regla: "CA-CRE-001", detalle: "El sexo es obligatorio." },
    { campo: "fecha_compra", regla: "CA-CRE-002", detalle: "La compra requiere fecha de compra." },
  ])
  assert.deepEqual(mapped, {
    sexoKey: "El sexo es obligatorio.",
    fechaCompra: "La compra requiere fecha de compra.",
  })

  // All v1.3 spec mappings round-trip — the new Raza / Color / Calidad /
  // LugarCompra / PrecioCompra / PesoCompra entries keep the form's error
  // labels honest when the dominio surfaces a validacion error.
  const allMapped = buildCreateAnimalFieldErrors([
    { campo: "codigo", regla: "CA-CRE-001", detalle: "Requerido" },
    { campo: "nombre", regla: "CA-CRE-001", detalle: "Requerido" },
    { campo: "fecha_nacimiento", regla: "CA-CRE-002", detalle: "Requerido" },
    { campo: "madre_id", regla: "CA-CRE-003", detalle: "Madre inválida" },
    { campo: "padre_id", regla: "CA-CRE-004", detalle: "Padre inválido" },
    { campo: "raza", regla: "CA-CRE-005", detalle: "Raza inválida" },
    { campo: "color", regla: "CA-CRE-005", detalle: "Color inválido" },
    { campo: "calidad", regla: "CA-CRE-005", detalle: "Calidad inválida" },
    { campo: "lugar_compra", regla: "CA-CRE-006", detalle: "Lugar de compra requerido" },
    { campo: "precio_compra", regla: "CA-CRE-006", detalle: "Precio de compra inválido" },
    { campo: "peso_compra", regla: "CA-CRE-006", detalle: "Peso de compra inválido" },
  ])
  assert.deepEqual(allMapped, {
    codigo: "Requerido",
    nombre: "Requerido",
    fechaNacimiento: "Requerido",
    madre: "Madre inválida",
    padre: "Padre inválido",
    raza: "Raza inválida",
    color: "Color inválido",
    calidad: "Calidad inválida",
    lugarCompra: "Lugar de compra requerido",
    precioCompra: "Precio de compra inválido",
    pesoCompra: "Peso de compra inválido",
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

  // Regression guard: the `// fecha_compra intentionally absent` literal must
  // not have crept back into the route. If a future refactor re-introduces
  // the v1.0 silent-drop behaviour, this source-level pin fires.
  const createRoute = await readFile(join(ROUTES_DIR, "animales", "nuevo.tsx"), "utf8")
  assert.ok(
    !createRoute.includes("// fecha_compra intentionally absent"),
    "create route must not carry the v1.0 'fecha_compra intentionally absent' literal — v1.3 has a fechaCompra form field",
  )
}

async function run() {
  await testProductionRuntimeRequiresAdapters()
  await testServerGuards()
  await testRouteViewModelsAndFlows()
  await testCreatePreservesFechaCompra()
  await testCreateRejectsCrossFincaUbicaciones()
  await testRouteFormPayloadBuilders()
  await testCreateRouteNormalizesEsCOCompraNumerics()
  await testEditRouteMapperNormalizesEsCOCompraNumerics()
  await testEditRoutePassesInitialValuesToForm()
  await testCreatePersistsDatesRoundTripIntoEditLoader()
  await testRouteFilesWireUiAndActions()
  await testCreateRouteWiresCatalogOptions()
  await testCreateRouteWiresNewCatalogOptions()
  await testE2eFixtureRequiresSafeRuntimeGuard()
  await testActionForwardsValidacionErrores()
  await testActionE2eFastPathReturnsCreatedOnly()
  await testRouteBranchesOnResultTipo()
  await testMapperBuildsFieldErrorsAndPreservesFechaCompra()
  // biome-ignore lint/suspicious/noConsole: focused harness progress output
  console.log("✅ animal-web-flow.test.ts passed")
}

await run()
