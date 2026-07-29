# @ganaweb/db

## Animal listado §11 benchmark

`benchmark:animal-listado` measures only `DrizzleAnimalListadoReadModel.listar`.
HTTP routing and serialization are not measured and cannot be used as LA-100 evidence.

The command is intentionally fail-closed. It requires an isolated PostgreSQL 17 database,
UTC timezone, `es_CO.UTF-8` collation and ctype, `public.unaccent`, migrations, the approved
`rf-anim-list-11-v2` fixture (A/B/C: 1,000 each; 900 active each), and no concurrent traffic. Its database name must contain
`benchmark`; the command never falls back to `DATABASE_URL`.

```sh
BENCHMARK_DATABASE_URL='postgresql://.../ganaweb_benchmark' \
  pnpm --filter @ganaweb/db benchmark:animal-listado
```

Every run writes an immutable directory under `packages/db/benchmark-runs/`. A successful
receipt contains environment metadata, raw samples, percentile summary, three JSON
`EXPLAIN (ANALYZE, BUFFERS)` plans and LA-103 statement records for each S01–S07 scenario.
Any precondition or measurement failure returns non-zero and retains `failure.json`; v1 receipts
are historical non-acceptance evidence and are never modified or reused.

The deferred-pagination optimization receipt is
`rf-anim-list-11-v2-1785182475584`: all S01–S07 p95 values are below 400 ms,
including S02 at 344.530818 ms, with LA-103 preserved at three statements.

## Maintenance

### `vacuum:analyze` — S02 visibility-map priming

**Triggers** (run when any of these occur):

- After a bulk load of `animales` data.
- After a backfill from an external source.
- When an S02 plan regression is observed (e.g. the benchmark starts reporting
  `Index Scan` instead of `Index Only Scan`, or `Heap Fetches > 0`).

**Command**:

```sh
DATABASE_URL='postgresql://...' \
  pnpm --filter @ganaweb/db vacuum:analyze
```

`DATABASE_URL` is required. The command also accepts disposable
`BENCHMARK_DATABASE_URL` targets — the same allow-list the §11 benchmark uses.

**What it does**: issues `VACUUM (ANALYZE) animales` outside any transaction
(`postgres-js` with `max: 1`). This primes the visibility map so the covering
index `idx_animales_finca_activo_codigo INCLUDE (id)` (migration `0004`) is
used as an `Index Only Scan` by the animal-list read model (S02 path).

**Safety**: non-destructive. Does not rewrite the table. Does not take an
exclusive lock. Can be run while readers and writers are active.

**Reference**: full design and regression tests live in
`openspec/changes/s02-vacuum-analyze-fix/`. The disposable-fixture integration
test is `packages/db/tests/vacuum-analyze-postgres.test.ts`; the source-invariant
test (no `sql.begin`) is `packages/db/tests/vacuum-analyze-script-source.test.ts`.

### `concurrent-index-deploy` — animal-list supporting indexes

Builds the animal-list supporting indexes
(`idx_animales_finca_activo_codigo` covering index post-migration `0004`, and
`idx_pesos_animal_fecha_id`) with `CREATE INDEX CONCURRENTLY`, detects
interrupted/invalid builds via `pg_index.indisvalid`, and recovers them
idempotently. The deployment is additive: it never alters RBAC, per-finca
isolation, or query authorization, and an invalid or absent index affects only
performance, never correctness.

**Command**:

```sh
DATABASE_URL='postgresql://...' \
  pnpm --filter @ganaweb/db concurrent-index-deploy
```

`DATABASE_URL` is required. Run it during a maintenance window. The command
exits `0` when every target index is valid and `1` on any failure.

**Never via drizzle-kit migrate**: `CREATE INDEX CONCURRENTLY` cannot run inside
a transaction, and `drizzle-kit migrate` always wraps statements in one. This
script runs each statement in autocommit (`postgres-js`, `max: 1`), outside any
transaction block. Build these indexes only with this standalone script.

**What it does** (per target index, idempotently):

1. Reads `pg_index.indisvalid`.
2. Valid → no-op, exit `0`.
3. Invalid (an interrupted prior build) → `DROP INDEX CONCURRENTLY` then rebuild.
4. Absent → `CREATE INDEX CONCURRENTLY IF NOT EXISTS`.
5. Re-verifies `indisvalid = true`; a defensive `REINDEX CONCURRENTLY` runs only
   if the index is somehow still invalid after the build.

Re-running against already-valid indexes is a safe no-op.

**`indisvalid` diagnostic query**:

```sql
SELECT c.relname, i.indisvalid
  FROM pg_index i
  JOIN pg_class c ON c.oid = i.indexrelid
 WHERE c.relname IN (
   'idx_animales_finca_activo_codigo',
   'idx_pesos_animal_fecha_id'
 );
```

**Recovery procedure** (interrupted build left `indisvalid = false`): just
re-run the command. It drops the invalid index concurrently and rebuilds it,
ending with `indisvalid = true` and exit `0`.

**Rollback**:

```sql
DROP INDEX CONCURRENTLY "idx_animales_finca_activo_codigo";
DROP INDEX CONCURRENTLY "idx_pesos_animal_fecha_id";
```

Rollback is fully reversible and correctness-preserving — queries keep returning
the same rows (PostgreSQL falls back to other plans); only performance changes.

**Reference**: design and specs live in
`openspec/changes/issue-112-session-error-hardening/`. The source-invariant tests
(no transaction wrapper) are `packages/db/tests/concurrent-index-deploy-source.test.ts`
and `packages/db/tests/animal-list-indexes.test.ts`.
