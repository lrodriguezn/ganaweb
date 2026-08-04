/**
 * LM-050 performance harness for the mobile animal listing (#155).
 *
 * Self-contained by design: the desktop `run-animal-listado.ts` harness is
 * contractually bound to the §11 LA-100/LA-102/LA-103 scenario matrix and a
 * TRUNCATE-based fixture on the disposable benchmark database, so the mobile
 * endpoint gets its own non-destructive harness instead. It seeds a prefixed
 * fixture into the target database (DATABASE_URL, default local dev DB),
 * measures warmup + sample iterations per scenario, captures EXPLAIN ANALYZE
 * evidence for the page statement, asserts p95 < 400 ms, and removes the
 * fixture on exit.
 *
 * Usage: pnpm --filter @ganaweb/db benchmark:animal-mobile-list
 */
import { randomUUID } from "node:crypto"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { DrizzleAnimalMobileListReadModel } from "../animal-mobile-list-infrastructure.js"
import type { createClient } from "../client.js"

const DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/ganaweb"
const ANIMAL_COUNT = 5000
const WARMUP_COUNT = 5
const SAMPLE_COUNT = 25
const P95_BUDGET_MS = 400

const fixture = `bml-${randomUUID().slice(0, 8)}`
const fincaId = `${fixture}-finca`
const usuarioId = `${fixture}-reader`
const roleId = `${fixture}-role`

function percentile(sorted: readonly number[], fraction: number): number {
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))
  return sorted[index] ?? Number.NaN
}

async function seed(client: ReturnType<typeof postgres>): Promise<void> {
  await client.unsafe(
    `
    INSERT INTO fincas (id, codigo, nombre) VALUES ($1, $2, 'Benchmark Móvil')
    `,
    [fincaId, `${fixture}-A`],
  )
  await client.unsafe(
    `
    INSERT INTO usuarios (id, nombre, email) VALUES ($1, 'Mobile reader', $2)
    `,
    [usuarioId, `${fixture}@example.invalid`],
  )
  await client.unsafe(`INSERT INTO usuarios_roles (id, nombre) VALUES ($1, 'Mobile reader')`, [
    roleId,
  ])
  await client.unsafe(
    `
    INSERT INTO roles_permisos (id, rol_id, permiso_id)
    SELECT $1, $2, id FROM usuarios_permisos WHERE modulo = 'animales' AND accion = 'ver'
    `,
    [`${fixture}-rp`, roleId],
  )
  await client.unsafe(
    `
    INSERT INTO usuarios_fincas (id, usuario_id, finca_id, activo) VALUES ($1, $2, $3, 1)
    `,
    [`${fixture}-membership`, usuarioId, fincaId],
  )
  await client.unsafe(
    `
    INSERT INTO usuarios_roles_asignacion (id, usuario_id, rol_id, finca_id, activo)
    VALUES ($1, $2, $3, $4, 1)
    `,
    [`${fixture}-assignment`, usuarioId, roleId, fincaId],
  )
  for (let index = 0; index < 10; index += 1) {
    await client.unsafe("INSERT INTO propietarios (id, finca_id, nombre) VALUES ($1, $2, $3)", [
      `${fixture}-prop-${index}`,
      fincaId,
      `Propietario ${index}`,
    ])
  }
  for (let index = 0; index < 5; index += 1) {
    await client.unsafe("INSERT INTO config_razas (id, nombre) VALUES ($1, $2)", [
      `${fixture}-raza-${index}`,
      `Raza ${index}`,
    ])
  }
  await client.unsafe(
    `
    INSERT INTO animales (
      id, finca_id, codigo, nombre, sexo_key, activo, estado_animal_key,
      salud_animal_key, categoria_reproductiva, raza_id, propietario_id,
      codigo_madre, codigo_arete, codigo_rfid, es_de_monta
    )
    SELECT
      $1 || '-' || lpad(s::text, 5, '0'),
      $2,
      'BM-' || lpad(s::text, 5, '0'),
      'Animal ' || s,
      CASE WHEN s % 10 = 0 THEN 0 WHEN s % 20 = 0 THEN 2 ELSE 1 END,
      CASE WHEN s % 50 = 0 THEN 0 ELSE 1 END,
      CASE WHEN s % 23 = 0 THEN 1 WHEN s % 29 = 0 THEN 2 ELSE 0 END,
      CASE WHEN s % 17 = 0 THEN 1 ELSE 0 END,
      CASE
        WHEN s % 10 = 0 OR s % 20 = 0 THEN 'no_aplica'
        ELSE (ARRAY['vacia','servida','prenada','parida','novilla'])[(s % 5) + 1]
      END,
      CASE WHEN s % 4 = 0 THEN $3 || '-raza-' || (s % 5) ELSE NULL END,
      CASE WHEN s % 3 = 0 THEN $3 || '-prop-' || (s % 10) ELSE NULL END,
      CASE WHEN s % 7 = 0 THEN 'EXT-' || s ELSE '' END,
      CASE WHEN s % 11 = 0 THEN 'ARETE-' || s ELSE '' END,
      CASE WHEN s % 13 = 0 THEN 'RFID-' || s ELSE '' END,
      CASE WHEN s % 40 = 0 THEN 1 ELSE 0 END
    FROM generate_series(1, $4) AS s
    `,
    [fixture, fincaId, fixture, ANIMAL_COUNT],
  )
  await client.unsafe(
    `
    UPDATE animales hija
    SET madre_id = madre.id
    FROM animales madre
    WHERE hija.finca_id = $1
      AND madre.finca_id = $1
      AND madre.id = $1 || '-' || lpad((substring(hija.codigo from 4)::int - 1)::text, 5, '0')
      AND substring(hija.codigo from 4)::int > 1
    `,
    [fixture],
  )
  await client.unsafe("ANALYZE animales")
}

async function cleanup(client: ReturnType<typeof postgres>): Promise<void> {
  await client.unsafe("DELETE FROM animales WHERE finca_id = $1", [fincaId])
  await client.unsafe("DELETE FROM usuarios_roles_asignacion WHERE id LIKE $1", [`${fixture}%`])
  await client.unsafe("DELETE FROM roles_permisos WHERE id LIKE $1", [`${fixture}%`])
  await client.unsafe("DELETE FROM usuarios_roles WHERE id = $1", [roleId])
  await client.unsafe("DELETE FROM usuarios_fincas WHERE id LIKE $1", [`${fixture}%`])
  await client.unsafe("DELETE FROM usuarios WHERE id LIKE $1", [`${fixture}%`])
  await client.unsafe("DELETE FROM propietarios WHERE id LIKE $1", [`${fixture}%`])
  await client.unsafe("DELETE FROM config_razas WHERE id LIKE $1", [`${fixture}%`])
  await client.unsafe("DELETE FROM fincas WHERE id LIKE $1", [`${fixture}%`])
}

interface Scenario {
  readonly id: string
  readonly description: string
  readonly request: {
    readonly page: number
    readonly pageSize: 20 | 25 | 30
    readonly q: string | null
    readonly filters: readonly {
      readonly key: "categoriaReproductivaKey" | "saludKey" | "propietarioId"
      readonly value: string
    }[]
  }
}

const scenarios: readonly Scenario[] = [
  {
    id: "M01",
    description: "base list, page 1, pageSize 25",
    request: { page: 1, pageSize: 25, q: null, filters: [] },
  },
  {
    id: "M02",
    description: "q search over codigo (partial match)",
    request: { page: 1, pageSize: 25, q: "BM-0004", filters: [] },
  },
  {
    id: "M03",
    description: "categoriaReproductivaKey + propietarioId filters",
    request: {
      page: 1,
      pageSize: 25,
      q: null,
      filters: [
        { key: "categoriaReproductivaKey", value: "prenada" },
        { key: "propietarioId", value: `${fixture}-prop-2` },
      ],
    },
  },
  {
    id: "M04",
    description: "deep page (page 100) stressing OFFSET",
    request: { page: 100, pageSize: 30, q: null, filters: [] },
  },
]

type MobileListRequest = Parameters<DrizzleAnimalMobileListReadModel["listar"]>[0]

async function measureScenario(
  readModel: DrizzleAnimalMobileListReadModel,
  scenario: Scenario,
): Promise<{ p95: number; total: number }> {
  const request: MobileListRequest = { usuarioId, fincaId, ...scenario.request }
  for (let warmup = 0; warmup < WARMUP_COUNT; warmup += 1) {
    await readModel.listar(request)
  }
  const samplesMs: number[] = []
  let total = 0
  for (let sample = 0; sample < SAMPLE_COUNT; sample += 1) {
    const startedAt = performance.now()
    const result = await readModel.listar(request)
    samplesMs.push(performance.now() - startedAt)
    total = result.total
  }
  samplesMs.sort((left, right) => left - right)
  const p95 = percentile(samplesMs, 0.95)
  const summary = {
    scenario: scenario.id,
    description: scenario.description,
    total,
    samples: SAMPLE_COUNT,
    minMs: Number((samplesMs[0] ?? 0).toFixed(2)),
    p50Ms: Number(percentile(samplesMs, 0.5).toFixed(2)),
    p95Ms: Number(p95.toFixed(2)),
    maxMs: Number((samplesMs[samplesMs.length - 1] ?? 0).toFixed(2)),
    budgetMs: P95_BUDGET_MS,
    pass: p95 < P95_BUDGET_MS,
  }
  process.stdout.write(`${JSON.stringify(summary)}\n`)
  return { p95, total }
}

async function printPagePlan(
  client: ReturnType<typeof postgres>,
  statements: { query: string; parameters: readonly unknown[] }[],
  beginMarker: string,
  endMarker: string,
): Promise<void> {
  const pageStatement = statements[1]
  if (!pageStatement) throw new Error("page statement was not captured")
  const plan = await client.unsafe(`EXPLAIN (ANALYZE, BUFFERS) ${pageStatement.query}`, [
    ...pageStatement.parameters,
  ] as never[])
  process.stdout.write(`${beginMarker}\n`)
  for (const row of plan as unknown as Array<Record<string, unknown>>) {
    process.stdout.write(`${row["QUERY PLAN"]}\n`)
  }
  process.stdout.write(`${endMarker}\n`)
}

async function runIndexAbComparison(
  client: ReturnType<typeof postgres>,
  readModel: DrizzleAnimalMobileListReadModel,
  statements: { query: string; parameters: readonly unknown[] }[],
): Promise<void> {
  const indexName = `${fixture.replace(/-/gu, "_")}_idx_ab`
  await client.unsafe(
    `CREATE INDEX ${indexName} ON animales (finca_id, activo, estado_animal_key, codigo, id)`,
  )
  await client.unsafe("ANALYZE animales")
  const abScenario: Scenario = {
    id: "M01-with-composite-index",
    description: "(finca_id, activo, estado_animal_key, codigo, id)",
    request: { page: 1, pageSize: 25, q: null, filters: [] },
  }
  const { p95 } = await measureScenario(readModel, abScenario)
  if (p95 >= P95_BUDGET_MS) {
    await client.unsafe(`DROP INDEX ${indexName}`)
    throw new Error(`composite index p95 ${p95.toFixed(2)}ms violates LM-050`)
  }
  statements.length = 0
  await readModel.listar({ usuarioId, fincaId, page: 1, pageSize: 25, q: null, filters: [] })
  await printPagePlan(
    client,
    statements,
    "EXPLAIN_ANALYZE_PAGE_PLAN_WITH_INDEX_BEGIN",
    "EXPLAIN_ANALYZE_PAGE_PLAN_WITH_INDEX_END",
  )
  await client.unsafe(`DROP INDEX ${indexName}`)
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL
  const statements: { query: string; parameters: readonly unknown[] }[] = []
  const client = postgres(databaseUrl, {
    max: 1,
    debug: (_connection, query, parameters) => statements.push({ query, parameters }),
  })
  try {
    await cleanup(client)
    await seed(client)
    const db = drizzle(client) as unknown as ReturnType<typeof createClient>
    const readModel = new DrizzleAnimalMobileListReadModel(db)

    for (const scenario of scenarios) {
      const { p95 } = await measureScenario(readModel, scenario)
      if (p95 >= P95_BUDGET_MS) {
        throw new Error(
          `${scenario.id} p95 ${p95.toFixed(2)}ms violates LM-050 < ${P95_BUDGET_MS}ms`,
        )
      }
    }

    statements.length = 0
    await readModel.listar({ usuarioId, fincaId, page: 1, pageSize: 25, q: null, filters: [] })
    await printPagePlan(
      client,
      statements,
      "EXPLAIN_ANALYZE_PAGE_PLAN_BEGIN",
      "EXPLAIN_ANALYZE_PAGE_PLAN_END",
    )

    if (process.env.MOBILE_BENCH_INDEX_AB === "1") {
      await runIndexAbComparison(client, readModel, statements)
    }
  } finally {
    await cleanup(client)
    await client.end({ timeout: 5 })
  }
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  )
  process.exitCode = 1
})
