/**
 * redesign-ficha-animal (slice 2, tasks 2.1/2.2) — pure ficha derivations.
 *
 * Spec `animal-ficha-read-model`: age from fechaNacimiento, GDP from the two
 * latest weighings, reproductive summary derived ONLY from the event sequence
 * (TR-010/TR-014: the `categoria_reproductiva` cache is never an input).
 * TR-013: machos y pajuelas have no reproductive summary.
 *
 * Every function receives an injected `hoy` so the derivations are
 * deterministic (RelojDelSistemaPort rationale).
 */
import { describe, expect, it } from "vitest"
import { calcularEdadMeses, calcularGdp, derivarResumenReproductivo } from "../src/index.js"

const HOY = new Date(Date.UTC(2026, 7, 4)) // 2026-08-04

describe("calcularEdadMeses", () => {
  it("computes whole elapsed months from epoch-seconds birth date", () => {
    // 2024-01-15 → 2026-08-04: 31 calendar months minus one (day 4 < 15).
    const fechaNacimiento = Date.UTC(2024, 0, 15) / 1000
    expect(calcularEdadMeses(fechaNacimiento, HOY)).toBe(30)
  })

  it("counts the month when the birth day is already reached", () => {
    expect(calcularEdadMeses(Date.UTC(2026, 6, 4) / 1000, HOY)).toBe(1)
  })

  it("does not count the month before the birth day is reached", () => {
    expect(calcularEdadMeses(Date.UTC(2026, 6, 5) / 1000, HOY)).toBe(0)
  })

  it("returns absent age when fechaNacimiento is missing", () => {
    expect(calcularEdadMeses(null, HOY)).toBeNull()
    expect(calcularEdadMeses(undefined, HOY)).toBeNull()
  })
})

describe("calcularGdp", () => {
  it("derives kg/day between the two latest weighings", () => {
    const gdp = calcularGdp(
      { fecha: "2026-07-01", pesoKg: 410 },
      { fecha: "2026-06-01", pesoKg: 380 },
    )
    expect(gdp).toBe(1)
  })

  it("rounds the daily gain to two decimals", () => {
    const gdp = calcularGdp(
      { fecha: "2026-07-08", pesoKg: 400 },
      { fecha: "2026-07-01", pesoKg: 390 },
    )
    expect(gdp).toBe(1.43)
  })

  it("allows negative gain on weight loss", () => {
    const gdp = calcularGdp(
      { fecha: "2026-07-01", pesoKg: 350 },
      { fecha: "2026-06-01", pesoKg: 380 },
    )
    expect(gdp).toBe(-1)
  })

  it("returns absent GDP with a single weighing", () => {
    expect(calcularGdp({ fecha: "2026-07-01", pesoKg: 410 }, null)).toBeNull()
  })

  it("returns absent GDP without a latest weighing", () => {
    expect(calcularGdp(null, { fecha: "2026-06-01", pesoKg: 380 })).toBeNull()
    expect(calcularGdp(null, null)).toBeNull()
  })

  it("returns absent GDP when the interval is not positive", () => {
    expect(
      calcularGdp({ fecha: "2026-07-01", pesoKg: 410 }, { fecha: "2026-07-01", pesoKg: 400 }),
    ).toBeNull()
    expect(
      calcularGdp({ fecha: "2026-06-01", pesoKg: 410 }, { fecha: "2026-07-01", pesoKg: 400 }),
    ).toBeNull()
  })
})

describe("derivarResumenReproductivo", () => {
  const secuenciaCompleta = {
    sexo: "hembra" as const,
    // Deliberately unordered: the derivation must sort by fecha itself.
    servicios: [
      { fecha: "2025-05-01", tipo: "inseminacion", efectivo: true },
      { fecha: "2026-06-20", tipo: "inseminacion", efectivo: null },
      { fecha: "2025-02-10", tipo: "monta", efectivo: null },
    ],
    palpaciones: [
      { fecha: "2025-06-01", resultado: "vacia", diasGestacion: null },
      { fecha: "2026-07-15", resultado: "prenada", diasGestacion: 45 },
    ],
    partos: [
      { fecha: "2024-10-01", tipoParto: "aborto" },
      { fecha: "2025-03-01", tipoParto: "normal" },
      { fecha: "2024-03-01", tipoParto: "normal" },
    ],
  }

  it("derives the full summary from the event sequence (TR-014)", () => {
    const resumen = derivarResumenReproductivo({ ...secuenciaCompleta, hoy: HOY })
    expect(resumen).toEqual({
      ultimoServicio: { fecha: "2026-06-20", detalle: "inseminacion" },
      ultimaPalpacion: { fecha: "2026-07-15", resultado: "prenada" },
      // 45 days recorded at the 2026-07-15 palpation + 20 elapsed days.
      gestacionDias: 65,
      partos: { total: 3, ultimaFecha: "2025-03-01" },
      // KPI-03: 2024-03-01 → 2025-03-01, aborto excluded from the pair.
      iepDias: 365,
      // KPI-04: first efectivo=TRUE servicio after the last parto
      // (2025-03-01 → 2025-05-01).
      diasAbiertos: 61,
    })
  })

  it("returns empty summary for male animals (TR-013)", () => {
    expect(derivarResumenReproductivo({ ...secuenciaCompleta, sexo: "macho", hoy: HOY })).toBeNull()
  })

  it("returns empty summary for pajuela animals (TR-013)", () => {
    expect(
      derivarResumenReproductivo({ ...secuenciaCompleta, sexo: "pajuela", hoy: HOY }),
    ).toBeNull()
  })

  it("returns every field absent for a hembra without reproductive events", () => {
    const resumen = derivarResumenReproductivo({
      sexo: "hembra",
      servicios: [],
      palpaciones: [],
      partos: [],
      hoy: HOY,
    })
    expect(resumen).toEqual({
      ultimoServicio: null,
      ultimaPalpacion: null,
      gestacionDias: null,
      partos: null,
      iepDias: null,
      diasAbiertos: null,
    })
  })

  it("keeps días abiertos open against hoy when no servicio conceived after the last parto", () => {
    const resumen = derivarResumenReproductivo({
      sexo: "hembra",
      servicios: [
        // Before the last parto — must not count as conception.
        { fecha: "2025-01-10", tipo: "monta", efectivo: true },
        // After the last parto but efectivo=FALSE — not a conception.
        { fecha: "2026-06-01", tipo: "inseminacion", efectivo: false },
      ],
      palpaciones: [],
      partos: [{ fecha: "2026-05-01", tipoParto: "normal" }],
      hoy: HOY,
    })
    expect(resumen?.diasAbiertos).toBe(95) // 2026-05-01 → 2026-08-04
    expect(resumen?.iepDias).toBeNull()
  })

  it("returns absent gestation when the latest palpacion is not prenada", () => {
    const resumen = derivarResumenReproductivo({
      sexo: "hembra",
      servicios: [],
      palpaciones: [
        { fecha: "2026-07-15", resultado: "vacia", diasGestacion: null },
        { fecha: "2026-04-01", resultado: "prenada", diasGestacion: 60 },
      ],
      partos: [],
      hoy: HOY,
    })
    expect(resumen?.gestacionDias).toBeNull()
    expect(resumen?.ultimaPalpacion).toEqual({ fecha: "2026-07-15", resultado: "vacia" })
  })

  it("returns absent gestation when a prenada palpacion has no recorded days", () => {
    const resumen = derivarResumenReproductivo({
      sexo: "hembra",
      servicios: [],
      palpaciones: [{ fecha: "2026-07-15", resultado: "prenada", diasGestacion: null }],
      partos: [],
      hoy: HOY,
    })
    expect(resumen?.gestacionDias).toBeNull()
  })

  it("needs two non-aborto partos for IEP while the count includes every parto", () => {
    const resumen = derivarResumenReproductivo({
      sexo: "hembra",
      servicios: [],
      palpaciones: [],
      partos: [
        { fecha: "2025-03-01", tipoParto: "normal" },
        { fecha: "2024-10-01", tipoParto: "aborto" },
      ],
      hoy: HOY,
    })
    expect(resumen?.partos).toEqual({ total: 2, ultimaFecha: "2025-03-01" })
    expect(resumen?.iepDias).toBeNull()
  })
})
