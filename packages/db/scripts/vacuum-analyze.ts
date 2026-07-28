import postgres from "postgres"

const S02_TABLES = ["animales"] as const

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) {
    process.stderr.write("DATABASE_URL is required\n")
    process.exit(1)
  }
  const client = postgres(url, { max: 1 })
  try {
    for (const table of S02_TABLES) {
      await client.unsafe(`VACUUM (ANALYZE) ${table}`)
    }
    await client.end({ timeout: 5 })
    process.exit(0)
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
    )
    await client.end({ timeout: 5 }).catch(() => undefined)
    process.exit(1)
  }
}

void main()
