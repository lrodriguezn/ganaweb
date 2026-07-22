# Exploration: FincaSwitcher shows slug instead of real finca name

## Current State

### The Bug

Two compounding issues produce wrong output:

1. **`_app.tsx:139`** synthesizes a `FincaResumen` object with `nombre: \`Finca ${sesion.fincaActivaId}\`` — this uses the finca slug/ID (e.g. `"finca-esperanza"`) as the display name, producing `"Finca finca-esperanza"`.

2. **`finca-switcher.tsx:94`** prepends another `"Finca "` prefix on the trigger button: `` \`Finca ${activa.nombre}\` `` — this turns `"Finca finca-esperanza"` into `"Finca Finca finca-esperanza"`.

Result: the dropdown trigger shows `"Finca Finca finca-esperanza"` instead of the correct `"Finca La Esperanza"`.

### Data Flow (DB → Session → Route → UI)

```
fincas table (DB)
  id: 'finca-esperanza'
  nombre: 'La Esperanza'           ← the real name from the database column
  codigo: 'GAN001'
  ...

  │
  ▼
obtenerAutorizacionUsuario()     ← packages/db/src/auth-repository.ts:144-213
  ├── Queries fincas.nombre AS fincaNombre  ← ALREADY FETCHED (line 158)
  ├── Available as: activeMembership.fincaNombre
  └── BUT returned SesionAutorizada drops it (lines 203-213):
        fincaActivaId: activeMembership.fincaId  ← only the ID
        ← NO fincaActivaNombre — the data is discarded here

  │
  ▼
SesionAutorizada type             ← packages/dominio/src/usuario.ts:24-31
  Has: fincaActivaId: string
  MISSING: fincaActivaNombre: string ← type gap — name is queried but not modeled

  │
  ▼
getCurrentSession()               ← apps/web/src/server/auth.ts:65-80
  Returns { sesion: SesionAutorizada }

  │
  ▼
_app.tsx beforeLoad               ← apps/web/src/routes/_app.tsx:70-76
  Gets sesion from route context

  │
  ▼
AppLayout()                       ← apps/web/src/routes/_app.tsx:129-204
  Synthesizes FincaResumen with:
    nombre: `Finca ${sesion.fincaActivaId}`  ← BUG: uses ID as name

  │
  ▼
AppHeader → FincaSwitcher        ← packages/ui/src/ganado/finca-switcher.tsx:94
  Trigger shows: `Finca ${activa.nombre}`   ← SECOND "Finca " prefix
```

### Key Discovery: The DB Already Has the Name

In `packages/db/src/auth-repository.ts:155-163`, the `obtenerAutorizacionUsuario()` method does:

```typescript
const memberships = await this.db
  .select({
    fincaId: usuariosFincas.fincaId,
    fincaNombre: fincas.nombre,   // ← THE NAME IS FETCHED
    activo: usuariosFincas.activo,
  })
  .from(usuariosFincas)
  .innerJoin(fincas, eq(fincas.id, usuariosFincas.fincaId))
  .where(eq(usuariosFincas.usuarioId, usuarioId))
```

The `fincas.nombre` column is **already in the query result** as `activeMembership.fincaNombre`. It's simply dropped when constructing the `SesionAutorizada` return value (lines 203-213). This is the root cause: a data-passing gap at the repository → domain boundary.

### Finca ID Format

From both seed files (`seed.ts` and `seed_v3.ts`):
- Finks use **slug-style text IDs**, not UUIDs: `'finca-esperanza'`, `'finca-roble'`
- The display names are: `'La Esperanza'`, `'Hacienda El Roble'`
- The `id` column is `text("id").primaryKey()` without auto-generation
- The e2e fixture uses `fincaActivaId: "finca-1"` — another slug-style ID

`fincaActivaId` is ALWAYS a valid finca ID that exists in the `fincas` table. It is also always a slug, never a UUID.

## Affected Areas

### Files That MUST Change

| File | What | Why |
|------|------|-----|
| `packages/dominio/src/usuario.ts:24-31` | `SesionAutorizada` type — add `fincaActivaNombre: string` | The domain type models the session but lacks the finca display name |
| `packages/db/src/auth-repository.ts:203-213` | `obtenerAutorizacionUsuario` — pass `activeMembership.fincaNombre` to sesion | The data is queried but not forwarded |
| `apps/web/src/routes/_app.tsx:139` | `fincaActiva` construction — use `sesion.fincaActivaNombre` instead of `\`Finca ${sesion.fincaActivaId}\`` | This is where the bug manifests |
| `apps/web/src/server/e2e-animals-fixture.server.ts:41-55` | `getAnimalE2eSession()` — add `fincaActivaNombre` field | E2e mode constructs a hardcoded `SesionAutorizada` |

### Files That MUST Change (Test files — 4 locations construct `SesionAutorizada`)

| File | Line(s) | What |
|------|---------|------|
| `apps/web/tests/auth-flow.test.ts` | 14-23 | `authorizedSession()` — add `fincaActivaNombre` |
| `apps/web/tests/animal-web-flow.test.ts` | 19-33 | `session()` — add `fincaActivaNombre` |
| `tests/animal-catalogos.test.ts` | 29-39 | `E2E_SESSION` — add `fincaActivaNombre` |
| `packages/aplicacion/tests/auth-use-cases.test.ts` | 80-87 | inline `sesion` in mock — add `fincaActivaNombre` |

### Files That MAY Need Change

| File | Reason |
|------|--------|
| `packages/aplicacion/src/puertos/auth-repository-port.ts:31` | `LoginResult` includes `sesion: SesionAutorizada` — if `SesionAutorizada` changes, `LoginResult` consumers in the login flow need the new field. The type itself doesn't need changing; but the DB `iniciar-sesion` use case that builds `LoginResult` may need to pass the finca name. |

Let me verify — actually, `LoginResult` type uses `SesionAutorizada` directly (line 31), so it transitively gets the new field. The callers in the login flow will need the finca name at the point where the `LoginResult` `sesion` is constructed.

## Approaches

### Option A (Recommended) — Add `fincaActivaNombre` to `SesionAutorizada` and thread through from existing query

**Description**: Add `fincaActivaNombre: string` to the `SesionAutorizada` domain type, pass `activeMembership.fincaNombre` through in `obtenerAutorizacionUsuario`, then use `sesion.fincaActivaNombre` in `_app.tsx`.

**Effort**: Low

**Pros**:
- Data is ALREADY queried — zero additional DB cost
- Fixes the root cause, not the symptom
- Clean data flow: DB → repository → use case → route → UI
- The `FincaUsuarioResumen` type already proves this model is expected (it has `nombre`)

**Cons**:
- Changes a domain type — all consumers of `SesionAutorizada` must be updated
- Tests need updating (4 test files with 4 `SesionAutorizada` constructions)
- E2e fixture needs updating

**Files to change**: ~6-7 files (domain type, repository, route, e2e fixture, 4 test files)

### Option B — Query finca name separately in the route's `beforeLoad`

**Description**: Add a server function or extend the existing route loader to fetch `fincas.nombre` by `fincaActivaId`.

**Effort**: Medium

**Pros**:
- No domain type change
- No test changes outside web layer
- More targeted change

**Cons**:
- Extra DB query on every protected page load (N+1 risk if extended)
- Leaves the architectural gap unfixed (data is already in the membership query but discarded)
- Code at route level won't be reused when multi-finca list is needed
- The route is already a server function context — adds clutter to the shell layout

### Option C — Keep `_app.tsx` synthetic but look up the name from a finca list

**Description**: Create a separate endpoint or include a finca list in the session context, then derive the name from the list.

**Effort**: High

**Pros**:
- Sets groundwork for multi-finca switching UI (needs a finca list anyway)

**Cons**:
- Over-engineered for this bug
- Multi-finca isn't needed yet; the session only tracks one active finca
- Still leaves the domain type gap unfixed
- Much larger change scope

## Recommendation

**Option A**. The data is already in the query result — `activeMembership.fincaNombre` exists at line 158 of `auth-repository.ts` but is silently dropped. This is a clear data-passing oversight at the repository → domain boundary. Fixing it at the type level is the correct architectural approach.

The `FincaUsuarioResumen` domain type (which represents a user's relationship to a finca) already has a `nombre` field, confirming the domain model expects finca names to be propagated. `SesionAutorizada` is the only type missing it.

## Risks

- **Login flow**: `iniciar-sesion` constructs `LoginResult` with `sesion: SesionAutorizada`. When this session is constructed from a DB query in `auth-repository.ts`, it runs through `obtenerAutorizacionUsuario` which would already pass `fincaActivaNombre`. **Low risk** — the `LoginResult` type uses `SesionAutorizada` directly, so it inherits the new field. No extra wiring needed.

- **Return type mismatch**: The `obtenerAutorizacionUsuario` return type is `Promise<DecisionAutorizacion>`, and `DecisionAutorizacion` uses `SesionAutorizada`. TypeScript will flag any missing field at compile time. If we add `fincaActivaNombre` to `SesionAutorizada`, every construction site must provide it or TypeScript will error. This is a feature, not a bug — we won't miss any callers.

- **Login flow's `obtenerAutorizacionUsuario` path**: When a user logs in via `iniciarSesion`, it calls `obtenerCredencialesPorEmail`, creates a session, then calls `obtenerAutorizacionUsuario` to get the `DecisionAutorizacion`. That same `obtenerAutorizacionUsuario` method queries `fincas.nombre` — so login is covered automatically.

- **`SesionAnimal` type** in `packages/aplicacion/src/casos-uso/animales/index.ts:19-23` is a separate type (not the same as `SesionAutorizada`), so it does NOT need changing.

## Ready for Proposal

**Yes**. The root cause is clear, the data flow is fully traced, and the fix path is low-effort (~6-7 files, all mechanical changes). The orchestrator should tell the user: the domain type `SesionAutorizada` needs a new `fincaActivaNombre` field, the data is already in the DB query but dropped, and the remaining changes are propagation through `_app.tsx`, the e2e fixture, and 4 test files.
