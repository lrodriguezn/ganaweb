# Design: Issue #110 — Animal List Pagination and Preferences

## Technical Approach

Add a dedicated per-user/per-finca preference store through the existing
Clean/Hexagonal seams: an application port, a Drizzle adapter reusing the #107
authz-CTE pattern (PE-001–003), an HTTP handler factory mirroring
`createAnimalListadoHttpHandler`, and a new API route. Normalization reuses the
36-column registry in `animal-list-contract.ts`. The route initializes
`pageSize`/`cols` from preferences only when the URL lacks valid values, mutates
them via the existing URL-owned query model, and serializes saves so later
writes win. Desktop UI stays presentational.

## Architecture Decisions

### Decision: Storage model

| Option | Tradeoff | Decision |
|---|---|---|
| Dedicated `animal_listado_preferencias` table | New migration; clean ownership, isolation | ✅ |
| Reuse `config_parametros_finca` | Finca config ≠ user UI state; leakage risk | Rejected |
| URL-only | Fails cross-device criterion | Rejected |

### Decision: Normalization location

| Option | Tradeoff | Decision |
|---|---|---|
| Server contract layer (reuse `ANIMAL_LIST_COLUMNS`) | Consistent with `normalizeCols` | ✅ |
| `packages/dominio` | Registry lives in web; would duplicate | Rejected |

### Decision: Concurrency

| Option | Tradeoff | Decision |
|---|---|---|
| Last-write-wins (`ON CONFLICT DO UPDATE`) | Matches product decision #3 | ✅ |
| Optimistic versioning | Unrequested round-trips | Rejected |

### Decision: Column storage format

| Option | Tradeoff | Decision |
|---|---|---|
| `text[]` of column ids | Compact, ordered | ✅ |
| `jsonb` | Heavier than a flat id list | Rejected |

### Decision: Authorization

| Option | Tradeoff | Decision |
|---|---|---|
| Reuse authz-CTE, fail-closed | Consistent with #107; PE-001–003 at data layer | ✅ |
| HTTP-layer check only | Weaker; diverges from read-model | Rejected |

## Data Flow

    animales.tsx route
      init: URL valid? → use URL : GET prefs → defaults(29/25)
      change pageSize/cols → mutate URL (page→1) → debounced PUT
        │  getUsuarioId(fincaId) ── null → 403
        ▼
    API /api/fincas/$fincaId/animales/preferencias (GET|PUT)
        ▼
    AnimalListadoPreferenciasPort → Drizzle repository
      authz CTE (animales:ver + membership) → ForbiddenError
      GET: select (usuario_id, finca_id) → normalize → defaults on miss
      PUT: normalize → upsert ON CONFLICT DO UPDATE (last-write-wins)

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/db/src/schema/animal-listado-preferencias.ts` | Create | Table; `uq (usuario_id, finca_id)`; `columnas text[]`, `page_size smallint`, timestamps. |
| `packages/db/src/schema/index.ts` | Modify | Re-export new table. |
| `packages/db/migrations/0005_animal_listado_preferencias.sql` | Create | Table + unique index. |
| `packages/aplicacion/src/puertos/animal-listado-preferencias-port.ts` | Create | Port + DTO types. |
| `packages/aplicacion/src/index.ts` | Modify | Export new port types. |
| `packages/db/src/animal-infrastructure.ts` | Modify | Add `DrizzleAnimalListadoPreferenciasRepository` (authz CTE + upsert). |
| `apps/web/src/server/animal-list-preferences.ts` | Create | Normalize/validate: registered-only, mandatory `codigo`/`nombre`, page-size whitelist, 29/25 defaults. |
| `apps/web/src/server/animal-list-preferences-http.ts` | Create | `createAnimalListadoPreferenciasHttpHandler` (GET/PUT). |
| `apps/web/src/routes/api/fincas/$fincaId/animales/preferencias.ts` | Create | Wire GET/PUT with session auth + Drizzle repo. |
| `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` | Modify | Load prefs on init; own `page`/`pageSize`/`cols` mutations; debounced serialized saves; retryable warning. |
| `apps/web/src/features/animal-listado/animal-listado-route-adapter.ts` | Modify | Preference init/merge + page/pageSize/cols mutation builders. |
| `packages/ui/src/ganado/animal-listado-desktop.tsx` | Modify | Presentational pagination, column selector, reset, warning/retry; keep `codigo`/`nombre` immutable. |

## Interfaces / Contracts

```ts
// aplicacion port
export interface AnimalListadoPreferencias {
  readonly cols: readonly string[] // normalized; codigo+nombre always present
  readonly pageSize: 25 | 50 | 100
}
export interface AnimalListadoPreferenciasPort {
  obtener(req: { usuarioId: string; fincaId: string }): Promise<AnimalListadoPreferencias>
  guardar(req: { usuarioId: string; fincaId: string } & AnimalListadoPreferencias): Promise<void>
}
```

HTTP: `GET` → `200` | `403`. `PUT` body `{ cols, pageSize }` → `200` normalized
echo | `400` invalid | `403`. Errors use `apiError(...)`; never leak other scopes.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Normalization: registered-only, dedupe, mandatory `codigo`/`nombre`, page-size whitelist, 29/25 defaults | Vitest on `animal-list-preferences.ts` |
| Integration | Authz (PE-001–003), cross-scope denial, LWW upsert, failed-save keeps prior row | Vitest + PG/SQLite adapter |
| Contract | GET/PUT 200/400/403, sanitized errors | Extend `animal-list-server-contract.test.ts` |
| Route/UI | URL overrides prefs, failed-load defaults+warning, page reset on size/cols change, retry | Extend `animal-listado-route.test.tsx` |

Note: `openspec/config.yaml` marks runners unavailable; verification plans for this.

## Threat Matrix

N/A — no shell, subprocess, VCS/PR automation, executable-file classification,
or process-integration boundary; matrix rows do not apply. The only new
boundary is an authenticated HTTP route + DB persistence, governed by PE-001–003
via the reused authz-CTE pattern; its adversarial cases (cross-user/cross-finca
access, invalid values, failed saves) are design requirements carried to tasks
and RED tests.

## Migration / Rollout

Additive migration `0005`; empty table means first visit resolves to 29/25
defaults — no backfill. Rollback: revert endpoints/UI, drop the table; the list
keeps its canonical defaults.

## Open Questions

- [ ] Preference load timing: route `loader` (SSR, no flicker) vs client fetch — confirm against #109 stale-request behavior.
- [ ] Save debounce interval (propose 500 ms); reset saves synchronously?
