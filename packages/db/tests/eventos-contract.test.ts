import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { getTableColumns } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import {
  animalesCondicionCorporal,
  animalesUbicacionHistorico,
  aplicacionesSanitarias,
  muertes,
  palpaciones,
  partos,
  pesos,
  produccionesLacteas,
  registrosGrupales,
  revisionesVeterinarias,
  servicios,
  ventas,
} from "../src/schema/index.js"

describe("eventos persistence contract", () => {
  it("exposes group origin and the two missing child links", () => {
    expect(Object.keys(getTableColumns(registrosGrupales))).toEqual(
      expect.arrayContaining(["origenSeleccion", "grupoId", "motivoAnulacion", "corrigeAId"]),
    )
    expect(getTableColumns(muertes).registroGrupalId).toBeDefined()
    expect(getTableColumns(animalesCondicionCorporal).registroGrupalId).toBeDefined()
    for (const table of [
      servicios,
      palpaciones,
      partos,
      aplicacionesSanitarias,
      revisionesVeterinarias,
      pesos,
      produccionesLacteas,
      animalesCondicionCorporal,
      ventas,
      muertes,
      animalesUbicacionHistorico,
    ]) {
      expect(Object.keys(getTableColumns(table))).toEqual(
        expect.arrayContaining(["anuladoEn", "anuladoPor", "motivoAnulacion", "corrigeAId"]),
      )
    }
  })

  it("migrates existing group origins before enforcing the new contract", async () => {
    const migration = await readFile(
      fileURLToPath(new URL("../migrations/0009_eventos_contract.sql", import.meta.url)),
      "utf8",
    )
    const backfill = migration.indexOf('UPDATE "registros_grupales"')
    const notNull = migration.indexOf('ALTER COLUMN "origen_seleccion" SET NOT NULL')
    expect(backfill).toBeGreaterThan(-1)
    expect(notNull).toBeGreaterThan(backfill)
    expect(migration).toContain('REFERENCES "public"."servicios"("id")')
    expect(migration).toContain("ck_servicios_auditoria")
    expect(migration).toContain('FOREIGN KEY ("registro_grupal_id")')
  })
})
