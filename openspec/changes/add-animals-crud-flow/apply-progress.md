# Apply Progress: add-animals-crud-flow

## Slice

- Current PR slice: PR1 domain/application.
- Chain strategy: feature-branch-chain; this slice targets the integrator/tracker branch and intentionally excludes DB/sync adapters, UI/OpenPencil parity, web routes, and E2E.
- Scope completed: domain validators/result unions and application use-case/port contracts for the first autonomous review unit.

## Completed Tasks

- [x] 1.1 RED: add `packages/dominio/src/animal*.test.ts` cases for CA-CRE required `codigo/nombre/sexo_key`, optional color/raza, genealogy, defaults, and conditional origin dates.
- [x] 1.2 Implement `packages/dominio/src/animal*.ts` pure validators for CA-CRE, CA-UPD, CA-IMG, CA-DEL, and CA-TL helper result unions.
- [x] 1.3 RED: add `packages/aplicacion/src/casos-uso/animales/*.test.ts` for permission denied, create pipeline, cursor timeline, offline image add, and delete outcomes.
- [x] 1.4 Define `packages/aplicacion/src/casos-uso/animales/*` plus `packages/aplicacion/src/puertos/*animal*` ports, including centralized `AnimalReferenceCheckerPort`.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `packages/dominio/tests/animal.test.ts` | Unit | ✅ `pnpm --filter @ganaweb/dominio test` baseline: 1 file, 8 tests passed | ✅ RED run failed: 7/7 new tests failed because validators were not exported | ✅ Focused run passed: 7/7 tests | ✅ Covered minimum create, invalid genealogy, conditional origin, update/delete/image/timeline paths | ✅ Extracted helper validators and lint passed |
| 1.2 | `packages/dominio/tests/animal.test.ts` | Unit | ✅ Same baseline | ✅ Same RED from 1.1 drove implementation | ✅ `pnpm --filter @ganaweb/dominio test`: 2 files, 15 tests passed | ✅ Existing RN-001 tests plus new CA tests cover multiple paths | ✅ `pnpm --filter @ganaweb/dominio typecheck` and lint passed |
| 1.3 | `packages/aplicacion/tests/animal-use-cases.test.ts` | Unit | ✅ `pnpm --filter @ganaweb/aplicacion test` baseline: 2 files, 7 tests passed | ✅ RED run failed: 5/5 new tests failed because use cases were not exported | ✅ Focused run passed: 5/5 tests | ✅ Permission denied, create pipeline, ficha cursor, image queue, delete decision paths | ✅ `pnpm --filter @ganaweb/aplicacion typecheck` and lint passed |
| 1.4 | `packages/aplicacion/tests/animal-use-cases.test.ts` | Unit/contracts | ✅ Same baseline | ✅ Same RED from 1.3 drove port and contract definitions | ✅ `pnpm --filter @ganaweb/aplicacion test`: 3 files, 12 tests passed | ✅ Ports exercised through mocked repositories, timeline, files, binary queue, outbox, and reference checker | ✅ Architecture boundary test still passed |

## Test Summary

- Total tests written: 12 new tests (7 domain, 5 application).
- Total focused tests passing: 27 tests across domain/application package runs.
- Layers used: Unit (12 new); Integration/E2E not applicable to PR1 domain/application slice.
- Approval tests: None — this slice adds new behavior/contracts rather than refactoring existing implementations.
- Pure functions created: 6 domain helpers/validators plus application use-case factories.

## Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --filter @ganaweb/dominio test && pnpm --filter @ganaweb/aplicacion test` → exit 0; dominio 2 files / 15 tests passed, aplicacion 3 files / 12 tests passed. |
| Runtime harness command/scenario and exact result | N/A: PR1 is pure domain/application contracts with no DB, route, UI, or runtime boundary. |
| Rollback boundary | Revert `packages/dominio/src/animal.ts`, `packages/dominio/src/index.ts`, `packages/dominio/tests/animal.test.ts`, `packages/aplicacion/src/casos-uso/animales/index.ts`, `packages/aplicacion/src/puertos/*animal*`, `packages/aplicacion/src/puertos/animal-repository-port.ts`, `packages/aplicacion/src/index.ts`, and `packages/aplicacion/tests/animal-use-cases.test.ts`. |

## Additional Checks

- `pnpm --filter @ganaweb/dominio typecheck` → exit 0.
- `pnpm --filter @ganaweb/aplicacion typecheck` → exit 0.
- `pnpm --filter @ganaweb/dominio lint` → exit 0.
- `pnpm --filter @ganaweb/aplicacion lint` → exit 0.

## Remaining Tasks

- [ ] Phase 2 DB/sync adapters and reference checker persistence.
- [ ] Phase 3 reusable animal UI and OpenPencil parity.
- [ ] Phase 4 web routes/actions and E2E hardening.

## Notes

- `apps`, DB, sync, UI, and route code were not modified.
- Commands emitted a warning because the environment runs Node v24.18.0 while package engines request Node 22; tests/typecheck/lint still passed.

## Correction Evidence: PR1 reliability findings R3-001..R3-006

### Scope

- Correction actor scope: frozen PR1 domain/application findings only.
- Explicitly excluded: DB/sync adapters, UI/OpenPencil parity, web routes, E2E.

### TDD Cycle Evidence

| Finding | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| R3-001 | `packages/aplicacion/tests/animal-use-cases.test.ts` | Unit/contracts | ✅ Baseline `pnpm --filter @ganaweb/aplicacion test`: 3 files / 12 tests passed | ✅ RED: update/reactivate tests failed with `pendiente_adaptador` | ✅ Focused run passed: 1 file / 8 tests | ✅ Covered update mutation/outbox and reactivation code validation paths | ✅ Added typed repository methods and transaction reuse |
| R3-002 | `packages/aplicacion/tests/animal-use-cases.test.ts` | Unit/contracts | ✅ Same baseline | ✅ RED: create test showed transaction port was not called; failure path threw before contract result | ✅ Focused run passed: 1 file / 8 tests | ✅ Covered successful transactional create and outbox-failure short-circuit before binary queue | ✅ Added `TransaccionPort` and `transaccion_fallida` result |
| R3-003 | `packages/aplicacion/tests/animal-use-cases.test.ts` | Unit/contracts | ✅ Same baseline | ✅ RED: create-with-images returned no pending image DTO and wrote no image-link contract | ✅ Focused run passed: 1 file / 8 tests | ✅ Covered data outbox, pending image link, and separate binary queue | ✅ Kept DB/sync adapter implementation deferred to PR2 |
| R3-004 | `packages/aplicacion/tests/animal-use-cases.test.ts`, `packages/dominio/tests/animal.test.ts` | Unit/contracts | ✅ Baseline domain/app tests passed | ✅ RED: ficha expected concrete genealogy/state banner, received placeholder `{}` / missing banner | ✅ Focused domain/app runs passed | ✅ Covered null genealogy shape plus inactive/sold banner helper | ✅ Extracted pure banner helper in dominio |
| R3-005 | `packages/dominio/tests/animal.test.ts` | Unit | ✅ Baseline `pnpm --filter @ganaweb/dominio test`: 2 files / 15 tests passed | ✅ RED: missing CA-UPD-003/reactivation/image validators failed | ✅ Focused run passed: 1 file / 10 tests | ✅ Covered derived-field update lock, reused-code reactivation, image MIME, purge eligibility, banner | ✅ Expanded `ReglaAnimal` union and exported pure validators |
| R3-006 | `packages/dominio/vitest.config.ts`, `packages/aplicacion/vitest.config.ts`, package scripts | Config | ✅ Existing test commands passed before config change | ✅ RED by inspection: configs/scripts had no explicit focused-test guard | ✅ Package test commands now execute with `--allowOnly=false`; configs set `allowOnly: false` | ➖ Structural config guard has one deterministic outcome | ✅ Guard kept package-local and CI-equivalent for PR1 packages |

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --filter @ganaweb/dominio test -- tests/animal.test.ts` → exit 0; 1 file / 10 tests passed. `pnpm --filter @ganaweb/aplicacion test -- tests/animal-use-cases.test.ts` → exit 0; 1 file / 8 tests passed. |
| Runtime harness command/scenario and exact result | N/A: correction remains pure domain/application contract scope; no DB, sync, UI, web route, or runtime adapter boundary is in PR1. |
| Rollback boundary | Revert only PR1 correction files: `packages/dominio/src/animal.ts`, `packages/dominio/src/index.ts`, `packages/dominio/tests/animal.test.ts`, `packages/dominio/vitest.config.ts`, `packages/dominio/package.json`, `packages/aplicacion/src/casos-uso/animales/index.ts`, `packages/aplicacion/src/index.ts`, `packages/aplicacion/src/puertos/animal-repository-port.ts`, `packages/aplicacion/src/puertos/animal-media-port.ts`, `packages/aplicacion/src/puertos/transaccion-port.ts`, `packages/aplicacion/tests/animal-use-cases.test.ts`, `packages/aplicacion/vitest.config.ts`, `packages/aplicacion/package.json`, and this apply-progress section. |

### Verification Commands

- `pnpm --filter @ganaweb/dominio test` → exit 0; 2 files / 18 tests passed.
- `pnpm --filter @ganaweb/aplicacion test` → exit 0; 3 files / 15 tests passed.
- `pnpm --filter @ganaweb/dominio typecheck` → exit 0.
- `pnpm --filter @ganaweb/aplicacion typecheck` → exit 0.
- `pnpm --filter @ganaweb/dominio lint` → exit 0.
- `pnpm --filter @ganaweb/aplicacion lint` → exit 0.

### Findings Fixed

- R3-001 fixed: `actualizarAnimal` and `reactivarAnimal` now accept session input, enforce permissions, validate domain rules, call repository mutation ports, and append outbox records within the transaction port.
- R3-002 fixed: `crearAnimal` now coordinates repository, outbox, image link, and binary queue writes through `TransaccionPort`, with a tested `transaccion_fallida` path that avoids binary enqueue after outbox failure.
- R3-003 fixed: create-with-images now returns pending image DTOs, writes a pending image-link contract through `ArchivoAnimalPort.vincularImagenPendiente`, appends image-link outbox data, and queues blobs separately.
- R3-004 fixed: ficha response now exposes a concrete genealogy shape and `estadoBanner`; banner logic is covered by a pure domain helper.
- R3-005 fixed: domain rule union now covers CA-CRE-004/006/007, CA-UPD-003, CA-DEL-001..009, and CA-IMG-001..007, with added validators for father genealogy, derived update locks, reactivation code reuse, image MIME, purge eligibility, and state banners.
- R3-006 fixed: domain/application Vitest configs set `allowOnly: false`, and package test scripts pass `--allowOnly=false` for CI-equivalent focused-test prevention.

### Notes

- Existing Node engine warning remains: current environment is Node v24.18.0 while package engines request Node 22.

## Scoped Correction Evidence: R3-005 scope resolution

### Scope

- Correction actor scope: remaining escalated R3-005 only.
- Maintainer-approved strategy: implement/cover pure domain CA rules now in `packages/dominio`; explicitly defer infrastructure-dependent CA rules to PR2/PR3 spec/task ownership.
- Explicitly excluded: DB/sync adapters, UI/OpenPencil parity, web routes, OPFS/file storage, outbox execution, tombstone propagation, purge jobs, and table reference queries.

### Ownership Clarification

- Domain decides pure outcomes from supplied facts: required create fields, initial active/category defaults, code editability, delete eligibility/inactivation/denial, image limit/principal/unlink/purge eligibility.
- Application orchestrates permissions, transactions, clocks, online state, reference summaries, file queues, and outbox ports.
- DB/sync/file adapters execute infrastructure effects: reference table queries, CA-CRE-006 persistence, image storage/auth/OPFS/binary queue, delete audit/tombstones, purge execution.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| R3-005 scope resolution | `packages/dominio/tests/animal.test.ts` | Unit/domain | ✅ Baseline `pnpm --filter @ganaweb/dominio test -- tests/animal.test.ts`: 1 file / 10 tests passed | ✅ RED: focused run failed after new tests because `calcularEditabilidadCodigoAnimal` and `validarPrincipalImagenAnimal` were not exported/implemented; 2 failed / 13 passed | ✅ Focused run passed after implementation: 1 file / 15 tests passed | ✅ Added distinct cases for required fields, sex-derived defaults, code editability allowed/blocked, offline/denied delete, and image principal/reassignment invariants | ✅ Added small pure helpers and public exports; no infrastructure concerns added |

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --filter @ganaweb/dominio test -- tests/animal.test.ts` → exit 0; 1 file / 15 tests passed. |
| Runtime harness command/scenario and exact result | N/A: R3-005 correction is pure domain/spec clarification only; no DB, sync, UI, web route, or runtime adapter boundary is in scope. |
| Rollback boundary | Revert only `packages/dominio/src/animal.ts`, `packages/dominio/src/index.ts`, `packages/dominio/tests/animal.test.ts`, `openspec/changes/add-animals-crud-flow/specs/{dominio,aplicacion,db,sync}/spec.md`, `openspec/changes/add-animals-crud-flow/tasks.md`, and this apply-progress section. |

### Verification Commands

- `pnpm --filter @ganaweb/dominio test -- tests/animal.test.ts` → exit 0; 1 file / 15 tests passed.
- `pnpm --filter @ganaweb/dominio typecheck` → exit 0.
- `pnpm --filter @ganaweb/dominio lint` → exit 0.

### Finding Resolution

- R3-005 resolved by narrowing PR1 truthfully to pure domain CA contract coverage and documenting that infrastructure-dependent CA rules are PR2/PR3 responsibilities.
- Added pure domain coverage for missing rule surfaces: required create fields, sex-derived initial state/category, code editability from reference facts, delete decisions from pure facts, active image principal invariant, and principal reassignment candidate on unlink.
- Adjusted task/spec wording so completed PR1 tasks no longer overclaim full DB/sync/file/storage implementation.

## PR2 Evidence: DB/sync/persistence/reference infrastructure

### Scope

- Current PR slice: PR2 DB/sync adapters and reference checker infrastructure.
- Chain strategy: feature-branch-chain; this slice builds on PR1 domain/application contracts and intentionally excludes UI/OpenPencil parity, web routes, and E2E.
- Scope completed: DB reference summary helpers, one-active-principal image invariant support, immutable physical-delete audit helper, tombstone/binary queue schema deltas, and animal sync envelope/conflict/tombstone/binary-state contracts.

### Completed Tasks

- [x] 2.1 RED: add DB adapter tests for reference summaries across CA-TL-001 sources, one principal image, and immutable physical-delete audit.
- [x] 2.2 Update `packages/db/src/schema/{imagenes,auditoria,sync,animales}.ts` and adapters for `es_principal`, audit rows, tombstones, authenticated image metadata, and reference queries.
- [x] 2.3 RED: add `packages/sync/src/*animal*.test.ts` for duplicate-code conflict, physical-delete tombstone purge, blob failure after data sync, and version conflict review.
- [x] 2.4 Implement `packages/sync/src/*animal*` operation envelopes for create/update/inactivate/reactivate/image-link/delete tombstone and separate binary queue state.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.1 | `packages/db/tests/animal-infrastructure.test.ts` | Unit/integration-adapter contract | ✅ Existing DB package tests were present; focused new file was added before implementation | ✅ RED failed: missing `../src/animal-infrastructure.js` module | ✅ `pnpm --filter @ganaweb/db test -- tests/animal-infrastructure.test.ts`: 1 file / 3 tests passed | ✅ Covered blocking CA-TL references with annulled group exclusion, principal reassignment, and immutable audit row | ✅ Formatted changed DB files with Biome and kept helper pure |
| 2.2 | `packages/db/tests/animal-infrastructure.test.ts` | DB adapter/schema contract | ✅ Same DB package safety net | ✅ Same RED from 2.1 drove reference/image/audit persistence helper surface | ✅ `pnpm --filter @ganaweb/db test`: 3 passed files, 1 skipped DB smoke file; 7 passed / 2 skipped | ✅ Schema support covers active-principal uniqueness, tombstones, binary queue, and audit identity | ✅ `pnpm --filter @ganaweb/db typecheck` exit 0; changed DB files pass `pnpm exec biome check` |
| 2.3 | `packages/sync/src/animal-sync.test.ts` | Unit/sync contract | ✅ Sync test runner was scaffolded for PR2 before package GREEN | ✅ RED failed: missing `./animal-sync.js` module after enabling Vitest for `@ganaweb/sync` | ✅ `pnpm --filter @ganaweb/sync test -- src/animal-sync.test.ts`: 1 file / 4 tests passed | ✅ Covered duplicate-code conflict, tombstone purge, data/blob split state, and version conflict review | ✅ Sync package lint and typecheck passed |
| 2.4 | `packages/sync/src/animal-sync.test.ts` | Unit/sync contract | ✅ Same sync package safety net | ✅ Same RED from 2.3 drove envelope and state implementation | ✅ `pnpm --filter @ganaweb/sync test`: 1 file / 4 tests passed | ✅ Operation union includes create/update/inactivate/reactivate/image-link/delete tombstone, with separate binary queue state | ✅ Exported public sync contract from `packages/sync/src/index.ts` |

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --filter @ganaweb/db test && pnpm --filter @ganaweb/sync test` → exit 0; DB 3 passed files / 1 skipped smoke file / 7 passed / 2 skipped tests, sync 1 file / 4 tests passed. |
| Runtime harness command/scenario and exact result | `pnpm --filter @ganaweb/db typecheck && pnpm --filter @ganaweb/sync typecheck` → exit 0. Full DB runtime smoke remains gated behind `DB_SMOKE=true` and was skipped by existing test design because no Postgres harness was provided in this apply environment. |
| Rollback boundary | Revert PR2 files only: `packages/db/src/animal-infrastructure.ts`, `packages/db/tests/animal-infrastructure.test.ts`, `packages/db/src/schema/animales-extra.ts`, `packages/db/src/schema/sync.ts`, `packages/db/src/schema/index.ts`, `packages/db/migrations/0000_initial.sql`, `packages/sync/src/animal-sync.ts`, `packages/sync/src/animal-sync.test.ts`, `packages/sync/src/index.ts`, `packages/sync/package.json`, `pnpm-lock.yaml`, `openspec/changes/add-animals-crud-flow/tasks.md`, and this apply-progress PR2 section. |

### Verification Commands

- `pnpm --filter @ganaweb/db test -- tests/animal-infrastructure.test.ts` → RED before implementation: failed because `../src/animal-infrastructure.js` did not exist; GREEN after implementation: exit 0, 1 file / 3 tests passed.
- `pnpm --filter @ganaweb/sync test -- src/animal-sync.test.ts` → RED before implementation: failed because `./animal-sync.js` did not exist after Vitest was enabled; GREEN after implementation: exit 0, 1 file / 4 tests passed.
- `pnpm --filter @ganaweb/db test` → exit 0; 3 passed files / 1 skipped DB smoke file; 7 passed / 2 skipped tests.
- `pnpm --filter @ganaweb/sync test` → exit 0; 1 file / 4 tests passed.
- `pnpm --filter @ganaweb/db typecheck && pnpm --filter @ganaweb/sync typecheck` → exit 0.
- `pnpm --filter @ganaweb/sync lint` → exit 0.
- `pnpm exec biome check packages/db/src/animal-infrastructure.ts packages/db/src/schema/animales-extra.ts packages/db/src/schema/index.ts` → exit 0.
- `pnpm --filter @ganaweb/db lint` → exit 1 due pre-existing package-wide formatting/import diagnostics in generated/previous schema and migration meta files outside the PR2-authored changed-file check; no PR2 changed-file diagnostics remained after formatting.

### Notes

- Existing Node engine warning remains: current environment is Node v24.18.0 while package engines request Node 22.
- `DB_SMOKE=true` Postgres integration was not run because no database harness was provided; the existing duplicate-insert smoke suite remains skipped without that flag.
- Apply-progress was merged by appending this PR2 section after all previous PR1 and R3-005 evidence; prior completed tasks/evidence were preserved.

## Scoped Correction Evidence: PR2 reliability findings R3-001/R3-002

### Scope

- Correction actor scope: frozen PR2 DB/sync/persistence/reference findings R3-001 and R3-002 only.
- Explicitly excluded: UI/web routes and R3-003 warning remediation.

### TDD Cycle Evidence

| Finding | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| R3-001 | `packages/db/tests/animal-infrastructure.test.ts` | Config/unit | ✅ Existing focused DB file was run before correction work | ✅ RED: focused run failed because `@ganaweb/db/animal-infrastructure` package contract was still missing before tests could collect; the new guard assertion also required `--allowOnly=false` and `allowOnly: false` | ✅ `pnpm --filter @ganaweb/db test -- tests/animal-infrastructure.test.ts` passed: 1 file / 6 tests | ➖ Structural config guard has one deterministic outcome | ✅ Added package script guard plus Vitest config guard |
| R3-002 | `packages/db/tests/animal-infrastructure.test.ts` | DB adapter contract | ✅ Same focused DB safety net | ✅ RED: tests required `DbAnimalReferenceChecker`, `AnimalReferenceQueryReader`, and package export contract that did not exist | ✅ Focused run passed after implementation: 1 file / 6 tests | ✅ Covered reader-backed summary across CA-TL reference sources, annulled group exclusion, images excluded from blocking references, and all offspring roles `madreId`/`padreId`/`donadoraId` in finca scope | ✅ Added Drizzle query reader, application-port-compatible checker, and factory export without touching UI/web scope |

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --filter @ganaweb/db test -- tests/animal-infrastructure.test.ts` → exit 0; 1 file / 6 tests passed. |
| Runtime harness command/scenario and exact result | `pnpm --filter @ganaweb/db test` → exit 0; 3 passed files / 1 skipped smoke file / 10 passed / 2 skipped tests. `pnpm --filter @ganaweb/db typecheck` → exit 0. Postgres smoke remains N/A because no DB harness was provided and existing smoke tests are gated by `DB_SMOKE=true`. |
| Rollback boundary | Revert only correction files: `packages/db/package.json`, `packages/db/vitest.config.ts`, `packages/db/src/animal-infrastructure.ts`, `packages/db/tests/animal-infrastructure.test.ts`, and this apply-progress section. |

### Verification Commands

- `pnpm --filter @ganaweb/db test -- tests/animal-infrastructure.test.ts` → initial RED failed before implementation because `@ganaweb/db/animal-infrastructure` export was missing; GREEN exit 0, 1 file / 6 tests passed.
- `pnpm --filter @ganaweb/db test` → exit 0; 3 passed files / 1 skipped smoke file; 10 passed / 2 skipped tests.
- `pnpm --filter @ganaweb/db typecheck` → exit 0.
- `pnpm exec biome check packages/db/src/animal-infrastructure.ts packages/db/tests/animal-infrastructure.test.ts packages/db/vitest.config.ts packages/db/package.json` → exit 0.

### Finding Resolution

- R3-001 fixed: DB package test command now passes `--allowOnly=false`, and `packages/db/vitest.config.ts` sets `test.allowOnly: false`.
- R3-002 fixed: `@ganaweb/db/animal-infrastructure` now exports a package-visible `createAnimalReferenceChecker` factory plus `DbAnimalReferenceChecker`/`DrizzleAnimalReferenceQueryReader`; the checker implements the application `AnimalReferenceCheckerPort` contract and delegates to Drizzle table queries for CA-TL references and offspring roles before producing the existing summary shape.

### Notes

- Existing Node engine warning remains: current environment is Node v24.18.0 while package engines request Node 22.
- R3-003 remains intentionally not fixed; it was warning/info only and outside the frozen severe correction scope.

## PR3 Evidence: UI components and OpenPencil parity

### Scope

- Current PR slice: PR3 reusable animal UI and OpenPencil visual parity.
- Chain strategy: feature-branch-chain; this slice builds on PR1/PR2 contracts and intentionally excludes web route/server-function integration and Playwright E2E wiring.
- Scope completed: package UI presentational components for animal mobile list/cards, desktop list/table, ficha header/metrics/timeline/cards, gallery image states, delete dialog copy, and desktop/mobile animal form shells mapped to OpenPencil frames 03/04/18/19/20/21.

### Completed Tasks

- [x] 3.1 RED: add UI tests for mobile cards, empty state, timeline year grouping, five-image limit, pending upload, and inactive/sold/dead banners.
- [x] 3.2 Build `packages/ui/src/ganado/animal-*` list/table, form, ficha header, gallery, genealogy, delete dialog, and timeline components using tokens only.
- [x] 3.3 Verify component layout parity against OpenPencil frames `frame-0185`, `frame-0232`, `f-300165`, `f-400107`, `f-400191`, and `f-400233`.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.1 | `packages/ui/tests/animal-ui.test.tsx` | Component/unit (jsdom) | ⚠️ Package-wide baseline `pnpm --filter @ganaweb/ui test` had 4 pre-existing failures in `tests/integration-app.test.ts` unrelated to PR3; focused PR3 file did not exist yet. | ✅ RED failed: 6/6 new tests failed because animal PR3 exports/components did not exist. | ✅ Focused run passed: 1 file / 6 tests passed. | ✅ Covered mobile cards + empty state, timeline year grouping + pending upload, inactive/sold banner, five-image limit, form labels/sticky save, and desktop OpenPencil structure. | ✅ Added cleanup isolation, accessible labels, non-color status copy, and formatted with Biome. |
| 3.2 | `packages/ui/tests/animal-ui.test.tsx` | Component/unit (jsdom) | ⚠️ Same pre-existing package-wide failures; changed-file checks used for this slice. | ✅ Same RED from 3.1 drove `AnimalListMobile`, `AnimalTimeline`, `AnimalFichaHeader`, `AnimalGallery`, `AnimalFormScreen`, `AnimalDesktopScreen`, `AnimalFichaDesktopScreen`, and delete-copy surface. | ✅ `pnpm --filter @ganaweb/ui test -- tests/animal-ui.test.tsx`: exit 0, 6 tests passed. | ✅ Components cover distinct responsive/card/table/form/gallery/timeline paths with Spanish domain copy and token classes only. | ✅ `pnpm --filter @ganaweb/ui typecheck` exit 0; changed files pass `pnpm exec biome check ...`. |
| 3.3 | `packages/ui/tests/animal-ui.test.tsx` | Component parity/structure | ⚠️ OpenPencil live validation was already recorded in `design.md`; no canvas mutation was required. | ✅ RED expected named OpenPencil test IDs/accessible names and frame-specific responsibilities before implementation. | ✅ Focused parity test passed for `op-frame-0185`, `op-f-300165`, `op-f-400107`, `op-f-400191`, and `op-f-400233`; mobile ficha responsibilities are covered through `AnimalFichaHeader` + `AnimalTimeline`. | ✅ Desktop list/ficha and desktop/mobile forms assert frame labels, table, selection bar, card regions, required labels, and sticky save. | ✅ Kept PR3 presentational; no route/server-function integration added. |

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --filter @ganaweb/ui test -- tests/animal-ui.test.tsx` → exit 0; 1 file / 6 tests passed. |
| Runtime harness command/scenario and exact result | Component render harness via jsdom in `packages/ui/tests/animal-ui.test.tsx` renders the PR3 screen structures for OpenPencil frames 03/18/19/20/21 and ficha mobile header/timeline responsibilities → exit 0, 6 tests passed. Full `pnpm --filter @ganaweb/ui test` exits 1 due pre-existing `tests/integration-app.test.ts` expectations around `USUARIO_DEMO` in app shell, observed before PR3 changes. |
| Rollback boundary | Revert PR3 files only: `packages/ui/src/ganado/animal-crud.tsx`, `packages/ui/tests/animal-ui.test.tsx`, `packages/ui/src/index.ts` export additions, `openspec/changes/add-animals-crud-flow/tasks.md` PR3 checkboxes, and this apply-progress PR3 section. |

### Verification Commands

- `pnpm --filter @ganaweb/ui test -- tests/animal-ui.test.tsx` → RED before implementation: exit 1, 6/6 failed because components were undefined; GREEN after implementation: exit 0, 1 file / 6 tests passed.
- `pnpm --filter @ganaweb/ui typecheck` → exit 0.
- `pnpm exec biome check packages/ui/src/ganado/animal-crud.tsx packages/ui/src/index.ts packages/ui/tests/animal-ui.test.tsx` → exit 0.
- `pnpm --filter @ganaweb/ui test` → exit 1 with the same 4 pre-existing `tests/integration-app.test.ts` failures around obsolete `USUARIO_DEMO` shell expectations; PR3 animal tests passed in that package run.

### Notes

- Existing Node engine warning remains: current environment is Node v24.18.0 while package engines request Node 22.
- CodeGraph initialization was attempted before broad source exploration but failed with `unsafe CodeGraph root "/home/lrodriguezn/ganaweb"`; implementation proceeded with direct file reads after that tool-level blocker.
- Apply-progress was merged by appending this PR3 section after all previous PR1/PR2/correction evidence; prior completed tasks/evidence were preserved.

## Scoped Correction Evidence: PR3 UI/OpenPencil reliability findings R3-001/R3-002/R3-003

### Scope

- Correction actor scope: frozen PR3 UI/OpenPencil parity findings R3-001, R3-002, and R3-003 only.
- Explicitly excluded: PR4 web routes, server functions, route integration, and E2E wiring.

### TDD Cycle Evidence

| Finding | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| R3-001 | `packages/ui/tests/animal-ui.test.tsx` | Config/component package guard | ✅ Baseline `pnpm --filter @ganaweb/ui test -- tests/animal-ui.test.tsx`: 1 file / 6 tests passed | ✅ RED failed because `package.json` test script lacked `--allowOnly=false`; same test also required `vitest.config.ts` `allowOnly: false` | ✅ Focused run passed after package script/config guard: 1 file / 9 tests passed | ➖ Structural config guard has one deterministic outcome | ✅ Kept guard package-local in both script and Vitest config |
| R3-002 | `packages/ui/tests/animal-ui.test.tsx` | Component/unit (jsdom) | ✅ Same focused baseline | ✅ RED failed because `AnimalFichaMobileScreen` was undefined and no `op-frame-0232` frame contract rendered | ✅ Focused run passed after mobile ficha implementation: 1 file / 9 tests passed | ✅ Covered frame name, header data, metric cards, selected Timeline tab, Fotos tab, timeline item, BottomNav, and FAB action | ✅ Kept component route-agnostic and presentational for PR4 composition |
| R3-003 | `packages/ui/tests/animal-ui.test.tsx` | Component/unit + public export contract | ✅ Same focused baseline | ✅ RED failed because `AnimalGenealogy` was undefined from the package barrel | ✅ Focused run passed after genealogy component/export and desktop ficha composition support: 1 file / 9 tests passed | ✅ Covered parent relationships and multiple offspring roles with concrete animal codes/names | ✅ Added typed genealogy contracts and optional ficha composition without touching route code |

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --filter @ganaweb/ui test -- tests/animal-ui.test.tsx` → RED after tests first: exit 1; failures for missing `--allowOnly=false`, undefined `AnimalFichaMobileScreen`, and undefined `AnimalGenealogy`. GREEN after implementation: exit 0; 1 file / 9 tests passed. |
| Runtime harness command/scenario and exact result | Component render harness via jsdom renders OpenPencil frame 04 mobile ficha (`op-frame-0232`) with BottomNav parity plus exported genealogy contract → exit 0 in focused run. Package command `pnpm --filter @ganaweb/ui test` now executes with `--allowOnly=false` but still exits 1 due the same pre-existing `tests/integration-app.test.ts` USUARIO_DEMO shell expectation failures recorded before PR3 correction; animal UI tests passed in that run. |
| Rollback boundary | Revert only PR3 correction files: `packages/ui/package.json`, `packages/ui/vitest.config.ts`, `packages/ui/src/ganado/animal-crud.tsx`, `packages/ui/src/index.ts`, `packages/ui/tests/animal-ui.test.tsx`, and this apply-progress section. |

### Verification Commands

- `pnpm --filter @ganaweb/ui test -- tests/animal-ui.test.tsx` → initial RED after tests-first change: exit 1; 3 failed / 6 passed because focused-test guard and missing mobile ficha/genealogy contracts were absent.
- `pnpm --filter @ganaweb/ui test -- tests/animal-ui.test.tsx` → GREEN exit 0; 1 file / 9 tests passed.
- `pnpm --filter @ganaweb/ui typecheck` → exit 0.
- `pnpm exec biome check packages/ui/src/ganado/animal-crud.tsx packages/ui/src/index.ts packages/ui/tests/animal-ui.test.tsx packages/ui/vitest.config.ts packages/ui/package.json` → exit 0.
- `pnpm --filter @ganaweb/ui test` → exit 1 due pre-existing `tests/integration-app.test.ts` expectations around obsolete `USUARIO_DEMO` shell contracts; command now includes `--allowOnly=false`, and `tests/animal-ui.test.tsx` passed 9 tests in the package run.

### Finding Resolution

- R3-001 fixed: `@ganaweb/ui` package test script now passes `--allowOnly=false`, and `packages/ui/vitest.config.ts` sets `test.allowOnly: false`; a focused static test guards both contracts.
- R3-002 fixed: `AnimalFichaMobileScreen` implements route-agnostic OpenPencil frame `op-frame-0232` / `04 Ficha Animal · Mobile` with mobile ficha header, metrics, tabs/pills, timeline, BottomNav, and FAB parity for PR3 scope.
- R3-003 fixed: `AnimalGenealogy` plus typed genealogy contracts are exported from `@ganaweb/ui`; desktop ficha can compose genealogy when provided and otherwise shows a truthful empty genealogy card.

### Notes

- Existing Node engine warning remains: current environment is Node v24.18.0 while package engines request Node 22.
- `tasks.md` was not changed because tasks 3.2 and 3.3 were already checked; this correction aligns the implementation and evidence with those existing checked statuses.

## PR4 Evidence: Web routes, server actions, and route harness

### Scope

- Current PR slice: PR4 web route/server-function integration and deterministic E2E-adjacent harness.
- Chain strategy: feature-branch-chain; this slice builds on PR1/PR2/PR3 contracts and intentionally leaves full Playwright scenarios pending because Playwright is not installed/configured in this workspace.
- Scope completed: finca-scoped animal route files, server action harness with session/finca/RBAC/animal ownership guards, PR3 UI component composition, active-finca shell navigation, and focused route/action tests for forged finca, cross-finca animal ids, missing permissions, create/list/ficha/delete/reactivate/timeline harness behavior.

### Completed Tasks

- [x] 4.1 RED: add route/action tests for forged `fincaId`, cross-finca `animalId`, missing permissions, and direct mutation denial.
- [x] 4.2 Create `apps/web/src/server/animal-actions.server.ts` to revalidate session, finca membership, animal ownership, RBAC, and online-only physical delete.
- [x] 4.3 Create `apps/web/src/routes/_app/fincas/$fincaId/animales*.tsx` list, create/edit, ficha, image, delete/inactivate, and reactivate flows.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 4.1 | `apps/web/tests/animal-web-flow.test.ts` | Route/server-function harness | ✅ Existing `pnpm --filter @ganaweb/web test` baseline passed auth tests before adding the new package-script entry | ✅ Initial RED failed because `src/server/animal-actions.server.js` did not exist; later REDs failed for active-finca shell routing and delete-only permission handling | ✅ `pnpm --filter @ganaweb/web test` passed after implementation: auth tests + animal harness | ✅ Covered forged finca, cross-finca animal id, read-only direct mutation denial, delete-only authorization, create with pending image, referenced delete → inactivate, ficha timeline cursor, and read-only view model | ✅ Extracted pure guard/view-model/harness functions and formatted changed files with Biome |
| 4.2 | `apps/web/tests/animal-web-flow.test.ts` | Server action/unit harness | ✅ Existing auth server tests passed before package-script change | ✅ RED required missing guard exports: `resolveAnimalPermissions`, `denyAnimalRouteAccess`, `createAnimalActionHarness`, `buildAnimalRouteViewModel` | ✅ Focused and package web tests passed | ✅ Distinct permission/finca/ownership branches plus create/update/delete/reactivate use-case delegation paths | ✅ Server functions delegate to a runtime harness; pure helpers remain testable without invoking TanStack runtime |
| 4.3 | `apps/web/tests/animal-web-flow.test.ts` | Route/static integration + typecheck | ✅ Typecheck run generated route tree and exposed stale UI type surface before `@ganaweb/ui` build | ✅ Static route-wire test failed until finca-scoped route files and active-finca shell navigation existed | ✅ `pnpm --filter @ganaweb/web typecheck` passed after route integration | ✅ List, create, ficha, edit, delete/inactivate, reactivate, PR3 desktop/mobile components, and active nav highlight paths are asserted | ✅ Kept route components thin and reused PR3 presentational components |

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --filter @ganaweb/web exec tsx tests/animal-web-flow.test.ts` → RED before implementation: exit 1 missing `animal-actions.server.js`; additional REDs: exit 1 for missing active-finca shell route and delete-only permission guard. GREEN after implementation: exit 0; `✅ animal-web-flow.test.ts passed`. |
| Runtime harness command/scenario and exact result | `pnpm --filter @ganaweb/web test` → exit 0; existing auth harness plus animal route/action harness passed. `pnpm --filter @ganaweb/web typecheck` → exit 0 after `tsr generate`. `pnpm exec playwright test animales` → blocked, exit 1: `Command "playwright" not found`; no Playwright config/spec scaffold exists in this workspace. |
| Rollback boundary | Revert PR4 files only: `apps/web/src/server/animal-actions.server.ts`, `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx`, `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx`, `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId.tsx`, `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/editar.tsx`, `apps/web/tests/animal-web-flow.test.ts`, `apps/web/package.json`, the active-finca animal navigation edits in `apps/web/src/routes/_app.tsx`, the `AnimalRegistro` re-export in `packages/aplicacion/src/index.ts`, `openspec/changes/add-animals-crud-flow/tasks.md` PR4 checkboxes, and this apply-progress section. |

### Verification Commands

- `pnpm --filter @ganaweb/web exec tsx tests/animal-web-flow.test.ts` → GREEN exit 0; `✅ animal-web-flow.test.ts passed`.
- `pnpm --filter @ganaweb/web test` → exit 0; auth harness and animal route/action harness passed.
- `pnpm --filter @ganaweb/web typecheck` → exit 0; `tsr generate && tsc --noEmit` passed.
- `pnpm exec biome check apps/web/src/server/animal-actions.server.ts apps/web/src/routes/_app.tsx apps/web/src/routes/_app/fincas/\$fincaId/animales.tsx apps/web/src/routes/_app/fincas/\$fincaId/animales/nuevo.tsx apps/web/src/routes/_app/fincas/\$fincaId/animales/\$animalId.tsx apps/web/src/routes/_app/fincas/\$fincaId/animales/\$animalId/editar.tsx apps/web/tests/animal-web-flow.test.ts apps/web/package.json packages/aplicacion/src/index.ts` → exit 0.
- `pnpm exec playwright test animales` → exit 1; blocked because the `playwright` command is not installed and no Playwright config was found.

### Notes

- Existing Node engine warning remains: current environment is Node v24.18.0 while package engines request Node 22.
- `@ganaweb/ui` was built locally (`pnpm --filter @ganaweb/ui build`) before web typecheck so the package `dist/index.d.ts` reflected the PR3 exports consumed by PR4 routes; no dist files appeared in git status.
- Apply-progress was merged by appending this PR4 section after all previous PR1/PR2/PR3/correction evidence; prior completed tasks/evidence were preserved.
- Task 4.4 remains unchecked: closest deterministic route/server-function harness is present, but full Playwright E2E scenarios require adding/configuring Playwright in a later slice or verification pass.

## Scoped Correction Evidence: PR4 web route/server-function reliability findings R3-001/R3-002/R3-003

### Scope

- Correction actor scope: frozen PR4 severe findings R3-001, R3-002, and R3-003 only.
- Explicitly excluded: Playwright task 4.4 completion and R3-004 warning-only remediation.

### TDD Cycle Evidence

| Finding | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| R3-001 | `apps/web/tests/animal-web-flow.test.ts` | Server-function harness | ✅ Baseline focused harness passed before production code changes | ✅ RED failed because `createAnimalRuntimeHarness` was missing and production exports still relied on demo state | ✅ Focused harness passed after exported actions used an explicit adapter factory and no demo deps | ✅ Covered configured test harness behavior plus unconfigured production-runtime failure path | ✅ Removed demo repository/outbox/file queue from production module scope |
| R3-002 | `apps/web/tests/animal-web-flow.test.ts` | Route payload builder | ✅ Same focused harness baseline | ✅ RED failed because create/edit routes did not export payload builders and route source contained hard-coded create placeholders | ✅ Focused harness passed after create/edit submit `FormData` values for `codigo`, `nombre`, `sexoKey`, `versionLeida`, and editable `codigo` | ✅ Covered distinct create and update form payloads | ✅ Added named form fields in `AnimalFormScreen` while keeping PR3 component tests green |
| R3-003 | `apps/web/tests/animal-web-flow.test.ts` | Route/server-function harness | ✅ Same focused harness baseline | ✅ RED failed because no image route file/action surface existed | ✅ Focused harness passed after adding `attachAnimalImageAction` and `/imagenes` route | ✅ Covered create-with-photo and existing-animal image attach paths | ✅ Documented mark-principal/unlink as deferred because current app ports only support pending image attach |

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --filter @ganaweb/web exec tsx tests/animal-web-flow.test.ts` → RED first: exit 1 for missing `buildCreateAnimalInputFromFormData`; GREEN after implementation: exit 0, `✅ animal-web-flow.test.ts passed`. |
| Runtime harness command/scenario and exact result | `pnpm --filter @ganaweb/web test` → exit 0; auth harnesses and animal route/server-function harness passed. `pnpm --filter @ganaweb/web typecheck` → exit 0. `pnpm exec playwright test animales` → exit 1, `Command "playwright" not found`; task 4.4 remains unchecked. |
| Rollback boundary | Revert only PR4 correction files: `apps/web/src/server/animal-actions.server.ts`, `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx`, `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/editar.tsx`, `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/imagenes.tsx`, `apps/web/tests/animal-web-flow.test.ts`, `packages/ui/src/ganado/animal-crud.tsx`, rebuilt `packages/ui/dist/index.*`, `openspec/changes/add-animals-crud-flow/tasks.md`, and this apply-progress section. |

### Verification Commands

- `pnpm --filter @ganaweb/web exec tsx tests/animal-web-flow.test.ts` → RED before implementation: exit 1; missing route payload builder/export. GREEN after implementation: exit 0; `✅ animal-web-flow.test.ts passed`.
- `pnpm --filter @ganaweb/web test` → exit 0; auth harnesses plus animal harness passed.
- `pnpm --filter @ganaweb/ui test -- tests/animal-ui.test.tsx` → exit 0; 1 file / 9 tests passed.
- `pnpm --filter @ganaweb/ui build` → exit 0; rebuilt `dist/index.js`, `dist/index.js.map`, and `dist/index.d.ts` so `apps/web` consumes the updated `AnimalFormScreen` prop type.
- `pnpm --filter @ganaweb/web typecheck` → exit 0; `tsr generate && tsc --noEmit` passed.
- `pnpm --filter @ganaweb/ui typecheck` → exit 0.
- `pnpm exec biome check apps/web/src/server/animal-actions.server.ts apps/web/src/routes/_app/fincas/\$fincaId/animales.tsx apps/web/src/routes/_app/fincas/\$fincaId/animales/nuevo.tsx apps/web/src/routes/_app/fincas/\$fincaId/animales/\$animalId.tsx apps/web/src/routes/_app/fincas/\$fincaId/animales/\$animalId/editar.tsx apps/web/src/routes/_app/fincas/\$fincaId/animales/\$animalId/imagenes.tsx apps/web/tests/animal-web-flow.test.ts packages/ui/src/ganado/animal-crud.tsx` → exit 0.
- `pnpm exec playwright test animales` → exit 1; blocked because `playwright` command is unavailable.

### Finding Resolution

- R3-001 fixed: exported production server functions no longer instantiate the in-memory demo repository/outbox/file queue; they use `createAnimalRuntimeHarness` and `configureAnimalRuntimeDeps` as an explicit adapter boundary and fail loudly if real adapters are not configured.
- R3-002 fixed: create/edit routes now submit `FormData` from named form fields instead of hard-coded placeholders; route payload builders are covered by focused tests.
- R3-003 fixed: PR4 now exposes an image attach server action and finca/animal-scoped `/imagenes` route. Mark-principal/unlink are intentionally not claimed because the current application contract only supports pending image attach.

### Notes

- Existing Node engine warning remains: current environment is Node v24.18.0 while package engines request Node 22.
- Task 4.4 remains unchecked; Playwright is still unavailable and was not faked.

## PR4.4 Evidence: Playwright E2E setup and blocked browser execution

### Scope

- Current PR slice: remaining task 4.4 only — Playwright installation/configuration plus animals E2E coverage scaffold.
- Chain strategy: feature-branch-chain; this work stays within the PR4 E2E hardening boundary.
- Scope completed: installed Playwright Test, added root Playwright config, added animals E2E scenarios, added env-gated E2E-only animal/auth fixtures so the dev server can exercise current app routes without production demo dependencies, and exposed route/UI hooks needed by those scenarios.
- Completion status: task 4.4 remains unchecked because Chromium cannot launch in this execution environment due missing Linux shared library dependencies.

### Completed / Blocked Tasks

- [ ] 4.4 Add Playwright scenarios for offline create with photo, referenced delete → inactivate, read-only RBAC, timeline pagination, and responsive OpenPencil parity. **Blocked at browser launch**: Playwright tests are installed/listable, but browser execution fails with `libatk-1.0.so.0: cannot open shared object file` and `pnpm exec playwright install-deps chromium` cannot run because sudo requires an interactive password.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 4.4 | `tests/e2e/animales.spec.ts` | Playwright E2E/browser | ✅ `pnpm --filter @ganaweb/web test` baseline passed before Playwright setup; previous `pnpm exec playwright test animales` failed because `playwright` was not installed | ✅ RED: initial Playwright command failed with `Command "playwright" not found`; after install/config/spec, browser run failed before app assertions because Chromium could not load `libatk-1.0.so.0` | ❌ Blocked: `pnpm exec playwright test animales --reporter=line` reached 6 tests but all failed at Chromium launch due missing system deps; no browser GREEN was achieved | ✅ Scenarios are defined for create/offline affordance + pending photo, referenced delete/inactivate, timeline pagination, read-only RBAC, and desktop/mobile OpenPencil parity, but not executable until system deps are installed | ✅ Config uses deterministic `webServer`, `baseURL`, one worker, desktop/mobile projects, and env-gated E2E fixtures instead of production demo adapters |

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm exec playwright test animales --list` → exit 0; 6 tests discovered in `tests/e2e/animales.spec.ts` across `animales-desktop` and `animales-mobile`. `pnpm exec playwright test animales --reporter=line` → exit 1; 6/6 failed at browser launch before assertions due `libatk-1.0.so.0` missing. |
| Runtime harness command/scenario and exact result | `pnpm --filter @ganaweb/web test` → exit 0; auth harnesses and animal route/server-function harness passed. `pnpm --filter @ganaweb/ui test -- tests/animal-ui.test.tsx` → exit 0; 1 file / 9 tests passed. `pnpm --filter @ganaweb/ui build` → exit 0; rebuilt `dist/index.js`, `dist/index.js.map`, and `dist/index.d.ts`. |
| Rollback boundary | Revert only 4.4 files/edits: `playwright.config.ts`, `tests/e2e/animales.spec.ts`, root `package.json`/`pnpm-lock.yaml` Playwright dependency changes, `apps/web/src/server/e2e-animals-fixture.server.ts`, E2E fixture hooks in `apps/web/src/server/auth.ts` and `apps/web/src/server/animal-actions.server.ts`, route visibility/pagination text in `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` and `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId.tsx`, `packages/ui/src/ganado/animal-crud.tsx` `canCreate` prop edits, rebuilt `packages/ui/dist/index.*`, and this apply-progress section. |

### Verification Commands

- `pnpm exec playwright test animales` before install → exit 1; `Command "playwright" not found`.
- `pnpm add -D @playwright/test -w` → exit 0; root dev dependency added and lockfile updated.
- `pnpm exec playwright --version && pnpm exec playwright install chromium` → exit 0; Playwright 1.61.1 installed Chromium/ffmpeg into `/home/lrodriguezn/.cache/ms-playwright`.
- `pnpm exec playwright install-deps chromium` → exit 1; blocked because sudo requires an interactive password.
- `pnpm exec playwright test animales --list` → exit 0; 6 tests listed.
- `pnpm exec playwright test animales --reporter=line` → exit 1; Chromium failed to launch: `libatk-1.0.so.0: cannot open shared object file: No such file or directory`.
- `pnpm --filter @ganaweb/web test` → exit 0.
- `pnpm --filter @ganaweb/ui test -- tests/animal-ui.test.tsx` → exit 0; 1 file / 9 tests passed.
- `pnpm --filter @ganaweb/ui build` → exit 0.
- `pnpm exec biome check playwright.config.ts tests/e2e/animales.spec.ts apps/web/src/server/e2e-animals-fixture.server.ts apps/web/src/server/auth.ts apps/web/src/server/animal-actions.server.ts apps/web/src/routes/_app/fincas/\$fincaId/animales.tsx apps/web/src/routes/_app/fincas/\$fincaId/animales/\$animalId.tsx packages/ui/src/ganado/animal-crud.tsx package.json pnpm-lock.yaml` → exit 0.
- `pnpm --filter @ganaweb/web typecheck` → exit 1 due existing typed-navigation targets in `apps/web/src/routes/_app.tsx` for missing routes `/configuracion`, `/buscar`, `/sync`, and `/eventos/nuevo`; this is outside the 4.4 Playwright scope.

### Notes

- Existing Node engine warning remains: current environment is Node v24.18.0 while package engines request Node 22.
- Browser binaries are installed, but OS dependencies are not. Install the Chromium system dependencies outside this non-interactive agent environment, then rerun `pnpm exec playwright test animales` before checking task 4.4.
- The E2E fixture is guarded by `GANAWEB_E2E_ANIMALS=1`; production runtime still fails clearly when real animal adapters are not configured.
- The current app does not yet provide true service-worker-backed offline submission from the create form; the Playwright scenario covers the route-level offline sync affordance plus pending image upload state available in the current route surface.

## PR4.4 Correction Evidence: Playwright GREEN after import-boundary and strict-locator fixes

### Scope

- Current PR slice: task 4.4 only — make `pnpm exec playwright test animales` pass after Playwright dependencies were installed.
- Chain strategy: feature-branch-chain; this remains inside PR4 E2E hardening and does not add unrelated animal features.
- Scope completed: removed direct route imports of `*.server.*` by adding a TanStack Start server-function bridge, fixed nested animal route rendering for child pages, made Playwright locators strict and frame-scoped, and used route/server E2E hooks for deterministic create/delete flows.

### Completed Tasks

- [x] 4.4 Add Playwright scenarios for offline create with photo, referenced delete → inactivate, read-only RBAC, timeline pagination, and responsive OpenPencil parity.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 4.4 | `tests/e2e/animales.spec.ts` | Playwright E2E/browser | ✅ Baseline `pnpm exec playwright test animales --reporter=line`: 6/6 failed with strict `MT-122` locator violations and TanStack Start import-protection warnings for direct `*.server.*` imports from animal routes | ✅ User-provided RED plus reproduced RED before changes; follow-up REDs exposed nested route child rendering and native form/delete flow gaps | ✅ `pnpm exec playwright test animales --reporter=line`: exit 0; 6/6 passed across `animales-desktop` and `animales-mobile` | ✅ Covered desktop/mobile list, create/list pending affordance, image pending upload, referenced delete/inactivation, timeline cursor/events, read-only RBAC, and responsive frame parity | ✅ Added a thin `apps/web/src/server/animal-actions.ts` server-function bridge, scoped locators to OpenPencil frames/roles, and kept E2E-only deterministic fixture writes behind `GANAWEB_E2E_ANIMALS=1` |

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm exec playwright test animales --reporter=line` → exit 0; 6 tests passed using 1 worker. |
| Runtime harness command/scenario and exact result | `pnpm --filter @ganaweb/web typecheck` → exit 0 (`tsr generate && tsc --noEmit`). `pnpm exec biome check apps/web/src/server/animal-actions.ts apps/web/src/server/e2e-animals-fixture.server.ts apps/web/src/routes/_app/fincas/\$fincaId/animales.tsx apps/web/src/routes/_app/fincas/\$fincaId/animales/nuevo.tsx apps/web/src/routes/_app/fincas/\$fincaId/animales/\$animalId.tsx apps/web/src/routes/_app/fincas/\$fincaId/animales/\$animalId/editar.tsx apps/web/src/routes/_app/fincas/\$fincaId/animales/\$animalId/imagenes.tsx tests/e2e/animales.spec.ts packages/ui/src/ganado/animal-crud.tsx` → exit 0. `pnpm --filter @ganaweb/ui build` → exit 0 before final Playwright run. |
| Rollback boundary | Revert only this 4.4 correction surface: `apps/web/src/server/animal-actions.ts`, E2E fixture additions in `apps/web/src/server/e2e-animals-fixture.server.ts`, route import/nested child/native submit/delete edits in `apps/web/src/routes/_app/fincas/$fincaId/animales*.tsx`, `tests/e2e/animales.spec.ts`, `packages/ui/src/ganado/animal-crud.tsx` and rebuilt `packages/ui/dist/index.*`, plus this tasks/apply-progress update. |

### Verification Commands

- `pnpm exec playwright test animales --reporter=line` → initial RED reproduced: exit 1; 6/6 failed with strict locator violations and import-protection warnings.
- `pnpm exec playwright test animales --reporter=line` → GREEN exit 0; 6/6 passed.
- `pnpm --filter @ganaweb/ui build` → exit 0; rebuilt UI package dist for the form footer/button changes.
- `pnpm --filter @ganaweb/web typecheck` → exit 0.
- `pnpm exec biome check apps/web/src/server/animal-actions.ts apps/web/src/server/e2e-animals-fixture.server.ts apps/web/src/routes/_app/fincas/\$fincaId/animales.tsx apps/web/src/routes/_app/fincas/\$fincaId/animales/nuevo.tsx apps/web/src/routes/_app/fincas/\$fincaId/animales/\$animalId.tsx apps/web/src/routes/_app/fincas/\$fincaId/animales/\$animalId/editar.tsx apps/web/src/routes/_app/fincas/\$fincaId/animales/\$animalId/imagenes.tsx tests/e2e/animales.spec.ts packages/ui/src/ganado/animal-crud.tsx` → exit 0.

### Notes

- Existing Node engine warning remains: current environment is Node v24.18.0 while package engines request Node 22.
- The import-protection fix follows the existing `server/auth.ts` pattern: route files import a non-`.server` action bridge, and the bridge uses `createServerFn().handler(...)` with server-only dynamic imports.
- Task 4.4 is now checked because the requested Playwright command passes locally.

## Bounded 4R Correction Evidence: severe findings RISK-001, RELIABILITY-001/002/003, R4-001/002/003/004, R2-001/002/003

### Scope

- Correction actor scope: one ordinary correction transaction for the frozen severe IDs only.
- Artifact mode: OpenSpec.
- Production adapter status: real animal persistence adapters are still not registered in `apps/web`; the production boundary remains explicit and fail-fast through `configureAnimalRuntimeDeps` / `createAnimalRuntimeHarness`. The fixture is test-only and now has a production/runtime guard.

### TDD Cycle Evidence

| Finding(s) | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| RISK-001, R2-002 | `apps/web/tests/animal-web-flow.test.ts`, `tests/e2e/animales.spec.ts` | Web route/static + Playwright route | ✅ Baseline before correction: `pnpm --filter @ganaweb/web exec tsx tests/animal-web-flow.test.ts` passed; `pnpm exec playwright test animales --reporter=line` passed 6/6 | ✅ RED: static route assertions failed while ficha loader still used `search.get("delete")`, GET form, `onClick`, and `onMouseDown` destructive triggers | ✅ Web harness passed and Playwright passed 6/6 after removing loader GET mutation and using a single non-GET server-action submission path | ✅ Covered route source absence of GET mutation/overlapping triggers plus desktop/mobile referenced-delete copy | ✅ Removed overlapping delete triggers and preserved server RBAC/ownership validation in `deleteAnimalAction` |
| R2-001 | `apps/web/tests/animal-web-flow.test.ts`, `tests/e2e/animales.spec.ts` | Web route/static + Playwright route | ✅ Existing create payload-builder tests passed before correction | ✅ RED: static assertions failed while create route still had query-param loader mutation and duplicate click interception/listener paths | ✅ Web harness passed and Playwright passed after removing query-param create mutation and duplicate listener path | ✅ Covered create form payload builders and route rendering for desktop/mobile forms | ✅ Kept one route-local form submission bridge; no document listener or ID-based form lookup remains |
| R2-003 | `apps/web/tests/animal-web-flow.test.ts`, `packages/ui/tests/animal-ui.test.tsx` | Route/static + component | ✅ UI focused test passed 9/9 before correction | ✅ RED: route source exposed `onMarkPrincipal={() => {}}` and `onUnlink={() => {}}` no-op callbacks | ✅ Web harness/UI test passed after gallery controls became optional and image route stopped rendering no-op callbacks | ✅ Covered controls absent when contracts are not implemented, while add-image remains available | ✅ Did not invent mark-principal/unlink server contracts outside current application port scope |
| RELIABILITY-002 | `packages/aplicacion/tests/animal-use-cases.test.ts`, `apps/web/tests/animal-web-flow.test.ts` | Application + server-action harness | ✅ Application and web focused baselines passed | ✅ RED: create/attach tests accepted `application/pdf` and a sixth active image | ✅ Application focused test passed 10/10 and web harness passed after enforcing allowed MIME types and max 5 active images | ✅ Covered unsupported MIME and over-limit create, plus unsupported MIME attach | ✅ Centralized image validation in application and reused it from the web attach path |
| RELIABILITY-003, R4-002 | `packages/aplicacion/tests/animal-use-cases.test.ts` | Application transaction contract | ✅ Application focused baseline passed 8/8 before correction | ✅ RED: physical delete did not call transaction port, immutable audit port, tombstone port, or tombstone-marked outbox in one unit | ✅ Application focused test passed 10/10 after delete/inactivate mutation effects run through `transacciones.run` and physical delete writes audit/tombstone/outbox in the same transaction callback | ✅ Covered referenced inactivation and no-reference physical delete paths | ✅ Added optional audit/tombstone ports without coupling application to DB |
| RELIABILITY-001, R4-001, R4-004 | `apps/web/tests/animal-web-flow.test.ts`, `tests/e2e/animales.spec.ts` | Server-action harness + Playwright route | ✅ Existing production runtime fail-fast test passed before correction | ✅ RED: fixture gate was a single `GANAWEB_E2E_ANIMALS` env-var check and could enable in production | ✅ Web harness passed after `isSafeAnimalE2eRuntime` guard; Playwright config now sets `PLAYWRIGHT_TEST=1` explicitly for local test runtime | ✅ Covered production fail-fast without adapters plus safe test fixture enablement | ✅ Kept fixture behavior out of production and updated task wording so Playwright is not overclaimed as real persistence proof |
| R4-003 | `packages/db/tests/animal-infrastructure.test.ts` | DB migration metadata | ✅ DB focused baseline passed 6/6 before correction | ✅ RED: additive migration test failed because `0001_animal_sync_audit.sql` did not exist and animal sync/audit changes were embedded in `0000_initial.sql` | ✅ DB focused test passed 7/7 after moving animal sync/audit additions to `0001_animal_sync_audit.sql` and updating `_journal.json` | ✅ Covered initial migration absence and additive migration presence for principal image, audit, tombstone, and binary queue deltas | ✅ Preserved current schema TS shape while making migration rollout additive |

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --filter @ganaweb/aplicacion test -- tests/animal-use-cases.test.ts` → exit 0; 1 file / 10 tests passed. `pnpm --filter @ganaweb/web test` → exit 0; auth harnesses and animal harness passed. `pnpm --filter @ganaweb/ui test -- tests/animal-ui.test.tsx` → exit 0; 1 file / 9 tests passed. `pnpm --filter @ganaweb/db test -- tests/animal-infrastructure.test.ts` → exit 0; 1 file / 7 tests passed. |
| Runtime harness command/scenario and exact result | `PLAYWRIGHT_PORT=4180 pnpm exec playwright test animales --reporter=line` → exit 0; 6 tests passed. `pnpm --filter @ganaweb/aplicacion typecheck && pnpm --filter @ganaweb/web typecheck && pnpm --filter @ganaweb/ui typecheck && pnpm --filter @ganaweb/db typecheck` → exit 0. `pnpm exec biome check ...` → exit 0 with one warning for pre-existing/accepted application use-case complexity after this correction. |
| Rollback boundary | Revert only this correction surface: animal route edits under `apps/web/src/routes/_app/fincas/$fincaId/animales/**`, `apps/web/src/server/animal-actions.ts`, `apps/web/src/server/animal-actions.server.ts`, `apps/web/src/server/e2e-animals-fixture.server.ts`, `packages/aplicacion/src/casos-uso/animales/index.ts`, `packages/aplicacion/tests/animal-use-cases.test.ts`, `packages/db/tests/animal-infrastructure.test.ts`, `packages/db/migrations/0000_initial.sql`, `packages/db/migrations/0001_animal_sync_audit.sql`, `packages/db/migrations/meta/_journal.json`, `packages/ui/src/ganado/animal-crud.tsx`, rebuilt `packages/ui/dist/index.*`, `playwright.config.ts`, `tests/e2e/animales.spec.ts`, `openspec/changes/add-animals-crud-flow/tasks.md`, and this apply-progress section. |

### Verification Commands

- `pnpm --filter @ganaweb/aplicacion test -- tests/animal-use-cases.test.ts` → RED before implementation: 2 failed / 8 passed for missing image validation and transactional audit/tombstone; GREEN exit 0, 10 tests passed.
- `pnpm --filter @ganaweb/web exec tsx tests/animal-web-flow.test.ts` → RED before implementation: failed for unsupported image attach validation; GREEN exit 0, `✅ animal-web-flow.test.ts passed`.
- `pnpm --filter @ganaweb/db test -- tests/animal-infrastructure.test.ts` → RED before implementation: failed because `0001_animal_sync_audit.sql` was missing; GREEN exit 0, 7 tests passed.
- `pnpm --filter @ganaweb/web test` → exit 0.
- `pnpm --filter @ganaweb/ui test -- tests/animal-ui.test.tsx` → exit 0, 9 tests passed.
- `pnpm --filter @ganaweb/aplicacion typecheck && pnpm --filter @ganaweb/web typecheck && pnpm --filter @ganaweb/ui typecheck && pnpm --filter @ganaweb/db typecheck` → exit 0.
- `PLAYWRIGHT_PORT=4180 pnpm exec playwright test animales --reporter=line` → exit 0, 6/6 passed.
- `pnpm exec biome check ...changed correction files...` → exit 0; one warning remains for application use-case cognitive complexity (non-blocking diagnostic).

### Finding Resolution

- RISK-001 fixed: ficha loader no longer mutates on `?delete=1`; destructive delete/inactivate uses the POST server action path and preserved RBAC/finca/ownership checks.
- RELIABILITY-001/R4-001 fixed by honesty: production animal route actions remain fail-fast until real adapters are explicitly configured; no fixture fallback is silently used in production.
- RELIABILITY-002 fixed: create and attach image mutation paths enforce allowed image MIME types and the five-active-image limit server/application-side.
- RELIABILITY-003/R4-002 fixed at application contract level: physical delete now coordinates delete, immutable audit, tombstone, and outbox through one transaction callback; inactivation also runs transactionally with outbox.
- R4-003 fixed: animal sync/audit/schema deltas moved out of the journaled initial migration into additive `0001_animal_sync_audit.sql`; journal metadata includes the new migration.
- R4-004 fixed: `GANAWEB_E2E_ANIMALS=1` is no longer sufficient; fixture mode requires a safe local/test runtime and is blocked for production unless an explicit test runtime marker is present.
- R2-001 fixed: create route no longer has query-param loader mutation or duplicate document click interception.
- R2-002 fixed: delete/inactivate no longer has loader mutation, `onClick`, and `onMouseDown` overlap.
- R2-003 fixed: image route no longer renders clickable mark-principal/unlink no-op callbacks; controls are omitted until real contracts exist.

### Notes

- CodeGraph initialization was attempted before broad source exploration and failed with `unsafe CodeGraph root "/home/lrodriguezn/ganaweb"`; correction proceeded with direct file reads after that tool-level blocker.
- Existing Node engine warning remains: current environment is Node v24.18.0 while package engines request Node 22.
- Playwright coverage is now honest route/runtime coverage; actual create/delete mutation behavior is proven by focused server-action harness tests because the production route runtime still intentionally requires explicit real adapter registration.

## Escalated R2-001 Maintainer-Approved Correction Evidence: Nuevo Animal single submit contract

### Scope

- Correction actor scope: escalated R2-001 only — double execution risk in the Nuevo Animal create submit path.
- Explicitly excluded: all other R2/R3/R4 findings, unrelated animal flows, production adapter registration, and new feature behavior.
- Maintainer decision: remove route DOM click interception and leave `AnimalFormScreen` as the single submit owner receiving `onSave` from the route.

### TDD Cycle Evidence

| Finding | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| R2-001 | `apps/web/tests/animal-web-flow.test.ts`, `packages/ui/tests/animal-ui.test.tsx` | Web route/static + UI component submit contract | ✅ Baseline context from existing validator: create route still had `onClickCapture` plus `AnimalFormScreen onSave`; UI focused test was added before production changes and passed existing form behavior. | ✅ RED after tests-first route guard: `pnpm --filter @ganaweb/web exec tsx tests/animal-web-flow.test.ts` failed with `AssertionError: create form must not intercept save clicks` while `onClickCapture` remained. | ✅ After implementation, focused web harness passed and UI component test passed: `animal-web-flow.test.ts passed`; `packages/ui/tests/animal-ui.test.tsx` 10/10 passed. | ✅ Covered both sides of the duplicate path: route source now rejects `onClickCapture`, `closest("button")`, and button-text lookup; UI test proves one Guardar click calls `onSave` exactly once with current form values. | ✅ Converted `AnimalFormScreen` to own native form `onSubmit` with `Button type="submit"`; route now only passes `onSave` to `AnimalFormScreen` and calls `createAnimalAction` from that callback. |

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | RED: `pnpm --filter @ganaweb/web exec tsx tests/animal-web-flow.test.ts` → exit 1, `AssertionError [ERR_ASSERTION]: create form must not intercept save clicks`. GREEN: same command → exit 0, `✅ animal-web-flow.test.ts passed`. UI submit contract: `pnpm --filter @ganaweb/ui test -- tests/animal-ui.test.tsx` → exit 0, 1 file / 10 tests passed. |
| Runtime harness command/scenario and exact result | `pnpm exec playwright test animales --reporter=line` → exit 0, 6 tests passed using 1 worker. `pnpm --filter @ganaweb/web typecheck` → exit 0. `pnpm --filter @ganaweb/ui typecheck` → exit 0. `pnpm exec biome check apps/web/src/routes/_app/fincas/\$fincaId/animales/nuevo.tsx apps/web/tests/animal-web-flow.test.ts packages/ui/src/ganado/animal-crud.tsx packages/ui/tests/animal-ui.test.tsx` → exit 0. |
| Rollback boundary | Revert only R2-001 correction edits in `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx`, `apps/web/tests/animal-web-flow.test.ts`, `packages/ui/src/ganado/animal-crud.tsx`, `packages/ui/tests/animal-ui.test.tsx`, rebuilt `packages/ui/dist/index.*`, and this apply-progress section. |

### Verification Commands

- `pnpm --filter @ganaweb/web exec tsx tests/animal-web-flow.test.ts` → RED before implementation: exit 1, failed on `create form must not intercept save clicks`.
- `pnpm --filter @ganaweb/web exec tsx tests/animal-web-flow.test.ts` → GREEN exit 0, `✅ animal-web-flow.test.ts passed`.
- `pnpm --filter @ganaweb/ui test -- tests/animal-ui.test.tsx` → exit 0, 1 file / 10 tests passed.
- `pnpm --filter @ganaweb/ui build` → exit 0, rebuilt UI package dist for the form submit-contract change.
- `pnpm --filter @ganaweb/web typecheck` → exit 0.
- `pnpm --filter @ganaweb/ui typecheck` → exit 0.
- `pnpm exec playwright test animales --reporter=line` → exit 0, 6 tests passed.
- `pnpm exec biome check apps/web/src/routes/_app/fincas/\$fincaId/animales/nuevo.tsx apps/web/tests/animal-web-flow.test.ts packages/ui/src/ganado/animal-crud.tsx packages/ui/tests/animal-ui.test.tsx` → initial exit 1 due formatting in `animal-web-flow.test.ts`; after `pnpm exec biome check --write ...`, final exit 0.

### Finding Resolution

- R2-001 fixed: `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx` no longer uses `onClickCapture`, DOM lookup by button text, or any route-level submit interception. It only builds payloads and passes `save` into `AnimalFormScreen`.
- `AnimalFormScreen` now owns the submit contract through the form `onSubmit` handler and a single `Guardar` submit button; one click produces one `onSave(FormData)` call.
- Existing form value behavior is preserved: the focused UI test asserts `codigo`, `nombre`, and default `sexoKey` values are present in the submitted `FormData`, and the existing Playwright animals flow still passes.

### Notes

- Existing Node engine warning remains: current environment is Node v24.18.0 while package engines request Node 22.
- CodeGraph was unavailable for this workspace because `.codegraph/` is missing; per the active MCP server instruction, implementation proceeded with direct reads of the required files rather than initializing an index.

## Manual Verify Remediation Evidence: final verify blockers from `verify-report.md`

### Scope

- Manual remediation scope only: concrete final verify blockers for `add-animals-crud-flow`.
- Maintainer decision honored: native review/provenance recovery was not retried; existing `reviews/` artifacts remain audit history.
- Artifact mode: OpenSpec.

### TDD Cycle Evidence

| Blocker | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Web typecheck typed navigation | `pnpm --filter @ganaweb/web typecheck`, `packages/ui/tests/integration-app.test.ts` | Typecheck + source integration | ✅ Baseline reproduced exit 2 for unregistered `/configuracion`, `/buscar`, `/sync`, `/eventos/nuevo`; UI package test reproduced 4 stale `USUARIO_DEMO` failures | ✅ RED reproduced before changes: web typecheck exit 2 and `@ganaweb/ui test` 4 failed stale source assertions | ✅ `pnpm --filter @ganaweb/web typecheck` exit 0; `pnpm --filter @ganaweb/ui test` exit 0, 11 files / 323 tests | ✅ Covered session-derived user identity, real logout action, and pending shell navigation without typed route violations | ✅ Placeholder shell navigation extracted to `logPendingNavigation`; stale demo assertions updated to current session contract |
| UI package/root test failures | `packages/ui/tests/integration-app.test.ts`, root `pnpm test` | Source integration + Turbo root suite | ✅ Baseline `pnpm --filter @ganaweb/ui test` failed 4 stale `USUARIO_DEMO` assertions | ✅ RED reproduced the 4 stale assertions exactly | ✅ `pnpm --filter @ganaweb/ui test` exit 0; `pnpm test` exit 0, 13 Turbo tasks successful | ✅ Assertions now prove current session source rather than removed demo constants | ✅ Kept tests aligned with real auth/session behavior instead of restoring demo-only state |
| Missing create location/weight side effects | `packages/aplicacion/tests/animal-use-cases.test.ts` | Application contract/unit | ✅ Focused application test baseline passed before new assertions | ✅ RED failed: `ubicaciones.registrarInicial` and `pesajes.registrarInicial` were never called | ✅ `pnpm --filter @ganaweb/aplicacion test -- tests/animal-use-cases.test.ts` exit 0; 12 tests passed | ✅ Covered location, weight, two images, outbox, transaction, and binary queue side effects in one create command | ✅ Extracted side-effect helpers to reduce `crearAnimal` cognitive complexity below Biome warning threshold |
| Missing default list/search/filter evidence | `apps/web/tests/animal-web-flow.test.ts` | Web route/server-action harness | ✅ Focused web harness baseline passed before new assertions | ✅ RED failed: default list only returned `MT-122` and did not prove active/default filtering or search/filter semantics | ✅ `pnpm --filter @ganaweb/web exec tsx tests/animal-web-flow.test.ts` exit 0 | ✅ Covered default active-only sorted list and all-criteria search + health/potrero/lote filters within finca | ✅ Added `filterAnimalList` helper and kept harness deterministic |
| Missing update version conflict evidence | `packages/aplicacion/tests/animal-use-cases.test.ts` | Application contract/unit | ✅ Focused application baseline passed | ✅ Test-first assertion initially exposed current domain CA-UPD-002 error shape; no production mutation was needed for behavior | ✅ Focused application test exit 0; stale `versionLeida` returns validation and does not call repository/outbox | ➖ Existing domain behavior already implemented; new evidence directly proves the required scenario | ✅ No production change needed beyond preserving behavior through refactor |
| Missing DB image metadata persistence evidence | `packages/db/tests/animal-infrastructure.test.ts` | DB adapter contract/unit | ✅ Focused DB baseline passed before new assertion | ✅ RED failed because `crearPersistenciaImagenAnimal` was missing | ✅ `pnpm --filter @ganaweb/db test -- tests/animal-infrastructure.test.ts` exit 0; 8 tests passed | ✅ Asserted finca ownership, storage path, MIME/size/dimensions, active link, principal flag, authenticated metadata, and no public URL | ✅ Added a small pure persistence-shape helper without requiring public URL storage |

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --filter @ganaweb/aplicacion test -- tests/animal-use-cases.test.ts` → exit 0, 12 tests passed. `pnpm --filter @ganaweb/db test -- tests/animal-infrastructure.test.ts` → exit 0, 8 tests passed. `pnpm --filter @ganaweb/web exec tsx tests/animal-web-flow.test.ts` → exit 0, `✅ animal-web-flow.test.ts passed`. `pnpm --filter @ganaweb/ui test` → exit 0, 11 files / 323 tests passed. |
| Runtime harness command/scenario and exact result | `PLAYWRIGHT_PORT=4180 pnpm exec playwright test animales --reporter=line` → exit 0, 6 tests passed. `pnpm test` → exit 0, 13 Turbo tasks successful. `pnpm --filter @ganaweb/web typecheck` → exit 0. |
| Rollback boundary | Revert only this manual remediation surface: `apps/web/src/routes/_app.tsx`, `apps/web/src/server/animal-actions.server.ts`, `apps/web/tests/animal-web-flow.test.ts`, `packages/aplicacion/src/casos-uso/animales/index.ts`, `packages/aplicacion/src/puertos/animal-repository-port.ts`, `packages/aplicacion/tests/animal-use-cases.test.ts`, `packages/db/src/animal-infrastructure.ts`, `packages/db/tests/animal-infrastructure.test.ts`, `packages/ui/tests/integration-app.test.ts`, rebuilt `packages/ui/dist/index.*`, `openspec/changes/add-animals-crud-flow/verify-report.md`, and this apply-progress section. |

### Verification Commands

- `pnpm --filter @ganaweb/web typecheck` → initial RED exit 2 for stale typed navigation and missing rebuilt `@ganaweb/ui` declarations; final exit 0.
- `pnpm --filter @ganaweb/ui test` → initial RED exit 1 with 4 stale `USUARIO_DEMO` integration failures; final exit 0, 11 files / 323 tests passed.
- `pnpm --filter @ganaweb/aplicacion test -- tests/animal-use-cases.test.ts` → RED after tests-first side-effect assertions: 2 failed / 10 passed; final exit 0, 12 tests passed.
- `pnpm --filter @ganaweb/db test -- tests/animal-infrastructure.test.ts` → RED after tests-first metadata assertion: `crearPersistenciaImagenAnimal is not a function`; final exit 0, 8 tests passed.
- `pnpm --filter @ganaweb/web exec tsx tests/animal-web-flow.test.ts` → RED after tests-first list assertions: default list mismatch; final exit 0, `✅ animal-web-flow.test.ts passed`.
- `pnpm --filter @ganaweb/web test` → exit 0.
- `pnpm --filter @ganaweb/ui build` → exit 0, rebuilt UI package dist/declarations.
- `pnpm --filter @ganaweb/aplicacion typecheck`, `pnpm --filter @ganaweb/db typecheck`, `pnpm --filter @ganaweb/ui typecheck`, `pnpm --filter @ganaweb/web typecheck` → exit 0.
- `pnpm exec biome check apps/web/src/routes/_app.tsx apps/web/src/server/animal-actions.server.ts apps/web/tests/animal-web-flow.test.ts packages/aplicacion/src/casos-uso/animales/index.ts packages/aplicacion/src/puertos/animal-repository-port.ts packages/aplicacion/tests/animal-use-cases.test.ts packages/db/src/animal-infrastructure.ts packages/db/tests/animal-infrastructure.test.ts packages/ui/tests/integration-app.test.ts` → exit 0, no diagnostics.
- `PLAYWRIGHT_PORT=4180 pnpm exec playwright test animales --reporter=line` → exit 0, 6 tests passed.
- `pnpm test` → exit 0, 13 Turbo tasks successful.

### Blocker Resolution

- Fixed: `pnpm --filter @ganaweb/web typecheck` now exits 0; unregistered typed shell navigation is replaced with non-route placeholder logging, and UI declarations are rebuilt before consuming them.
- Fixed: `pnpm test` now exits 0; stale `USUARIO_DEMO` UI integration assertions now verify current session-derived user identity and real logout behavior.
- Fixed: missing runtime evidence for create side effects, default list/search/filter, update version conflict, and DB image metadata persistence is now covered by passing focused tests plus the existing Playwright animals flow.
- Fixed: changed-file Biome no longer reports the animal application use-case complexity warning after extracting create side-effect helpers.
- Documented: Node warning remains unchanged — current environment is Node v24.18.0 while repo engines request Node 22. No non-invasive Node runtime change was made.
