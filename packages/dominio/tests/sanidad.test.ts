/**
 * Sanidad animal — reglas puras de dominio (Issue #208, RF-SANIDAD v0.2).
 *
 * Reglas cubiertas (TS-001: cada regla citable tiene tests que la nombran):
 * - §3 requisito: enum `tipo_tratamiento` (el CHECK vive sólo en schema_v3;
 *   Drizzle tiene texto plano, así el dominio es dueño de la validación).
 * - RN-002: fecha de evento nunca futura (excepción única: `proxima_dosis`)
 *   ni anterior a fecha_nacimiento / fecha_compra del animal.
 * - RN-003: animal EN_FINCA a la fecha del evento; captura tardía permitida
 *   con advertencia.
 * - RN-040: `precio_dosis` es snapshot del catálogo al momento de aplicar.
 * - RN-041: stock SIEMPRE calculado (Σ entradas − Σ aplicaciones), nunca un
 *   campo mutable; negativo = alerta de reconciliación, no error (KPI-10).
 * - RN-042: aplicar un producto auto-completa el refuerzo pendiente del mismo
 *   producto para el mismo animal cuando proxima_dosis ≤ fecha de aplicación.
 * - RN-051: anular un registro grupal excluye sus filas de stock y KPIs; sin
 *   edición parcial de un grupo anulado.
 * - RN-052: captura 1..N animales; N>1 exige cabecera `registros_grupales`
 *   con tipo_evento 'tratamiento' y total_animales = filas hijas.
 *
 * Funciones puras: sin I/O, sin estado global (TS-003: fixtures en memoria).
 * Nombres en español (T-003). Fechas como texto ISO YYYY-MM-DD (columnas DATE
 * del esquema v3).
 */
import { describe, expect, it } from "vitest"
import type {
  CapturaEntradaAlmacen,
  ErrorValidacionSanidad,
  RefuerzoPendienteFila,
} from "../src/index.js"
import {
  agruparRefuerzosPorSemana,
  calcularStockDisponible,
  construirAplicacionesSanitarias,
  contarAnimalesEnTratamiento,
  esAlertaReconciliacionStock,
  esFechaIso,
  esRefuerzoPendienteSanidad,
  estadoStockSanidad,
  evaluarAnimalEnFinca,
  finSemanaIso,
  inicioSemanaIso,
  planificarRegistroGrupal,
  propositoProductoSanitario,
  refuerzosAutoCompletados,
  sumarDiasAFechaIso,
  validarAnulacionRegistroGrupal,
  validarCabeceraRegistroGrupal,
  validarCantidadAnimalesSanidad,
  validarEntradaAlmacen,
  validarFechaEventoSanidad,
  validarTipoTratamiento,
} from "../src/index.js"

const HOY = "2026-08-05"

describe("tipo_tratamiento: enum de dominio (§3 requisito, CHECK de schema_v3)", () => {
  it("acepta los tres valores del enum", () => {
    for (const valor of ["reproductivo", "no_reproductivo", "vacuna"] as const) {
      expect(validarTipoTratamiento(valor)).toEqual({ valido: true, valor })
    }
  })

  it("rechaza un valor fuera del enum con error { campo, detalle }", () => {
    const resultado = validarTipoTratamiento("vitamina")

    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.error.campo).toBe("tipo_tratamiento")
      expect(resultado.error.detalle.length).toBeGreaterThan(0)
    }
  })

  it("rechaza valores no textuales (number, null, undefined, objeto)", () => {
    for (const valor of [42, null, undefined, { tipo: "vacuna" }]) {
      const resultado = validarTipoTratamiento(valor)
      expect(resultado.valido).toBe(false)
      if (!resultado.valido) {
        expect(resultado.error.campo).toBe("tipo_tratamiento")
      }
    }
  })
})

describe("RN-002: fechas de evento sanitarias", () => {
  it("acepta una fecha igual a hoy (límite: hoy no es futura)", () => {
    const errores = validarFechaEventoSanidad({ fecha: HOY, hoy: HOY })
    expect(errores).toEqual([])
  })

  it("acepta una fecha pasada sin datos del animal", () => {
    const errores = validarFechaEventoSanidad({ fecha: "2026-07-01", hoy: HOY })
    expect(errores).toEqual([])
  })

  it("rechaza una fecha futura citando la regla en el detalle", () => {
    const errores = validarFechaEventoSanidad({ fecha: "2026-08-06", hoy: HOY })

    expect(errores).toHaveLength(1)
    expect(errores[0]?.campo).toBe("fecha")
    expect(errores[0]?.detalle).toContain("RN-002")
  })

  it("rechaza una fecha anterior a la fecha de nacimiento del animal", () => {
    const errores = validarFechaEventoSanidad({
      fecha: "2026-07-01",
      hoy: HOY,
      fechaNacimiento: "2026-07-10",
    })

    expect(errores).toHaveLength(1)
    expect(errores[0]?.campo).toBe("fecha")
    expect(errores[0]?.detalle).toContain("nacimiento")
  })

  it("rechaza una fecha anterior a la fecha de compra del animal", () => {
    const errores = validarFechaEventoSanidad({
      fecha: "2026-07-01",
      hoy: HOY,
      fechaCompra: "2026-07-15",
    })

    expect(errores).toHaveLength(1)
    expect(errores[0]?.campo).toBe("fecha")
    expect(errores[0]?.detalle).toContain("compra")
  })

  it("acepta fecha igual a la de nacimiento y acumula todos los errores cuando hay varios", () => {
    const validos = validarFechaEventoSanidad({
      fecha: "2026-07-10",
      hoy: HOY,
      fechaNacimiento: "2026-07-10",
    })
    expect(validos).toEqual([])

    const errores = validarFechaEventoSanidad({
      fecha: "2026-08-06",
      hoy: HOY,
      fechaNacimiento: "2026-08-10",
      fechaCompra: "2026-08-11",
    })
    expect(errores.length).toBeGreaterThanOrEqual(3)
  })

  it("ignora fecha de nacimiento/compra ausentes (null) — RN-002 sólo aplica cuando están disponibles", () => {
    const errores = validarFechaEventoSanidad({
      fecha: "2026-07-01",
      hoy: HOY,
      fechaNacimiento: null,
      fechaCompra: null,
    })
    expect(errores).toEqual([])
  })

  it("rechaza una fecha con formato inválido", () => {
    const errores = validarFechaEventoSanidad({ fecha: "05/08/2026", hoy: HOY })

    expect(errores).toHaveLength(1)
    expect(errores[0]?.campo).toBe("fecha")
  })
})

describe("RN-002: proxima_dosis es la única excepción de fecha futura", () => {
  it("esFechaIso valida el formato ISO YYYY-MM-DD usado por proxima_dosis", () => {
    expect(esFechaIso("2027-02-05")).toBe(true)
    expect(esFechaIso("2027-13-05")).toBe(false)
    expect(esFechaIso("2027-02-30")).toBe(false)
    expect(esFechaIso("mañana")).toBe(false)
    expect(esFechaIso("")).toBe(false)
  })

  it("construirAplicacionesSanitarias acepta proxima_dosis futura (excepción RN-002)", () => {
    const filas = construirAplicacionesSanitarias({
      producto: { id: "prod-esp-aftosa", precioDosis: 3500 },
      animalIds: ["animal-mt-120"],
      fecha: HOY,
      dosis: 2,
      proximaDosis: "2027-02-05",
      comentarios: null,
      registroGrupalId: null,
    })

    expect(filas).toHaveLength(1)
    expect(filas[0]?.proximaDosis).toBe("2027-02-05")
  })
})

describe("RN-003: animal EN_FINCA al momento de la fecha del evento", () => {
  it("acepta sin advertencia un animal EN_FINCA a la fecha del evento", () => {
    const resultado = evaluarAnimalEnFinca({
      fechaEvento: "2026-07-01",
      estadoActual: "en_finca",
      fechaSalida: null,
    })

    expect(resultado).toEqual({ valido: true, capturaTardia: false })
  })

  it("rechaza un animal vendido cuya venta es anterior o igual a la fecha del evento", () => {
    for (const fechaEvento of ["2026-07-20", "2026-07-10"]) {
      const resultado = evaluarAnimalEnFinca({
        fechaEvento,
        estadoActual: "vendido",
        fechaSalida: "2026-07-10",
      })

      expect(resultado.valido).toBe(false)
      if (!resultado.valido) {
        expect(resultado.error.campo).toBe("animal")
        expect(resultado.error.detalle).toContain("RN-003")
      }
    }
  })

  it("rechaza un animal muerto sin fecha de salida conocida (no se puede probar EN_FINCA)", () => {
    const resultado = evaluarAnimalEnFinca({
      fechaEvento: "2026-07-01",
      estadoActual: "muerto",
      fechaSalida: null,
    })

    expect(resultado.valido).toBe(false)
  })

  it("acepta con advertencia de captura tardía un evento anterior a la venta/muerte", () => {
    const resultado = evaluarAnimalEnFinca({
      fechaEvento: "2026-07-01",
      estadoActual: "vendido",
      fechaSalida: "2026-07-10",
    })

    expect(resultado).toEqual({ valido: true, capturaTardia: true })
  })

  it("el estado se evalúa a la fecha del evento, no a la fecha de captura (registro tardío permitido)", () => {
    // El animal ya salió de la finca (hoy = 2026-08-05), pero el evento es de
    // cuando estaba: se acepta con advertencia, nunca se bloquea.
    const resultado = evaluarAnimalEnFinca({
      fechaEvento: "2026-06-01",
      estadoActual: "muerto",
      fechaSalida: "2026-06-15",
    })

    expect(resultado).toEqual({ valido: true, capturaTardia: true })
  })
})

describe("RN-040: precio_dosis es snapshot del catálogo al aplicar", () => {
  it("cada aplicación construida lleva el precio del catálogo al momento de aplicar", () => {
    const filas = construirAplicacionesSanitarias({
      producto: { id: "prod-esp-aftosa", precioDosis: 3500 },
      animalIds: ["animal-mt-120", "animal-mt-121"],
      fecha: HOY,
      dosis: 2,
      proximaDosis: null,
      comentarios: null,
      registroGrupalId: null,
    })

    expect(filas.map((fila) => fila.precioDosis)).toEqual([3500, 3500])
  })

  it("cambiar el precio del producto después NO altera las filas ya construidas", () => {
    const producto = { id: "prod-esp-aftosa", precioDosis: 3500 as number | null }
    const filas = construirAplicacionesSanitarias({
      producto,
      animalIds: ["animal-mt-120"],
      fecha: HOY,
      dosis: 1,
      proximaDosis: null,
      comentarios: null,
      registroGrupalId: null,
    })

    producto.precioDosis = 9999

    expect(filas[0]?.precioDosis).toBe(3500)
  })

  it("un producto sin precio produce snapshot null (aplicación sin costear, KPI-08)", () => {
    const filas = construirAplicacionesSanitarias({
      producto: { id: "prod-sin-precio", precioDosis: null },
      animalIds: ["animal-mt-120"],
      fecha: HOY,
      dosis: 1,
      proximaDosis: null,
      comentarios: null,
      registroGrupalId: null,
    })

    expect(filas[0]?.precioDosis).toBeNull()
  })
})

describe("RN-041: stock siempre calculado, nunca un campo mutable", () => {
  it("stock = Σ entradas.dosis − Σ aplicaciones.dosis", () => {
    const stock = calcularStockDisponible(
      [{ dosis: 150 }, { dosis: 50 }],
      [{ dosis: 1 }, { dosis: 3 }],
    )

    expect(stock).toBe(196)
  })

  it("sin entradas ni aplicaciones el stock es 0", () => {
    expect(calcularStockDisponible([], [])).toBe(0)
  })

  it("el stock puede quedar negativo: es alerta de reconciliación, no error", () => {
    const stock = calcularStockDisponible([{ dosis: 5 }], [{ dosis: 8 }])

    expect(stock).toBe(-3)
    expect(esAlertaReconciliacionStock(stock)).toBe(true)
    expect(esAlertaReconciliacionStock(0)).toBe(false)
    expect(esAlertaReconciliacionStock(10)).toBe(false)
  })

  it("KPI-10: estados agotado (≤0), bajo (< umbral), ok — el umbral es un parámetro (T-001)", () => {
    expect(estadoStockSanidad(-3, 20)).toBe("agotado")
    expect(estadoStockSanidad(0, 20)).toBe("agotado")
    expect(estadoStockSanidad(19, 20)).toBe("bajo")
    expect(estadoStockSanidad(20, 20)).toBe("ok")
    expect(estadoStockSanidad(5, 5)).toBe("ok")
  })
})

describe("RN-042: la aplicación auto-completa el refuerzo pendiente del mismo producto", () => {
  it("auto-completa el refuerzo de la última aplicación cuando proxima_dosis ≤ fecha nueva", () => {
    const refuerzos = refuerzosAutoCompletados(
      [{ id: "app-1", animalId: "animal-mt-120", fecha: "2026-01-10", proximaDosis: "2026-07-10" }],
      "2026-08-01",
    )

    expect(refuerzos).toEqual(["app-1"])
  })

  it("no auto-completa cuando proxima_dosis es posterior a la fecha de aplicación", () => {
    const refuerzos = refuerzosAutoCompletados(
      [{ id: "app-1", animalId: "animal-mt-120", fecha: "2026-01-10", proximaDosis: "2026-09-10" }],
      "2026-08-01",
    )

    expect(refuerzos).toEqual([])
  })

  it("sólo la última aplicación por animal puede tener refuerzo pendiente (KPI-09)", () => {
    const refuerzos = refuerzosAutoCompletados(
      [
        { id: "app-1", animalId: "animal-mt-120", fecha: "2026-01-10", proximaDosis: "2026-06-10" },
        { id: "app-2", animalId: "animal-mt-120", fecha: "2026-06-20", proximaDosis: "2026-12-20" },
      ],
      "2026-07-01",
    )

    // app-1 ya fue superada por app-2 (aplicación posterior): no está pendiente.
    expect(refuerzos).toEqual([])
  })

  it("evalúa cada animal de forma independiente", () => {
    const refuerzos = refuerzosAutoCompletados(
      [
        { id: "app-a", animalId: "animal-mt-120", fecha: "2026-01-10", proximaDosis: "2026-07-01" },
        { id: "app-b", animalId: "animal-mt-121", fecha: "2026-02-10", proximaDosis: "2026-07-15" },
      ],
      "2026-07-10",
    )

    expect(refuerzos).toEqual(["app-a"])
  })

  it("una aplicación sin proxima_dosis nunca genera refuerzo", () => {
    const refuerzos = refuerzosAutoCompletados(
      [{ id: "app-1", animalId: "animal-mt-120", fecha: "2026-01-10", proximaDosis: null }],
      "2026-08-01",
    )

    expect(refuerzos).toEqual([])
  })

  it("fecha nueva igual a proxima_dosis auto-completa (límite ≤)", () => {
    const refuerzos = refuerzosAutoCompletados(
      [{ id: "app-1", animalId: "animal-mt-120", fecha: "2026-01-10", proximaDosis: "2026-08-01" }],
      "2026-08-01",
    )

    expect(refuerzos).toEqual(["app-1"])
  })
})

describe("RN-051: anulación de registro grupal", () => {
  it("las aplicaciones de un grupo anulado se excluyen del stock calculado", () => {
    const stock = calcularStockDisponible(
      [{ dosis: 100 }],
      [
        { dosis: 10, anulada: false },
        { dosis: 30, anulada: true },
      ],
    )

    expect(stock).toBe(90)
  })

  it("valida la anulación: registro inexistente → motivo no_encontrado", () => {
    const resultado = validarAnulacionRegistroGrupal(null)

    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.motivo).toBe("no_encontrado")
    }
  })

  it("valida la anulación: registro ya anulado → motivo ya_anulado (sin edición parcial)", () => {
    const resultado = validarAnulacionRegistroGrupal({ anuladoEn: "2026-08-01T10:00:00.000Z" })

    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.motivo).toBe("ya_anulado")
      expect(resultado.error.campo).toBe("registro_grupal")
    }
  })

  it("valida la anulación: registro vigente → válido", () => {
    const resultado = validarAnulacionRegistroGrupal({ anuladoEn: null })
    expect(resultado).toEqual({ valido: true })
  })
})

describe("RN-052: captura 1..N animales y cabecera grupal", () => {
  it("rechaza una captura sin animales", () => {
    const resultado = validarCantidadAnimalesSanidad(0)

    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.error.campo).toBe("animales")
      expect(resultado.error.detalle).toContain("RN-052")
    }
  })

  it("rechaza cantidades no enteras o negativas", () => {
    expect(validarCantidadAnimalesSanidad(-1).valido).toBe(false)
    expect(validarCantidadAnimalesSanidad(1.5).valido).toBe(false)
    expect(validarCantidadAnimalesSanidad(Number.NaN).valido).toBe(false)
  })

  it("acepta 1 animal sin cabecera y N>1 con cabecera", () => {
    expect(validarCantidadAnimalesSanidad(1)).toEqual({ valido: true })
    expect(validarCantidadAnimalesSanidad(17)).toEqual({ valido: true })

    expect(planificarRegistroGrupal(1).requiereCabecera).toBe(false)
    const plan = planificarRegistroGrupal(17)
    expect(plan.requiereCabecera).toBe(true)
    expect(plan.tipoEvento).toBe("tratamiento")
    expect(plan.totalAnimales).toBe(17)
  })

  it("la cabecera exige total_animales = filas hijas creadas", () => {
    expect(validarCabeceraRegistroGrupal({ totalAnimales: 3, filasHijas: 3 })).toEqual({
      valido: true,
    })

    const invalido = validarCabeceraRegistroGrupal({ totalAnimales: 3, filasHijas: 2 })
    expect(invalido.valido).toBe(false)
    if (!invalido.valido) {
      expect(invalido.error.campo).toBe("total_animales")
      expect(invalido.error.detalle).toContain("RN-052")
    }
  })

  it("construye una fila por animal con los datos comunes de la captura", () => {
    const filas = construirAplicacionesSanitarias({
      producto: { id: "prod-esp-aftosa", precioDosis: 3500 },
      animalIds: ["animal-mt-120", "animal-mt-121", "animal-mt-122"],
      fecha: "2026-06-20",
      dosis: 2,
      proximaDosis: "2026-12-20",
      comentarios: "Vacunación lote",
      registroGrupalId: "rg-1",
    })

    expect(filas).toHaveLength(3)
    expect(filas.map((fila) => fila.animalId)).toEqual([
      "animal-mt-120",
      "animal-mt-121",
      "animal-mt-122",
    ])
    for (const fila of filas) {
      expect(fila.productoId).toBe("prod-esp-aftosa")
      expect(fila.fecha).toBe("2026-06-20")
      expect(fila.dosis).toBe(2)
      expect(fila.proximaDosis).toBe("2026-12-20")
      expect(fila.comentarios).toBe("Vacunación lote")
      expect(fila.registroGrupalId).toBe("rg-1")
    }
  })

  it("registro individual (N=1) no lleva cabecera: registroGrupalId null", () => {
    const filas = construirAplicacionesSanitarias({
      producto: { id: "prod-esp-iverm", precioDosis: 1800 },
      animalIds: ["animal-mt-124"],
      fecha: "2026-06-25",
      dosis: 1,
      proximaDosis: null,
      comentarios: null,
      registroGrupalId: null,
    })

    expect(filas[0]?.registroGrupalId).toBeNull()
  })
})

describe("SAN-030: validarEntradaAlmacen — entradas de almacén (Issue #210)", () => {
  function captura(overrides: Partial<CapturaEntradaAlmacen> = {}): CapturaEntradaAlmacen {
    return {
      productoId: "prod-aftosa",
      fecha: "2026-08-01",
      dosis: 100,
      precioPorDosis: 3500,
      comentario: "Compra distribuidor",
      ...overrides,
    }
  }

  it("SAN-030: acepta una captura válida con precio y comentario", () => {
    const errores = validarEntradaAlmacen({ captura: captura(), hoy: HOY })
    expect(errores).toEqual([])
  })

  it("RN-002: rechaza una fecha futura en la entrada", () => {
    const errores = validarEntradaAlmacen({
      captura: captura({ fecha: "2026-08-06" }),
      hoy: HOY,
    })

    expect(errores).toHaveLength(1)
    expect(errores[0]?.campo).toBe("fecha")
    expect(errores[0]?.detalle).toContain("RN-002")
  })

  it("RN-002: acepta la fecha igual a hoy (límite: hoy no es futura)", () => {
    const errores = validarEntradaAlmacen({ captura: captura({ fecha: HOY }), hoy: HOY })
    expect(errores).toEqual([])
  })

  it("SAN-030: rechaza una fecha con formato inválido", () => {
    const errores = validarEntradaAlmacen({
      captura: captura({ fecha: "01/08/2026" }),
      hoy: HOY,
    })

    expect(errores).toHaveLength(1)
    expect(errores[0]?.campo).toBe("fecha")
  })

  it("SAN-030: rechaza dosis ≤ 0, no entera o no numérica", () => {
    for (const dosis of [0, -5, 2.5, Number.NaN]) {
      const errores = validarEntradaAlmacen({ captura: captura({ dosis }), hoy: HOY })

      expect(errores.some((error) => error.campo === "dosis")).toBe(true)
    }
  })

  it("SAN-030: rechaza el producto ausente (null o vacío)", () => {
    for (const productoId of [null, "", "   "]) {
      const errores = validarEntradaAlmacen({ captura: captura({ productoId }), hoy: HOY })

      expect(errores.some((error) => error.campo === "producto")).toBe(true)
    }
  })

  it("SAN-030: precio_por_dosis y comentario son opcionales", () => {
    const errores = validarEntradaAlmacen({
      captura: captura({ precioPorDosis: null, comentario: null }),
      hoy: HOY,
    })
    expect(errores).toEqual([])

    const sinOpcionales = validarEntradaAlmacen({
      captura: { productoId: "prod-aftosa", fecha: "2026-08-01", dosis: 10 },
      hoy: HOY,
    })
    expect(sinOpcionales).toEqual([])
  })

  it("SAN-030: rechaza un precio_por_dosis no numérico cuando está presente", () => {
    const errores = validarEntradaAlmacen({
      captura: captura({ precioPorDosis: Number.NaN }),
      hoy: HOY,
    })

    expect(errores).toHaveLength(1)
    expect(errores[0]?.campo).toBe("precio_por_dosis")
  })

  it("SAN-030: acumula todos los errores de una sola pasada", () => {
    const errores = validarEntradaAlmacen({
      captura: captura({ productoId: null, fecha: "2026-08-06", dosis: 0 }),
      hoy: HOY,
    })

    const campos = errores.map((error) => error.campo).sort()
    expect(campos).toEqual(["dosis", "fecha", "producto"])
  })
})

describe("ErrorValidacionSanidad: forma { campo, detalle }", () => {
  it("todos los errores producidos tienen exactamente la forma { campo, detalle }", () => {
    const errores: readonly ErrorValidacionSanidad[] = [
      ...validarFechaEventoSanidad({ fecha: "2027-01-01", hoy: HOY }),
      ...(() => {
        const resultado = validarTipoTratamiento("x")
        return resultado.valido ? [] : [resultado.error]
      })(),
      ...(() => {
        const resultado = validarCantidadAnimalesSanidad(0)
        return resultado.valido ? [] : [resultado.error]
      })(),
    ]

    expect(errores.length).toBeGreaterThanOrEqual(3)
    for (const error of errores) {
      expect(Object.keys(error).sort()).toEqual(["campo", "detalle"])
    }
  })
})

/* -------------------------------------------------------------------------- */
/* Issue #212 — Panel Sanidad: reglas puras del read model                    */
/* -------------------------------------------------------------------------- */

describe("Aritmética de fechas ISO (insumo de SAN-052/KPI-09/D-002)", () => {
  it("sumarDiasAFechaIso suma días cruzando mes y año", () => {
    expect(sumarDiasAFechaIso("2026-08-05", 30)).toBe("2026-09-04")
    expect(sumarDiasAFechaIso("2026-01-31", 1)).toBe("2026-02-01")
    expect(sumarDiasAFechaIso("2026-12-31", 1)).toBe("2027-01-01")
  })

  it("sumarDiasAFechaIso resta días con desplazamiento negativo", () => {
    expect(sumarDiasAFechaIso("2026-08-05", -30)).toBe("2026-07-06")
    expect(sumarDiasAFechaIso("2026-08-05", 0)).toBe("2026-08-05")
  })

  it("inicioSemanaIso/finSemanaIso: la semana natural va de lunes a domingo (SAN-052)", () => {
    // 2026-08-05 es miércoles; su semana natural: lunes 03 → domingo 09.
    expect(inicioSemanaIso("2026-08-05")).toBe("2026-08-03")
    expect(finSemanaIso("2026-08-05")).toBe("2026-08-09")
    // Extremos de la semana: lunes y domingo mapean a su propia semana.
    expect(inicioSemanaIso("2026-08-03")).toBe("2026-08-03")
    expect(finSemanaIso("2026-08-09")).toBe("2026-08-09")
    // Domingo: la semana natural NO salta a la siguiente (ISO lunes-domingo).
    expect(inicioSemanaIso("2026-08-09")).toBe("2026-08-03")
  })
})

describe("KPI-09/SAN-050: predicado de refuerzo pendiente", () => {
  it("está pendiente: proxima_dosis ≤ hoy+30, sin aplicación posterior y EN_FINCA", () => {
    const pendiente = esRefuerzoPendienteSanidad({
      proximaDosis: "2026-08-20",
      tieneAplicacionPosterior: false,
      animalEnFinca: true,
      hoy: HOY,
    })
    expect(pendiente).toBe(true)
  })

  it("límite KPI-09: proxima_dosis exactamente en hoy+30 sigue pendiente", () => {
    expect(
      esRefuerzoPendienteSanidad({
        proximaDosis: "2026-09-04", // HOY + 30
        tieneAplicacionPosterior: false,
        animalEnFinca: true,
        hoy: HOY,
      }),
    ).toBe(true)
  })

  it("fuera de la ventana KPI-09: proxima_dosis > hoy+30 no está pendiente", () => {
    expect(
      esRefuerzoPendienteSanidad({
        proximaDosis: "2026-09-05", // HOY + 31
        tieneAplicacionPosterior: false,
        animalEnFinca: true,
        hoy: HOY,
      }),
    ).toBe(false)
  })

  it("SAN-046/RN-042: con aplicación posterior del mismo producto ya no está pendiente", () => {
    expect(
      esRefuerzoPendienteSanidad({
        proximaDosis: "2026-08-20",
        tieneAplicacionPosterior: true,
        animalEnFinca: true,
        hoy: HOY,
      }),
    ).toBe(false)
  })

  it("SAN-050: solo animales EN_FINCA — fuera de la finca no está pendiente", () => {
    expect(
      esRefuerzoPendienteSanidad({
        proximaDosis: "2026-08-20",
        tieneAplicacionPosterior: false,
        animalEnFinca: false,
        hoy: HOY,
      }),
    ).toBe(false)
  })

  it("sin proxima_dosis no hay refuerzo pendiente", () => {
    expect(
      esRefuerzoPendienteSanidad({
        proximaDosis: null,
        tieneAplicacionPosterior: false,
        animalEnFinca: true,
        hoy: HOY,
      }),
    ).toBe(false)
  })

  it("refuerzo vencido (proxima_dosis en el pasado) sigue pendiente", () => {
    expect(
      esRefuerzoPendienteSanidad({
        proximaDosis: "2026-07-15",
        tieneAplicacionPosterior: false,
        animalEnFinca: true,
        hoy: HOY,
      }),
    ).toBe(true)
  })
})

function filaRefuerzo(overrides: Partial<RefuerzoPendienteFila> = {}): RefuerzoPendienteFila {
  return {
    productoId: "prod-aftosa",
    codigo: "VAC-AFTOSA",
    descripcion: "Vacuna fiebre aftosa",
    tipoTratamiento: "vacuna",
    animalId: "animal-1",
    proximaDosis: "2026-08-05",
    ...overrides,
  }
}

describe("SAN-052: agruparRefuerzosPorSemana — Esta semana / Próxima semana / Este mes", () => {
  it("ubica cada refuerzo en su período de semana natural", () => {
    const resultado = agruparRefuerzosPorSemana(
      [
        filaRefuerzo({ animalId: "a1", proximaDosis: "2026-08-05" }), // esta semana (miércoles)
        filaRefuerzo({ animalId: "a2", proximaDosis: "2026-08-12" }), // próxima semana
        filaRefuerzo({ animalId: "a3", proximaDosis: "2026-08-25" }), // este mes
      ],
      HOY,
    )

    expect(resultado.estaSemana).toHaveLength(1)
    expect(resultado.proximaSemana).toHaveLength(1)
    expect(resultado.esteMes).toHaveLength(1)
    expect(resultado.estaSemana[0]?.cantidadAnimales).toBe(1)
    expect(resultado.estaSemana[0]?.venceFecha).toBe("2026-08-05")
    expect(resultado.proximaSemana[0]?.venceFecha).toBe("2026-08-12")
    expect(resultado.esteMes[0]?.venceFecha).toBe("2026-08-25")
  })

  it("límites de período: domingo de esta semana y lunes de la próxima", () => {
    const resultado = agruparRefuerzosPorSemana(
      [
        filaRefuerzo({ animalId: "a1", proximaDosis: "2026-08-09" }), // domingo: esta semana
        filaRefuerzo({ animalId: "a2", proximaDosis: "2026-08-10" }), // lunes: próxima semana
        filaRefuerzo({
          productoId: "prod-iverm",
          codigo: "IVERMECTINA",
          descripcion: "Ivermectina 1%",
          tipoTratamiento: "no_reproductivo",
          animalId: "a3",
          proximaDosis: "2026-08-16", // domingo: próxima semana
        }),
        filaRefuerzo({
          productoId: "prod-cepa",
          codigo: "VAC-CEPA",
          descripcion: "Vacuna cepa",
          animalId: "a4",
          proximaDosis: "2026-08-17", // lunes siguiente: este mes
        }),
      ],
      HOY,
    )

    expect(resultado.estaSemana.map((f) => f.venceFecha)).toEqual(["2026-08-09"])
    expect(resultado.proximaSemana.map((f) => f.venceFecha)).toEqual(["2026-08-10", "2026-08-16"])
    expect(resultado.esteMes.map((f) => f.venceFecha)).toEqual(["2026-08-17"])
  })

  it("un refuerzo vencido dentro de la semana actual cae en Esta semana", () => {
    // HOY es miércoles 2026-08-05; el lunes 2026-08-03 ya pasó pero sigue pendiente.
    const resultado = agruparRefuerzosPorSemana(
      [filaRefuerzo({ animalId: "a1", proximaDosis: "2026-08-03" })],
      HOY,
    )

    expect(resultado.estaSemana).toHaveLength(1)
    expect(resultado.estaSemana[0]?.venceFecha).toBe("2026-08-03")
    expect(resultado.proximaSemana).toHaveLength(0)
    expect(resultado.esteMes).toHaveLength(0)
  })

  it("agrupa por producto dentro del período: N animales y vence más próximo (SAN-003)", () => {
    const resultado = agruparRefuerzosPorSemana(
      [
        filaRefuerzo({ animalId: "a1", proximaDosis: "2026-08-07" }),
        filaRefuerzo({ animalId: "a2", proximaDosis: "2026-08-05" }),
        filaRefuerzo({ animalId: "a3", proximaDosis: "2026-08-06" }),
      ],
      HOY,
    )

    expect(resultado.estaSemana).toHaveLength(1)
    const fila = resultado.estaSemana[0]
    expect(fila?.productoId).toBe("prod-aftosa")
    expect(fila?.cantidadAnimales).toBe(3)
    expect(fila?.venceFecha).toBe("2026-08-05") // el vence más próximo del grupo
  })

  it("el mismo producto en períodos distintos produce una fila por período", () => {
    const resultado = agruparRefuerzosPorSemana(
      [
        filaRefuerzo({ animalId: "a1", proximaDosis: "2026-08-06" }),
        filaRefuerzo({ animalId: "a2", proximaDosis: "2026-08-12" }),
      ],
      HOY,
    )

    expect(resultado.estaSemana).toHaveLength(1)
    expect(resultado.proximaSemana).toHaveLength(1)
    expect(resultado.estaSemana[0]?.productoId).toBe("prod-aftosa")
    expect(resultado.proximaSemana[0]?.productoId).toBe("prod-aftosa")
    expect(resultado.estaSemana[0]?.cantidadAnimales).toBe(1)
    expect(resultado.proximaSemana[0]?.cantidadAnimales).toBe(1)
  })

  it("defensa KPI-09: descarta filas fuera de la ventana hoy+30", () => {
    const resultado = agruparRefuerzosPorSemana(
      [filaRefuerzo({ animalId: "a1", proximaDosis: "2026-10-01" })],
      HOY,
    )

    expect(resultado.estaSemana).toHaveLength(0)
    expect(resultado.proximaSemana).toHaveLength(0)
    expect(resultado.esteMes).toHaveLength(0)
  })

  it("el mismo animal contado una sola vez por producto y período", () => {
    const resultado = agruparRefuerzosPorSemana(
      [
        filaRefuerzo({ animalId: "a1", proximaDosis: "2026-08-05" }),
        filaRefuerzo({ animalId: "a1", proximaDosis: "2026-08-06" }),
      ],
      HOY,
    )

    expect(resultado.estaSemana[0]?.cantidadAnimales).toBe(1)
  })

  it("propósito derivado del tipo de tratamiento (SAN-003)", () => {
    const resultado = agruparRefuerzosPorSemana(
      [
        filaRefuerzo({ animalId: "a1", proximaDosis: "2026-08-05", tipoTratamiento: "vacuna" }),
        filaRefuerzo({
          productoId: "prod-iverm",
          codigo: "IVERMECTINA",
          descripcion: "Ivermectina 1%",
          animalId: "a2",
          proximaDosis: "2026-08-05",
          tipoTratamiento: "no_reproductivo",
        }),
      ],
      HOY,
    )

    const porProducto = new Map(resultado.estaSemana.map((f) => [f.productoId, f.proposito]))
    expect(porProducto.get("prod-aftosa")).toBe("Vacuna")
    expect(porProducto.get("prod-iverm")).toBe("Tratamiento")
  })
})

describe("propositoProductoSanitario — propósito legible del producto (SAN-003)", () => {
  it("mapea los tres tipos de tratamiento a su propósito", () => {
    expect(propositoProductoSanitario("vacuna")).toBe("Vacuna")
    expect(propositoProductoSanitario("reproductivo")).toBe("Tratamiento reproductivo")
    expect(propositoProductoSanitario("no_reproductivo")).toBe("Tratamiento")
  })
})

describe("D-002: animales en tratamiento (tipo ≠ vacuna, últimos 30 días)", () => {
  it("cuenta animales distintos con tratamientos en los últimos 30 días", () => {
    const total = contarAnimalesEnTratamiento(
      [
        { animalId: "a1", tipoTratamiento: "no_reproductivo", fecha: "2026-08-01" },
        { animalId: "a2", tipoTratamiento: "reproductivo", fecha: "2026-07-20" },
        { animalId: "a3", tipoTratamiento: "vacuna", fecha: "2026-08-01" },
      ],
      HOY,
    )

    // a3 es vacuna (prevención, no tratamiento — D-002): no cuenta.
    expect(total).toBe(2)
  })

  it("el mismo animal con dos tratamientos cuenta una sola vez", () => {
    const total = contarAnimalesEnTratamiento(
      [
        { animalId: "a1", tipoTratamiento: "no_reproductivo", fecha: "2026-08-01" },
        { animalId: "a1", tipoTratamiento: "reproductivo", fecha: "2026-07-30" },
      ],
      HOY,
    )

    expect(total).toBe(1)
  })

  it("límite D-002: fecha exactamente en hoy-30 cuenta; un día antes no", () => {
    const enLimite = contarAnimalesEnTratamiento(
      [{ animalId: "a1", tipoTratamiento: "no_reproductivo", fecha: "2026-07-06" }], // HOY-30
      HOY,
    )
    const fueraDeLimite = contarAnimalesEnTratamiento(
      [{ animalId: "a1", tipoTratamiento: "no_reproductivo", fecha: "2026-07-05" }], // HOY-31
      HOY,
    )

    expect(enLimite).toBe(1)
    expect(fueraDeLimite).toBe(0)
  })

  it("aplicaciones futuras a hoy no cuentan (fecha de evento, no de captura)", () => {
    const total = contarAnimalesEnTratamiento(
      [{ animalId: "a1", tipoTratamiento: "no_reproductivo", fecha: "2026-08-06" }],
      HOY,
    )

    expect(total).toBe(0)
  })
})
