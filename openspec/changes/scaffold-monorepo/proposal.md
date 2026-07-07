# Proposal: Scaffold Monorepo (ganaweb foundation)

## Intent

There is NO source code in `ganaweb` yet — only planning docs, `schema_v3_corregido.sql`, `seed_v3.ts`, and a reference component library (`docs/ganaweb-componentes/`). Every downstream change (domain rules, use cases, sync, UI) is blocked until a buildable, tested, dependency-rule-enforced monorepo exists. This change closes the 100% gap between documentation and runnable code by scaffolding all 6 packages + `apps/web`, migrating the full component library, proving the TDD workflow with RN-001, and wiring a Postgres-only dev DB with seed — while explicitly deferring the offline/sync protocol and full domain model to follow-up changes.

## Scope

### In Scope
- **All 6 packages** (`dominio`, `aplicacion`, `db`, `sync`, `ui`, `config`) + `apps/web` + complete tooling (pnpm workspaces, Turborepo, Biome, Vitest, dependency-cruiser, GitHub Actions CI skeleton).
- **Online-first**: Postgres Drizzle driver only. No SQLite WASM / OPFS / `sync_outbox` / sync push-pull logic.
- **`packages/sync`**: stub — port interfaces DEFINED, no implementation.
- **`packages/aplicacion`**: stub — no use cases beyond RN-001 proof.
- **Component library migration**: ALL 13 reference components from `docs/ganaweb-componentes/ganaweb/src/` → `packages/ui` (globals.css tokens, `utils.ts`, all shadcn base dependencies, all `ganado/` components). `packages/ui` MUST be buildable as a package.
- **TDD proof-of-concept**: RN-001 (`uq_animales_finca_codigo` — código de animal único por finca) implemented as the first domain rule with full TDD (test first, then implementation). ONLY domain logic in this change.
- **Seed integration**: `seed_v3.ts` wired as dev/demo data script populating Postgres dev DB.
- **Minimal schema for RN-001**: `animales` + `fincas` tables (Drizzle) — enough to enforce RN-001. Full schema generation is a follow-up.

### Out of Scope
- SQLite WASM / OPFS / offline sync protocol (packages/sync = stub only).
- Full Drizzle schema generation from `schema_v3_corregido.sql` (follow-up change).
- Use cases beyond RN-001 proof (packages/aplicacion = stub only).
- Complete domain entity model (only Animal entity + RN-001; full model = follow-up).
- KPI queries / reports.
- E2E tests with Playwright (unit/integration only this change).

## Capabilities

### New Capabilities
- `monorepo-scaffold`: pnpm workspaces + Turborepo + Biome + shared tsconfig + dependency-cruiser rule enforcement + GitHub Actions CI skeleton. Root build/test/lint/typecheck commands work.
- `domain-animal`: `Animal` entity + RN-001 (código único por finca) as pure function with TDD test (≥90% coverage on this rule). Proves the TDD workflow for `packages/dominio` (zero deps).
- `db-schema-bootstrap`: Drizzle Postgres config + minimal `animales`/`fincas` schema for RN-001 + `seed_v3.ts` dev seed script. No SQLite driver.
- `ui-component-library`: `packages/ui` buildable package — migrated tokens (`globals.css`), `utils.ts` (`cn`), shadcn base components, all 13 `ganado/` components (EstadoBadge, AnimalCard, SyncPill, EventDrawer, FormularioVacuna, etc.).
- `sync-port-stub`: `packages/sync` defines the port interfaces (push/pull/conflict-resolver contracts) ONLY. No implementation. Consumed interface shape locked so future sync change doesn't ripple into `aplicacion`.
- `web-app-bootstrap`: `apps/web` minimal TanStack Start app with health-check route + boots against Postgres dev DB.
- `aplicacion-stub`: `packages/aplicacion` package stub with port interfaces defined; no concrete use cases (deferred).

### Modified Capabilities
- None. Greenfield — no existing specs in `openspec/specs/`.

## Approach

1. **Root config first** (PR 1): `pnpm-workspace.yaml` + root `package.json` + `turbo.json` + `biome.json` + `packages/config` (shared tsconfig, biome preset) + empty package stubs. Establishes the workspace graph before any code.
2. **Dependency rule enforcement**: `.dependency-cruiser.js` codifying `apps/web → aplicacion → dominio`; `ui → (no dominio)`; `aplicacion → db (via ports)` per ADR A1. CI fails on violation.
3. **Domain + TDD** (PR 2): `packages/dominio` — `Animal` entity types (Spanish names per T-003), `RN-001` pure function. Test written first (`describe('RN-001 código único por finca')` per TS-001), then implementation. Coverage gate active for `dominio`.
4. **DB bootstrap** (PR 3): `packages/db` — Drizzle Postgres config, minimal `animales`/`fincas` schema with `uq_animales_finca_codigo` constraint, seed script from `seed_v3.ts`.
5. **UI migration** (PR 4): `packages/ui` — copy `globals.css` tokens (Tailwind v4 `@theme inline`), `utils.ts`, add shadcn base deps, migrate all 13 `ganado/` components preserving Spanish domain vocabulary. Package builds (`tsup`/`tsc`) and exports.
6. **App + assembly** (PR 5): `apps/web` TanStack Start minimal app, health route, boots against seeded Postgres. CI skeleton: install → biome ci → typecheck → test → build.
7. **Stubs**: `packages/sync` and `packages/aplicacion` get port interface `.ts` files only (typed contracts, no logic).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `pnpm-workspace.yaml`, `package.json`, `turbo.json`, `biome.json` | New | Root monorepo config |
| `packages/config/` | New | Shared tsconfig base + biome preset |
| `packages/dominio/` | New | `Animal` entity + RN-001 pure fn + TDD test |
| `packages/aplicacion/` | New (stub) | Port interface contracts only |
| `packages/db/` | New | Drizzle PG config + minimal `animales`/`fincas` + seed script |
| `packages/sync/` | New (stub) | Port interfaces (push/pull/conflict) — no impl |
| `packages/ui/` | New | Migrated tokens, utils, shadcn base, 13 ganado components |
| `apps/web/` | New | TanStack Start minimal app + health route |
| `.dependency-cruiser.js` | New | Layer rule enforcement |
| `.github/workflows/ci.yml` | New | CI skeleton (install/lint/typecheck/test/build) |
| `openspec/specs/*/spec.md` | New | 7 new capability specs (created by sdd-spec) |

## Reference Rule IDs

| Rule | Type | Applies to |
|------|------|-----------|
| **RN-001** | Negocio | `packages/dominio` — código de animal único por finca (only domain rule implemented) |
| **T-003** | Técnica | Domain names in Spanish across `dominio`/`aplicacion`/`ui` |
| **T-004** | Técnica | No `dark:` variants in `packages/ui` — theming via CSS tokens only |
| **TS-001** | Testing | RN-001 test names its rule: `describe('RN-001 ...')` |
| **TS-003** | Testing | Fixtures from `seed_v3.ts`, not invented catalogs |
| **IA-003** | Infra/Arq | Reuse `packages/ui` components before creating new ones (migration preserves them) |
| **PE-001..004** | Permiso | Out of scope this change (no use cases) — port interfaces only |

## Chained PR Forecast (delivery_strategy: force-chained)

| PR | Title | Est. lines | Depends on | Key risk |
|----|-------|-----------|------------|----------|
| **PR 1** | `chore(root): pnpm + turbo + biome + config + empty package stubs` | ~250 | — | Build graph correctness |
| **PR 2** | `feat(dominio): Animal entity + RN-001 with TDD` | ~200 | PR 1 | TDD red-green discipline |
| **PR 3** | `feat(db): Drizzle PG config + minimal schema + seed_v3` | ~300 | PR 1, PR 2 | Drizzle PG dialect config |
| **PR 4** | `feat(ui): migrate 13 ganado components + tokens + utils` | ~700 | PR 1 | Shadcn dep resolution; token port |
| **PR 5** | `feat(web): TanStack Start minimal app + health route + CI skeleton` | ~250 | PR 1–4 | App boots against seeded PG |

Total review surface spread across 5 PRs to respect the 800-line review budget per PR. Each PR is independently mergeable after deps land.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Drizzle PG dialect config errors block seed | Med | Validate connection in PR 3 with a smoke test against ephemeral Postgres |
| shadcn base component version drift breaks `ganado/` migrations | Med | Pin all shadcn deps; copy base components verbatim from reference lib |
| TDD discipline slips under scaffolding pressure | Med | PR 2 review explicitly checks test-written-first (commit timestamps) |
| Dependency-rule violations sneak in via stub packages | Low | dependency-cruiser enforced in CI from PR 1 |
| Component library not buildable as a package | Med | PR 4 includes a `tsup`/`tsc` build step in CI; fail if `packages/ui` doesn't emit |
| Token migration breaks dark mode (T-004) | Low | Migrate `globals.css` verbatim; add token-presence assertion test |
| Scope creep into sync/schema/full domain | Med | This proposal explicitly lists non-goals; sdd-spec enforces via capability contracts |

## Rollback Plan

This is a greenfield scaffold — rollback is primarily revert-by-PR:
1. **Per-PR**: Each chained PR lands on its own branch; revert any single PR via `git revert <merge>` without touching upstream PRs (dependency-cruiser + Turbo ensure package isolation).
2. **Full rollback**: Delete the scaffolded packages/ and root config files; `openspec/changes/scaffold-monorepo/` proposal + specs are retained as the recovery plan. No production data exists yet (dev DB only), so no data migration rollback needed.
3. **Seed rollback**: `packages/db` seed is dev-only against ephemeral/local Postgres; drop the dev DB and re-run seed. No production seed.
4. **CI rollback**: `.github/workflows/ci.yml` is additive — removing the file restores prior state (no CI).

## Dependencies

- Node 22 LTS, pnpm ≥9 (per ADR stack version base).
- PostgreSQL 17 (local dev + CI Testcontainers for PR 3 smoke test).
- TanStack Start (latest stable) for PR 5.
- Drizzle ORM + `drizzle-kit` for PR 3.
- shadcn/ui CLI + `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` for PR 4.
- `@emuraweb` reference component library at `docs/ganaweb-componentes/ganaweb/src/` (source for PR 4 migration).
- `seed_v3.ts` and `schema_v3_corregido.sql` (source for PR 3 minimal schema).

## Success Criteria

- [ ] `pnpm install` + `pnpm turbo build` succeeds from clean clone on Node 22.
- [ ] `pnpm turbo test` passes with RN-001 test green (test written before implementation).
- [ ] Coverage on `packages/dominio` ≥ 90% (coverage gate active).
- [ ] `biome ci .` + `pnpm turbo typecheck` pass with zero errors.
- [ ] `dependency-cruiser` reports zero layer-rule violations.
- [ ] `packages/ui` builds and exports all 13 `ganado/` components.
- [ ] Seed script populates Postgres dev DB with `seed_v3.ts` data (smoke: ≥1 finca, ≥1 animal).
- [ ] `apps/web` health route (`/api/health`) returns 200 against seeded Postgres.
- [ ] `packages/sync` and `packages/aplicacion` contain ONLY port interface definitions (no logic) — enforced by spec review.
- [ ] GitHub Actions CI runs install → biome ci → typecheck → test → build on every PR.
- [ ] No source code references SQLite/wa-sqlite/OPFS (greppable guard for online-first scope).