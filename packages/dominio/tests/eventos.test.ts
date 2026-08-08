import { describe, expect, it } from "vitest"
import {
  EventoReadForbiddenError,
  EventoReadInvalidError,
  PAGE_SIZE_FEED_FINCA,
  PAGE_SIZE_HISTORIAL_FINCA,
  PERMISOS_VER_POR_DOMINIO,
  TIPOS_POR_DOMINIO,
  dominiosAutorizadosParaSesion,
  normalizarFiltroEventosFinca,
  permisoEvento,
  validarAlcanceFincaEvento,
  validarAlcanceFincaRead,
  validarAuditoriaAnulacion,
  validarCriterioSeleccionGrupal,
} from "../src/eventos.js"

describe("contrato transversal de eventos", () => {
  it("conserva exactamente el criterio correspondiente al origen grupal", () => {
    expect(validarCriterioSeleccionGrupal({ origen: "manual" })).toBe(true)
    expect(validarCriterioSeleccionGrupal({ origen: "grupo", grupoId: "grupo-1" })).toBe(true)
    expect(validarCriterioSeleccionGrupal({ origen: "lote", potreroId: "potrero-1" })).toBe(false)
    expect(validarCriterioSeleccionGrupal({ origen: "grupo", grupoId: "g-1", loteId: "l-1" })).toBe(
      false,
    )
  })

  it("usa solamente los permisos existentes por dominio", () => {
    expect(permisoEvento("reproductivo", "crear")).toBe("eventos_reproductivos:crear")
    expect(permisoEvento("productivo", "anular")).toBe("eventos_productivos:anular")
    expect(permisoEvento("sanidad", "editar")).toBe("sanidad:editar")
    expect(permisoEvento("movimientos", "anular")).toBe("movimientos:anular")
    expect(permisoEvento("movimientos", "editar")).toBeNull()
  })

  it("rechaza animales o cabeceras grupales de otra finca", () => {
    expect(validarAlcanceFincaEvento({ fincaActivaId: "f-1", fincaAnimalId: "f-1" })).toBe(true)
    expect(validarAlcanceFincaEvento({ fincaActivaId: "f-1", fincaAnimalId: "f-2" })).toBe(false)
    expect(
      validarAlcanceFincaEvento({
        fincaActivaId: "f-1",
        fincaAnimalId: "f-1",
        fincaRegistroGrupalId: "f-2",
      }),
    ).toBe(false)
  })

  it("exige motivo, actor y fecha para anular", () => {
    expect(
      validarAuditoriaAnulacion({ motivo: "Dato duplicado", actorId: "u-1", fecha: new Date() }),
    ).toBe(true)
    expect(validarAuditoriaAnulacion({ motivo: " ", actorId: "u-1", fecha: new Date() })).toBe(
      false,
    )
  })

  it("expone los permisos de lectura por dominio (sin crear `eventos:*`)", () => {
    expect(PERMISOS_VER_POR_DOMINIO.reproductivo).toBe("eventos_reproductivos:ver")
    expect(PERMISOS_VER_POR_DOMINIO.productivo).toBe("eventos_productivos:ver")
    expect(PERMISOS_VER_POR_DOMINIO.sanidad).toBe("sanidad:ver")
    expect(PERMISOS_VER_POR_DOMINIO.movimientos).toBe("movimientos:ver")
    for (const dominio of Object.keys(PERMISOS_VER_POR_DOMINIO) as Array<
      keyof typeof PERMISOS_VER_POR_DOMINIO
    >) {
      expect(PERMISOS_VER_POR_DOMINIO[dominio]).not.toContain("eventos:")
    }
  })

  it("asocia cada tipo canónico con su dominio", () => {
    expect(TIPOS_POR_DOMINIO.reproductivo).toEqual(["servicio", "palpacion", "parto"])
    expect(TIPOS_POR_DOMINIO.productivo).toEqual([
      "pesaje",
      "produccion_lactea",
      "condicion_corporal",
    ])
    expect(TIPOS_POR_DOMINIO.sanidad).toEqual(["aplicacion_sanitaria", "revision_veterinaria"])
    expect(TIPOS_POR_DOMINIO.movimientos).toEqual(["venta", "muerte", "traslado"])
  })

  it("expone el techo de página del feed y del historial como constantes", () => {
    expect(PAGE_SIZE_FEED_FINCA).toBe(20)
    expect(PAGE_SIZE_HISTORIAL_FINCA).toBe(50)
  })
})

describe("issue #227 — read model de finca (RBAC y filtros)", () => {
  it("devuelve solo los dominios que la sesion tiene autorizados para ver", () => {
    expect(
      dominiosAutorizadosParaSesion([
        { modulo: "eventos_reproductivos", accion: "ver" },
        { modulo: "sanidad", accion: "ver" },
      ]),
    ).toEqual(["reproductivo", "sanidad"])
  })

  it("reconoce el permiso comodin `*`/`*` como autorizacion para todos los dominios", () => {
    expect(dominiosAutorizadosParaSesion([{ modulo: "*", accion: "*" }])).toEqual([
      "reproductivo",
      "productivo",
      "sanidad",
      "movimientos",
    ])
  })

  it("devuelve una lista vacia cuando la sesion no tiene `ver` sobre ningun dominio", () => {
    expect(
      dominiosAutorizadosParaSesion([
        { modulo: "animales", accion: "ver" },
        { modulo: "configuracion", accion: "administrar" },
      ]),
    ).toEqual([])
  })

  it("rechaza leer eventos de una finca ajena", () => {
    expect(() =>
      validarAlcanceFincaRead({
        sesionFincaActivaId: "f-1",
        fincaSolicitadaId: "f-2",
        dominiosAutorizados: ["reproductivo"],
      }),
    ).toThrow(EventoReadForbiddenError)
  })

  it("rechaza leer sin permisos de lectura por dominio", () => {
    expect(() =>
      validarAlcanceFincaRead({
        sesionFincaActivaId: "f-1",
        fincaSolicitadaId: "f-1",
        dominiosAutorizados: [],
      }),
    ).toThrowError(EventoReadForbiddenError)
  })

  it("acepta leer cuando la sesion es de la misma finca y tiene al menos un permiso de ver", () => {
    expect(() =>
      validarAlcanceFincaRead({
        sesionFincaActivaId: "f-1",
        fincaSolicitadaId: "f-1",
        dominiosAutorizados: ["productivo"],
      }),
    ).not.toThrow()
  })

  it("normaliza el filtro y devuelve los dominios permitidos al cruzar autorizacion y categoria", () => {
    const resultado = normalizarFiltroEventosFinca({
      filtro: { categoria: "productivo", pageSize: 20 },
      dominiosAutorizados: ["reproductivo", "productivo", "sanidad"],
    })
    expect(resultado).toEqual(["productivo"])
  })

  it("expande `todos` a los dominios autorizados", () => {
    const resultado = normalizarFiltroEventosFinca({
      filtro: { categoria: "todos", pageSize: 50 },
      dominiosAutorizados: ["productivo", "sanidad"],
    })
    expect(resultado).toEqual(["productivo", "sanidad"])
  })

  it("rechaza un tipo canonico que no pertenece a la categoria solicitada", () => {
    expect(() =>
      normalizarFiltroEventosFinca({
        filtro: { categoria: "reproductivo", tipo: "pesaje", pageSize: 20 },
        dominiosAutorizados: ["reproductivo", "productivo"],
      }),
    ).toThrow(EventoReadInvalidError)
  })

  it("rechaza un tipo canonico desconocido", () => {
    expect(() =>
      normalizarFiltroEventosFinca({
        filtro: { tipo: "foto", pageSize: 20 },
        dominiosAutorizados: ["reproductivo", "productivo"],
      }),
    ).toThrow(EventoReadInvalidError)
  })

  it("rechaza fechas ISO invalidas o invertidas", () => {
    expect(() =>
      normalizarFiltroEventosFinca({
        filtro: { fechaDesde: "2026/08/01", pageSize: 20 },
        dominiosAutorizados: ["reproductivo"],
      }),
    ).toThrow(EventoReadInvalidError)
    expect(() =>
      normalizarFiltroEventosFinca({
        filtro: { fechaHasta: "no-es-fecha", pageSize: 20 },
        dominiosAutorizados: ["reproductivo"],
      }),
    ).toThrow(EventoReadInvalidError)
    expect(() =>
      normalizarFiltroEventosFinca({
        filtro: { fechaDesde: "2026-08-31", fechaHasta: "2026-08-01", pageSize: 20 },
        dominiosAutorizados: ["reproductivo"],
      }),
    ).toThrow(EventoReadInvalidError)
  })

  it("rechaza filtros que no dejan ningun dominio autorizado (fail-closed)", () => {
    expect(() =>
      normalizarFiltroEventosFinca({
        filtro: { categoria: "productivo", pageSize: 20 },
        dominiosAutorizados: ["reproductivo"],
      }),
    ).toThrow(EventoReadForbiddenError)
  })
})
