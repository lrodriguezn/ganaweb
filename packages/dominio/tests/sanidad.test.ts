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
import type { ErrorValidacionSanidad } from "../src/index.js"
import {
  calcularStockDisponible,
  construirAplicacionesSanitarias,
  esAlertaReconciliacionStock,
  esFechaIso,
  estadoStockSanidad,
  evaluarAnimalEnFinca,
  planificarRegistroGrupal,
  refuerzosAutoCompletados,
  validarAnulacionRegistroGrupal,
  validarCabeceraRegistroGrupal,
  validarCantidadAnimalesSanidad,
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
