import { spawnSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import postgres from "postgres"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { fixtureSeedSql } from "../src/benchmark/animal-listado.js"
import {
  assertDisposableBenchmarkTarget,
  assertS02OrderedCompositeIndexPlan,
  assertS02OrderedIndexOnlyScanPlan,
} from "../src/benchmark/run-animal-listado.js"

const here = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(here, "..")
const S02 =
  "WITH pagina AS (SELECT a.id FROM animales a WHERE a.finca_id = $1 AND a.activo = 1 ORDER BY a.codigo ASC LIMIT $2 OFFSET $3) SELECT a.*, raza.nombre AS raza_nombre FROM pagina p JOIN animales a ON a.id = p.id LEFT JOIN config_razas raza ON raza.id = a.raza_id LEFT JOIN LATERAL (SELECT peso_kg FROM pesos WHERE animal_id = a.id ORDER BY fecha DESC LIMIT 1) ultimo_peso ON true ORDER BY a.codigo ASC, a.id ASC"
const P: readonly [string, number, number] = ["finca-A", 100, 800]

describe("vacuum-analyze disposable-fixture integration", () => {
  const benchmarkUrl = process.env.BENCHMARK_DATABASE_URL
  if (!benchmarkUrl) {
    it.skip("BENCHMARK_DATABASE_URL not set")
    return
  }
  try {
    assertDisposableBenchmarkTarget(benchmarkUrl)
  } catch (error) {
    it.skip(`Not the disposable target: ${error instanceof Error ? error.message : String(error)}`)
    return
  }

  let client: ReturnType<typeof postgres>
  beforeAll(async () => {
    client = postgres(benchmarkUrl, { max: 1 })
    await client.unsafe(fixtureSeedSql())
  })
  afterAll(async () => {
    await client?.end({ timeout: 5 })
  })

  it("(a) pre-VACUUM S02 plan is NOT strict IOS", async () => {
    const plan = await client.unsafe(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${S02}`,
      P as unknown as never[],
    )
    expect(() => assertS02OrderedCompositeIndexPlan(plan)).not.toThrow()
    expect(() => assertS02OrderedIndexOnlyScanPlan(plan)).toThrow()
  })

  it("(c) vacuum:analyze script exits 0", () => {
    const result = spawnSync("pnpm", ["--filter", "@ganaweb/db", "vacuum:analyze"], {
      cwd: packageRoot,
      env: { ...process.env, DATABASE_URL: benchmarkUrl },
      encoding: "utf-8",
    })
    expect(result.status).toBe(0)
  })

  it("(b) post-VACUUM S02 plan IS strict IOS, no inner Sort", async () => {
    const plan = await client.unsafe(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${S02}`,
      P as unknown as never[],
    )
    expect(() => assertS02OrderedIndexOnlyScanPlan(plan)).not.toThrow()
  })
})
