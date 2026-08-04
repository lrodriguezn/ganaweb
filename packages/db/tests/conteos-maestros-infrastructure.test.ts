/**
 * Tests unitarios de la degradación por card del hub (issue #148, CM-014)
 * en `DrizzleConteosMaestrosAdapter` con un cliente FALSO (sin Postgres):
 * los conteos individuales devuelven el número de la query y NUNCA lanzan
 * — ante cualquier error devuelven `null` (el hub degrada la card).
 * Los valores reales contra Postgres viven en `maestro-listado-smoke.test.ts`.
 */

import { describe, expect, it } from "vitest"
import { DrizzleConteosMaestrosAdapter } from "../src/conteos-maestros-infrastructure.js"

/** Texto SQL de un statement (StringChunks), sin parámetros. */
function sqlText(statement: unknown): string {
  const partes: string[] = []
  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return
    const value = (node as { value?: unknown }).value
    if (Array.isArray(value)) {
      for (const parte of value) partes.push(String(parte))
      return
    }
    const chunks = (node as { queryChunks?: unknown[] }).queryChunks
    if (Array.isArray(chunks)) for (const chunk of chunks) walk(chunk)
  }
  walk(statement)
  return partes.join("")
}

function fakeDbQueResuelve(fila: Record<string, unknown>) {
  const statements: unknown[] = []
  const db = {
    execute: (statement: unknown) => {
      statements.push(statement)
      return Promise.resolve([fila])
    },
  }
  return { db, statements }
}

const DB_QUE_FALLA = {
  execute: () => Promise.reject(new Error("connection refused")),
}

describe("DrizzleConteosMaestrosAdapter — conteos individuales (CM-014)", () => {
  describe("contarPorFamilia", () => {
    it("conta registros activo=1 de la tabla de la finca", async () => {
      const { db, statements } = fakeDbQueResuelve({ cantidad: 3 })

      const resultado = await new DrizzleConteosMaestrosAdapter(db as never).contarPorFamilia(
        "finca-1",
        "potreros",
      )

      expect(resultado).toBe(3)
      const texto = sqlText(statements[0])
      expect(texto).toContain("FROM potreros WHERE")
      expect(texto).toContain("finca_id =")
      expect(texto).toContain("activo = 1")
    })

    it("usa la tabla con nombre SQL distinto al de la familia (diagnosticos)", async () => {
      const { db, statements } = fakeDbQueResuelve({ cantidad: 0 })

      const resultado = await new DrizzleConteosMaestrosAdapter(db as never).contarPorFamilia(
        "finca-1",
        "diagnosticos",
      )

      expect(resultado).toBe(0)
      expect(sqlText(statements[0])).toContain("FROM diagnosticos_veterinarios WHERE")
    })

    it("inseminadores: añade el filtro es_inseminador=1", async () => {
      const { db, statements } = fakeDbQueResuelve({ cantidad: 2 })

      const resultado = await new DrizzleConteosMaestrosAdapter(db as never).contarPorFamilia(
        "finca-1",
        "inseminadores",
      )

      expect(resultado).toBe(2)
      const texto = sqlText(statements[0])
      expect(texto).toContain("FROM veterinarios WHERE")
      expect(texto).toContain("es_inseminador = 1")
    })

    it("fincaCompleta: devuelve 1/0 con la condición de completitud de fincas", async () => {
      const completa = fakeDbQueResuelve({ cantidad: 1 })
      expect(
        await new DrizzleConteosMaestrosAdapter(completa.db as never).contarPorFamilia(
          "finca-1",
          "fincaCompleta",
        ),
      ).toBe(1)
      const texto = sqlText(completa.statements[0])
      expect(texto).toContain("FROM fincas WHERE")
      expect(texto).toContain("trim(nombre)")
      expect(texto).toContain("departamento")
      expect(texto).toContain("municipio")

      const incompleta = fakeDbQueResuelve({ cantidad: 0 })
      expect(
        await new DrizzleConteosMaestrosAdapter(incompleta.db as never).contarPorFamilia(
          "finca-1",
          "fincaCompleta",
        ),
      ).toBe(0)
    })

    it("devuelve null sin lanzar cuando la query falla", async () => {
      const adapter = new DrizzleConteosMaestrosAdapter(DB_QUE_FALLA as never)

      expect(await adapter.contarPorFamilia("finca-1", "potreros")).toBeNull()
      expect(await adapter.contarPorFamilia("finca-1", "inseminadores")).toBeNull()
      expect(await adapter.contarPorFamilia("finca-1", "fincaCompleta")).toBeNull()
    })
  })

  describe("contarCatalogoGlobal", () => {
    it("conta registros activo=1 de cada catálogo global", async () => {
      const razas = fakeDbQueResuelve({ cantidad: 7 })
      expect(
        await new DrizzleConteosMaestrosAdapter(razas.db as never).contarCatalogoGlobal("razas"),
      ).toBe(7)
      expect(sqlText(razas.statements[0])).toContain("FROM config_razas WHERE")

      const tipos = fakeDbQueResuelve({ cantidad: 4 })
      expect(
        await new DrizzleConteosMaestrosAdapter(tipos.db as never).contarCatalogoGlobal(
          "tiposExplotacion",
        ),
      ).toBe(4)
      expect(sqlText(tipos.statements[0])).toContain("FROM config_tipos_explotacion WHERE")

      const calidades = fakeDbQueResuelve({ cantidad: 2 })
      expect(
        await new DrizzleConteosMaestrosAdapter(calidades.db as never).contarCatalogoGlobal(
          "calidades",
        ),
      ).toBe(2)
      expect(sqlText(calidades.statements[0])).toContain("FROM config_calidad_animal WHERE")
    })

    it("devuelve null sin lanzar cuando la query falla", async () => {
      const adapter = new DrizzleConteosMaestrosAdapter(DB_QUE_FALLA as never)

      expect(await adapter.contarCatalogoGlobal("razas")).toBeNull()
      expect(await adapter.contarCatalogoGlobal("tiposExplotacion")).toBeNull()
      expect(await adapter.contarCatalogoGlobal("calidades")).toBeNull()
    })
  })
})
