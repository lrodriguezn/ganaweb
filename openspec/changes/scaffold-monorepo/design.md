# Design: Scaffold Monorepo (ganaweb foundation)

## Technical Approach

Greenfield pnpm + Turborepo monorepo with 6 packages + `apps/web`, online-first this change. Layer graph from `especificaciones_tecnicas.md` §3 and ADR A1: `apps/web → aplicacion → dominio`; `ui → (no dominio)`; `db` implements ports declared by `aplicacion`. We scaffold root config first (PR 1), then incrementally add `dominio` (TDD), `db`, `ui`, `web`, and interface-only stubs for `aplicacion` + `sync`, each as a chained PR. Postgres-17 Drizzle only — no SQLite/WASM/OPFS references anywhere (greppable guard enforced in CI).

## Architecture Decisions

| # | Decision | Alternatives | Rationale |
|---|----------|--------------|-----------|
| D1 | Vendor the shadcn base primitives the 13 components depend on into `packages/ui/src/primitives/` (button, input, label, select, drawer, dropdown-menu, alert-dialog, collapsible) | Re-export from `@radix-ui/*` directly in each component; run shadcn CLI at build time | Reference components already import `@/components/ui/*` shadcn shape; vendoring keeps the package self-contained, buildabl offline, and pins versions (risk mitigation in proposal). |
| D2 | Build `packages/ui` with `tsup` (ESM + DTS) | `tsc` only; `vite` library mode | `tsup` emits dual ESM/CJS + declarations in one pass; faster than `tsc`; web/ TanStack Start can tree-shake ESM. |
| D3 | `dependency-cruiser` with two rulesets: `layer-rules` (package→package allowed edges) + `no-sqlite` (forbidden substring `wa-sqlite\|OPFS\|sqlite-wasm`) | ESLint import boundary plugin; manual review | dependency-cruiser already named in §3 as the enforcement tool; regex forbidden-deps rule cheaply guards the online-first scope gate. |
| D4 | `packages/dominio` exports a tagged-union `ResultadoValidacion` (not booleans/throws) | throw on invalid; `{ ok: boolean }` flat | Discriminated unions make `validarCodigoUnicoPorFinca` total, exhaustively testable, and let a future use case surface structured errors (RN-001 code cited in the `invalida` branch). |
| D5 | Minimal `animales`+`fincas` Drizzle schema is a *subset of v3*, hand-authored (not generated from the SQL file) | Generate full v3 schema now | Proposal explicitly defers full schema generation; hand-authoring just RN-001 columns keeps PR 3 ~300 lines and avoids blocking on `drizzle-kit` introspection tooling. |
| D6 | `packages/sync` + `packages/aplicacion` expose only `interface`/`type` declarations — no exported functions with bodies | Empty stubs returning `throw` | Spec requirements forbid I/O/mutation/logic; a `throw` body counts as logic. Pure declarations satisfy the spec and dependency-cruiser; CI guard asserts zero `function`/`export const = () =>` in `src`. |
| D7 | CI coverage gate scoped to `packages/dominio` only (≥90%), run via `vitest --coverage` with `v8` provider; other packages have no coverage gate this change | Gate all packages; use `istanbul` provider | `dominio` is the only package with logic this change; `v8` provider needs no instrumentation setup and integrates cleanly with Turborepo. |
| D8 | Health route (`/api/health`) issues a `SELECT 1` via the Drizzle client and returns `{ status, db }`; non-200 when PG unreachable | No DB check | Spec Req 3 says it SHOULD verify PG; cheap HTTP probe Docker `HEALTHCHECK` already references `/api/health`. |
| D9 | TanStack Start app under `apps/web/src/` with file-based routes + server functions in `src/server/` | Hono `apps/api` (escape hatch A2) | ADR A2: one deployable artifact. The Hono escape path stays available via the layer rule without code now. |
| D10 | Port-inversion edge: `db` MAY import type-only port interfaces from `packages/aplicacion/puertos/*` (`AnimalRepositoryPort`, `OutboxPort`) | `aplicacion` imports `db` concretely; shared `ports` package | Inversion of dependency: `aplicacion` defines the contract, `db` implements it — the defining feature of Clean/Hexagonal. The `aplicacion-to-db` forbidden rule stays symmetric so runtime flow is never inverted. Type-only imports erase at compile time, keeping the runtime DAG acyclic (`db → aplicacion` for types, never values). |
| D11 | Seed subset extent: minimal seed inserts ZERO `animales` rows this change; uses real finca IDs `finca-esperanza` (GAN001) + `finca-roble` (GAN002) from `docs/seed_v3.ts` lines 204-217; RN-001 verified at Drizzle schema level via `uq_animales_finca_codigo` unique index, NOT via seed data | Invent `finca-demo-01`/`animal-a001`/`A001` demo rows; defer seed entirely | The real `seed_v3.ts` inserts zero animals, so inventing IDs would diverge from source-of-truth. RN-001's invariant is enforced by the DB unique index (verified by integration test TS-004 duplicate-insert-throws) and by the `dominio` pure-function unit test with in-memory fixtures (TS-003), not by seed data. Keeping real finca IDs lets the integration smoke assert the index fires without coupling to fabricated IDs. |

## Data Flow

```
 pnpm turbo build (topological ^build)
   │
   ▼
 config → dominio ─┐          ui (tsup) ─┐
                   │                      │
   aplicacion (ports only) ──► sync (ports only)
                   │
   db (Drizzle PG) ─┘
                   │
   apps/web (TanStack Start) ──► ui, aplicacion, db  (NOT dominio directly)
```
Health request: `GET /api/health` → server function → `db` client → `SELECT 1` → JSON `{ status:"ok", db:"ok"|"error" }`. Sync flow deferred (only port shapes defined).

## Monorepo Directory Tree (files to create)

```
ganaweb/
├─ pnpm-workspace.yaml                 # packages: ["apps/*","packages/*"]
├─ package.json                        # engines node="22", pnpm=">=9"; scripts: build/test/typecheck/lint/ci
├─ turbo.json                          # pipelines: build(^build), typecheck(^build), test, lint, ci
├─ biome.json                          # extends @ganaweb/config/biome-preset; strict, no any
├─ .dependency-cruiser.js              # layer-rules + no-sqlite forbidden rule
├─ .github/workflows/ci.yml            # install→biome ci→typecheck→test→build→depcruise→coverage gate
├─ .nvmrc                              # 22
├─ packages/
│  ├─ config/
│  │  ├─ package.json                  # @ganaweb/config (private)
│  │  ├─ tsconfig.base.json            # strict, lib ESNext, moduleResolution Bundler
│  │  ├─ tsconfig.react.json           # extends base + jsx
│  │  └─ biome-preset.json
│  ├─ dominio/
│  │  ├─ package.json                  # zero runtime deps; scripts: test/typecheck/build
│  │  ├─ tsconfig.json                 # extends @ganaweb/config/tsconfig.base
│  │  ├─ vitest.config.ts             # coverage v8, threshold 90, scope ./src
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ animal.ts                  # Animal entity type (Domain language Spanish)
│  │  │  └─ rn-001.ts                  # validarCodigoUnicoPorFinca pure fn
│  │  └─ tests/
│  │     └─ rn-001.test.ts             # describe('RN-001: código único por finca')
│  ├─ aplicacion/
│  │  ├─ package.json                  # deps: dominio, sync (workspace:*)
│  │  ├─ tsconfig.json
│  │  └─ src/
│  │     ├─ index.ts
│  │     ├─ puertos/animal-repository-port.ts   # AnimalRepositoryPort
│  │     ├─ puertos/reloj-del-sistema-port.ts   # RelojDelSistemaPort
│  │     └─ puertos/outbox-port.ts              # OutboxPort
│  ├─ db/
│  │  ├─ package.json                  # deps: drizzle-orm, pg; scripts: migrate/seed
│  │  ├─ tsconfig.json
│  │  ├─ drizzle.config.ts             # dialect: 'postgresql'
│  │  ├─ src/
│  │  │  ├─ client.ts                  # createClient() (Drizzle + node-postgres)
│  │  │  ├─ schema/fincas.ts
│  │  │  ├─ schema/animales.ts          # uq_animales_finca_codigo unique index
│  │  │  ├─ schema/index.ts            # typed re-exports (Inferschema types)
│  │  │  └─ seed/seed-v3.ts            # adapted minimal seed (≥1 finca, ≥1 animal)
│  │  └─ migrations/                   # drizzle-kit generated SQL
│  ├─ sync/
│  │  ├─ package.json                  # NO runtime deps; devDeps: @ganaweb/config only
│  │  ├─ tsconfig.json
│  │  └─ src/
│  │     ├─ index.ts
│  │     ├─ push-port.ts               # SyncPushPort
│  │     ├─ pull-port.ts               # SyncPullPort
│  │     └─ conflict-resolver-port.ts  # ConflictResolverPort (RN-061)
│  ├─ ui/
│  │  ├─ package.json                  # deps: cva/clsx/tailwind-merge/lucide-react/@radix-ui/*
│  │  ├─ tsconfig.json                 # extends react config
│  │  ├─ tsup.config.ts                # format: ['esm'], dts: true, entry: all ganado + types + utils
│  │  ├─ src/
│  │  │  ├─ styles/globals.css         # verbatim migration of design tokens
│  │  │  ├─ lib/utils.ts               # cn()
│  │  │  ├─ ganado/<12 files>          # 10 top-level + 2 under event-drawer/ (formulario-vacuna.tsx, index.tsx); migrated verbatim minus path aliases
│  │  │  └─ primitives/<8 shadcn files> # button,input,label,select,drawer,dropdown-menu,alert-dialog,collapsible
│  │  └─ tests/tokens.test.ts          # asserts --color-primary etc. present; no `dark:` variant
│  └─ (config — see above)
└─ apps/web/
   ├─ package.json                     # deps: aplicacion, ui, db; NOT dominio
   ├─ tsconfig.json
   ├─ vite.config.ts                   # @tanstack/start plugin
   ├─ app.config.ts                    # TanStack Start config
   └─ src/
      ├─ routes/__root.tsx
      ├─ routes/index.tsx              # minimal landing using ui components
      └─ routes/api/health.ts          # server function → db SELECT 1
```

## Package Dependency Graph & dependency-cruiser Rules

Allowed edges (directed): `apps/web → {aplicacion, ui, db, config}`; `aplicacion → {dominio, sync, config}`; `db → {aplicacion (type-only), config}` (D10 port-inversion); `sync → {config}`; `ui → {config}` (NOT dominio); `dominio → {config}` (config = tooling only; dominio has zero runtime deps).

`.dependency-cruiser.js` rules (valid syntax: every `from`/`to` is an object with a `path` property; enforcement is via `forbidden` rules — per dep-cruiser docs, an `allowed` array is only used as a scope limiter, not as the boundary enforcer; the absence of a `forbidden` match IS the allowance):

```js
module.exports = {
  forbidden: [
    // Layer boundaries — each forbidden rule encodes one denied edge.
    // Allowance is the absence of a matching forbidden rule (dep-cruiser idiom).
    { name: 'ui-to-dominio',
      from: { path: 'packages/ui' }, to: { path: 'packages/dominio' } },
    { name: 'web-to-dominio-direct',
      from: { path: 'apps/web' }, to: { path: 'packages/dominio' } },
    { name: 'dominio-to-io',
      from: { path: 'packages/dominio/src' },
      to: { pathNot: '^(packages/dominio|node:)', viaNot: ['type-only'] } },
    // Asymmetric port-inversion (D10): aplicacion → db is FORBIDDEN at all times,
    // but db → aplicacion is allowed ONLY for type-only imports (interfaces).
    { name: 'aplicacion-to-db',
      from: { path: 'packages/aplicacion' }, to: { path: 'packages/db' } },
    { name: 'db-to-aplicacion-runtime',
      // db may import aplicacion ONLY as type-only (no runtime values).
      from: { path: 'packages/db' }, to: { path: 'packages/aplicacion', viaNot: ['type-only'] } },
    { name: 'sync-to-db',
      from: { path: 'packages/sync' }, to: { path: 'packages/db' } },
    { name: 'no-sqlite',
      from: {},
      to: { path: 'node:.*|$', dependencyTypes: ['npm', 'npm-no-pkg', 'coremodule', 'aliased'] },
      comment: 'Online-first gate: reject any SQLite/WASM/OPFS import. pathOrPattern backstop below.'
    },
  ],
  // allowed: array limits WHICH dependencies dep-cruiser even considers scanning
  // (scope limiter, not the enforcer). Listed edges are in-scope; anything not
  // forbidden above within this scope simply passes.
  allowed: [
    { from: { path: 'apps/web' }, to: { path: 'packages/(aplicacion|ui|db|config)' } },
    { from: { path: 'packages/aplicacion' }, to: { path: 'packages/(dominio|sync|config)' } },
    { from: { path: 'packages/db' }, to: { path: 'packages/(aplicacion|config)' } }, // D10 edge
    { from: { path: 'packages/sync' }, to: { path: 'packages/config' } },
    { from: { path: 'packages/ui' }, to: { path: 'packages/config' } },
    { from: { path: 'packages/dominio' }, to: { path: 'packages/config' } },
  ],
};
```
Note: `db → aplicacion` appears in BOTH `allowed` (in-scope) and `db-to-aplicacion-runtime` (forbidden unless type-only). The `viaNot: ['type-only']` clause on the forbidden rule means type-only imports pass; runtime imports fail — this is the dep-cruiser idiom for the D10 port-inversion contract. `no-sqlite`'s `coremobul` typo from the prior draft is corrected to `coremodule`. A separate `grep -rE "wa-sqlite|OPFS|sqlite-wasm|sql\.js"` step in CI backstops the source-tree scan (catches string literals dep-cruiser cannot see).

## `packages/dominio` Design

```ts
// src/animal.ts — Domain language Spanish (T-001/T-003)
export type Sexo = "macho" | "hembra" | "pajuela";
export type EstadoAnimal = "activo" | "vendido" | "muerto";
export type Salud = "sano" | "enfermo";

export interface AnimalResumen {
  readonly id: string;
  readonly fincaId: string;
  readonly codigo: string;          // unique per finca (RN-001)
  readonly nombreAnimal?: string | null;
  readonly sexo: Sexo;
  readonly estadoActual: EstadoAnimal;
  readonly salud: Salud;
}

// src/rn-001.ts — pure function, zero deps
export type ResultadoValidacion =
  | { readonly valido: true }
  | { readonly valido: false; readonly regla: "RN-001"; readonly detalle: string };

export function validarCodigoUnicoPorFinca(
  codigo: string,
  fincaId: string,
  animalesExistentes: ReadonlyArray<{ readonly fincaId: string; readonly codigo: string }>,
): ResultadoValidacion;
```
Test `tests/rn-001.test.ts` (committed first, red): `describe('RN-001: código único por finca')` per TS-001. Cases: duplicate same finca → `{valido:false, regla:"RN-001"}`; same code different finca → `{valido:true}`; empty `animalesExistentes` → `{valido:true}`; empty/whitespace `codigo` → invalid (input guard, not RN-001 — separate `detalle`). Coverage ≥90% enforced by `vitest.config.ts` threshold.

## `packages/db` Design

`drizzle.config.ts`: `dialect: 'postgresql'`, schema `./src/schema/*`, out `./migrations`, credentials from `DATABASE_URL`. `client.ts` exports both a factory and a lazy singleton (so `apps/web` can `import { db }` while tests can call `createClient()` against ephemeral PG):

```ts
// src/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
export function createClient(url = process.env.DATABASE_URL!) {
  const queryClient = postgres(url);
  return drizzle(queryClient, { schema });
}
// Lazy singleton — only initialized on first import use; safe for serverless cold starts.
let _db: ReturnType<typeof createClient> | null = null;
export const db = new Proxy({} as ReturnType<typeof createClient>, {
  get(_t, prop) { _db ??= createClient(); return Reflect.get(_db, prop); },
});
```

```ts
// schema/fincas.ts
export const fincas = pgTable('fincas', {
  id: text('id').primaryKey(),
  codigo: text('codigo', { length: 20 }).notNull(),
  nombre: text('nombre', { length: 100 }).notNull(),
  activo: integer('activo').default(1).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
// schema/animales.ts — only columns needed for RN-001
export const animales = pgTable('animales', {
  id: text('id').primaryKey(),
  fincaId: text('finca_id').notNull().references(() => fincas.id),
  codigo: text('codigo', { length: 20 }).notNull(),
  nombre: text('nombre', { length: 100 }).default(''),
  sexo: text('sexo').notNull(),
  estadoAnimal: text('estado_animal').notNull(),
  activo: integer('activo').default(1).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uqAnimalesFincaCodigo: uniqueIndex('uq_animales_finca_codigo').on(t.fincaId, t.codigo),
}));
```
`seed/seed-v3.ts` adaptation (D11 — Seed Subset Extent, Option A): keep the `seed_v3.ts` file header + idempotency pattern (`onConflictDoNothing`) but insert ONLY `fincas` (2 rows with the REAL IDs from `docs/seed_v3.ts` lines 204-217: `finca-esperanza` / codigo `GAN001`, `finca-roble` / codigo `GAN002`). This change inserts ZERO `animales` rows — `docs/seed_v3.ts` likewise inserts no animals, so inventing `finca-demo-01`/`animal-a001`/`A001` would diverge from source-of-truth. RN-001 is verified at the Drizzle schema level via the `uq_animales_finca_codigo` unique index (integration test `duplicate insert throws`, TS-004), NOT via seed data; the `dominio` unit test for RN-001 uses in-memory fixtures per TS-003. Script idempotent; `pnpm --filter db seed` runs it via `tsx`. `seed-v3.ts` does NOT import the full v3 schema list — only the tables exported locally (`fincas`).

## `packages/ui` Design

Imports rewritten: `@/lib/utils` → `../lib/utils`; `@/components/ganado/types` → `../types`; `@/components/ui/*` (shadcn) → `../primitives/*`. Build with `tsup` — entry: `src/index.ts` (barrel re-exporting all ganado + types + `cn`), `format: ['esm']`, `dts: true`, `external: ['react','react-dom','@radix-ui/*','lucide-react','class-variance-authority','clsx','tailwind-merge']`. `globals.css` copied verbatim (Tailwind v4 `@theme inline` tokens, `.dark` override block stays — toggling via `<html class="dark">`, NOT via `dark:` utilities, so T-004 holds). `tests/tokens.test.ts`: reads `globals.css`, asserts `--color-primary`, `--color-background`, `--color-ring` present, and `grep -c 'dark:' src/**` === 0 (the `:root`→`.dark` switch via CSS vars is allowed; `dark:` Tailwind variant token is not). shadcn base deps vendored verbatim from shadcn-ui reference (pinned versions in `package.json`).

## `packages/sync` Port Contracts (interfaces ONLY)

```ts
// push-port.ts
export type ResultadoEntradaPush = { aplicada: true; id: string } | { aplicada: false; conflicto: true; id: string; motivo: string };
export interface SyncPushPort {
  push(lote: EntradaOutbox[]): Promise<ResultadoEntradaPush[]>;
}
// pull-port.ts
export interface SyncPullPort {
  pull(fincaId: string, cursor: { updated_at: string; id: string } | null, limite?: number): Promise<{ filas: FilaCambiada[]; cursorSiguiente: { updated_at: string; id: string } | null }>;
}
// conflict-resolver-port.ts — RN-061: LWW by event timestamp; life-cycle severity MUERTO > VENDIDO > EN_FINCA
export type EstadoVital = "en_finca" | "vendido" | "muerto";
export interface ConflictResolverPort<T> {
  resolver(local: { estado: T; timestampEvento: string }, remoto: { estado: T; timestampEvento: string }): { ganador: "local" | "remoto"; estado: T };
}
```
No exported concrete functions. CI guard: no `export (const|function|class) =` arrows with bodies in `packages/sync/src`.

## `packages/aplicacion` Port Contracts (interfaces ONLY)

```ts
// animal-repository-port.ts — operations needed for RN-001
export interface AnimalRepositoryPort {
  buscarPorCodigoYFinca(codigo: string, fincaId: string): Promise<AnimalResumen | null>;
  guardar(animal: AnimalResumen): Promise<void>;
}
// reloj-del-sistema-port.ts
export interface RelojDelSistemaPort { ahora(): Date; }
// outbox-port.ts — EventoOutbox shape compatible with sync push entry
export type EventoOutbox = { id: string; fincaId: string; tablaDestino: string; operacion: "INSERT"|"UPDATE"|"DELETE"; payload: unknown; createdAt: string };
export interface OutboxPort { append(evento: EventoOutbox): Promise<void>; }
```
`aplicacion` depends on `dominio` (for `AnimalResumen`) + `sync` (for compatible outbox shape) only; NOT `db` (enforced by dependency-cruiser).

## `apps/web` Design

TanStack Start app (`@tanstack/start` + `vinxi`). `src/routes/api/health.ts`:

```ts
import { createServerFileRoute } from '@tanstack/start/server';
import { db } from '@ganaweb/db/client';
export const ServerRoute = createServerFileRoute('/api/health')({ GET: async () => {
  try { await db.execute('SELECT 1'); return Response.json({ status: 'ok', db: 'ok' }, { status: 200 }); }
  catch { return Response.json({ status: 'degraded', db: 'error' }, { status: 503 }); }
}});
```
`src/routes/index.tsx` imports showcase components from `@ganaweb/ui` (`EstadoBadge`, `SyncPill`, `AnimalCard`). `apps/web` imports from `aplicacion` (for future server functions) + `ui` + `db`; never from `dominio` directly (dependency-cruiser rule `web-to-dominio-direct`). Docker `HEALTHCHECK` already references `/api/health` (§7).

## CI Pipeline Design (`.github/workflows/ci.yml`)

```yaml
jobs:
  ci:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17-alpine
        env: { POSTGRES_PASSWORD: postgres, POSTGRES_DB: ganaweb }
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 10s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec biome ci .
      - run: pnpm turbo typecheck
      - run: pnpm turbo test -- --coverage
      - run: pnpm turbo build
      - run: pnpm exec dependency-cruise .
      - name: Coverage gate (dominio ≥90%)
        run: pnpm --filter @ganaweb/dominio exec vitest run --coverage && node scripts/check-coverage.mjs
      - name: No-SQLite guard
        run: ! grep -rE "wa-sqlite|OPFS|sqlite-wasm|sql\.js" packages apps || (echo "SQLite reference detected"; exit 1)
      - env: { DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ganaweb }
        run: pnpm --filter @ganaweb/db migrate && pnpm --filter @ganaweb/db seed && pnpm --filter @ganaweb/web exec tsx scripts/health-check.mjs
```
Order matches `monorepo-scaffold.md` Req 5. Coverage gate isolated to `dominio` (D7). Postgres Testcontainers-style service container backs the integration smoke for `db` + `web` health route. `scripts/check-coverage.mjs` parses `coverage/coverage-summary.json` and fails if `packages/dominio` lines < 90%.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `pnpm-workspace.yaml`, root `package.json`, `turbo.json`, `biome.json`, `.nvmrc` | Create | Root workspace + tooling (PR 1) |
| `.dependency-cruiser.js` | Create | Layer + no-sqlite rules (PR 1) |
| `.github/workflows/ci.yml`, `scripts/check-coverage.mjs`, `apps/web/scripts/health-check.mjs` | Create | CI skeleton + gates (PR 5) |
| `packages/config/{package.json,tsconfig.base.json,tsconfig.react.json,biome-preset.json}` | Create | Shared tooling config |
| `packages/dominio/**` (incl. `tests/rn-001.test.ts` committed first per TDD) | Create | Animal entity + RN-001 pure fn |
| `packages/aplicacion/src/puertos/*` | Create | Port interfaces only |
| `packages/db/{drizzle.config.ts,src/client.ts,src/schema/*,src/seed/seed-v3.ts,migrations}` | Create | Drizzle PG + minimal schema + seed |
| `packages/sync/src/{push,pull,conflict-resolver}-port.ts` | Create | Port interfaces only |
| `packages/ui/{tsup.config.ts,src/styles/globals.css,src/lib/utils.ts,src/ganado/*,src/primitives/*,tests/tokens.test.ts}` | Create | Migrated component library |
| `apps/web/{package.json,tsconfig.json,vite.config.ts,app.config.ts,src/routes/*}` | Create | TanStack Start minimal app + health route |
| `docs/*`, `openspec/**` | Unchanged | Greenfield rest preserved |

No modifies / deletes — all files are new. Total net new ≈ 2,000 lines spread across 5 chained PRs (proposal forecast).

## Interfaces / Contracts

See inline TypeScript in `packages/dominio`, `packages/sync`, `packages/aplicacion`, `apps/web` sections above. Cross-package contract test plan: when a future use case lands, `aplicacion` constructs depend on `AnimalRepositoryPort`, `RelojDelSistemaPort`, `OutboxPort`; `sync` pushes consume `EventoOutbox` (shape contract asserted at compile time via the shared `sync` package — `aplicacion` imports `sync` types, so the outbox shape is enforced by the TS compiler, not runtime).

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (`dominio`) | RN-001 across duplicate/different-finca/empty cases | Vitest + `--coverage` (v8); test written FIRST (red→green per strict_tdd) |
| Unit (`ui`) | Tokens present in `globals.css`; zero `dark:` variants | Vitest reads CSS file as text; regex assertions |
| Integration (`db`) | Migrate + seed a real PG (service container) — 2 fincas (`finca-esperanza`, `finca-roble`); ZERO animales seeded per D11. RN-001 verified by inserting a duplicate `(fincaId, codigo)` pair at test time and asserting the unique index `uq_animales_finca_codigo` throws (fixtures generated inside the test, not from seed) | Vitest against ephemeral `postgres:17` in CI; gated under a `DB_SMOKE=true` env flag |
| Integration (`web`) | `/api/health` returns 200 + `db:"ok"` when seeded; 503 when PG down | `tsx` health-check script after build (CI step) |
| Contract (`aplicacion`↔`sync`) | `EventoOutbox` shape assignable to sync push entry | `@ts-expect-error`-free compile; type-only test |
| E2E | Deferred (Playwright out of scope this change per proposal §OOS) | — |

Coverage gate: `packages/dominio` ≥90% (CI step + `vitest.config.ts` threshold). Other packages have no coverage gate this change (D7).

## Migration / Rollout

No migration required — greenfield. Per-PR revertability documented in the proposal: each chained PR reverts independently (dependency-cruiser + Turbo keep packages isolated); full rollback = delete scaffolded dirs, retain `openspec/changes/scaffold-monorepo/` as recovery plan. CI rollback = remove `.github/workflows/ci.yml`. Dev seed is ephemeral against local/CI Postgres.

## Open Questions

- [ ] Drizzle `uniqueIndex` name must match `uq_animales_finca_codigo` exactly so `seed-v3.ts` (which references v3) stays compatible — confirm no `drizzle-kit` rename (low risk, design assumes verbatim name).
- [ ] Whether `event-drawer/formulario-vacuna.tsx` pulls any prop type from `@/components/ganado/types` not already covered — to verify at task time by reading the file end-to-end.
- [ ] Postgres service container is GH-hosted; confirm the VPS CI runner (if any) supports nested PG or if we scope the integration smoke to GH-hosted only.
- [ ] **`sexo`/`estado` column types**: design declares `text` (`sexo`, `estado_animal`) for ergonomic RN-001 fixtures, but source v3 SQL uses `sexo_key integer` (FK to a `sexo_enum` lookup table) and `estado` integer codes. Decision needed at task time: (a) keep `text` as a deliberate simplification this change and align with v3 in a later change (document here as decision), or (b) align now with `integer` + lookup FK. Default assumption: `text` simplification is accepted for `scaffold-monorepo` only; full v3 schema generation (D5) reverts to typed FKs.
- [ ] **Drizzle migration command**: `drizzle-kit push` (ephemeral, schema-pushed-on-the-fly — fine for local/CI ephemeral PG) vs `drizzle-kit migrate` (versioned SQL journal under `packages/db/migrations/`). Design assumes CI smoke uses `push` against ephemeral `postgres:17`, but proposes persist a versioned migration. Verify at task time whether the seed CI step runs `migrate` (versioned) or `push` (ephemeral) and pin the choice in `packages/db/package.json` `migrate` script.
- [ ] **TanStack Start `createServerFileRoute` API**: the `apps/web` design imports `createServerFileRoute` from `@tanstack/start/server`. Verify the import path + signature against the version pinned in `apps/web/package.json` at task time — the `@tanstack/start` API surface has moved across minor versions during its beta; if shape differs, adjust the health route to the documented factory (e.g. `createAPIFileRoute` or `createServerFn`) accordingly.