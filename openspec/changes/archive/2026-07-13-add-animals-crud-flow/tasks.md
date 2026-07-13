# Tasks: Complete Animals CRUD Flow

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 1,800-2,600 |
| 800-line budget risk | High |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 dominio/aplicacion → PR2 db/sync → PR3 ui → PR4 web/e2e |
| Delivery strategy | auto-forecast |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
800-line budget risk: High
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Domain rules + use-case contracts | PR1 | `pnpm --filter @ganaweb/dominio test && pnpm --filter @ganaweb/aplicacion test` | N/A: pure/domain layer | `packages/dominio/src/animal*`, `packages/aplicacion/src/casos-uso/animales/*`, ports |
| 2 | DB/sync adapters and reference checker | PR2 | `pnpm --filter @ganaweb/db test && pnpm --filter @ganaweb/sync test` | Dual SQLite/Postgres fixture when scaffolded | `packages/db/src/**animal**`, schema deltas, `packages/sync/src/*animal*` |
| 3 | Reusable animal UI matching OpenPencil | PR3 | `pnpm --filter @ganaweb/ui test` | Story/screen render for frames 03/04/18/19/20/21 | `packages/ui/src/ganado/animal-*` |
| 4 | Web routes/actions + E2E hardening | PR4 | `pnpm --filter @ganaweb/web test && pnpm exec playwright test animales` | `pnpm dev`, offline create/photo, delete/inactivate, RBAC | `apps/web/src/routes/_app/fincas/$fincaId/animales*`, server action wrapper |

## Phase 1: Domain and Use-Case Contracts

- [x] 1.1 RED: add `packages/dominio/src/animal*.test.ts` cases for pure PR1 CA domain rules: required `codigo/nombre/sexo_key`, optional color/raza, genealogy from supplied facts, defaults/category decisions, conditional origin dates, code editability, delete decisions, and image invariants.
- [x] 1.2 Implement `packages/dominio/src/animal*.ts` pure validators/deciders for PR1-owned CA-CRE, CA-UPD, CA-IMG, CA-DEL, and CA-TL helper result unions; infrastructure-dependent CA-CRE-006, CA-IMG storage/queue/purge jobs, and CA-DEL reference/audit/tombstone execution remain PR2/PR3 ownership.
- [x] 1.3 RED: add `packages/aplicacion/src/casos-uso/animales/*.test.ts` for permission denied, create pipeline, cursor timeline, offline image add, and delete outcomes.
- [x] 1.4 Define `packages/aplicacion/src/casos-uso/animales/*` plus `packages/aplicacion/src/puertos/*animal*` ports, including centralized `AnimalReferenceCheckerPort`.

## Phase 2: Persistence, References, and Sync

- [x] 2.1 RED: add DB adapter tests for reference summaries across CA-TL-001 sources, one principal image, and immutable physical-delete audit.
- [x] 2.2 Update `packages/db/src/schema/{imagenes,auditoria,sync,animales}.ts` and adapters for `es_principal`, audit rows, tombstones, authenticated image metadata, and reference queries.
- [x] 2.3 RED: add `packages/sync/src/*animal*.test.ts` for duplicate-code conflict, physical-delete tombstone purge, blob failure after data sync, and version conflict review.
- [x] 2.4 Implement `packages/sync/src/*animal*` operation envelopes for create/update/inactivate/reactivate/image-link/delete tombstone and separate binary queue state.

## Phase 3: UI Components and OpenPencil Parity

- [x] 3.1 RED: add UI tests for mobile cards, empty state, timeline year grouping, five-image limit, pending upload, and inactive/sold/dead banners.
- [x] 3.2 Build `packages/ui/src/ganado/animal-*` list/table, form, ficha header, gallery, genealogy, delete dialog, and timeline components using tokens only.
- [x] 3.3 Verify component layout parity against OpenPencil frames `frame-0185`, `frame-0232`, `f-300165`, `f-400107`, `f-400191`, and `f-400233`.

## Phase 4: Web Routes, Security, and E2E

- [x] 4.1 RED: add route/action tests for forged `fincaId`, cross-finca `animalId`, missing permissions, and direct mutation denial.
- [x] 4.2 Create `apps/web/src/server/animal-actions.server.ts` to revalidate session, finca membership, animal ownership, RBAC, and online-only physical delete through an explicit adapter factory; production exports no longer use demo in-memory persistence and fail clearly until real adapters are configured.
- [x] 4.3 Create `apps/web/src/routes/_app/fincas/$fincaId/animales*.tsx` list, create/edit, ficha, image attach, delete/inactivate, and reactivate flows; image mark-principal/unlink remain deferred because the current application port only exposes pending image attach.
- [x] 4.4 Add Playwright coverage for animal route rendering, pending-photo affordance, referenced-delete/inactivation copy, read-only RBAC, timeline pagination, and responsive OpenPencil parity; actual create/delete mutations are proven by the focused server-action harness because production route runtime still requires explicit real adapter registration.
