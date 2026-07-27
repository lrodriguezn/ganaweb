import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const migrationUrl = new URL("../migrations/0002_animal_list_indexes.sql", import.meta.url)
const migration = await readFile(fileURLToPath(migrationUrl), "utf8")

assert.match(
  migration,
  /CREATE INDEX "idx_animales_finca_activo_codigo" ON "animales" USING btree \("finca_id", "activo", "codigo"\)/,
)
assert.match(
  migration,
  /CREATE INDEX "idx_pesos_animal_fecha_id" ON "pesos" USING btree \("animal_id", "fecha" DESC, "id" DESC\)/,
)

// biome-ignore lint/suspicious/noConsole: focused TDD harness progress output
console.log("✅ animal-list-indexes.test.ts passed")
