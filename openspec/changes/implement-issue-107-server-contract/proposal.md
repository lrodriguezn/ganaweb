# Proposal: Implement issue #107 server-side animal-list contract

## Intent

Deliver the approved #107 online-only HTTP contract for secure, scalable animal listing. Replace the legacy all-rows server-function path with a canonical DTO, database pagination, and enforceable access/error semantics. References: LA-RBAC-01/04/05, LA-001–005, LA-010–021, LA-040–043, LA-050, LA-100–103; PE-001–003.

## Scope

### In Scope
- `GET /api/fincas/{fincaId}/animales`: 36-field canonical DTO, query parsing, filtering, sorting, stable pagination, counts, and contractual `ApiErrorDto` errors.
- Database-side read model: catalog/derived fields, latest weight (date then ID), `tipo_ingreso` fallback, RBAC (`animales:ver`) and active `usuarios_fincas` isolation.
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

Add a route adapter around pure request/response validation and a dedicated paginated read-model port. Drive allowed fields from one typed RF-ANIM-LIST matrix; execute joins, derivations, filtering, ordering, and counts in PostgreSQL without N+1. Validate membership and permission before querying; return 403 without cross-finca disclosure.

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

## Rollback Plan

Remove the new route/read-model and reverse its dedicated index migration; retain the legacy path unchanged until the contract is accepted.

## Dependencies

- #107 `status:approved`; PostgreSQL test database and the RF-ANIM-LIST §11 benchmark dataset/scenarios.

## Success Criteria

- [ ] Contract, authorization, isolation, errors, and canonical 36-field mapping satisfy RF-ANIM-LIST v2.1.
- [ ] LA-102 migrations plus PostgreSQL plans and exact-scenario p95 <400 ms evidence are recorded, or missing infrastructure is explicitly reported.

## Proposal question round

Preflight decisions resolve the primary product choices. Before implementation, confirm whether a documented PostgreSQL-only limitation is acceptable to API consumers and whether the RF-ANIM-LIST §11 benchmark fixture is available; otherwise record the evidence gap as a blocker.
