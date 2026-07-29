import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const migrations = {
  indexes: new URL("../migrations/0002_animal_list_indexes.sql", import.meta.url),
  unaccent: new URL("../migrations/0003_animal_list_unaccent.sql", import.meta.url),
  journal: new URL("../migrations/meta/_journal.json", import.meta.url),
}

describe("animal list migrations", () => {
  it("keeps the applied index migration unchanged", async () => {
    const migration = await readFile(fileURLToPath(migrations.indexes), "utf8")

    expect(migration).toBe(
      'CREATE INDEX "idx_animales_finca_activo_codigo" ON "animales" USING btree ("finca_id", "activo", "codigo");\n--> statement-breakpoint\nCREATE INDEX "idx_pesos_animal_fecha_id" ON "pesos" USING btree ("animal_id", "fecha" DESC, "id" DESC);\n',
    )
  })

  it("registers a forward public unaccent capability migration", async () => {
    const [migration, journal] = await Promise.all([
      readFile(fileURLToPath(migrations.unaccent), "utf8"),
      readFile(fileURLToPath(migrations.journal), "utf8"),
    ])

    expect(migration).toContain("CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public")
    expect(migration).toContain("to_regprocedure('public.unaccent(text)')")
    expect(migration).toContain(
      "has_function_privilege(current_user, 'public.unaccent(text)', 'EXECUTE')",
    )
    expect(migration).toContain("public.unaccent('Árbol')")
    expect(journal).toContain('"tag": "0003_animal_list_unaccent"')
  })
})

describe("concurrent index deploy script", () => {
  const scriptUrl = new URL("../scripts/concurrent-index-deploy.ts", import.meta.url)

  it("deploys and recovers the animal-list indexes concurrently, outside a transaction", async () => {
    const source = await readFile(fileURLToPath(scriptUrl), "utf8")

    expect(source).toContain("CREATE INDEX CONCURRENTLY")
    expect(source).toContain("REINDEX CONCURRENTLY")
    expect(source).toContain("pg_index")
    expect(source).toContain("indisvalid")
    expect(source).not.toMatch(/\.begin\(/)
    expect(source).not.toMatch(/\bBEGIN\b/)
  })
})
