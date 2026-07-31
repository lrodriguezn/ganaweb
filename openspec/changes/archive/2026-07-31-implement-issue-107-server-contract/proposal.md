# Proposal: Implement issue #107 server-side animal-list contract

## Intent

Deliver the approved #107 online-only HTTP contract for secure, scalable animal listing. Replace the legacy all-rows server-function path with a canonical DTO, database pagination, and enforceable access/error semantics. References: LA-RBAC-01/04/05, LA-001–005, LA-010–021, LA-040–043, LA-050, LA-100–103; PE-001–003.

## Scope

### In Scope
- `GET /api/fincas/{fincaId}/animales`: 36-field canonical DTO, query parsing, filtering, sorting, stable pagination, counts, and contractual `ApiErrorDto` errors.
- Database-side read model: catalog/derived fields, latest weight (date then ID), `tipo_ingreso` fallback, RBAC (`animales:ver`) and active `usuarios_fincas` isolation.
- LA-010 PostgreSQL accent-insensitive `q` and `contains` search through qualified `public.unaccent`, literal-safe parameterized `LIKE` escaping, and additive migration `0003_animal_list_unaccent.sql`.
- Migration-backed LA-102 indexes with PostgreSQL query-plan evidence and RF-ANIM-LIST §11’s exact dataset/scenarios proving p95 <400 ms.
- Unit, integration, and performance evidence using available infrastructure only; report unavailable required infrastructure as a blocker/deviation.

### Out of Scope
- Table UI, visual filters, preferences, export, and unrelated client work.
- SQLite/WASM parity; its limitation must be explicit. Do not expand #107 to build test infrastructure beyond the minimum already available.
- Branch, commits, PR creation, or #106 approval; later delivery uses a dedicated branch, reviewable work-unit commits, relevant verification, and one PR closing #107.

## Capabilities

### New Capabilities
- `animal-list-server-contract`: Canonical online animal-list endpoint, query contract, server authorization, DTOs/errors, and PostgreSQL performance proof.

### Modified Capabilities
- `db`: Require LA-102 index migrations and query-plan/performance evidence for the finalized listing query.

## Approach

Add a route adapter around pure request/response validation and a dedicated paginated read-model port. Drive allowed fields from one typed RF-ANIM-LIST matrix; execute joins, derivations, filtering, ordering, and counts in PostgreSQL without N+1. Validate membership and permission before querying; return 403 without cross-finca disclosure. Normalize both columns and bound patterns with qualified PostgreSQL `public.unaccent(pg_catalog.lower(...))`, escaping `%`, `_`, and `!` so request text retains literal semantics. Migration `0003` provisions and validates the extension before this behavior is accepted.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/web/src/routes/api/` | New | Animal-list HTTP route |
| `apps/web/src/server/animal-actions.server.ts` | Modified | Reuse/extract session guard only |
| `packages/db/src/animal-infrastructure.ts` | Modified | Paginated read query |
| `packages/db/src/schema/*.ts`, migration directory | Modified | LA-102 indexes |
| `packages/*/tests/*` | New/Modified | Contract, isolation, plan, p95 evidence |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Test/performance harness unavailable | High | Record blocker/deviation; do not broaden scope |
| Missing catalog source | Med | Locate authoritative schema before implementation |
| Epic #106 remains `status:needs-review` | Med | Treat as risk; #107 `status:approved` is the passed gate |
| Production role cannot provision or invoke `public.unaccent` | Med | Fail rollout with an explicit capability blocker; separately design persisted normalized columns rather than silently reverting to case-only matching |

## Rollback Plan

Remove the new route/read-model and reverse its dedicated index migration; retain the legacy path unchanged until the contract is accepted.

## Dependencies

- #107 `status:approved`; PostgreSQL test database and the RF-ANIM-LIST §11 benchmark dataset/scenarios.

## Success Criteria

- [x] Contract, authorization, isolation, errors, canonical 36-field mapping, and LA-010 accent-insensitive search are implemented and covered by focused PostgreSQL evidence.
- [x] LA-102 migrations and available PostgreSQL plans are recorded; missing exact §11 fixture/scenario p95 infrastructure is explicitly reported without claiming acceptance.

## Proposal question round

Preflight decisions resolve the primary product choices. Before implementation, confirm whether a documented PostgreSQL-only limitation is acceptable to API consumers and whether the RF-ANIM-LIST §11 benchmark fixture is available; otherwise record the evidence gap as a blocker.

## Consolidated Remediation History

Independent verification found that the first implementation used case-folding without accent normalization, so LA-010 was not yet true. The maintainer authorized correction on the existing #107 branch. Commits `50614d0`, `3c9b937`, and `bd7d5da` added the approved `public.unaccent` architecture, closed inverse-equivalence and real-pagination audit gaps, and normalized the external review gate. The formerly separate corrective change has been consolidated into this original change; its requirements, rationale, decisions, risks, tasks, and evidence are now authoritative here.

The contract remains PostgreSQL-only. Semantic accent-search acceptance is implemented, but RF-ANIM-LIST §11 fixture/scenario p95 evidence remains unavailable and is still an explicit LA-100/full LA-102 deviation.
