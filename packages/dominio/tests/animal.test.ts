import { describe, expect, it } from "vitest"
import {
  calcularDecisionEliminarAnimal,
  calcularEditabilidadCodigoAnimal,
  crearEstadoBannerFichaAnimal,
  marcarImagenPrincipal,
  seleccionarCandidatoPrincipalImagenAnimalAlDesvincular,
  validarActualizacionAnimal,
  validarCreacionAnimal,
  validarFichaTimeline,
  validarLimiteImagenesAnimal,
  validarPrincipalImagenAnimal,
  validarPurgadoImagenAnimal,
  validarReactivacionAnimal,
  validarTipoArchivoImagenAnimal,
} from "../src/index.js"

const resumenSinReferencias = { eventCount: 0, offspringCount: 0, blocksCodeChange: false }

describe("CA-CRE: validación de creación de animal", () => {
  it("rechaza campos mínimos faltantes: codigo, nombre, sexo_key y tipo_explotacion_id", () => {
    const resultado = validarCreacionAnimal({
      codigo: "   ",
      nombre: "",
      sexoKey: null,
      fincaId: "finca-1",
      existentes: [],
    })

    expect(resultado).toEqual({
      valido: false,
      errores: expect.arrayContaining([
        expect.objectContaining({ campo: "codigo", regla: "CA-CRE-001" }),
        expect.objectContaining({ campo: "nombre", regla: "CA-CRE-001" }),
        expect.objectContaining({ campo: "sexo_key", regla: "CA-CRE-001" }),
        expect.objectContaining({ campo: "tipo_explotacion_id", regla: "CA-CRE-001" }),
      ]),
    })
  })

  it("acepta codigo, nombre y sexo_key sin exigir color ni raza", () => {
    const resultado = validarCreacionAnimal({
      codigo: " MT-122 ",
      nombre: "Lucera",
      sexoKey: 1,
      fincaId: "finca-1",
      tipoExplotacionId: "te-leche",
      existentes: [],
    })

    expect(resultado).toEqual({
      valido: true,
      valor: expect.objectContaining({
        codigo: "MT-122",
        nombre: "Lucera",
        sexoKey: 1,
        activo: true,
        version: 1,
        estadoAnimalKey: 0,
        saludAnimalKey: 0,
      }),
      reglas: expect.arrayContaining(["CA-CRE-001", "CA-CRE-005"]),
    })
  })

  it("decide estado inicial activo y categoría reproductiva desde sexo_key sin I/O", () => {
    const hembra = validarCreacionAnimal({
      codigo: "H-1",
      nombre: "Hembra",
      sexoKey: 1,
      fincaId: "finca-1",
      tipoExplotacionId: "te-leche",
      existentes: [],
    })
    const macho = validarCreacionAnimal({
      codigo: "M-1",
      nombre: "Macho",
      sexoKey: 0,
      fincaId: "finca-1",
      tipoExplotacionId: "te-leche",
      existentes: [],
    })

    expect(hembra).toEqual({
      valido: true,
      valor: expect.objectContaining({ estadoAnimalKey: 0, categoriaReproductiva: "novilla" }),
      reglas: expect.arrayContaining(["CA-CRE-005", "CA-CRE-007"]),
    })
    expect(macho).toEqual({
      valido: true,
      valor: expect.objectContaining({ estadoAnimalKey: 0, categoriaReproductiva: "no_aplica" }),
      reglas: expect.arrayContaining(["CA-CRE-005", "CA-CRE-007"]),
    })
  })

  it("rechaza madre macho o de otra finca con CA-CRE-003", () => {
    const resultado = validarCreacionAnimal({
      codigo: "MT-123",
      nombre: "Cría",
      sexoKey: 0,
      fincaId: "finca-1",
      madreId: "animal-macho",
      tipoExplotacionId: "te-leche",
      existentes: [
        { id: "animal-macho", fincaId: "finca-1", codigo: "M-1", sexoKey: 0 },
        { id: "hembra-otra", fincaId: "finca-2", codigo: "H-1", sexoKey: 1 },
      ],
    })

    expect(resultado).toEqual({
      valido: false,
      errores: [expect.objectContaining({ campo: "madre_id", regla: "CA-CRE-003" })],
    })
  })

  it("aplica fecha condicional por origen sin convertir raza ni color en obligatorios", () => {
    const resultado = validarCreacionAnimal({
      codigo: "CP-77",
      nombre: "Comprada",
      sexoKey: 1,
      fincaId: "finca-1",
      tipoIngreso: "comprado",
      tipoExplotacionId: "te-leche",
      existentes: [],
    })

    expect(resultado).toEqual({
      valido: false,
      errores: [expect.objectContaining({ campo: "fecha_compra", regla: "CA-CRE-002" })],
    })
  })

  it("rechaza tipoExplotacionId vacío con CA-CRE-001 en creación", () => {
    const resultado = validarCreacionAnimal({
      codigo: "MT-200",
      nombre: "Sin Tipo Explotación",
      sexoKey: 1,
      fincaId: "finca-1",
      tipoExplotacionId: "",
      existentes: [],
    })

    expect(resultado.valido).toBe(false)
    expect(resultado.errores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ campo: "tipo_explotacion_id", regla: "CA-CRE-001" }),
      ]),
    )
  })

  it("acepta tipoExplotacionId no vacío en creación sin error CA-CRE-001", () => {
    const resultado = validarCreacionAnimal({
      codigo: "MT-201",
      nombre: "Con Tipo Explotación",
      sexoKey: 1,
      fincaId: "finca-1",
      tipoExplotacionId: "te-leche",
      existentes: [],
    })

    expect(resultado.valido).toBe(true)
  })
})

describe("CA-UPD/DEL/IMG/TL: reglas puras del animal", () => {
  it("decide editabilidad de código desde hechos puros de referencias", () => {
    expect(
      calcularEditabilidadCodigoAnimal({
        eventCount: 0,
        offspringCount: 0,
        blocksCodeChange: false,
      }),
    ).toEqual({
      editable: true,
      reglas: ["CA-UPD-001"],
    })

    expect(
      calcularEditabilidadCodigoAnimal({
        eventCount: 1,
        offspringCount: 0,
        blocksCodeChange: true,
      }),
    ).toEqual({
      editable: false,
      regla: "CA-UPD-001",
      referencias: 1,
    })
  })

  it("bloquea cambio de código cuando el checker central reporta referencias", () => {
    const resultado = validarActualizacionAnimal({
      codigoActual: "MT-122",
      cambios: { codigo: "MT-999", versionLeida: 3, versionActual: 3 },
      referencias: { eventCount: 2, offspringCount: 0, blocksCodeChange: true },
    })

    expect(resultado).toEqual({
      valido: false,
      errores: [expect.objectContaining({ campo: "codigo", regla: "CA-UPD-001" })],
    })
  })

  it("rechaza cambios de campos derivados de eventos y reactivación con código reutilizado", () => {
    const actualizacion = validarActualizacionAnimal({
      codigoActual: "MT-122",
      cambios: {
        versionLeida: 3,
        versionActual: 3,
        estadoAnimalKey: 2,
      },
      referencias: resumenSinReferencias,
    })

    expect(actualizacion).toEqual({
      valido: false,
      errores: [expect.objectContaining({ campo: "estado_animal_key", regla: "CA-UPD-003" })],
    })

    expect(
      validarReactivacionAnimal({
        codigo: "MT-122",
        fincaId: "finca-1",
        existentesActivos: [{ fincaId: "finca-1", codigo: "mt-122" }],
      }),
    ).toEqual({
      valido: false,
      errores: [expect.objectContaining({ campo: "codigo", regla: "CA-DEL-009" })],
    })
  })

  it("rechaza tipoExplotacionId vacío con CA-CRE-001 en actualización", () => {
    const resultado = validarActualizacionAnimal({
      codigoActual: "MT-122",
      cambios: {
        versionLeida: 1,
        versionActual: 1,
        tipoExplotacionId: "",
      },
      referencias: resumenSinReferencias,
    })

    expect(resultado.valido).toBe(false)
    expect(resultado.errores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ campo: "tipo_explotacion_id", regla: "CA-CRE-001" }),
      ]),
    )
  })

  it("permite eliminación física por autoservicio solo online, reciente y sin referencias", () => {
    const resultado = calcularDecisionEliminarAnimal({
      online: true,
      referencias: resumenSinReferencias,
      usuarioId: "usuario-1",
      usuarioCreadoPor: "usuario-1",
      creadoEn: new Date("2026-07-12T08:00:00Z"),
      ahora: new Date("2026-07-12T20:00:00Z"),
      permisos: [{ modulo: "animales", accion: "crear" }],
    })

    expect(resultado).toEqual({ tipo: "eliminado", via: "autoservicio" })
  })

  it("inactiva cuando existen eventos y bloquea sexta imagen activa", () => {
    expect(
      calcularDecisionEliminarAnimal({
        online: true,
        referencias: { eventCount: 4, offspringCount: 0, blocksCodeChange: true },
        usuarioId: "usuario-1",
        usuarioCreadoPor: "usuario-2",
        creadoEn: new Date("2026-07-10T08:00:00Z"),
        ahora: new Date("2026-07-12T20:00:00Z"),
        permisos: [{ modulo: "animales", accion: "eliminar" }],
      }),
    ).toEqual({ tipo: "inactivado", eventos: 4 })

    expect(validarLimiteImagenesAnimal(5)).toEqual({
      valido: false,
      regla: "CA-IMG-001",
      limite: 5,
    })
  })

  it("inactiva eliminación offline sin referencias y deniega física sin permiso ni autoservicio", () => {
    expect(
      calcularDecisionEliminarAnimal({
        online: false,
        referencias: resumenSinReferencias,
        usuarioId: "usuario-1",
        usuarioCreadoPor: "usuario-1",
        creadoEn: new Date("2026-07-12T08:00:00Z"),
        ahora: new Date("2026-07-12T20:00:00Z"),
        permisos: [{ modulo: "animales", accion: "crear" }],
      }),
    ).toEqual({ tipo: "inactivado", eventos: 0 })

    expect(
      calcularDecisionEliminarAnimal({
        online: true,
        referencias: resumenSinReferencias,
        usuarioId: "usuario-1",
        usuarioCreadoPor: "usuario-2",
        creadoEn: new Date("2026-07-10T08:00:00Z"),
        ahora: new Date("2026-07-12T20:00:00Z"),
        permisos: [{ modulo: "animales", accion: "crear" }],
      }),
    ).toEqual({ tipo: "denegado", razon: "Sin permiso para eliminación física ni autoservicio." })
  })

  it("mantiene una sola imagen principal y pagina timeline en cursor de 20", () => {
    const imagenes = marcarImagenPrincipal(
      [
        { id: "img-1", activa: true, esPrincipal: true },
        { id: "img-2", activa: true, esPrincipal: false },
      ],
      "img-2",
    )

    expect(imagenes).toEqual([
      { id: "img-1", activa: true, esPrincipal: false },
      { id: "img-2", activa: true, esPrincipal: true },
    ])

    const timeline = validarFichaTimeline(
      Array.from({ length: 21 }, (_, index) => ({ id: `ev-${index}` })),
    )

    expect(timeline).toEqual({ pageSize: 20, hasNextPage: true })
  })

  it("valida exactamente una imagen principal activa y propone reemplazo al desvincular", () => {
    const imagenes = [
      { id: "img-1", activa: true, esPrincipal: true },
      { id: "img-2", activa: true, esPrincipal: false },
      { id: "img-3", activa: false, esPrincipal: true },
    ]

    expect(validarPrincipalImagenAnimal(imagenes)).toEqual({
      valido: true,
      reglas: ["CA-IMG-003", "CA-IMG-004"],
    })
    expect(seleccionarCandidatoPrincipalImagenAnimalAlDesvincular(imagenes, "img-1")).toEqual({
      candidatoId: "img-2",
      regla: "CA-IMG-005",
    })
    expect(
      validarPrincipalImagenAnimal([
        { id: "img-1", activa: true, esPrincipal: true },
        { id: "img-2", activa: true, esPrincipal: true },
      ]),
    ).toEqual({
      valido: false,
      errores: [expect.objectContaining({ campo: "es_principal", regla: "CA-IMG-004" })],
    })
  })

  it("valida tipo de imagen y purga solo enlaces inactivos vencidos sin vínculos activos", () => {
    expect(validarTipoArchivoImagenAnimal("image/gif")).toEqual({
      valido: false,
      regla: "CA-IMG-002",
      permitidos: ["image/jpeg", "image/png", "image/webp", "image/heic"],
    })

    expect(
      validarPurgadoImagenAnimal({
        activa: false,
        ahora: new Date("2026-07-12T00:00:00Z"),
        desvinculadaEn: new Date("2026-06-01T00:00:00Z"),
        tieneVinculosActivos: false,
      }),
    ).toEqual({ valido: true, reglas: ["CA-IMG-006", "CA-IMG-007"] })
  })

  it("expone banner de estado para ficha cuando el animal no está disponible", () => {
    expect(crearEstadoBannerFichaAnimal({ activo: false, estadoActual: "activo" })).toEqual({
      tipo: "inactivo",
      bloqueaAccionesEventos: true,
    })

    expect(crearEstadoBannerFichaAnimal({ activo: true, estadoActual: "vendido" })).toEqual({
      tipo: "vendido",
      bloqueaAccionesEventos: true,
    })
  })
})
