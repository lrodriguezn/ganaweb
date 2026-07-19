import { describe, expect, it, vi } from "vitest"
import {
  type AnimalReferenceCheckerPort,
  type AnimalRepositoryPort,
  type ArchivoAnimalPort,
  type ColaBinariosPort,
  type OutboxPort,
  type TimelineAnimalPort,
  actualizarAnimal,
  crearAnimal,
  eliminarAnimal,
  obtenerFichaAnimal,
  reactivarAnimal,
} from "../src/index.js"

function deps() {
  const animales: AnimalRepositoryPort = {
    buscarPorCodigoYFinca: vi.fn(async () => null),
    guardar: vi.fn(async () => {}),
    obtenerPorIdYFinca: vi.fn(async () => ({
      id: "animal-1",
      fincaId: "finca-1",
      codigo: "MT-122",
      nombre: "Lucera",
      sexoKey: 1,
      version: 1,
      activo: true,
      usuarioCreadoPor: "usuario-1",
      creadoEn: new Date("2026-07-12T08:00:00Z"),
    })),
    inactivar: vi.fn(async () => {}),
    eliminarFisico: vi.fn(async () => {}),
    actualizar: vi.fn(async () => {}),
    reactivar: vi.fn(async () => {}),
  }
  const referencias: AnimalReferenceCheckerPort = {
    summarize: vi.fn(async () => ({ eventCount: 0, offspringCount: 0, blocksCodeChange: false })),
  }
  const timeline: TimelineAnimalPort = {
    listarPagina: vi.fn(async () => ({ items: [{ id: "ev-1" }], nextCursor: "cursor-2" })),
  }
  const archivos: ArchivoAnimalPort = {
    listarImagenes: vi.fn(async () => [{ id: "img-1", esPrincipal: true, estadoSubida: "subida" }]),
    vincularImagenPendiente: vi.fn(async () => {}),
  }
  const outbox: OutboxPort = { append: vi.fn(async () => {}) }
  const colaBinarios: ColaBinariosPort = { encolar: vi.fn(async () => {}) }
  const transacciones = { run: vi.fn(async <T>(work: () => Promise<T>) => work()) }
  const auditoriaEliminaciones = { registrar: vi.fn(async () => {}) }
  const tombstones = { registrar: vi.fn(async () => {}) }
  const ubicaciones = { registrarInicial: vi.fn(async () => {}) }
  const pesajes = { registrarInicial: vi.fn(async () => {}) }
  return {
    animales,
    referencias,
    timeline,
    archivos,
    outbox,
    colaBinarios,
    transacciones,
    auditoriaEliminaciones,
    tombstones,
    ubicaciones,
    pesajes,
  }
}

const sesionCrear = {
  usuarioId: "usuario-1",
  fincaActivaId: "finca-1",
  permisos: [{ modulo: "animales", accion: "crear" }],
}

describe("animal use cases", () => {
  it("returns authorization failure before mutation when permission is missing", async () => {
    const d = deps()

    const result = await crearAnimal(d)({
      sesion: { ...sesionCrear, permisos: [] },
      datos: { codigo: "MT-122", nombre: "Lucera", sexoKey: 1 },
    })

    expect(result).toEqual({ tipo: "no_autorizado" })
    expect(d.animales.guardar).not.toHaveBeenCalled()
    expect(d.outbox.append).not.toHaveBeenCalled()
  })

  it("creates animal with domain validation, repository write and outbox append", async () => {
    const d = deps()

    const result = await crearAnimal(d)({
      sesion: sesionCrear,
      datos: { codigo: " MT-122 ", nombre: "Lucera", sexoKey: 1 },
    })

    expect(result).toEqual({ tipo: "creado", animalId: expect.any(String) })
    expect(d.animales.guardar).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: "MT-122", fincaId: "finca-1", version: 1 }),
    )
    expect(d.outbox.append).toHaveBeenCalledWith(expect.objectContaining({ operacion: "INSERT" }))
    expect(d.transacciones.run).toHaveBeenCalledOnce()
  })

  it("commits create location, weight, image links, outbox and binary queue side effects together", async () => {
    const d = deps()

    const result = await crearAnimal(d)({
      sesion: sesionCrear,
      datos: { codigo: "MT-131", nombre: "Estrella", sexoKey: 1 },
      ubicacionInicial: { potreroId: "potrero-1", sectorId: "sector-1", loteId: "lote-1" },
      pesoInicial: { pesoKg: 342, fecha: new Date("2026-07-13T00:00:00Z") },
      imagenes: [
        { id: "blob-side-1", mimeType: "image/webp", bytes: 100_000 },
        { id: "blob-side-2", mimeType: "image/png", bytes: 200_000 },
      ],
    })

    expect(result.tipo).toBe("creado")
    expect(d.transacciones.run).toHaveBeenCalledOnce()
    expect(d.animales.guardar).toHaveBeenCalledWith(expect.objectContaining({ codigo: "MT-131" }))
    expect(d.ubicaciones.registrarInicial).toHaveBeenCalledWith(
      expect.objectContaining({
        fincaId: "finca-1",
        potreroId: "potrero-1",
        motivo: "inicial",
      }),
    )
    expect(d.pesajes.registrarInicial).toHaveBeenCalledWith(
      expect.objectContaining({ fincaId: "finca-1", pesoKg: 342 }),
    )
    expect(d.archivos.vincularImagenPendiente).toHaveBeenCalledTimes(2)
    expect(d.outbox.append).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ potreroId: "potrero-1" }) }),
    )
    expect(d.outbox.append).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ pesoKg: 342 }) }),
    )
    expect(d.colaBinarios.encolar).toHaveBeenCalledTimes(2)
  })

  it("does not enqueue binary blobs when the transactional create pipeline fails", async () => {
    const d = deps()
    d.outbox.append = vi.fn(async () => {
      throw new Error("outbox unavailable")
    })

    const result = await crearAnimal(d)({
      sesion: sesionCrear,
      datos: { codigo: "MT-125", nombre: "Nube", sexoKey: 1 },
      imagenes: [{ id: "blob-fail", mimeType: "image/webp", bytes: 120_000 }],
    })

    expect(result).toEqual({ tipo: "transaccion_fallida", razon: "outbox unavailable" })
    expect(d.transacciones.run).toHaveBeenCalledOnce()
    expect(d.colaBinarios.encolar).not.toHaveBeenCalled()
  })

  it("returns cursor-paginated ficha data with header, images and genealogy shape", async () => {
    const d = deps()

    const result = await obtenerFichaAnimal(d)({
      sesion: { ...sesionCrear, permisos: [{ modulo: "animales", accion: "ver" }] },
      animalId: "animal-1",
      cursorTimeline: "cursor-1",
    })

    expect(result).toEqual({
      tipo: "ficha",
      animal: expect.objectContaining({ id: "animal-1", codigo: "MT-122" }),
      imagenes: [{ id: "img-1", esPrincipal: true, estadoSubida: "subida" }],
      genealogia: { madre: null, padre: null, crias: [] },
      estadoBanner: null,
      timeline: { items: [{ id: "ev-1" }], nextCursor: "cursor-2" },
    })
    expect(d.timeline.listarPagina).toHaveBeenCalledWith({
      animalId: "animal-1",
      fincaId: "finca-1",
      cursor: "cursor-1",
      limit: 20,
    })
  })

  it("queues data outbox and binary queue separately for offline image add on create", async () => {
    const d = deps()

    const result = await crearAnimal(d)({
      sesion: sesionCrear,
      datos: { codigo: "MT-123", nombre: "Aurora", sexoKey: 1 },
      imagenes: [{ id: "blob-1", mimeType: "image/webp", bytes: 900_000 }],
    })

    expect(result.tipo).toBe("creado")
    expect(result).toEqual({
      tipo: "creado",
      animalId: expect.any(String),
      imagenes: [{ id: expect.any(String), blobId: "blob-1", estadoSubida: "pendiente" }],
    })
    expect(d.outbox.append).toHaveBeenCalledWith(
      expect.objectContaining({ tablaDestino: "animales" }),
    )
    expect(d.archivos.vincularImagenPendiente).toHaveBeenCalledWith(
      expect.objectContaining({ blobId: "blob-1", estadoSubida: "pendiente" }),
    )
    expect(d.colaBinarios.encolar).toHaveBeenCalledWith(
      expect.objectContaining({ blobId: "blob-1" }),
    )
  })

  it("rejects create image metadata when MIME type is unsupported or active image limit is exceeded", async () => {
    const unsupported = deps()

    await expect(
      crearAnimal(unsupported)({
        sesion: sesionCrear,
        datos: { codigo: "MT-126", nombre: "Nube", sexoKey: 1 },
        imagenes: [{ id: "blob-pdf", mimeType: "application/pdf", bytes: 10_000 }],
      }),
    ).resolves.toEqual({
      tipo: "validacion",
      errores: [{ campo: "imagenes", mensaje: "Tipo de imagen no permitido: application/pdf" }],
    })
    expect(unsupported.animales.guardar).not.toHaveBeenCalled()
    expect(unsupported.transacciones.run).not.toHaveBeenCalled()

    const overLimit = deps()
    const sixImages = Array.from({ length: 6 }, (_, index) => ({
      id: `blob-${index}`,
      mimeType: "image/webp",
      bytes: 10_000,
    }))

    await expect(
      crearAnimal(overLimit)({
        sesion: sesionCrear,
        datos: { codigo: "MT-127", nombre: "Luna", sexoKey: 1 },
        imagenes: sixImages,
      }),
    ).resolves.toEqual({
      tipo: "validacion",
      errores: [{ campo: "imagenes", mensaje: "Máximo 5 fotos activas por animal" }],
    })
    expect(overLimit.animales.guardar).not.toHaveBeenCalled()
    expect(overLimit.transacciones.run).not.toHaveBeenCalled()
  })

  it("persists validated birth and purchase dates as epoch seconds on create", async () => {
    const d = deps()
    await crearAnimal(d)({
      sesion: sesionCrear,
      datos: { codigo: "MT-128", nombre: "Bella", sexoKey: 1, fechaNacimiento: new Date("2026-07-10T00:00:00Z"), fechaCompra: new Date("2026-07-15T00:00:00Z") },
    })
    expect(d.animales.guardar).toHaveBeenCalledWith(expect.objectContaining({
      fechaNacimiento: Math.floor(Date.UTC(2026, 6, 10) / 1000),
      fechaCompra: Math.floor(Date.UTC(2026, 6, 15) / 1000),
    }))
  })

  it("updates animals with permission, version validation, repository mutation and outbox", async () => {
    const d = deps()

    const result = await actualizarAnimal(d)({
      sesion: { ...sesionCrear, permisos: [{ modulo: "animales", accion: "editar" }] },
      animalId: "animal-1",
      cambios: { codigo: "MT-130", versionLeida: 1 },
    })

    expect(result).toEqual({ tipo: "actualizado" })
    expect(d.animales.actualizar).toHaveBeenCalledWith("animal-1", "finca-1", {
      codigo: "MT-130",
      versionLeida: 1,
    })
    expect(d.outbox.append).toHaveBeenCalledWith(expect.objectContaining({ operacion: "UPDATE" }))
  })

  it("rejects stale update versions before repository mutation", async () => {
    const d = deps()

    const result = await actualizarAnimal(d)({
      sesion: { ...sesionCrear, permisos: [{ modulo: "animales", accion: "editar" }] },
      animalId: "animal-1",
      cambios: { codigo: "MT-131", versionLeida: 0 },
    })

    expect(result).toEqual({
      tipo: "validacion",
      errores: [
        {
          campo: "version",
          regla: "CA-UPD-002",
          detalle: "La versión leída no coincide con la actual.",
        },
      ],
    })
    expect(d.animales.actualizar).not.toHaveBeenCalled()
    expect(d.outbox.append).not.toHaveBeenCalled()
  })

  it("reactivates animals only after permission and reused-code validation", async () => {
    const d = deps()

    const result = await reactivarAnimal(d)({
      sesion: { ...sesionCrear, permisos: [{ modulo: "animales", accion: "inactivar" }] },
      animalId: "animal-1",
      codigo: "MT-122",
    })

    expect(result).toEqual({ tipo: "reactivado" })
    expect(d.animales.reactivar).toHaveBeenCalledWith("animal-1", "finca-1", "MT-122")
    expect(d.outbox.append).toHaveBeenCalledWith(expect.objectContaining({ operacion: "UPDATE" }))
  })

  it("returns delete outcomes using centralized reference checker", async () => {
    const d = deps()
    d.referencias.summarize = vi.fn(async () => ({
      eventCount: 3,
      offspringCount: 0,
      blocksCodeChange: true,
    }))

    const result = await eliminarAnimal(d)({
      sesion: { ...sesionCrear, permisos: [{ modulo: "animales", accion: "inactivar" }] },
      animalId: "animal-1",
      online: true,
    })

    expect(result).toEqual({ tipo: "inactivado", eventos: 3 })
    expect(d.animales.inactivar).toHaveBeenCalledWith("animal-1", "finca-1")
    expect(d.animales.eliminarFisico).not.toHaveBeenCalled()
  })

  it("coordinates physical delete with immutable audit and tombstone records in the same transaction", async () => {
    const d = deps()

    const result = await eliminarAnimal(d)({
      sesion: {
        ...sesionCrear,
        permisos: [
          { modulo: "animales", accion: "crear" },
          { modulo: "animales", accion: "eliminar" },
        ],
      },
      animalId: "animal-1",
      online: true,
    })

    expect(result).toEqual({ tipo: "eliminado", via: "permiso" })
    expect(d.transacciones.run).toHaveBeenCalledOnce()
    expect(d.animales.eliminarFisico).toHaveBeenCalledWith("animal-1", "finca-1")
    expect(d.auditoriaEliminaciones.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        fincaId: "finca-1",
        entidadCodigo: "MT-122",
        usuarioId: "usuario-1",
        via: "permiso",
      }),
    )
    expect(d.tombstones.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        fincaId: "finca-1",
        tablaDestino: "animales",
        entidadId: "animal-1",
      }),
    )
    expect(d.outbox.append).toHaveBeenCalledWith(
      expect.objectContaining({
        operacion: "DELETE",
        payload: expect.objectContaining({ tombstone: true }),
      }),
    )
  })
})
