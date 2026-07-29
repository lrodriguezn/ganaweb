import postgres from "postgres"

// Animal-list supporting indexes (post-migration-0004 covering-index state).
// Built with CREATE INDEX CONCURRENTLY, which cannot run inside a transaction
// block. postgres-js runs each unsafe() call in autocommit mode (no explicit
// transaction), so CONCURRENTLY succeeds here. Never run this via
// drizzle-kit migrate — the migration runner always wraps statements in a
// transaction, which makes CONCURRENTLY fail.
type IndexTarget = Readonly<{
  name: string
  create: string
}>

const TARGET_INDEXES: readonly IndexTarget[] = [
  {
    name: "idx_animales_finca_activo_codigo",
    create:
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_animales_finca_activo_codigo" ON "animales" USING btree ("finca_id", "activo", "codigo") INCLUDE ("id")',
  },
  {
    name: "idx_pesos_animal_fecha_id",
    create:
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_pesos_animal_fecha_id" ON "pesos" USING btree ("animal_id", "fecha" DESC, "id" DESC)',
  },
]

type Client = ReturnType<typeof postgres>

// Returns true when the index exists and is valid, false when it exists but is
// invalid (an interrupted concurrent build), or null when it is absent.
async function readIndisvalid(client: Client, name: string): Promise<boolean | null> {
  const rows = await client.unsafe(
    `SELECT i.indisvalid
       FROM pg_index i
       JOIN pg_class c ON c.oid = i.indexrelid
      WHERE c.relname = $1`,
    [name],
  )
  if (rows.length === 0) return null
  return rows[0].indisvalid === true
}

function log(message: string): void {
  process.stdout.write(`${message}\n`)
}

async function deployIndex(client: Client, target: IndexTarget): Promise<boolean> {
  const initial = await readIndisvalid(client, target.name)

  if (initial === true) {
    log(`${target.name}: already valid (indisvalid=true) — no-op`)
    return true
  }

  if (initial === false) {
    // An interrupted prior build left an invalid index. Drop it concurrently
    // (no exclusive lock, readers/writers stay active), then rebuild below.
    log(`${target.name}: invalid (indisvalid=false) — DROP INDEX CONCURRENTLY`)
    await client.unsafe(`DROP INDEX CONCURRENTLY IF EXISTS "${target.name}"`)
  }

  // Absent (or just dropped): build fresh, outside any transaction block.
  log(`${target.name}: CREATE INDEX CONCURRENTLY`)
  await client.unsafe(target.create)

  let valid = await readIndisvalid(client, target.name)
  if (valid !== true) {
    // Defensive last-resort rebuild in place. REINDEX CONCURRENTLY constructs a
    // valid replacement and swaps it in without an exclusive lock.
    log(`${target.name}: not valid after create — REINDEX CONCURRENTLY`)
    await client.unsafe(`REINDEX CONCURRENTLY "${target.name}"`)
    valid = await readIndisvalid(client, target.name)
  }

  if (valid === true) {
    log(`${target.name}: valid (indisvalid=true)`)
    return true
  }

  log(`${target.name}: FAILED — still invalid after recovery`)
  return false
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) {
    process.stderr.write("DATABASE_URL is required\n")
    process.exit(1)
  }
  const client = postgres(url, { max: 1 })
  try {
    let allValid = true
    for (const target of TARGET_INDEXES) {
      const ok = await deployIndex(client, target)
      if (!ok) allValid = false
    }
    await client.end({ timeout: 5 })
    process.exit(allValid ? 0 : 1)
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
    )
    await client.end({ timeout: 5 }).catch(() => undefined)
    process.exit(1)
  }
}

void main()
