# Tasks: Issue #110 — Animal List Pagination and Preferences

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 750–1000 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (backend store + API) → PR 2 (route + UI wiring) |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Validated, authorized preference store + GET/PUT API | PR 1 | `pnpm vitest run apps/web/src/server/animal-list-preferences` | N/A — runners unavailable per config; contract tests assert 200/400/403 | Drop migration `0005`, delete server/api/port files; list keeps 29/25 defaults |
| 2 | Route preference lifecycle + presentational UI controls | PR 2 (base = PR 1 branch) | `pnpm vitest run apps/web/src/features/animal-listado` | N/A — runners unavailable; route tests assert URL-override + retry | Revert route/UI/adapter changes; endpoints remain but unused |

## Phase 1: Foundation (DB + Port) — PR 1

- [x] 1.1 RED: add normalization unit tests in `apps/web/src/server/animal-list-preferences.test.ts` (registered-only, dedupe, mandatory `codigo`/`nombre`, page-size whitelist, 29/25 defaults).
- [x] 1.2 Create `packages/db/src/schema/animal-listado-preferencias.ts` (uq `usuario_id,finca_id`, `columnas text[]`, `page_size smallint`, timestamps).
- [x] 1.3 Create migration `packages/db/migrations/0005_animal_listado_preferencias.sql` (table + unique index).
- [x] 1.4 Re-export table in `packages/db/src/schema/index.ts`.
- [x] 1.5 Create `packages/aplicacion/src/puertos/animal-listado-preferencias-port.ts` (port + DTO); export from `packages/aplicacion/src/index.ts`.

## Phase 2: Core Backend — PR 1

- [x] 2.1 GREEN: create `apps/web/src/server/animal-list-preferences.ts`; make 1.1 pass (normalize/validate, 29/25 defaults).
- [x] 2.2 RED: integration tests for `DrizzleAnimalListadoPreferenciasRepository` — PE-001–003 authz, cross-scope denial, LWW upsert, failed-save keeps prior row.
- [x] 2.3 GREEN: add repository to `packages/db/src/animal-infrastructure.ts` (authz-CTE + `ON CONFLICT DO UPDATE`).
- [x] 2.4 RED: contract tests in `apps/web/src/server/animal-list-preferences-http.test.ts` — GET/PUT 200/400/403, sanitized errors.
- [x] 2.5 GREEN: create `apps/web/src/server/animal-list-preferences-http.ts` (`createAnimalListadoPreferenciasHttpHandler`).
- [x] 2.6 Wire `apps/web/src/routes/api/fincas/$fincaId/animales/preferencias.ts` (GET/PUT, session auth + repo).
- [x] 2.7 REFACTOR: share normalization with `animal-list-contract.ts` registry; remove duplication.

## Phase 3: Route + UI Wiring — PR 2

- [x] 3.1 RED: route tests in `apps/web/src/features/animal-listado/animal-listado-route.test.tsx` — URL overrides prefs, failed-load defaults+warning, page reset on size/cols change, failed-save keeps session + retry.
- [x] 3.2 GREEN: extend `animal-listado-route-adapter.ts` (preference init/merge; `page`/`pageSize`/`cols` mutation builders, page→1).
- [x] 3.3 GREEN: update `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` (load prefs on init, debounced serialized saves, retryable warning).
- [x] 3.4 RED: UI tests for `packages/ui/src/ganado/animal-listado-desktop.tsx` — callbacks fire, `Código`/`Nombre` immutable, reset delegates once, warning preserves selection.
- [x] 3.5 GREEN: implement presentational pagination, column selector, reset, warning/retry in `animal-listado-desktop.tsx`.
- [x] 3.6 REFACTOR: confirm UI owns no URL/auth/persistence; labels not data-derived.

## Phase 4: Verification

- [x] 4.1 Run `pnpm turbo test` and `pnpm turbo typecheck`; note runner-unavailable gaps per `openspec/config.yaml`.
- [x] 4.2 Confirm success criteria: cross-device retention, 29/25 defaults, mandatory columns, failed-save retry.
