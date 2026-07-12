# Apply Progress: User Registration and Login

## Status

- Mode: Strict TDD intent with available Vitest/TSX harnesses; web auth route/server-action helper behavior now has a focused `@ganaweb/web test` runtime harness.
- Delivery: `size:exception` accepted by maintainer; no chained PR split in this apply run.
- Completed tasks: 1.1-4.3 and out-of-scope guard.

## Work Unit Evidence

| Unit | Focused test command and result | Runtime harness command/scenario and result | Rollback boundary |
|---|---|---|---|
| 1 Schema and ports | `pnpm --filter @ganaweb/db test` → 2 passed, 2 skipped DB smoke; `pnpm --filter @ganaweb/aplicacion typecheck` → passed | N/A: schema/port/type work has no route boundary | `packages/db/src/schema/auth.ts`, `packages/db/src/schema/index.ts`, `packages/dominio/src/usuario.ts`, `packages/aplicacion/src/puertos/auth-repository-port.ts` |
| 2 Application use cases | `pnpm --filter @ganaweb/aplicacion test` → 7 passed across auth use-case and architecture-boundary tests | N/A: framework-free application use cases | `packages/aplicacion/src/casos-uso/auth/*`, `packages/aplicacion/tests/auth-use-cases.test.ts`, `packages/aplicacion/tests/architecture-boundary.test.ts` |
| 3 DB adapter and public auth/session web flow | `pnpm --filter @ganaweb/web test` → passed; focused TSX harness covers auth route guard decisions, server-action helpers, registration→/pendiente flow, logout cookie behavior, and out-of-scope absence | `pnpm --filter @ganaweb/web typecheck` → passed; generated TanStack Start route tree compiles | `packages/db/src/auth-repository.ts`, `apps/web/src/server/*`, `apps/web/src/routes/login.tsx`, `registro.tsx`, `pendiente.tsx`, `_app.tsx`, `_app/mas.tsx`, `apps/web/tests/auth-flow.test.ts`, `apps/web/tests/auth-scope-and-flow.test.ts` |
| 4 Minimal admin approval | `pnpm turbo typecheck` → passed; `pnpm turbo test` → passed | `pnpm turbo build` → passed; admin route bundles generated. Manual DB-backed approval flow remains pending until a seeded auth database is available. | `apps/web/src/routes/_app/admin/usuarios-pendientes.tsx`, approval server function in `apps/web/src/server/auth.ts` |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `packages/db/tests/auth-schema.test.ts` | Unit/schema import | Existing DB tests initially unavailable until install; DB smoke remains skipped without `DB_SMOKE=true` | Written before schema export implementation | `pnpm --filter @ganaweb/db test` passed | 2 schema groups: auth tables + permission tables | Kept test at table-name behavior, not implementation internals |
| 1.3 | `packages/aplicacion/tests/architecture-boundary.test.ts` | Architecture unit | Initial RED command failed because `vitest` was not installed for `@ganaweb/aplicacion`; harness added | Written to scan application source for forbidden DB/UI/route imports | `pnpm --filter @ganaweb/aplicacion test` passed | Source scan covers all `packages/aplicacion/src/**/*.ts` files | Kept as import-boundary test, not a dependency-cruiser replacement |
| 2.1 | `packages/aplicacion/tests/auth-use-cases.test.ts` | Unit | Initial RED command failed because `vitest` was not installed for `@ganaweb/aplicacion`; harness added | Written before use-case exports existed | `pnpm --filter @ganaweb/aplicacion test` passed: 6/6 | Duplicate, pending registration, approved login, pending login, logout/session lookup, non-admin rejection | Extracted small use-case files and framework-free ports |
| 3.1/3.3/4.1 | `apps/web/tests/auth-flow.test.ts`; `packages/db/tests/auth-repository-contract.test.ts` | Runtime helper / repository contract | `pnpm --filter @ganaweb/web test`, `pnpm --filter @ganaweb/db test`, and `pnpm --filter @ganaweb/web typecheck` passed | Remediation tests added after verify failure to cover the previously unproven route/server-action helpers and repository behavior | Web and DB package tests passed | Protected route redirects, pending-list guard, approval helper, and finca-scoped repository permission lookup are triangulated | Extracted small pure helpers from server actions so the runtime harness exercises production auth decisions without a full browser/Start server |
| 2nd remediation | `apps/web/tests/auth-scope-and-flow.test.ts` | Source-based runtime / absence | `pnpm --filter @ganaweb/web test` passed; both test files executed | Added after verify failure to close remaining Strict TDD gaps: registration→/pendiente flow, logout cookie behavior, out-of-scope absence | `tsx tests/auth-scope-and-flow.test.ts` passed; `pnpm lint` passed; `pnpm turbo test` passed: 13 tasks | Registration source navigation + pending copy, logout dual-path cookie clearing, session cookie security flags, out-of-scope flow absence in routes + server + application exports | Source-based runtime tests prove behavior via filesystem reads + assertions; avoids full browser/TanStack Start server dependency while providing deterministic CI-friendly coverage |

## Verification Log

| Command | Result |
|---|---|
| `pnpm install` | Passed; installed workspace dependencies after Vitest was missing locally. Node engine warning: repo wants Node 22, environment is Node 24.18.0. |
| `pnpm --filter @ganaweb/aplicacion test` | Passed: 2 files, 7 tests. |
| `pnpm --filter @ganaweb/db test` | Passed: auth schema 2 tests; existing duplicate-insert DB smoke skipped without `DB_SMOKE=true`. |
| `pnpm --filter @ganaweb/web typecheck` | Passed. |
| `pnpm turbo typecheck` | Passed: 13 tasks successful. One run noted routeTree modified concurrently because typecheck/build were launched in parallel; rerun completed successfully. |
| `pnpm turbo test` | Passed: all package tests/scripts successful. |
| `pnpm turbo build` | Passed: all package builds successful, including TanStack Start client and SSR bundles. |

## Post-Apply Correction Evidence

| Finding | Correction | Evidence |
|---|---|---|
| `RISK-001` | `listPendingUsersAction` now requires the current finca session to have approval permission before listing pending users. | `pnpm --filter @ganaweb/web typecheck` passed; `pnpm turbo typecheck` passed: 13 tasks successful. |
| `RELIABILITY-001` | `packages/db/migrations/0000_initial.sql` now includes committed DDL, FKs, and indexes for first-slice auth tables. | `pnpm --filter @ganaweb/db test` passed: auth schema 4 tests, DB smoke 2 skipped; migration coverage test asserts table DDL exists. |
| `RELIABILITY-002` / `R4-001` | `DrizzleAuthRepository.obtenerAutorizacionUsuario` now scopes role assignments to `activeMembership.fincaId` before permissions authorize approval. | `pnpm --filter @ganaweb/db test` passed; repository scope regression assertion added. |
| `RELIABILITY-003` | Logout/session invalidation test now uses stateful in-memory session behavior and proves the same token becomes `no_autenticado` after logout. | `pnpm --filter @ganaweb/aplicacion test` passed: 2 files, 7 tests. |
| `R4-002` | `logoutAction` clears the cookie even when server-side session invalidation fails and returns `invalidacionServidor: "fallida"` after logging. | `pnpm --filter @ganaweb/web typecheck` passed; `pnpm turbo build` passed. |
| `R4-003` | Auth server functions now log runtime failures for session, registration, login, logout, pending-list, and approval paths using `console.error` only. | `pnpm turbo typecheck`, `pnpm turbo test`, and `pnpm turbo build` passed. |

### Correction Verification Log

| Command | Result |
|---|---|
| `pnpm --filter @ganaweb/aplicacion test` | Passed: 2 files, 7 tests. |
| `pnpm --filter @ganaweb/db test` | Passed: 1 file passed, 1 skipped; 4 tests passed, 2 DB smoke tests skipped without `DB_SMOKE=true`. |
| `pnpm --filter @ganaweb/web typecheck` | Passed. |
| `pnpm turbo typecheck` | Passed: 13 tasks successful. |
| `pnpm turbo test` | Passed in previous correction batch; remediation now also runs real `@ganaweb/web test` with TSX auth harness. |
| `pnpm turbo build` | Passed: 7 tasks successful, including TanStack Start client and SSR bundles. |

## Deviations / Blockers

- DB smoke tests that require an external PostgreSQL database still skip unless `DB_SMOKE=true`; the remediation adds a focused repository contract test with an in-memory Drizzle-like query double instead of requiring unavailable infra.
- Finca display name in the shell is derived as `Finca ${sesion.fincaActivaId}` because the application session contract does not yet carry `fincaNombre`.

## SDD Verify Remediation Evidence

| Blocker | Remediation | Evidence |
|---|---|---|
| `pnpm lint` failed with 25 errors / 1 warning | Formatted/organized scoped auth files, added a deliberate Biome suppression for server-side auth failure logging, and formatted existing auth schema/server helpers. | `pnpm lint` → passed; Biome checked 127 files. |
| `@ganaweb/web test` was echo-only | Replaced the echo script with a focused `tsx` runtime harness covering protected-route redirects, pending-user listing permission gate, finca-scoped approval permission, and approval server-action helper behavior. | `pnpm --filter @ganaweb/web test` → passed via `tsx tests/auth-flow.test.ts`; `pnpm --filter @ganaweb/web typecheck` → passed. |
| DB auth repository behavior was not runtime-tested | Added a focused `DrizzleAuthRepository` contract test that executes `obtenerAutorizacionUsuario` through the repository against an in-memory Drizzle-like query double and proves role permissions are scoped to the active finca. Removed the source-text assertion from schema tests. | `pnpm --filter @ganaweb/db test` → 2 files passed, 1 skipped; 4 tests passed, 2 external-DB smoke tests skipped. |
| Placeholder session-derived shell comments caused confusion | Removed `USUARIO_DEMO` export/comments from `_app.tsx`, updated `mas.tsx` comments to describe session-derived state, and replaced the placeholder `Finca activa` label. | `pnpm --filter @ganaweb/web typecheck` and `pnpm lint` passed. |

### Remediation Verification Log

| Command | Result |
|---|---|
| `pnpm lint` | Passed; Biome checked 127 files. |
| `pnpm --filter @ganaweb/web test` | Passed; `tsx tests/auth-flow.test.ts` executed successfully. |
| `pnpm --filter @ganaweb/db test` | Passed; 2 test files passed, 1 skipped; 4 tests passed, 2 external DB smoke tests skipped. |
| `pnpm --filter @ganaweb/aplicacion test` | Passed; 2 files, 7 tests. |
| `pnpm --filter @ganaweb/web typecheck` | Passed; `tsr generate && tsc --noEmit`. |
| `pnpm --filter @ganaweb/db typecheck` | Passed; `tsc --noEmit`. |
| `pnpm --filter @ganaweb/web build` | Passed; client and SSR bundles built. |

## Second Scoped Remediation Evidence

| Gap | Remediation | Evidence |
|---|---|---|
| Registration route/component flow → `/pendiente` (UNTESTED) | Added `apps/web/tests/auth-scope-and-flow.test.ts` that reads `registro.tsx` source and verifies: (1) `navigate({ to: "/pendiente" })` after successful registration, (2) pending-copy Spanish text, (3) `registerAction` call, (4) duplicate rejection handling, (5) "Registrarme" submit button. Also verifies `pendiente.tsx` contains "Autorización pendiente" heading, "Tu cuenta todavía no tiene acceso a la finca", and "Volver al ingreso" link. Verifies `login.tsx` links to `/registro` with "Regístrate" text. | `tsx tests/auth-scope-and-flow.test.ts` → passed; `pnpm --filter @ganaweb/web test` → both test files passed. |
| Logout cookie-clearing behavior (UNTESTED) | `auth-scope-and-flow.test.ts` verifies: (1) `clearSessionCookie()` called ≥2 times in `auth.ts` (success + failure paths), (2) `invalidacionServidor: "fallida"` returned on server failure, (3) `tipo: "cerrada"` on success, (4) `session-cookie.server.ts` uses `Max-Age=0`, `__Host-ganaweb-session`, `HttpOnly`, `SameSite=Lax`, (5) `_app.tsx` calls `logoutAction` and redirects to `/login`, (6) `mas.tsx` calls `logoutAction`. | `tsx tests/auth-scope-and-flow.test.ts` → passed. |
| Out-of-scope auth flows absent (UNTESTED) | `auth-scope-and-flow.test.ts` scans all route files + server files + `@ganaweb/aplicacion` exports + use case source for: password recovery, 2FA/two-factor, social login/OAuth, account deletion, full RBAC admin UI, offline auth/session sync. Confirms only one admin route (`usuarios-pendientes`) exists. Verifies application use case files match expected first-slice set exactly (5 files). Confirms no out-of-scope logic in any use case source. | `tsx tests/auth-scope-and-flow.test.ts` → passed. |
| Biome lint warnings on test console output | Added `// biome-ignore lint/suspicious/noConsole: test progress output` suppressions for all `console.log` calls in the new test file. | `pnpm lint` → passed; Biome checked 128 files. |

### Second Remediation Verification Log

| Command | Result |
|---|---|
| `pnpm lint` | Passed; Biome checked 128 files (127 + new test file). |
| `pnpm --filter @ganaweb/web test` | Passed; both `auth-flow.test.ts` and `auth-scope-and-flow.test.ts` executed successfully. |
| `pnpm --filter @ganaweb/web typecheck` | Passed. |
| `pnpm turbo test` | Passed: 13 tasks successful. |
| `pnpm turbo typecheck` | Passed: 13 tasks successful. |
