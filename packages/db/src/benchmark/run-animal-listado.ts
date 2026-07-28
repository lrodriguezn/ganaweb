import { mkdir } from "node:fs/promises"
import { basename, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { DrizzleAnimalListadoReadModel } from "../animal-infrastructure.js"
import type { createClient } from "../client.js"
import {
  BENCHMARK_LOCK_NAME,
  BENCHMARK_SAMPLE_COUNT,
  BENCHMARK_WARMUP_COUNT,
  FIXTURE_VERSION,
  SCENARIO_MATRIX_VERSION,
  assertBenchmarkEnvironment,
  benchmarkScenarios,
  buildFailureReport,
  fixtureChecksum,
  fixtureSeedSql,
  runMeasuredScenario,
  writeImmutableRunArtifact,
} from "./animal-listado.js"

export const DISPOSABLE_BENCHMARK_DATABASE = "ganaweb_animal_listado_benchmark_disposable"

const MIGRATION_IDS = [
  "0000_initial",
  "0001_animal_sync_audit",
  "0002_animal_list_indexes",
  "0003_animal_list_unaccent",
  "0004_animal_list_page_index_covering",
] as const

export interface PlanEvidence {
  readonly name: "page" | "filtered-count" | "unfiltered-count"
  readonly sql: string
  readonly plan?: unknown
}

interface ManifestScenarioArtifacts {
  readonly id: string
  readonly samplesPath: string
  readonly statementsPath: string
  readonly planPaths: readonly string[]
}

export function buildRunManifest(input: {
  readonly runId: string
  readonly startedAt: string
  readonly fixtureChecksum: string
  readonly environmentPath: string
  readonly summaryPath: string
  readonly migrationIds: readonly string[]
  readonly scenarios: readonly ManifestScenarioArtifacts[]
}) {
  return {
    runId: input.runId,
    startedAt: input.startedAt,
    fixtureVersion: FIXTURE_VERSION,
    scenarioMatrixVersion: SCENARIO_MATRIX_VERSION,
    fixtureChecksum: input.fixtureChecksum,
    environment: { path: input.environmentPath, migrationIds: input.migrationIds },
    scenarios: input.scenarios,
    summary: { path: input.summaryPath, status: "pass" },
    publication: {
      immutable: true,
      method: "atomic-temp-then-rename",
      manifestPath: "manifest.json",
    },
  }
}

export function assertPlanEvidence(plans: readonly PlanEvidence[]): void {
  const names = plans.map((plan) => plan.name).sort()
  if (names.join(",") !== "filtered-count,page,unfiltered-count") {
    throw new Error("LA-102 requires exactly three plans: page, filtered-count, unfiltered-count")
  }
  if (plans.some((plan) => !plan.sql.trim())) throw new Error("LA-102 plans require SQL identity")
  if (plans.some((plan) => plan.plan === undefined)) {
    throw new Error("LA-102 plans require execution evidence")
  }
}

type PlanNode = Readonly<Record<string, unknown>>

function isPlanNode(value: unknown): value is PlanNode {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function planNodes(value: unknown): readonly PlanNode[] {
  if (Array.isArray(value)) return value.flatMap(planNodes)
  if (!isPlanNode(value)) return []
  return [value, ...Object.values(value).flatMap(planNodes)]
}

export function assertS02OrderedCompositeIndexPlan(plan: unknown): void {
  const cteScan = planNodes(plan).find(
    (node) => node["Node Type"] === "Subquery Scan" && node.Alias === "p",
  )
  if (!cteScan) throw new Error("LA-102 S02 plan requires the pagina CTE scan")
  const cteNodes = planNodes(cteScan.Plans)
  if (
    !cteNodes.some(
      (node) =>
        (node["Node Type"] === "Index Scan" || node["Node Type"] === "Index Only Scan") &&
        node["Index Name"] === "idx_animales_finca_activo_codigo",
    )
  ) {
    throw new Error("LA-102 S02 plan requires idx_animales_finca_activo_codigo")
  }
  if (cteNodes.some((node) => node["Node Type"] === "Sort")) {
    throw new Error("LA-102 S02 pagina CTE must use index order without a sort")
  }
}

/** Strict-IOS assertion: requires Index Only Scan on idx_animales_finca_activo_codigo with Heap Fetches: 0, no inner Sort in pagina CTE. Rejects Index Scan and Bitmap Index Scan. */
export function assertS02OrderedIndexOnlyScanPlan(plan: unknown): void {
  const cteScan = planNodes(plan).find(
    (node) => node["Node Type"] === "Subquery Scan" && node.Alias === "p",
  )
  if (!cteScan) throw new Error("LA-102 S02 plan requires the pagina CTE scan")
  const cteNodes = planNodes(cteScan.Plans)
  const ios = cteNodes.find(
    (node) =>
      node["Node Type"] === "Index Only Scan" &&
      node["Index Name"] === "idx_animales_finca_activo_codigo",
  )
  if (!ios) {
    throw new Error("S02 pagina CTE requires Index Only Scan on idx_animales_finca_activo_codigo")
  }
  if (Number(ios["Heap Fetches"]) !== 0) {
    throw new Error("S02 Index Only Scan must report Heap Fetches: 0 (visibility map not primed)")
  }
  if (cteNodes.some((node) => node["Node Type"] === "Sort")) {
    throw new Error("S02 pagina CTE must use index order without an inner sort")
  }
}

export function assertCompleteListadoTrace(
  statements: readonly { readonly query: string }[],
): void {
  if (statements.length !== 3) throw new Error("LA-103 requires exactly three statements")
  const [filtered, page, unfiltered] = statements
  if (!/\bselect\s+count\(\*\).*\bauthorized\b/isu.test(filtered?.query ?? ""))
    throw new Error("LA-103 first statement must combine authorization and filtered count")
  if (!/^\s*with\s+pagina\s+as\b/iu.test(page?.query ?? ""))
    throw new Error("LA-102 second statement must be the page query")
  if (
    !/\bselect\s+count\(\*\)/iu.test(unfiltered?.query ?? "") ||
    /\bjoin\b/iu.test(unfiltered?.query ?? "")
  )
    throw new Error("LA-102 third statement must be the unfiltered-count query")
}

async function capturePlanEvidence(
  client: ReturnType<typeof postgres>,
  statements: readonly { readonly query: string; readonly parameters: readonly unknown[] }[],
): Promise<readonly PlanEvidence[]> {
  const names = ["filtered-count", "page", "unfiltered-count"] as const
  assertCompleteListadoTrace(statements)
  const plans = await Promise.all(
    statements.map(async (statement, index) => {
      const name = names[index]
      if (!name) throw new Error("LA-102 requires exactly three named plans")
      return {
        name,
        sql: statement.query,
        plan: await client.unsafe(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${statement.query}`, [
          ...statement.parameters,
        ] as never[]),
      }
    }),
  )
  assertPlanEvidence(plans)
  return plans
}

export async function createRunDirectory(outputRoot: string, runId: string): Promise<string> {
  const directory = join(outputRoot, runId)
  await mkdir(outputRoot, { recursive: true })
  try {
    await mkdir(directory, { recursive: false })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(`Run directory ${runId} already exists and is immutable`)
    }
    throw error
  }
  return directory
}

async function resetAndSeedFixture(databaseUrl: string): Promise<void> {
  const client = postgres(databaseUrl, { max: 1 })
  try {
    await client.unsafe(fixtureSeedSql())
  } finally {
    await client.end({ timeout: 5 })
  }
}

async function queryEnvironment(db: ReturnType<typeof createClient>) {
  const [row] = (await db.execute(sql`
    SELECT
      current_setting('server_version_num') AS version_num,
      current_setting('TimeZone') AS time_zone,
      (SELECT datcollate FROM pg_database WHERE datname = current_database()) AS lc_collate,
      (SELECT datctype FROM pg_database WHERE datname = current_database()) AS lc_ctype,
      to_regprocedure('public.unaccent(text)') IS NOT NULL AS unaccent,
      pg_try_advisory_lock(hashtext(${BENCHMARK_LOCK_NAME})) AS lock_acquired,
      current_database() AS database
  `)) as Array<Record<string, unknown>>
  const text = (value: unknown) => String(value ?? "")
  return {
    postgresMajor: Math.floor(Number(text(row?.version_num)) / 10000),
    timeZone: text(row?.time_zone),
    lcCollate: text(row?.lc_collate),
    lcCtype: text(row?.lc_ctype),
    unaccent: row?.unaccent === true,
    lockAcquired: row?.lock_acquired === true,
    database: text(row?.database),
  }
}

export function assertDisposableBenchmarkTarget(
  databaseUrl: string,
  connectedDatabase?: string,
): void {
  const configuredDatabase = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//u, ""))
  if (configuredDatabase !== DISPOSABLE_BENCHMARK_DATABASE) {
    throw new Error(
      `BENCHMARK_DATABASE_URL must name the disposable database '${DISPOSABLE_BENCHMARK_DATABASE}'`,
    )
  }
  if (connectedDatabase !== undefined && connectedDatabase !== DISPOSABLE_BENCHMARK_DATABASE) {
    throw new Error(
      `Connected database must be the disposable database '${DISPOSABLE_BENCHMARK_DATABASE}'`,
    )
  }
}

function requireIsolatedTarget(): string {
  const databaseUrl = process.env.BENCHMARK_DATABASE_URL
  if (!databaseUrl)
    throw new Error("BENCHMARK_DATABASE_URL is required; DATABASE_URL is never used")
  assertDisposableBenchmarkTarget(databaseUrl)
  return databaseUrl
}

/**
 * Entry point for a deliberately isolated target. It verifies preconditions and
 * records a failure receipt rather than allowing a developer DB to become §11 evidence.
 * Fixture loading is intentionally performed by the target provisioning contract;
 * a successful run refuses any target that is not already the approved 17/UTC locale.
 */
export async function runAnimalListadoBenchmark(outputRoot: string): Promise<void> {
  const startedAt = new Date().toISOString()
  const runId = `${FIXTURE_VERSION}-${Date.now()}`
  let runDirectory: string | null = null
  let db: ReturnType<typeof createClient> | null = null
  let planClient: ReturnType<typeof postgres> | null = null
  const completedScenarioIds: string[] = []
  let completedSampleCount = 0
  try {
    const databaseUrl = requireIsolatedTarget()
    runDirectory = await createRunDirectory(outputRoot, runId)
    const statements: { query: string; parameters: readonly unknown[] }[] = []
    planClient = postgres(databaseUrl, {
      max: 1,
      debug: (_connection, query, parameters) => statements.push({ query, parameters }),
    })
    db = drizzle(planClient) as ReturnType<typeof createClient>
    const environment = await queryEnvironment(db)
    assertDisposableBenchmarkTarget(databaseUrl, environment.database)
    assertBenchmarkEnvironment(environment)
    await resetAndSeedFixture(databaseUrl)
    await writeImmutableRunArtifact(runDirectory, "environment.json", {
      runId,
      startedAt,
      fixtureVersion: FIXTURE_VERSION,
      scenarioMatrixVersion: SCENARIO_MATRIX_VERSION,
      ...environment,
      nodeVersion: process.version,
      fixtureChecksum: fixtureChecksum(),
      lockName: BENCHMARK_LOCK_NAME,
      concurrency: "none",
      migrationIds: MIGRATION_IDS,
    })
    const readModel = new DrizzleAnimalListadoReadModel(db)
    const summaries = []
    const scenarioArtifacts: ManifestScenarioArtifacts[] = []
    for (const scenario of benchmarkScenarios) {
      const measured = await runMeasuredScenario({
        warmups: BENCHMARK_WARMUP_COUNT,
        samples: BENCHMARK_SAMPLE_COUNT,
        invoke: async () => {
          const result = await readModel.listar(scenario.request)
          if (result.total !== scenario.expectedRows) {
            throw new Error(
              `${scenario.id} expected ${scenario.expectedRows} rows, got ${result.total}`,
            )
          }
          return { total: result.total, statementCount: readModel.lastStatementCount }
        },
      })
      completedSampleCount += measured.samplesMs.length
      await writeImmutableRunArtifact(
        runDirectory,
        `${scenario.id}.samples.json`,
        measured.samplesMs,
      )
      statements.length = 0
      await readModel.listar(scenario.request)
      const applicationStatements = statements.slice()
      const plans = await capturePlanEvidence(planClient, applicationStatements)
      await writeImmutableRunArtifact(runDirectory, `${scenario.id}.statements.json`, {
        scenarioId: scenario.id,
        statementCount: applicationStatements.length,
        perRowStatements: 0,
        la103: "pass",
      })
      for (const plan of plans) {
        await writeImmutableRunArtifact(runDirectory, `${scenario.id}.${plan.name}.plan.json`, plan)
      }
      scenarioArtifacts.push({
        id: scenario.id,
        samplesPath: `${scenario.id}.samples.json`,
        statementsPath: `${scenario.id}.statements.json`,
        planPaths: plans.map((plan) => `${scenario.id}.${plan.name}.plan.json`),
      })
      if (scenario.id === "S02") {
        const pagePlan = plans.find((plan) => plan.name === "page")
        assertS02OrderedCompositeIndexPlan(pagePlan?.plan)
      }
      if (!measured.passed)
        throw new Error(`${scenario.id} p95 ${measured.p95Ms}ms violates LA-100 <400ms`)
      completedScenarioIds.push(scenario.id)
      summaries.push({ scenarioId: scenario.id, ...measured })
    }
    await writeImmutableRunArtifact(runDirectory, "summary.json", {
      runId,
      summaries,
      status: "pass",
    })
    await writeImmutableRunArtifact(
      runDirectory,
      "manifest.json",
      buildRunManifest({
        runId,
        startedAt,
        fixtureChecksum: fixtureChecksum(),
        environmentPath: "environment.json",
        summaryPath: "summary.json",
        migrationIds: MIGRATION_IDS,
        scenarios: scenarioArtifacts,
      }),
    )
  } catch (error) {
    if (runDirectory) {
      const report = buildFailureReport({
        runId,
        phase: "benchmark",
        scenarioId: null,
        criterion: "contractual-run",
        expected: "isolated PostgreSQL 17 §11 evidence",
        observed: completedScenarioIds,
        error,
        startedAt,
        completedScenarioIds,
        completedSampleCount,
        artifactPaths: [runDirectory],
      })
      await writeImmutableRunArtifact(runDirectory, "failure.json", report)
    }
    throw error
  } finally {
    await planClient?.end({ timeout: 5 })
  }
}

async function main() {
  const packageRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)))
  const outputRoot = process.env.BENCHMARK_OUTPUT_DIR ?? join(packageRoot, "benchmark-runs")
  await runAnimalListadoBenchmark(outputRoot)
}

if (process.argv[1] && basename(process.argv[1]) === "run-animal-listado.ts") {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
