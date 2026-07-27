# Design: Issue #107 Animal List Server Contract

## Technical Approach

Add PostgreSQL-only `GET /api/fincas/$fincaId/animales` with TanStack Start `createFileRoute(...).server.handlers.GET`. A pure contract module owns the RF-ANIM-LIST registry, query grammar, DTO mapping, and error envelope. A dedicated application read-model port accepts normalized input; its Drizzle adapter authorizes before the paginated PostgreSQL read. Legacy `listAnimalsAction` and UI remain unchanged.

## Architecture Decisions

| Decision | Options / tradeoff | Choice and rationale |
|---|---|---|
| Boundary | Extend legacy action; dedicated HTTP/read model | Dedicated port: `listAnimalsAction` loads all rows into a UI model, so cannot prove HTTP errors, pagination, or no-N+1. |
| Contract source | Separate lists; typed registry | One `as const` 36-column registry drives IDs, response keys, filter grammar, sorting, defaults, and parser allow-lists; labels never derive keys. |
| Authorization | Session active-finca check only; fresh DB authorization | Resolve authentication, then re-authorize `usuarioId + fincaId` through `DrizzleAuthRepository.obtenerAutorizacionUsuario`; require active `usuarios_fincas` and `animales:ver` before the read-model call. Membership/permission failure shares one non-disclosing 403. |
| SQL | Per-row catalog queries; joined read | One PostgreSQL row query plus filtered and finca-wide counts; no per-row queries. Latest weight orders `fecha DESC, id DESC`; sort appends `animales.id ASC`. |

## Data Flow

```
HTTP route -> requestId + pure parse -> authenticated session
    -> fresh membership/RBAC check -> AnimalListadoReadPort -> PostgreSQL
    -> canonical row mapper -> Response.json DTO
```

Invalid grammar returns 400 before authorization/read execution. Membership and permission failures share one 403 envelope. Driver errors/deadline return sanitized 500/timeout envelopes; logs carry `requestId`, route, finca/user identifiers, normalized keys, duration, row count, and error class.

The query predicates `animales.finca_id = fincaId AND activo = 1`; combines validated column predicates with AND and `q` as accent/case-insensitive OR over code, name, ear tag, and RFID. It uses parameter binding only. Catalogs are left joins; missing optional relations map to `null`. `config_key_values` joins `opcion = 'tipo_ingreso'` and key/value mapping; unknown non-null IDs map to `{ id, label: "Desconocido (<id>)" }`. Dates are serialized as ISO dates, age is calculated at request time to one decimal, and boolean fields are always non-null.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/src/routes/api/fincas/$fincaId/animales.ts` | Create | HTTP adapter, request IDs, errors, and dependency composition. |
| `apps/web/src/server/animal-list-contract.ts` | Create | Pure registry, parser/validator, DTO types/mapper, and `ApiErrorDto`. |
| `packages/aplicacion/src/puertos/animal-listado-port.ts` | Create | Normalized request, authorization/read-model port, and result contract; export from application barrel. |
| `packages/db/src/animal-infrastructure.ts` | Modify | Add `DrizzleAnimalListadoReadModel`: authorization check plus parameterized joined page/count queries. |
| `packages/db/src/schema/animales.ts` / `pesos-produccion.ts` | Modify | Declare LA-102 index metadata matching migration. |
| `packages/db/migrations/0002_animal_list_indexes.sql` and journal/meta | Create/Modify | Additive, migration-backed `(finca_id, activo, codigo)` and `(animal_id, fecha DESC, id DESC)` indexes. |
| `packages/db/package.json` | Modify | Export the dedicated read-model if consumed through the package boundary. |
| `apps/web/tests/animal-list-server-contract.test.ts`; `packages/db/tests/animal-listado-postgres.test.ts` | Create | Contract/RBAC and PostgreSQL integration-plan evidence. |

## Interfaces / Contracts

```ts
interface AnimalListadoReadPort {
  listar(input: NormalizedAnimalListadoRequest): Promise<AnimalListadoResponseDto>
}
// Errors use ApiErrorDto with requestId.
```

Rows contain `id` plus 36 fields. `cols` is validated, normalized, echoed, and never changes shape. Defaults: page 1, size 25, `codigo:asc`, then `id:asc`.

## Testing Strategy

| Layer | What to test | Approach |
|---|---|---|
| Unit | registry completeness/nullability; parser defaults and invalid/repeated keys; mapper fallbacks, age, tie-break, error/request ID mapping | Vitest pure-module tests. |
| Integration | exact 400/403/500 contract; active membership and missing permission indistinguishable; filters, both counts, stable pages, joins/no-N+1, latest weight | PostgreSQL-backed Vitest using `createClient`; instrument statement count and capture `EXPLAIN (ANALYZE, BUFFERS)`. SQLite/WASM is excluded. |
| Performance | every RF-ANIM-LIST §11 scenario p95 <400 ms and LA-102 plan/index use | Run repeatable PostgreSQL measurements against the agreed fixture. The fixture/scenarios and an automated PostgreSQL harness are not present in this change inputs; record their absence as a blocker/deviation, never substitute demo/E2E fixtures or claim LA-100/102 acceptance. |

## Threat Matrix

| Boundary | Applicability | Design response / RED tests |
|---|---|---|
| Documentation-like paths | N/A — HTTP route does not classify or execute files. | None. |
| Git repository selection | N/A — no VCS operation. | None. |
| Commit state | N/A — no commit operation. | None. |
| Push state | N/A — no push operation. | None. |
| PR commands | N/A — no PR automation. | None. |

## Migration / Rollout

Generate and review the additive Drizzle migration, apply it with `pnpm --filter @ganaweb/db migrate`, then capture plans before enabling acceptance evidence. Roll back by removing the route/read-model; indexes may remain safely or be reversed in a new migration—never edit an applied migration. Legacy behavior remains untouched.

## Open Questions

- [ ] Provide the exact §11 PostgreSQL fixture, scenarios, and measurement environment; without them LA-100/LA-102 evidence is blocked.
