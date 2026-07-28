import { createHash, randomUUID } from "node:crypto"
import { access, mkdir, rename, writeFile } from "node:fs/promises"
import { join } from "node:path"
import type {
  AnimalListadoReadRequest,
  BenchmarkAnimalListadoReadRequest,
} from "@ganaweb/aplicacion"

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

export const FIXTURE_VERSION = "rf-anim-list-11-v2"
export const SCENARIO_MATRIX_VERSION = FIXTURE_VERSION
export const BENCHMARK_LOCK_NAME = "ganaweb:animal-listado:rf-anim-list-11-v2"
export const BENCHMARK_SAMPLE_COUNT = 100
export const BENCHMARK_WARMUP_COUNT = 20
export const P95_LIMIT_MS = 400

export interface BenchmarkScenario {
  readonly id: "S01" | "S02" | "S03" | "S04" | "S05" | "S06" | "S07"
  readonly request: AnimalListadoReadRequest | BenchmarkAnimalListadoReadRequest
  readonly expectedRows: number
  readonly fixtureVersion: typeof FIXTURE_VERSION
  readonly scenarioMatrixVersion: typeof SCENARIO_MATRIX_VERSION
}

const request = (overrides: Partial<AnimalListadoReadRequest> = {}): AnimalListadoReadRequest => ({
  usuarioId: "benchmark-reader",
  fincaId: "finca-A",
  page: 1,
  pageSize: 25,
  sort: "codigo:asc",
  q: null,
  filters: [],
  cols: ["codigo", "nombre"],
  ...overrides,
})

const scenario = (
  id: BenchmarkScenario["id"],
  expectedRows: number,
  overrides: Partial<AnimalListadoReadRequest>,
): BenchmarkScenario => ({
  id,
  request: request(overrides),
  expectedRows,
  fixtureVersion: FIXTURE_VERSION,
  scenarioMatrixVersion: SCENARIO_MATRIX_VERSION,
})

export const benchmarkScenarios: readonly BenchmarkScenario[] = [
  scenario("S01", 900, {}),
  scenario("S02", 900, { page: 9, pageSize: 100 }),
  scenario("S03", 225, {
    pageSize: 50,
    filters: [
      { key: "sexoKey", grammar: "in", value: "1" },
      { key: "tatuado", grammar: "bool", value: "true" },
    ],
  }),
  {
    id: "S04",
    expectedRows: 16,
    request: {
      ...createBenchmarkAnimalListadoRequest({ page: 2, pageSize: 10 }),
      sort: "fechaNacimiento:desc",
      filters: [
        { key: "razaId", grammar: "in", value: "raza-01" },
        { key: "fechaNacimiento", grammar: "drange", value: "2018-01-01,2021-12-31" },
      ],
    },
    fixtureVersion: FIXTURE_VERSION,
    scenarioMatrixVersion: SCENARIO_MATRIX_VERSION,
  },
  scenario("S05", 63, {
    page: 3,
    sort: "pesoUltimoKg:desc",
    filters: [{ key: "pesoUltimoKg", grammar: "range", value: "500,509" }],
  }),
  scenario("S06", 9, { q: "AUREA NANDU 07" }),
  scenario("S07", 90, {
    filters: [{ key: "estadoKey", grammar: "in", value: "1" }],
  }),
] as const

export const fixtureCohorts = { A: 1_000, B: 1_000, C: 1_000, activeRate: 0.9 } as const
export const fixtureExpectedCounts = {
  animals: 3_000,
  activePerFinca: 900,
  nullLatestWeights: 900,
  latestWeightHistories: { one: 700, three: 700, twelve: 700 },
} as const

/**
 * The reset is intentionally SQL rather than application fixtures: PostgreSQL can
 * generate the fixed 100k rows deterministically without JavaScript timing noise.
 * It only runs after the runner has rejected non-benchmark databases and acquired
 * the benchmark advisory lock.
 */
export function fixtureSeedSql(): string {
  return `
TRUNCATE TABLE pesos, animales, usuarios_roles_asignacion, usuarios_fincas,
  roles_permisos, usuarios_permisos, usuarios_roles, usuarios, fincas,
  config_razas, config_colores RESTART IDENTITY CASCADE;
INSERT INTO fincas (id, codigo, nombre, activo) VALUES
  ('finca-A', 'BENCH-A', 'Benchmark A', 1),
  ('finca-B', 'BENCH-B', 'Benchmark B', 1),
  ('finca-C', 'BENCH-C', 'Benchmark C', 1);
INSERT INTO usuarios (id, nombre, email, activo)
VALUES ('benchmark-reader', 'Benchmark Reader', 'benchmark-reader@example.invalid', 1);
INSERT INTO usuarios_roles (id, nombre, activo) VALUES ('benchmark-reader-role', 'Benchmark reader', 1);
INSERT INTO usuarios_permisos (id, modulo, accion, nombre, activo)
VALUES ('benchmark-animals-ver', 'animales', 'ver', 'Benchmark animal list', 1);
INSERT INTO roles_permisos (id, rol_id, permiso_id, activo)
VALUES ('benchmark-role-permission', 'benchmark-reader-role', 'benchmark-animals-ver', 1);
INSERT INTO usuarios_fincas (id, usuario_id, finca_id, activo)
VALUES ('benchmark-reader-finca-a', 'benchmark-reader', 'finca-A', 1);
INSERT INTO usuarios_roles_asignacion (id, usuario_id, rol_id, finca_id, activo)
VALUES ('benchmark-reader-role-a', 'benchmark-reader', 'benchmark-reader-role', 'finca-A', 1);
INSERT INTO config_razas (id, nombre, activo)
SELECT 'raza-' || lpad(n::text, 2, '0'), 'Benchmark raza ' || n, 1
FROM generate_series(1, 10) AS n;
INSERT INTO config_colores (id, nombre, activo)
SELECT 'color-' || lpad(n::text, 2, '0'), 'Benchmark color ' || n, 1
FROM generate_series(1, 10) AS n;
WITH source AS (
  SELECT n,
    CASE WHEN n <= 1000 THEN 'finca-A' WHEN n <= 2000 THEN 'finca-B' ELSE 'finca-C' END AS finca_id,
    CASE WHEN n <= 1000 THEN n WHEN n <= 2000 THEN n - 1000 ELSE n - 2000 END AS cohort_n
  FROM generate_series(1, 3000) AS n
)
INSERT INTO animales (id, finca_id, codigo, nombre, fecha_nacimiento, sexo_key, raza_id, color_id,
  estado_animal_key, tatuado, activo, usuario_creado_por)
SELECT 'benchmark-animal-' || n,
  finca_id,
  CASE WHEN finca_id = 'finca-A' THEN 'A' WHEN finca_id = 'finca-B' THEN 'B' ELSE 'C' END || lpad(cohort_n::text, 4, '0'),
  CASE WHEN finca_id = 'finca-A' AND cohort_n BETWEEN 305 AND 313 THEN 'AUREA NANDU 07' ELSE 'Benchmark animal ' || n END,
  EXTRACT(EPOCH FROM CASE WHEN finca_id = 'finca-A' AND cohort_n BETWEEN 226 AND 241 THEN date '2019-06-01' ELSE date '2010-01-01' + (n % 3000) END)::integer,
  CASE WHEN finca_id = 'finca-A' AND cohort_n <= 225 THEN 1 ELSE n % 3 END,
  CASE WHEN finca_id = 'finca-A' AND cohort_n BETWEEN 226 AND 241 THEN 'raza-01' WHEN cohort_n % 5 = 0 THEN NULL ELSE 'raza-' || lpad(((n - 1) % 10 + 1)::text, 2, '0') END,
  CASE WHEN cohort_n % 5 = 0 THEN NULL ELSE 'color-' || lpad(((n - 1) % 10 + 1)::text, 2, '0') END,
  CASE WHEN finca_id = 'finca-A' AND cohort_n <= 90 THEN 1 ELSE 0 END,
  finca_id = 'finca-A' AND cohort_n <= 225,
  CASE WHEN cohort_n <= 900 THEN 1 ELSE 0 END,
  'benchmark-reader'
FROM source;
WITH weighted AS (
  SELECT n, ((n - 1) % 1000) + 1 AS cohort_n,
    CASE WHEN n % 3 = 1 THEN 1 WHEN n % 3 = 2 THEN 3 ELSE 12 END AS weight_count
  FROM generate_series(1, 3000) AS n
  WHERE ((n - 1) % 1000) + 1 <= 700
)
INSERT INTO pesos (id, animal_id, fecha, peso_kg, tipo_peso)
-- Exactly 63 active A animals have a latest 505kg weight for S05.
SELECT 'benchmark-weight-' || n || '-' || sequence,
  'benchmark-animal-' || n,
  date '2024-01-01' + sequence,
  CASE WHEN n BETWEEN 242 AND 304 AND sequence = weight_count THEN 505 ELSE 450 END,
  'control'
FROM weighted CROSS JOIN LATERAL generate_series(1, weight_count) AS sequence;
ANALYZE;
`
}

/** Stable fixture identity, never a measurement of a generated database. */
export function fixtureChecksum(): string {
  return createHash("sha256")
    .update(JSON.stringify({ fixtureVersion: FIXTURE_VERSION, fixtureCohorts, benchmarkScenarios }))
    .digest("hex")
}

export function assertContractualScenario(candidate: BenchmarkScenario): void {
  const expected = benchmarkScenarios.find((scenario) => scenario.id === candidate.id)
  if (!expected || JSON.stringify(candidate) !== JSON.stringify(expected)) {
    throw new Error(
      `Scenario ${candidate.id} does not match the ${SCENARIO_MATRIX_VERSION} contract`,
    )
  }
}

export function nearestRank(samples: readonly number[], percentile: number): number {
  if (!Number.isInteger(percentile) || percentile < 1 || percentile > 100 || samples.length === 0) {
    throw new Error("nearest-rank requires non-empty samples and a percentile from 1 through 100")
  }
  const sorted = [...samples].sort((a, b) => a - b)
  return sorted[Math.ceil((percentile / 100) * sorted.length) - 1] as number
}

export interface MeasuredInvocation {
  readonly total: number
  readonly statementCount: number
}

export interface MeasuredScenario {
  readonly samplesMs: readonly number[]
  readonly p50Ms: number
  readonly p95Ms: number
  readonly p99Ms: number
  readonly passed: boolean
}

export async function runMeasuredScenario(input: {
  readonly warmups: number
  readonly samples: number
  readonly invoke: () => Promise<MeasuredInvocation>
  readonly nowNs?: () => bigint
}): Promise<MeasuredScenario> {
  if (input.samples !== BENCHMARK_SAMPLE_COUNT)
    throw new Error("Contractual measurement requires 100 samples")
  const nowNs = input.nowNs ?? process.hrtime.bigint
  for (let index = 0; index < input.warmups; index += 1) await input.invoke()
  const samplesMs: number[] = []
  for (let index = 0; index < input.samples; index += 1) {
    const started = nowNs()
    const result = await input.invoke()
    if (result.statementCount !== 3) throw new Error("LA-103 requires exactly three statements")
    samplesMs.push(Number(nowNs() - started) / 1_000_000)
  }
  const p50Ms = nearestRank(samplesMs, 50)
  const p95Ms = nearestRank(samplesMs, 95)
  const p99Ms = nearestRank(samplesMs, 99)
  return { samplesMs, p50Ms, p95Ms, p99Ms, passed: p95Ms < P95_LIMIT_MS }
}

export interface BenchmarkEnvironment {
  readonly postgresMajor: number
  readonly timeZone: string
  readonly lcCollate: string
  readonly lcCtype: string
  readonly unaccent: boolean
  readonly lockAcquired: boolean
}

export function assertBenchmarkEnvironment(environment: BenchmarkEnvironment): void {
  if (environment.postgresMajor !== 17)
    throw new Error("Contractual benchmark requires PostgreSQL 17")
  if (environment.timeZone !== "UTC") throw new Error("Contractual benchmark requires UTC")
  if (environment.lcCollate !== "es_CO.UTF-8" || environment.lcCtype !== "es_CO.UTF-8") {
    throw new Error("Contractual benchmark requires es_CO.UTF-8 locale")
  }
  if (!environment.unaccent) throw new Error("Contractual benchmark requires public.unaccent")
  if (!environment.lockAcquired)
    throw new Error("Contractual benchmark requires the exclusive advisory lock")
}

export interface BenchmarkFailureInput {
  readonly runId: string
  readonly phase: string
  readonly scenarioId: BenchmarkScenario["id"] | null
  readonly criterion: string
  readonly expected: unknown
  readonly observed: unknown
  readonly error: unknown
  readonly startedAt: string
  readonly completedScenarioIds: readonly string[]
  readonly completedSampleCount: number
  readonly artifactPaths: readonly string[]
}

export function buildFailureReport(input: BenchmarkFailureInput) {
  const error = input.error instanceof Error ? input.error : new Error(String(input.error))
  return {
    ...input,
    fixtureVersion: FIXTURE_VERSION,
    scenarioMatrixVersion: SCENARIO_MATRIX_VERSION,
    errorName: error.name,
    errorMessage: error.message,
    failedAt: new Date().toISOString(),
  }
}

/** Write atomically and fail closed if an evidence name is already finalized. */
export async function writeImmutableRunArtifact(
  directory: string,
  name: string,
  value: unknown,
): Promise<string> {
  await mkdir(directory, { recursive: true })
  const target = join(directory, name)
  try {
    await access(target)
    throw new Error(`Artifact ${name} already exists and is immutable`)
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("ENOENT")) {
      if (error instanceof Error && error.message.includes("already exists")) throw error
    }
  }
  const temporary = join(directory, `.${name}.${randomUUID()}.tmp`)
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  })
  await rename(temporary, target)
  return target
}
