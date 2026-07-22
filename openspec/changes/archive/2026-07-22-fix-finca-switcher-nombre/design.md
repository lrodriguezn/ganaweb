# Design: fix-finca-switcher-nombre

## Technical Approach

Promote the already-queried `fincas.nombre` from the membership query in `obtenerAutorizacionUsuario` into the domain session type as `fincaActivaNombre: string`, then read it in `_app.tsx` to build `FincaResumen.nombre`. Drop the synthetic `\`Finca ${sesion.fincaActivaId}\`` and let `FincaSwitcher` own the single `"Finca "` prefix. No DB schema change, no query change, no new round-trip — the column is already in the result at `auth-repository.ts:158`.

## Architecture Decisions

| Decision | Choice | Tradeoff |
|---|---|---|
| Where to add the field | `SesionAutorizada` in `packages/dominio/src/usuario.ts` | Domain type models the session; a parallel `FincaResumen` ad-hoc field would split truth between route and domain |
| Who owns the `"Finca "` prefix | `FincaSwitcher` only | Single source of truth → no double-prefix; matches existing rule that the dropdown is the UX of the finca label |
| Trigger label source for tests | Real seed names (`"La Esperanza"`, `"Hacienda El Roble"`) for e2e; existing fixture strings for unit | E2e asserts user-visible copy; unit tests are decoupled from seed data |
| Handle an empty finca list | Not in scope (out of proposal) | `FincaSwitcher` already shows `"Elegir finca"` when no `activa` match |

## Data Flow

```
BEFORE (bug)
─────────────────────────────────────────────────────────────────
fincas.nombre            ──✗── dropped at repository → domain gap
SesionAutorizada         ───── has fincaActivaId only
_app.tsx AppLayout       ───── nombre: `Finca ${sesion.fincaActivaId}`   (synth from id)
FincaResumen.nombre      ───── "Finca finca-esperanza"
FincaSwitcher trigger    ───── `Finca ${activa.nombre}`                  (2nd prefix)
result                   ───── "Finca Finca finca-esperanza"  ❌

AFTER (fix)
─────────────────────────────────────────────────────────────────
fincas.nombre            ──✓── already selected as fincaNombre (L158)
obtenerAutorizacionUsuario  ── forwards activeMembership.fincaNombre
SesionAutorizada         ── adds fincaActivaNombre: string (L24-31)
_app.tsx AppLayout       ── nombre: sesion.fincaActivaNombre
FincaResumen.nombre      ── "La Esperanza"
FincaSwitcher trigger    ── `Finca ${activa.nombre}`                  (only prefix)
result                   ── "Finca La Esperanza"  ✅
```

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/dominio/src/usuario.ts` | Modify | Add `fincaActivaNombre: string` to `SesionAutorizada` (after `fincaActivaId`) |
| `packages/db/src/auth-repository.ts` | Modify | Pass `activeMembership.fincaNombre` into the `sesion` literal at L203-213 |
| `apps/web/src/routes/_app.tsx` | Modify | `fincaActiva.nombre = sesion.fincaActivaNombre`; drop the `` `Finca ${id}` `` synthesis at L139 |
| `apps/web/src/server/e2e-animals-fixture.server.ts` | Modify | Add `fincaActivaNombre: "Finca Demo E2E"` to `getAnimalE2eSession()` at L41-55 |
| `apps/web/tests/auth-flow.test.ts` | Modify | Add `fincaActivaNombre: "Finca 1"` to `authorizedSession()` at L14-23 |
| `apps/web/tests/animal-web-flow.test.ts` | Modify | Add `fincaActivaNombre: "Finca 1"` to `session()` at L19-33 |
| `tests/animal-catalogos.test.ts` | Modify | Add `fincaActivaNombre: "La Esperanza"` to `E2E_SESSION` at L29-39 |
| `tests/animal-catalogo-sexo.test.ts` | **Modify (missed by proposal audit)** | Add `fincaActivaNombre` to both `getSession` literals (L46-56, L86-93) — required by `getSession: () => Promise<SesionAutorizada \| null>` at `animal-actions.server.ts:87` |
| `packages/aplicacion/tests/auth-use-cases.test.ts` | Modify | Add `fincaActivaNombre: "Finca 1"` to inline `sesion` (L80-87) and to the actor mock at L159-166 |

No deletes, no DB migration, no new files. `SesionAnimal` (used by animal use cases) is a separate type and is not affected.

## Interfaces / Contracts

```ts
// packages/dominio/src/usuario.ts (modified)
export type SesionAutorizada = Readonly<{
  usuarioId: string
  nombre: string
  email: string
  fincaActivaId: string
  fincaActivaNombre: string  // ← NEW: populated from fincas.nombre
  rol: string
  permisos: readonly PermisoUsuario[]
}>
```

The field is **required**, not optional. This makes the TypeScript compiler flag every missed construction site (e2e fixture, 4 test files, 1 missed test) at `pnpm turbo typecheck` time — that is the propagation safety net.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Compile-time | Every `SesionAutorizada` literal includes the new field | `pnpm turbo typecheck` errors at the missed sites |
| Unit (`auth-flow.test.ts`) | `authorizedSession` shape updated | Existing assertions pass; assert `fincaActivaNombre === "Finca 1"` |
| Unit (`auth-use-cases.test.ts`) | `iniciarSesion` authorized path returns the name | Extend `toMatchObject` on `sesion.fincaActivaNombre` |
| Integration (`auth-repository-contract.test.ts`) | `obtenerAutorizacionUsuario` returns `fincaActivaNombre: "La Esperanza"` | Add field to the existing assertion at L114-120 |
| E2E (`tests/e2e/animales.spec.ts`) | Header trigger shows `"Finca La Esperanza"`, not `"Finca Finca finca-1"` | `await expect(page.getByRole("button", { name: /Finca La Esperanza/ })).toBeVisible()` |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary is touched. The change is pure data propagation within the existing TypeScript type system.

## Migration / Rollout

No migration required. The change is additive on the type, additive on the query (`fincas.nombre` is already in the SELECT), backward compatible on the wire (same JSON plus one new key), and trivially reversible by `git revert`. Rollout is "merge and ship" — no flags, no dual-write, no phased release.

## Open Questions

None. Non-blocking note: the proposal's audit listed 4 test files needing updates; my repo sweep found a 5th (`tests/animal-catalogo-sexo.test.ts`) because `createAnimalRuntimeHarness.getSession` is typed `() => Promise<SesionAutorizada | null>` at `animal-actions.server.ts:87`. The TypeScript compiler will flag it, but the task plan should call it out so the implementer doesn't miss it.
