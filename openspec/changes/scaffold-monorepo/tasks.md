# Tasks: Scaffold Monorepo (ganaweb foundation)

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Low

PR1 ~250 · PR2 ~200 · PR3 ~300 · PR4 ~700 · PR5 ~250 (max 700/800).

## PR 1

- [x] PR1.T1 Create `pnpm-workspace.yaml`, root `package.json` (engines node=22, pnpm≥9; scripts build/test/typecheck/lint/ci), `.nvmrc` (22), `turbo.json` (build^build, typecheck^build, test, lint, ci), `biome.json` extending `@ganaweb/config/biome-preset` (strict, no-any).
- [x] PR1.T2 Create `packages/config/{package.json,tsconfig.base.json,tsconfig.react.json,biome-preset.json}` shared strict tsconfig + Biome preset.
- [x] PR1.T3 Create empty stubs `packages/{dominio,aplicacion,db,sync,ui}/{package.json,tsconfig.json}` + `apps/web/{package.json,tsconfig.json}` with workspace:* deps per design.
- [x] PR1.T4 Create `.dependency-cruiser.js` (D3/D10 rules + no-sqlite regex: ui-to-dominio, web-to-dominio-direct, dominio-to-io, aplicacion-to-db, db-to-aplicacion-runtime type-only, sync-to-db).
- [x] PR1.T5 Create `.github/workflows/ci.yml` skeleton (install + biome ci only; full pipeline in PR5).

## PR 2 `packages/dominio`

- [x] PR2.T1 **[TDD-RED]** Write `tests/rn-001.test.ts` `describe('RN-001: código único por finca')` covering duplicate-same-finca, same-code-different-finca, empty-list, empty/whitespace-codigo. **Commit BEFORE impl.** Confirm RED via `pnpm --filter @ganaweb/dominio test`.
- [x] PR2.T2 **[TDD-GREEN]** Create `src/animal.ts` (Sexo/EstadoAnimal/Salud, AnimalResumen) and `src/rn-001.ts` with `ResultadoValidacion` tagged union (D4) + pure `validarCodigoUnicoPorFinca`.
- [x] PR2.T3 **[TDD-GREEN]** Add `src/index.ts` barrel; `vitest.config.ts` v8 coverage threshold 90% on `./src`.
- [x] PR2.T4 **[TDD-REFACTOR]** Coverage ≥90% lines; add missing edge cases.

## PR 3 `packages/db`

- [x] PR3.T1 Create `packages/db/{package.json,tsconfig.json}` deps `drizzle-orm`,`drizzle-kit`,`postgres`,`tsx`,`dotenv`; `drizzle.config.ts` (dialect:'postgresql', DATABASE_URL).
- [x] PR3.T2 Create `src/client.ts` (factory + lazy `db` Proxy), `src/schema/fincas.ts`, `src/schema/animales.ts` with `uniqueIndex('uq_animales_finca_codigo').on(t.fincaId, t.codigo)` (D5; sexo/estadoAnimal as text), and `src/schema/index.ts` typed re-exports.
- [x] PR3.T3 Create `src/seed/seed-v3.ts` (onConflictDoNothing, inserts ONLY 2 fincas finca-esperanza/GAN001 + finca-roble/GAN002 per D11, zero animales); generate initial migration via `drizzle-kit generate`.
- [x] PR3.T4 **[TDD]** Add `tests/duplicate-insert.test.ts` (DB_SMOKE=true): duplicate `(fincaId,codigo)` insert throws (TS-004).

## PR 4 `packages/ui`

- [ ] PR4.T1 Create `packages/ui/{package.json,tsconfig.json}` deps cva/clsx/tailwind-merge/lucide-react/@radix-ui/*; peerDeps react/react-dom/tailwindcss; `tsup.config.ts` (format:['esm'], dts:true).
- [ ] PR4.T2 Migrate `src/styles/globals.css` verbatim (Tailwind v4 @theme inline; .dark block kept; T-004) and `src/lib/utils.ts` (cn()).
- [ ] PR4.T3 Vendor 8 shadcn primitives into `src/primitives/` (button/input/label/select/drawer/dropdown-menu/alert-dialog/collapsible) per D1.
- [ ] PR4.T4 Migrate all 13 `ganado/` components (10 top-level + event-drawer/{index,formulario-vacuna} + types.ts); rewrite imports `@/lib/utils`→`../lib/utils`, `@/components/ui/*`→`../primitives/*`.
- [ ] PR4.T5 Create `src/index.ts` barrel and `tests/tokens.test.ts` asserting --color-primary/--color-background/--color-ring present and dark: count === 0 in src/** (T-004).

## PR 5 `apps/web`

- [ ] PR5.T1 Create `apps/web/{package.json,tsconfig.json,vite.config.ts,app.config.ts}` with @tanstack/start+vinxi; deps aplicacion,ui,db (NOT dominio); routes __root.tsx + index.tsx (AnimalCard/SyncPill/EstadoBadge from @ganaweb/ui).
- [ ] PR5.T2 Create `src/routes/api/health.ts` (D8): `db.execute('SELECT 1')` → 200/db:"ok" or 503/db:"error". Verify TanStack Start import path.
- [ ] PR5.T3 Create `packages/sync/src/{index.ts,push-port.ts,pull-port.ts,conflict-resolver-port.ts}` interfaces only (D6); RN-061 LWW + severity in ConflictResolverPort.
- [ ] PR5.T4 Create `packages/aplicacion/src/{index.ts,puertos/{animal-repository-port,reloj-del-sistema-port,outbox-port}.ts}` (T-003 Spanish); EventoOutbox shape compatible with sync push.
- [ ] PR5.T5 Create `apps/web/scripts/health-check.mjs` and `scripts/check-coverage.mjs`; activate full CI: install → biome ci → turbo typecheck → turbo test --coverage → turbo build → dependency-cruise → coverage gate → no-sqlite grep → migrate+seed+health-check (postgres:17 service).

## Verification

Deps: PR2→PR1, PR3→PR1+PR2, PR4→PR1, PR5→PR1–PR4. TDD: PR2.T1 precedes PR2.T2-T4. Stubs (PR5.T3/T4) ship with PR5.

Verify: `biome ci .` · `turbo typecheck` · `turbo test` · coverage gate (dominio ≥90%) · `turbo build` · `dependency-cruise .` · no-SQLite grep · `node apps/web/scripts/health-check.mjs`.
