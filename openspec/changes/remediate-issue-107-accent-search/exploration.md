## Exploration: Remediate issue #107 accent-insensitive PostgreSQL search

### Current State

RF-ANIM-LIST LA-010 requires `q` and `contains` text matching to ignore case and accents. The reviewed #107 implementation currently lowercases only the bound search value and applies `lower(column) LIKE`, so `á` and `a` do not compare equivalent. The affected predicate builder is shared by the global `q` search over `codigo`, `nombre`, `codigo_arete`, and `codigo_rfid`, and by validated `contains` filters. The read model preserves finca isolation (`a.finca_id` and `activo`), uses parameter binding, adds `a.id ASC` as the stable tie-break, and executes bounded page/count statements.

The repository has no existing `unaccent` extension, accent-normalization helper, generated search column, accent-insensitive collation, or migration that provisions one. Migration `0002` currently contains only ordinary btree indexes for finca/code and latest weight. The PostgreSQL integration test already covers authorization, finca isolation, counts, pagination, and deterministic ordering, but has no accent-equivalence assertions. OpenSpec explicitly excludes SQLite/WASM parity for this read model and records that the benchmark fixture/p95 harness is unavailable; this corrective change must not expand that scope.

### Affected Areas

- `features/feature-003-listado_animales-desktop/requisito_listado_animales.md` — LA-010 is the normative accent-insensitive requirement; LA-011, LA-021, LA-050/051, and LA-102/103 constrain composition, ordering, counts, and query plans.
- `packages/db/src/animal-infrastructure.ts` — `buildAnimalListadoPredicates` contains both non-compliant `q` and `contains` `lower(...) LIKE` predicates; this is the surgical implementation seam.
- `packages/db/tests/animal-listado-postgres.test.ts` — add RED integration scenarios for `q`, `contains`, finca isolation, and stable pagination using accented and unaccented data.
- `packages/db/migrations/` and `packages/db/src/schema/` — any PostgreSQL-native extension, normalized search columns, or supporting indexes must be migration-backed and deployment-safe.
- `openspec/changes/implement-issue-107-server-contract/{design.md,tasks.md,specs/db/spec.md}` — reviewed assumptions and the existing PostgreSQL-only/index evidence boundary must be carried forward, not treated as sufficient evidence for corrected bytes.

### Approaches

1. **Provision PostgreSQL `unaccent` and use it in parameterized predicates** — add an explicit migration prerequisite/provisioning step for `CREATE EXTENSION IF NOT EXISTS unaccent`, then compare `unaccent(lower(column)) LIKE unaccent(lower($boundValue))` for `q` and `contains`.
   - Pros: PostgreSQL-native and semantically complete for the repository’s Spanish text; parameter binding remains intact; no write-path changes or backfill; one shared predicate helper fixes both search modes; can be measured with `EXPLAIN`.
   - Cons: extension creation requires deployment/database privileges and must be verified rather than assumed; expression predicates need matching expression indexes for scale, and leading-wildcard `LIKE '%…%'` still limits ordinary btree usefulness; extension/version behavior must be captured in deployment evidence.
   - Effort: Medium

2. **Add persisted normalized search columns maintained by all write paths** — store accent/case-folded values for the four global-search columns and every `contains`-filterable text column, backfill existing rows, and index the normalized expressions/columns.
   - Pros: no extension or collation privilege; predictable query plans and deploy portability once complete.
   - Cons: much larger blast radius than this remediation; every create/update/import/sync path must stay in lockstep; migration/backfill and null semantics are substantial; leading-wildcard searches still need suitable trigram support for material benefit; easy to create stale search data.
   - Effort: High

3. **Rely on database collations or ad-hoc SQL transliteration** — select an ICU/nondeterministic accent-insensitive collation or hard-code `translate(...)` mappings.
   - Pros: avoids a new extension in the best case; transliteration is superficially surgical.
   - Cons: collation support for `LIKE`, equality, index usage, and existing PostgreSQL 17 deployment settings must be proven; collation changes are database/column-specific and do not automatically solve expression/index behavior; `translate` is incomplete for Unicode and Spanish text maintenance. Neither is repository-supported today.
   - Effort: High / high uncertainty

### Recommendation

Use `unaccent` only after an explicit deployment-capability check confirms the target PostgreSQL role can use the extension. It is the safest surgical correction because it changes one shared predicate builder, preserves parameter binding, avoids touching write paths, and keeps the existing authorization, pagination, and count structure. The change should include migration/deployment documentation that fails clearly when the extension cannot be provisioned, plus plan evidence for the finalized predicates. Do not claim ordinary LA-102 btree indexes make leading-wildcard accent-insensitive search fast; if measurements show a need, a separately justified `pg_trgm` migration/index is a performance decision, not a reason to broaden this corrective scope.

If deployment permissions cannot provision or use `unaccent`, stop and design the normalized-column alternative rather than silently falling back to `lower(...) LIKE`. Collations and hand-written transliteration should not be selected without repository-specific proof.

Required RED integration scenarios:

- `q`: a row containing `á`/`é`/`ñ` matches an unaccented query, and the inverse query matches unaccented stored text; cover the OR fields without leaking another finca.
- `contains`: the same equivalence holds for at least `nombre` and one other text filter column, with the normalized filter grammar unchanged.
- Isolation: an equivalent match in finca B is absent from a finca A request, and both `total` and `totalSinFiltro` remain correct.
- Stable pagination: insert multiple equivalent matches with tied sort values, fetch page 1/page 2 using the existing sort and page sizes, and assert no duplicate/omitted IDs and stable `id ASC` ordering across repeated reads.
- Capability guard: integration setup proves the extension is installed/usable; unavailable PostgreSQL evidence is reported as a blocker, never replaced with SQLite/WASM or E2E evidence.

Keep the corrective change limited to PostgreSQL query normalization, required migration/deployment capability evidence, and focused integration tests. Exclude UI, warning #112, p95 fixture creation, preferences, export, and SQLite parity. The existing reviewed candidate/receipt cannot validate corrected bytes; normalization and a new review are required after implementation.

### Risks

- The production migration role may lack `CREATE` privilege for extensions; this must be verified before implementation and documented as a hard prerequisite or blocker.
- `unaccent` expression predicates with leading `%` may remain expensive; do not infer performance acceptance from semantic correctness or from the existing btree indexes.
- Extension dictionary/version differences can change what characters normalize; test representative Spanish accents and record the PostgreSQL capability/version.
- Any normalization added to count and page predicates must be identical, or totals/pagination can diverge.
- The prior candidate/receipt describes pre-correction bytes and must not be reused as corrected evidence; source normalization and a fresh review are mandatory.

### Ready for Proposal

Yes, conditionally. The proposal should first require a read-only deployment-capability decision for PostgreSQL `unaccent`; if unavailable, return to design for normalized persisted columns. It should preserve the approved single-PR `size:exception`, 800-line review budget, interactive OpenSpec workflow, and the surgical exclusions above.
