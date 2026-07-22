# Tasks: fix-finca-switcher-nombre

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~20 lines across 9 source files + 2 test assertions |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr-default |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Domain type & repository (foundation)

- [x] 1.1 In `packages/dominio/src/usuario.ts` add `fincaActivaNombre: string` to `SesionAutorizada` right after `fincaActivaId` (required, not optional).
- [x] 1.2 In `packages/db/src/auth-repository.ts` at L203-213 add `fincaActivaNombre: activeMembership.fincaNombre` to the returned `sesion` literal.

## Phase 2: Consumer route

- [x] 2.1 In `apps/web/src/routes/_app.tsx` at L137-148 replace `nombre: \`Finca ${sesion.fincaActivaId}\`` with `nombre: sesion.fincaActivaNombre`; `FincaSwitcher` keeps the single prefix.

## Phase 3: Update all SesionAutorizada construction sites (typecheck safety net)

- [x] 3.1 `apps/web/src/server/e2e-animals-fixture.server.ts` L41-55: add `fincaActivaNombre: "Finca Demo E2E"` to the returned session.
- [x] 3.2 `apps/web/tests/auth-flow.test.ts` L14-23: add `fincaActivaNombre: "Finca 1"` to `authorizedSession()`.
- [x] 3.3 `apps/web/tests/animal-web-flow.test.ts` L19-33: add `fincaActivaNombre: "Finca 1"` to `session()`.
- [x] 3.4 `tests/animal-catalogos.test.ts` L29-39: add `fincaActivaNombre: "La Esperanza"` to `E2E_SESSION`.
- [x] 3.5 `tests/animal-catalogo-sexo.test.ts` add `fincaActivaNombre: "Finca 1"` to BOTH `getSession` literals (L46-56 and L86-93) — the 5th file missed by the proposal.
- [x] 3.6 `packages/aplicacion/tests/auth-use-cases.test.ts` add `fincaActivaNombre: "Finca 1"` to the inline `sesion` (L80-87) AND to the actor mock (L159-166).

## Phase 4: Test assertions for the new contract

- [x] 4.1 `packages/db/tests/auth-repository-contract.test.ts` L114-120: extend the `obtenerAutorizacionUsuario` assertion with `fincaActivaNombre: "La Esperanza"`.
- [x] 4.2 `apps/web/tests/auth-flow.test.ts` extend an `authorizedSession()`-based assertion with `fincaActivaNombre: "Finca 1"`.
- [x] 4.3 `packages/aplicacion/tests/auth-use-cases.test.ts` extend `toMatchObject` on the authorized path with `sesion.fincaActivaNombre`.
- [x] 4.4 `tests/e2e/animales.spec.ts` change the header trigger assertion to expect `/Finca La Esperanza/`, no slug, no `"Finca Finca"`.

## Phase 5: Final verification

- [x] 5.1 `pnpm turbo typecheck` — must pass; TypeScript strict mode is the propagation safety net.
- [x] 5.2 `pnpm turbo test` — all unit + contract + integration suites green.
- [x] 5.3 Run `tests/e2e/animales.spec.ts` against a real DB; confirm trigger text is `"Finca La Esperanza"`.
- [x] 5.4 `git grep "Finca Finca"` — must return zero matches in the rendered route surface.

## Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Propagate `fincaActivaNombre` end-to-end and lock with typecheck + e2e | PR 1 | `pnpm turbo typecheck && pnpm turbo test` | `pnpm playwright test tests/e2e/animales.spec.ts` | Revert single commit; additive on type, additive on query, no migration |
