import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { BenchmarkAnimalListadoReadRequest } from "@ganaweb/aplicacion"

/** Inlined from @ganaweb/aplicacion to satisfy db-to-aplicacion-runtime layer rule (type-only imports allowed). */
function createBenchmarkAnimalListadoRequest(
  overrides: Pick<BenchmarkAnimalListadoReadRequest, "page" | "pageSize">,
): BenchmarkAnimalListadoReadRequest {
  if (overrides.pageSize !== 10) throw new Error("Benchmark page size must be 10")
  return {
    usuarioId: "benchmark-reader",
    fincaId: "finca-A",
    page: overrides.page,
    pageSize: 10,
    sort: "codigo:asc",
    q: null,
    filters: [],
    cols: ["codigo", "nombre"],
  }
}
import { describe, expect, it } from "vitest"
import {
  BENCHMARK_LOCK_NAME,
  type BenchmarkScenario,
  FIXTURE_VERSION,
  SCENARIO_MATRIX_VERSION,
  assertBenchmarkEnvironment,
  assertContractualScenario,
  benchmarkScenarios,
  buildFailureReport,
  fixtureChecksum,
  fixtureCohorts,
  fixtureExpectedCounts,
  fixtureSeedSql,
  nearestRank,
  runMeasuredScenario,
  writeImmutableRunArtifact,
} from "../src/benchmark/animal-listado.js"
import {
  DISPOSABLE_BENCHMARK_DATABASE,
  assertCompleteListadoTrace,
  assertDisposableBenchmarkTarget,
  assertPlanEvidence,
  assertS02OrderedCompositeIndexPlan,
  buildRunManifest,
  createRunDirectory,
} from "../src/benchmark/run-animal-listado.js"

describe("animal listado §11 benchmark contract", () => {
  it("binds the fixed fixture cohorts and reproducible S07 selection", () => {
    expect(FIXTURE_VERSION).toBe("rf-anim-list-11-v2")
    expect(SCENARIO_MATRIX_VERSION).toBe(FIXTURE_VERSION)
    expect(BENCHMARK_LOCK_NAME).toBe("ganaweb:animal-listado:rf-anim-list-11-v2")
    expect(fixtureCohorts).toEqual({ A: 1_000, B: 1_000, C: 1_000, activeRate: 0.9 })
    expect(fixtureExpectedCounts).toEqual({
      animals: 3_000,
      activePerFinca: 900,
      nullLatestWeights: 900,
      latestWeightHistories: { one: 700, three: 700, twelve: 700 },
    })
    expect(fixtureChecksum()).toMatch(/^[a-f0-9]{64}$/)

    const s07 = benchmarkScenarios.find((scenario) => scenario.id === "S07")
    expect(s07).toMatchObject({
      expectedRows: 90,
      request: {
        usuarioId: "benchmark-reader",
        fincaId: "finca-A",
        page: 1,
        pageSize: 25,
        sort: "codigo:asc",
        q: null,
        cols: ["codigo", "nombre"],
        filters: [{ key: "estadoKey", grammar: "in", value: "1" }],
      },
    })
  })

  it("declares a deterministic database reset with all fixture distributions", () => {
    const seedSql = fixtureSeedSql()
    expect(seedSql).toContain("TRUNCATE")
    expect(seedSql).toContain("generate_series(1, 3000)")
    expect(seedSql).toContain("finca-A")
    expect(seedSql).toContain("900")
    expect(seedSql).toContain("63")
    expect(seedSql).toContain("((n - 1) % 1000) + 1 <= 700")
    expect(seedSql).toContain("ANALYZE")
  })

  it("permits destructive reset only for the exact disposable database identity", () => {
    const disposableUrl = `postgresql://postgres:postgres@localhost:5432/${DISPOSABLE_BENCHMARK_DATABASE}`

    expect(() => assertDisposableBenchmarkTarget(disposableUrl)).not.toThrow()
    expect(() =>
      assertDisposableBenchmarkTarget(disposableUrl, DISPOSABLE_BENCHMARK_DATABASE),
    ).not.toThrow()
    expect(() =>
      assertDisposableBenchmarkTarget(
        "postgresql://postgres:postgres@localhost:5432/production_benchmark",
      ),
    ).toThrow("must name the disposable database")
    expect(() => assertDisposableBenchmarkTarget(disposableUrl, "ganaweb_production")).toThrow(
      "Connected database must be the disposable database",
    )
  })

  it("declares all seven exact scenarios and rejects altered contractual input", () => {
    expect(benchmarkScenarios.map((scenario) => [scenario.id, scenario.expectedRows])).toEqual([
      ["S01", 900],
      ["S02", 900],
      ["S03", 225],
      ["S04", 16],
      ["S05", 63],
      ["S06", 9],
      ["S07", 90],
    ])
    const s01 = benchmarkScenarios.find((scenario) => scenario.id === "S01")
    const s02 = benchmarkScenarios.find((scenario) => scenario.id === "S02")
    const s03 = benchmarkScenarios.find((scenario) => scenario.id === "S03")
    if (!s01 || !s02 || !s03) throw new Error("benchmark scenarios are incomplete")
    expect(s02.request).toMatchObject({
      usuarioId: "benchmark-reader",
      fincaId: "finca-A",
      page: 9,
      pageSize: 100,
      sort: "codigo:asc",
      q: null,
      filters: [],
      cols: ["codigo", "nombre"],
    })
    expect(() =>
      assertContractualScenario({
        ...(s01 as BenchmarkScenario),
        request: { ...s01.request, pageSize: 50 },
      }),
    ).toThrow("does not match")
    expect(() =>
      assertContractualScenario({
        ...(s03 as BenchmarkScenario),
        request: { ...s03.request, filters: [] },
      }),
    ).toThrow("does not match")
  })

  it("creates S04's page-size 10 request only through the benchmark adapter", () => {
    expect(createBenchmarkAnimalListadoRequest({ page: 2, pageSize: 10 })).toMatchObject({
      page: 2,
      pageSize: 10,
      usuarioId: "benchmark-reader",
      fincaId: "finca-A",
    })
  })

  it("uses nearest-rank percentiles and passes only 100 valid sub-threshold samples", async () => {
    expect(nearestRank([1, 2, 3, 4], 50)).toBe(2)
    expect(nearestRank([1, 2, 3, 4], 95)).toBe(4)
    const result = await runMeasuredScenario({
      warmups: 20,
      samples: 100,
      invoke: async () => ({ total: 63_000, statementCount: 3 }),
      nowNs: (() => {
        let tick = 0n
        return () => {
          tick += 1_000_000n
          return tick
        }
      })(),
    })
    expect(result).toMatchObject({ passed: true, p50Ms: 1, p95Ms: 1, p99Ms: 1 })
    expect(result.samplesMs).toHaveLength(100)
  })

  it("fails invalid samples, invocation errors, and a p95 at the 400ms boundary", async () => {
    await expect(
      runMeasuredScenario({
        warmups: 0,
        samples: 99,
        invoke: async () => ({ total: 1, statementCount: 3 }),
      }),
    ).rejects.toThrow("100 samples")
    await expect(
      runMeasuredScenario({
        warmups: 0,
        samples: 100,
        invoke: async () => {
          throw new Error("boom")
        },
      }),
    ).rejects.toThrow("boom")
    const result = await runMeasuredScenario({
      warmups: 0,
      samples: 100,
      invoke: async () => ({ total: 1, statementCount: 3 }),
      nowNs: (() => {
        let tick = 0n
        return () => {
          tick += 400_000_000n
          return tick
        }
      })(),
    })
    expect(result).toMatchObject({ passed: false, p95Ms: 400 })
  })

  it("rejects an unsafe environment and emits immutable artifacts with complete failures", async () => {
    expect(() =>
      assertBenchmarkEnvironment({
        postgresMajor: 16,
        timeZone: "UTC",
        lcCollate: "es_CO.UTF-8",
        lcCtype: "es_CO.UTF-8",
        unaccent: true,
        lockAcquired: true,
      }),
    ).toThrow("PostgreSQL 17")
    expect(() =>
      assertBenchmarkEnvironment({
        postgresMajor: 17,
        timeZone: "America/Bogota",
        lcCollate: "es_CO.UTF-8",
        lcCtype: "es_CO.UTF-8",
        unaccent: true,
        lockAcquired: true,
      }),
    ).toThrow("UTC")
    expect(() =>
      assertBenchmarkEnvironment({
        postgresMajor: 17,
        timeZone: "UTC",
        lcCollate: "es_CO.UTF-8",
        lcCtype: "es_CO.UTF-8",
        unaccent: true,
        lockAcquired: false,
      }),
    ).toThrow("advisory lock")

    const output = await mkdtemp(join(tmpdir(), "animal-listado-benchmark-"))
    try {
      const path = await writeImmutableRunArtifact(output, "manifest.json", {
        fixtureVersion: FIXTURE_VERSION,
      })
      expect(JSON.parse(await readFile(path, "utf8"))).toEqual({ fixtureVersion: FIXTURE_VERSION })
      await expect(writeImmutableRunArtifact(output, "manifest.json", {})).rejects.toThrow(
        "already exists",
      )
      expect(
        buildFailureReport({
          runId: "run-1",
          phase: "plans",
          scenarioId: "S04",
          criterion: "LA-102",
          expected: "three plans",
          observed: "two plans",
          error: new Error("missing plan"),
          startedAt: "2026-01-01T00:00:00.000Z",
          completedScenarioIds: ["S01"],
          completedSampleCount: 100,
          artifactPaths: [path],
        }),
      ).toMatchObject({
        runId: "run-1",
        criterion: "LA-102",
        errorMessage: "missing plan",
        completedSampleCount: 100,
      })
    } finally {
      await rm(output, { recursive: true, force: true })
    }
  })

  it("requires three named plans and a new immutable run directory", async () => {
    expect(() => assertPlanEvidence([])).toThrow("three plans")
    expect(() =>
      assertPlanEvidence([
        { name: "page", sql: "select 1" },
        { name: "filtered-count", sql: "select 2", plan: [] },
        { name: "unfiltered-count", sql: "select 3", plan: [] },
      ]),
    ).toThrow("execution evidence")
    expect(() =>
      assertPlanEvidence([
        { name: "page", sql: "select 1", plan: [] },
        { name: "filtered-count", sql: "select 2", plan: [] },
        { name: "unfiltered-count", sql: "select 3", plan: [] },
      ]),
    ).not.toThrow()

    const output = await mkdtemp(join(tmpdir(), "animal-listado-runs-"))
    try {
      const run = await createRunDirectory(output, "run-fixed")
      expect(run).toBe(join(output, "run-fixed"))
      await expect(createRunDirectory(output, "run-fixed")).rejects.toThrow("already exists")
      const nestedRun = await createRunDirectory(join(output, "new-output-root"), "run-nested")
      expect(nestedRun).toBe(join(output, "new-output-root", "run-nested"))
    } finally {
      await rm(output, { recursive: true, force: true })
    }
  })

  it("rejects incomplete or authorization-contaminated LA-103 traces", () => {
    const complete = [
      {
        query:
          "WITH authz AS (SELECT true AS authorized) SELECT CASE WHEN authorized THEN (SELECT count(*) FROM animales LEFT JOIN pesos ON true) ELSE 0 END AS count, authorized FROM authz",
      },
      { query: "WITH pagina AS (SELECT id FROM animales) SELECT * FROM pagina" },
      { query: "SELECT count(*) FROM animales WHERE activo = 1" },
    ]
    expect(() => assertCompleteListadoTrace(complete)).not.toThrow()
    const authorization = { query: "SELECT authorization AS authorized" }
    expect(() => assertCompleteListadoTrace([authorization, ...complete])).toThrow("exactly three")
    expect(() => assertCompleteListadoTrace([authorization, ...complete.slice(1)])).toThrow(
      "combine authorization",
    )
  })

  it("requires the S02 CTE to scan in codigo order through the composite index", () => {
    const orderedPlan = [
      {
        "QUERY PLAN": [
          {
            Plan: {
              "Node Type": "Subquery Scan",
              Alias: "p",
              Plans: [
                {
                  "Node Type": "Limit",
                  Plans: [
                    {
                      "Node Type": "Index Scan",
                      "Index Name": "idx_animales_finca_activo_codigo",
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    ]
    const bitmapAndSortPlan = [
      {
        "QUERY PLAN": [
          {
            Plan: {
              "Node Type": "Subquery Scan",
              Alias: "p",
              Plans: [
                {
                  "Node Type": "Limit",
                  Plans: [
                    {
                      "Node Type": "Sort",
                      Plans: [
                        {
                          "Node Type": "Bitmap Index Scan",
                          "Index Name": "idx_animales_finca_activo",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    ]

    expect(() => assertS02OrderedCompositeIndexPlan(orderedPlan)).not.toThrow()
    expect(() => assertS02OrderedCompositeIndexPlan(bitmapAndSortPlan)).toThrow(
      "idx_animales_finca_activo_codigo",
    )
  })

  it("binds a pass manifest to the run environment and its actual scenario artifacts", () => {
    const manifest = buildRunManifest({
      runId: "rf-anim-list-11-v2-test",
      startedAt: "2026-07-28T00:00:00.000Z",
      fixtureChecksum: fixtureChecksum(),
      environmentPath: "environment.json",
      summaryPath: "summary.json",
      migrationIds: ["0000_initial"],
      scenarios: [
        {
          id: "S01",
          samplesPath: "S01.samples.json",
          statementsPath: "S01.statements.json",
          planPaths: [
            "S01.filtered-count.plan.json",
            "S01.page.plan.json",
            "S01.unfiltered-count.plan.json",
          ],
        },
      ],
    })

    expect(manifest).toMatchObject({
      runId: "rf-anim-list-11-v2-test",
      fixtureVersion: FIXTURE_VERSION,
      scenarioMatrixVersion: SCENARIO_MATRIX_VERSION,
      fixtureChecksum: fixtureChecksum(),
      environment: { path: "environment.json", migrationIds: ["0000_initial"] },
      summary: { path: "summary.json", status: "pass" },
      scenarios: [
        {
          id: "S01",
          samplesPath: "S01.samples.json",
          planPaths: expect.arrayContaining(["S01.page.plan.json"]),
          statementsPath: "S01.statements.json",
        },
      ],
      publication: {
        immutable: true,
        method: "atomic-temp-then-rename",
        manifestPath: "manifest.json",
      },
    })
  })
})
