import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { auditEventWrites, auditEventWritesInRepo } from "./support/event-write-guard.js"

const root = fileURLToPath(new URL("../../..", import.meta.url))

describe("event write architecture guard", () => {
  it("finds no event-write bypass across packages and apps", async () => {
    expect(await auditEventWritesInRepo(root)).toEqual([])
  }, 15_000)

  it.each([
    [
      "packages/x.ts",
      'import { pesos } from "@ganaweb/db"; const target = pesos; db.insert(target)',
    ],
    ["packages/x.ts", "sql`INSERT INTO public.pesos VALUES (1)`"],
    ["packages/x.ts", 'sql`INSERT INTO "public"."pesos" VALUES (1)`'],
    ["apps/web/src/bypass.ts", 'import { pesos as target } from "@ganaweb/db"; db.insert(target)'],
  ])("rejects adversarial writer %s", (file, source) => {
    expect(auditEventWrites(source, file)).not.toEqual([])
  })

  it("rejects an event table hidden behind a reexport alias", () => {
    expect(
      auditEventWrites(
        'import { evento } from "./event-tables"; db.insert(evento)',
        "packages/x.ts",
      ),
    ).toContainEqual({ file: "packages/x.ts", kind: "dynamic-insert" })
  })

  it("rejects event SQL composed from static string concatenation", () => {
    expect(
      auditEventWrites('sql("INSERT INTO " + "pesos VALUES (1)")', "packages/x.ts"),
    ).toContainEqual({ file: "packages/x.ts", kind: "event-sql" })
  })

  it("allows demonstrably safe direct schema inserts and static SQL", () => {
    expect(
      auditEventWrites(
        'import { usuarios } from "./schema"; db.insert(usuarios); sql("SELECT 1")',
        "packages/db/src/safe.ts",
      ),
    ).toEqual([])
  })

  it("allows dynamic writes only in their exact authorized files", () => {
    expect(
      auditEventWrites(
        "db.insert(config.table)",
        "packages/db/src/maestro-escritura-infrastructure.ts",
      ),
    ).toEqual([])
    expect(
      auditEventWrites('sql("INSERT INTO " + tableName)', "packages/db/src/seed/seed.ts"),
    ).toEqual([])
  })

  it("allows the exact internal gateway and rejects public export of it", async () => {
    expect(
      auditEventWrites(
        'import { registrosGrupales } from "./schema"; tx.insert(registrosGrupales)',
        "packages/db/src/evento-write-internal.ts",
      ),
    ).toEqual([])
    const packageJson = JSON.parse(
      await readFile(new URL("../package.json", import.meta.url), "utf8"),
    ) as { exports: Record<string, unknown> }
    expect(Object.keys(packageJson.exports)).toContain("./evento-write-authorized")
    expect(Object.keys(packageJson.exports)).not.toContain("./evento-write-internal")
  })
})
