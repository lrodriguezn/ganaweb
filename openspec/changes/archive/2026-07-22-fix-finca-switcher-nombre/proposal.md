# Proposal: Fix FincaSwitcher showing slug instead of real finca name

## Intent

`FincaSwitcher` in `AppHeader` shows `"Finca Finca finca-esperanza"` instead of `"Finca La Esperanza"`. The real name is in `fincas.nombre` and already fetched, but dropped at the repository → domain boundary; the route then synthesizes a name from the slug-style `fincaActivaId`. Close the data-passing gap.

## Scope

### In Scope
- Add `fincaActivaNombre: string` to `SesionAutorizada`; forward `activeMembership.fincaNombre` into the session in `obtenerAutorizacionUsuario`.
- In `_app.tsx`, build `FincaResumen` from `sesion.fincaActivaNombre`; drop the synthetic `\`Finca ${id}\`` and redundant "Finca " prefix.
- Update the e2e fixture and 4 test files that hard-construct `SesionAutorizada`.

### Out of Scope
Refactoring `FincaSwitcher` (it stays the single source of the "Finca " prefix), multi-finca switching UX, schema/seed changes, `FincaUsuarioResumen`.

## Capabilities

### New Capabilities
None

### Modified Capabilities
None — existing specs do not model session payload shape or trigger label text. This closes a data-passing gap without altering spec-level behavior.

## Approach

`auth-repository.ts:155-163` already selects `fincas.nombre AS fincaNombre`; the session construction at lines 203-213 omits it. Promote it to the domain type as `fincaActivaNombre`, read it in `_app.tsx`, and stop prepending "Finca " in the route — `FincaSwitcher` keeps its own prefix. TypeScript strict mode flags every `SesionAutorizada` literal at compile time, so the e2e fixture and four test mocks update in lockstep.

## Affected Areas

- `packages/dominio/src/usuario.ts` — add field to `SesionAutorizada`
- `packages/db/src/auth-repository.ts` — forward `fincaNombre` into session
- `apps/web/src/routes/_app.tsx` — build `fincaActiva` from new field; drop synthetic name and prefix
- `apps/web/src/server/e2e-animals-fixture.server.ts` — add field to hardcoded session
- `apps/web/tests/auth-flow.test.ts` — add field to `authorizedSession()`
- `apps/web/tests/animal-web-flow.test.ts` — add field to `session()`
- `tests/animal-catalogos.test.ts` — add field to `E2E_SESSION`
- `packages/aplicacion/tests/auth-use-cases.test.ts` — add field to inline mock `sesion`

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Login flow loses the name | Low | `iniciar-sesion` builds `LoginResult` via `obtenerAutorizacionUsuario`, which already selects the name |
| Missed construction site | Very Low | TypeScript strict mode flags every `SesionAutorizada` literal at compile time |
| Visual regression on trigger label | Low | Update trigger-label assertion to expect the real name |

## Rollback Plan

Revert the commit. The new field is additive on the type and required at every construction site, so a clean revert restores the old shape. No DB migration — the existing query already selects `fincas.nombre`.

## Dependencies

None. The change is a propagation chain only.

## Success Criteria

- [ ] Trigger renders the real finca name, never the slug
- [ ] `SesionAutorizada` carries `fincaActivaNombre` from `obtenerAutorizacionUsuario`
- [ ] `pnpm turbo typecheck` and `pnpm turbo test` pass
- [ ] No `Finca Finca …` double-prefix anywhere
