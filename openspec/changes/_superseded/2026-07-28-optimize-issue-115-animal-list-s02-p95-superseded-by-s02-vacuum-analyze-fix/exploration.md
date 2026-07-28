## Exploration: S02 p95 Performance Optimization for DrizzleAnimalListadoReadModel.listar

### Current State

**Benchmark context**: The `rf-anim-list-11-v2` benchmark proved `DrizzleAnimalListadoReadModel.listar` fails LA-100 (`p95 < 400 ms`) for S02 (page 9, pageSize 100, sort `codigo:asc`, no filters/search) against 3 fincas × 1,000 animals with 90% active.

**The exact query for S02** (`packages/db/src/animal-infrastructure.ts:871`):

```sql
SELECT a.*, raza.nombre AS raza_nombre, color.nombre AS color_nombre, 
  madre.nombre AS madre_nombre, padre.nombre AS padre_nombre,
  propietario.nombre AS propietario_nombre, hierro.nombre AS hierro_nombre,
  calidad.nombre AS calidad_nombre, potrero.nombre AS potrero_nombre,
  sector.nombre AS sector_nombre, lote.nombre AS lote_nombre,
  grupo.nombre AS grupo_nombre, tipo_explotacion.nombre AS tipo_explotacion_nombre,
  origen.value AS origen_label,
  ultimo_peso.peso_kg, ultimo_peso.fecha AS peso_fecha
FROM animales a
LEFT JOIN config_razas raza ON raza.id = a.raza_id
LEFT JOIN config_colores color ON color.id = a.color_id
LEFT JOIN animales madre ON madre.id = a.madre_id
LEFT JOIN animales padre ON padre.id = a.padre_id
LEFT JOIN propietarios propietario ON propietario.id = a.propietario_id
LEFT JOIN hierros hierro ON hierro.id = a.hierro_id
LEFT JOIN config_calidad_animal calidad ON calidad.id = a.calidad_animal_id
LEFT JOIN potreros potrero ON potrero.id = a.potrero_id
LEFT JOIN sectores sector ON sector.id = a.sector_id
LEFT JOIN lotes lote ON lote.id = a.lote_id
LEFT JOIN grupos grupo ON grupo.id = a.grupo_id
LEFT JOIN config_tipos_explotacion tipo_explotacion ON tipo_explotacion.id = a.tipo_explotacion_id
LEFT JOIN config_key_values origen ON origen.opcion = 'tipo_ingreso' AND origen.key = a.tipo_ingreso_id::text
LEFT JOIN LATERAL (
  SELECT peso_kg, fecha 
  FROM pesos 
  WHERE animal_id = a.id 
  ORDER BY fecha DESC, id DESC 
  LIMIT 1
) ultimo_peso ON true
WHERE a.finca_id = 'finca-A' AND a.activo = 1
ORDER BY a.codigo ASC, a.id ASC
LIMIT 100 OFFSET 800
```

Three statements per invocation:
1. **page** — the paginated query above (900 filtered → OFFSET 800, LIMIT 100)
2. **filtered-count** — `SELECT count(*)::int AS count <same FROM+WHERE>`
3. **unfiltered-count** — `SELECT count(*)::int AS count FROM animales WHERE finca_id = 'finca-A' AND activo = 1`

**Existing indexes**:
- `idx_animales_finca_activo_codigo` ON animales (finca_id, activo, codigo) — BTREE — covers WHERE + ORDER BY perfectly for S02
- `idx_animales_finca_activo` ON animales (finca_id, activo) — for filter-only queries
- `idx_pesos_animal_fecha_id` ON pesos (animal_id, fecha DESC, id DESC) — covers the lateral subquery's ORDER BY/LIMIT
- `uq_animales_finca_codigo` — UNIQUE on (finca_id, codigo)

**Key observations**:

1. **The lateral subquery is the likely bottleneck for S02.** At OFFSET 800, PostgreSQL must scan and discard 800 rows then fetch 100, executing the lateral subquery for each of the 900 rows (it must determine which 100 are the 801st–900th). Each lateral execution hits `idx_pesos_animal_fecha_id`, so for S02 with 900 active animals × ~8.5 weight history rows avg = ~7,650 index lookups. That's the dominant cost: deep pagination multiplies lateral subquery overhead.

2. **13 LEFT JOINs to small catalog tables** (`config_razas`: 10 rows, `config_colores`: 10 rows, `config_calidad_animal`: small, `config_tipos_explotacion`: small, `config_key_values`: small) — these are cheap hash/merge joins against tiny tables; unlikely to be a significant factor.

3. **Self-joins** (`madre`, `padre`) — 20% nullable; 80% hit rate means ~720 lookups into the same `animales` table via PK index; minimal cost.

4. **Remaining joins** (`propietarios`, `hierros`, `potreros`, `sectores`, `lotes`, `grupos`) — small tables, nullable; cheap.

5. **unfiltered-count** is trivially cheap: full index-only scan on `idx_animales_finca_activo_codigo` or `idx_animales_finca_activo`.

6. **filtered-count** reuses the 13-join FROM clause but without ORDER/LIMIT — still significant because the lateral subquery executes for every matching row.

7. The `idx_animales_finca_activo_codigo` is a covering index for WHERE + ORDER BY for S02, so the main scan is efficient. But the lateral subquery overhead dominates at deep offsets.

### Affected Areas

- `packages/db/src/animal-infrastructure.ts` — The `listar()` method (L845–894), the `animalListadoFrom` SQL fragment (L827–843), and potentially `buildAnimalListadoPredicates` (L798–825). The lateral subquery for latest peso is defined here.
- `packages/db/src/schema/pesos-produccion.ts` — The `pesos` table Drizzle schema and its `idx_pesos_animal_fecha_id` index declaration (L22–24). May need index changes.
- `packages/db/migrations/` — May need a new migration for index changes.
- `packages/db/tests/animal-listado-postgres.test.ts` — PostgreSQL integration tests that validate peso latest-weight behavior (L182–191). Update if query structure changes.
- `packages/db/src/benchmark/` — `animal-listado.ts` (constants, runner) and `run-animal-listado.ts`. Re-run for verification after optimization.
- `packages/db/README.md` — Benchmark documentation updates if approach changes.

### Approaches

1. **Covering index on `animales` to eliminate `a.*` table heap lookups** — Add an INCLUDE clause to `idx_animales_finca_activo_codigo` or create a new covering index. This avoids heap access for the main scan.
   - Pros: Simple, zero query code change; no risk of regression; PostgreSQL makes all columns available from index-only scan.
   - Cons: Larger index (~2×+), slower writes; still pays the lateral subquery cost for every OFFSET row; marginal gain for S02 since the main WHERE/ORDER scan uses `idx_animales_finca_activo_codigo` and the heap lookup for `a.*` is secondary to lateral cost.
   - Effort: Low

2. **Eager-load latest weight via a single derived-table join instead of LATERAL** — Replace `LEFT JOIN LATERAL (SELECT ... LIMIT 1)` with `LEFT JOIN (SELECT DISTINCT ON (animal_id) ... FROM pesos ORDER BY animal_id, fecha DESC, id DESC)`. This collapses N lateral executions into one scan of `pesos`.
   - Pros: Eliminates the per-row lateral execution penalty; single sequential/index scan of `pesos` with DISTINCT ON; potentially dramatic improvement for deep-offset queries (S02).
   - Cons: `DISTINCT ON` requires ordering by `(animal_id, fecha DESC, id DESC)` — requires an index scan or sort on `pesos`; the join may need a sort or hash but it's one pass instead of N; risk: if `pesos` is very large (~300k rows), a full scan + DISTINCT ON + sort could still be expensive, but the v2 fixture has at most 8.5K rows (3k animals × ~2.8 avg weights); at product scale could be higher but peso records grow linearly with time, not super-linearly.
   - Effort: Medium

3. **Defer the lateral subquery to after pagination** — Restructure the query to paginate over `animales` first (using a derived table or CTE for the core WHERE+ORDER+OFFSET+LIMIT), then JOIN lateral subquery and left joins only for the 100 result rows.
   ```sql
   WITH pagina AS (
     SELECT a.id, a.finca_id, a.activo, a.codigo
     FROM animales a
     WHERE a.finca_id = 'finca-A' AND a.activo = 1
     ORDER BY a.codigo ASC, a.id ASC
     LIMIT 100 OFFSET 800
   )
   SELECT /* full columns + joins */ 
   FROM pagina p
   JOIN animales a ON a.id = p.id
   LEFT JOIN ... /* all 13 joins */
   LEFT JOIN LATERAL (SELECT ... FROM pesos WHERE animal_id = a.id ... LIMIT 1) ...
   ```
   - Pros: The lateral subquery executes only 100 times (for fetched rows) instead of 900 times (for scanned and skipped rows); same principle as "deferred joins" pattern. This directly targets S02's core problem.
   - Cons: Requires restructuring the query in `listar()`; adds a CTE/subquery; the filtered-count query still needs the full join (can't use the CTE easily); risk of plan instability with CTE optimization fences (PostgreSQL 12+ inlines CTEs unless `MATERIALIZED`).
   - Effort: Medium

4. **Combine approaches 2 and 3** — Deferred join + eager-loaded weights. Paginate first, then join everything including a pre-aggregated weight subquery (not LATERAL).
   - Pros: Attack the problem from both sides; eliminates per-row lateral overhead completely; the weight subquery only runs for 100 rows.
   - Cons: Most complex restructure; two queries (page + data fetch) instead of one; need to preserve statement count = 3 for LA-103.
   - Effort: Medium/High

5. **Covering index for the filtered-count query** — Create a narrow covering index `idx_animales_finca_activo_codigo_covering` that covers `finca_id, activo, codigo, id, fecha_nacimiento, fecha_compra, sexo_key, raza_id, color_id, potrero_id, sector_id, lote_id, grupo_id, hierro_id, propietario_id, calidad_animal_id, tipo_explotacion_id, tipo_ingreso_id ...` for index-only scan on the count + main query. This is extreme.
   - Pros: Eliminates heap lookups entirely for both page and count queries.
   - Cons: Massive index bloat (~5–10×); impacts write throughput significantly; overkill — heap accesses are not the bottleneck.
   - Effort: Low (code) / High (index maintenance)

6. **Composite INCLUDE index on pesos to support faster DISTINCT ON / lateral** — Instead of `(animal_id, fecha DESC, id DESC)`, try a covering index `(animal_id, fecha DESC, id DESC) INCLUDE (peso_kg, fecha)` to make the lateral/DISTINCT ON an index-only scan. This avoids heap access on `pesos`.
   - Pros: Moderate improvement for the lateral subquery regardless of approach; small index overhead (two extra columns).
   - Cons: Alone it doesn't eliminate the per-row lateral execution cost; benefits combine with approach 2 or 3.
   - Effort: Low

### Recommendation

**Approach 3 (Deferred lateral join) is the strongest candidate for S02 specifically.**

The root cause is clear: a deep OFFSET forces the lateral subquery to execute for every candidate row (900 for S02) even though only 100 are returned. Deferring the expensive joins (lateral peso + self-joins to madre/padre) until after pagination directly eliminates this waste.

Implementation sketch:

```
1. Create a "page key" CTE:
   WITH pagina AS (
     SELECT a.id 
     FROM animales a
     WHERE a.finca_id = $1 AND a.activo = 1
     ORDER BY a.codigo ASC, a.id ASC
     LIMIT $2 OFFSET $3
   )

2. Join the main query against the CTE:
   SELECT a.*, ...all joins...
   FROM pagina p
   JOIN animales a ON a.id = p.id
   LEFT JOIN ... (13 joins including lateral peso)
```

This approach:
- Executes the lateral subquery only 100× instead of 900× for S02
- Preserves the `idx_animales_finca_activo_codigo` index-only scan for the pagination step
- Does not change the result contract
- Can be combined with approach 6 (covering INCLUDE on pesos) for even more gain
- The filtered-count query can be left unchanged OR also benefit from the CTE restructure

**Effort**: Medium — requires careful query restructuring and benchmark revalidation.

**Second recommendation**: While implementing approach 3, also add a covering INCLUDE index on both `idx_animales_finca_activo_codigo` and `idx_pesos_animal_fecha_id` to maximize index-only scan efficiency for both the pagination and the peso lookup. This is additive and low-risk.

### Risks

- **Query plan regression**: PostgreSQL may choose different plans for the restructured query. Must benchmark all 7 scenarios, not just S02.
- **CTE optimization fence**: PostgreSQL 12+ inlines non-recursive CTEs by default, which is what we want. But if `MATERIALIZED` is needed in some PG versions, it could hurt. Must test against PG 17 specifically.
- **filtered-count query**: The restructure only helps the page query, not the filtered-count. For S02 (no filters), the filtered-count is effectively the same cost. This is acceptable — LA-100 is per-scenario, and the page query is the slow part. But we may need a covering index for the count as well.
- **Self-join impact**: `madre` and `padre` joins on `animales` are also deferred (only 100 lookups). This is a benefit, not a risk.
- **Statement count**: LA-103 requires exactly 3 statements. The restructure must not introduce extra queries. The page + filtered-count + unfiltered-count pattern must be preserved.
- **Not the only slow scenario**: S04 and S05 filter on `razaId` and `pesoUltimoKg` respectively, which may have different bottlenecks. The deferred join helps those too (fewer result rows = fewer lateral executions), but filter selectivity matters.
- **Benchmark-runs directory is gitignored**: No local plan evidence exists in the repo. All optimization decisions must be validated against the contractual benchmark, not guesswork. The benchmark must be rerun after any change.

### Ready for Proposal

Yes — the root cause is well-understood (lateral subquery fires 900× for 100 returned rows due to deep OFFSET), and the recommended approach (deferred join pagination) directly addresses it. The proposal should:

1. Define the deferred-lateral restructure for the page query
2. Optionally add covering INCLUDE indexes
3. Rerun the contractual benchmark against all 7 scenarios
4. Keep filtered-count and unfiltered-count as-is (they are already cheap for S02)

The orchestrator should inform the user that S02's p95 is dominated by lateral subquery execution across 900 scanned rows, and the fix is a query restructure that paginates on `animales.id` first, then applies joins only to the fetched page.
