# PR1 Verify Report — `scaffold-monorepo` (ganaweb)

**PR**: PR1 of 5 (root config + config package + stubs + dep-cruiser + CI skeleton)
**Branch**: `chore/scaffold-pr1-root-config` (stacked on master)
**Mode**: Standard (Strict TDD is on, but PR1 is config/scaffolding — no domain logic; TDD does not apply)
**Test runner present**: yes (Vitest 2.1.9, dependency-cruiser 16.10.3, biome 1.9.4, turbo 2.10.4)
**Verify date**: 2026-07-07

---

## Executive Summary

PR1 establishes the monorepo foundation: pnpm workspace, Turborepo pipelines, shared strict tsconfig + Biome preset, 7 workspace package stubs, dependency-cruiser layer rules, and a CI workflow skeleton. **5 of 5 tasks complete.** Verification surface mostly green — `pnpm install` ✓, `pnpm turbo build` (7/7) ✓, `pnpm turbo typecheck` (13/13) ✓, `biome ci .` (21 files, 0 errors) ✓, `dependency-cruiser .` (0 errors, 43 warnings on `docs/` only) ✓, `.github/workflows/ci.yml` valid YAML ✓, `pnpm no-sqlite` ✓.

**ONE CRITICAL bug discovered**: `pnpm turbo test` (and the `ci` pipeline that depends on it) **fails** because `packages/dominio/scripts.test` is `vitest run`, which exits 1 when no test files exist. This blocks Req 2's `test` pipeline and will break the full CI in PR5 unless fixed (e.g., `vitest run --passWithNoTests`). This was missed by the apply-progress verification, which did not run `pnpm turbo test`.

**Verdict**: **FAIL** — one CRITICAL bug, must be fixed before PR1 can be merged.

---

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total (PR1) | 5 |
| Tasks complete | 5 (PR1.T1–T5 all `[x]`) |
| Tasks incomplete | 0 |
| Commits on branch | 8 (all work-unit conventional commits) |
| Work surface (excl. `pnpm-lock.yaml` + `openspec/`) | 25 files, +608 LOC — within 800-line review budget |

---

## Build & Tests Execution

**Install**: ✅ Passed
```text
$ pnpm install
Scope: all 8 workspace projects
Lockfile is up to date, resolution step is skipped
Already up to date
Done in 1.9s
WARN  Unsupported engine: wanted: {"node":"22"} (current: {"node":"v24.18.0","pnpm":"9.12.0"})
```
Workspace resolves all 7 declared packages (`@ganaweb/{config,dominio,aplicacion,db,sync,ui}`) + `@ganaweb/web`. Engine warning is informational (env has Node 24, project requires Node 22 — pnpm allows, doesn't fail).

**Build**: ✅ Passed — 7/7 packages, cache stable
```text
$ pnpm turbo build
Tasks: 7 successful, 7 total
Cached: 7 cached, 7 total
Time: 48ms >>> FULL TURBO
```
Second run is FULL TURBO (all cached) → cache keys are stable, satisfies Req 2 scenario.

**Typecheck**: ✅ Passed — 13/13 tasks
```text
$ pnpm turbo typecheck
Tasks: 13 successful, 13 total
Cached: 13 cached, 13 total
Time: 76ms >>> FULL TURBO
```

**Lint (Biome)**: ✅ Passed
```text
$ pnpm exec biome ci .
Checked 21 files in 142ms. No fixes applied.
```

**Dependency cruiser**: ✅ Passed (0 errors)
```text
$ pnpm exec dependency-cruiser .
x 43 dependency violations (0 errors, 43 warnings). 32 modules, 43 dependencies cruised.
```
All 43 warnings are `not-in-allowed` in `docs/ganaweb-componentes/**` and `docs/seed_v3.ts` (reference code that will be migrated out in PR4). The new monorepo packages produce 0 violations.

**CI YAML**: ✅ Valid
```text
$ python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"
# parsed successfully → 5 steps, 1 job, valid triggers
```

**No-SQLite guard**: ✅ Passed
```text
$ pnpm no-sqlite
# exit 0, no wa-sqlite/OPFS/sqlite-wasm/sql.js references in packages/ or apps/
```

**Test pipeline**: ❌ **CRITICAL FAIL**
```text
$ pnpm turbo test
@ganaweb/dominio:test: > vitest run
@ganaweb/dominio:test: No test files found, exiting with code 1
@ganaweb/dominio:test:  ELIFECYCLE  Test failed.
Failed: @ganaweb/dominio#test
ERROR  run failed
```
`packages/dominio/scripts.test` is `"vitest run"`. With no test files in PR1, vitest exits 1. This also breaks `pnpm turbo ci` (which has `dependsOn: ["build", "typecheck", "test", "lint"]`).

**Coverage**: ➖ N/A — `pnpm turbo test` fails; `vitest run --coverage` is only configured for dominio and has no source to cover in PR1. (Coverage gate is a PR2/PR5 concern per design D7.)

---

## Spec Compliance Matrix

| Req | Scenario | Verification | Result |
|-----|----------|--------------|--------|
| **R1: Workspace definition** | Clean clone boots → `pnpm install` succeeds, `pnpm turbo build` runs | Install OK; `pnpm turbo build` 7/7 OK | ✅ COMPLIANT |
| **R2: Turborepo task graph** | `pnpm turbo build` runs → dominio builds before aplicacion, cache stable across CI | `turbo build --dry-run=json` confirms `aplicacion#build` deps = `[config, dominio, sync]` (dominio first); second `turbo build` returns `FULL TURBO` (all cached) | ✅ COMPLIANT for `build` |
| **R2: test pipeline** | `test` pipeline defined with correct deps | Pipeline defined in turbo.json, **but `pnpm turbo test` fails** because `dominio#test` (`vitest run`) exits 1 on empty test set | ❌ **CRITICAL FAIL** |
| **R3: Shared config package** | New package extending `tsconfig.base.json` uses same strict rules; `biome ci .` enforces preset | `tsconfig.base.json` strict (noImplicitAny, all strict flags, exactOptionalPropertyTypes, noUncheckedIndexedAccess); `biome ci .` 0 errors; extends @ganaweb/config/biome-preset in root `biome.json` | ✅ COMPLIANT |
| **R4: Dependency rule enforcement** | `ui` → `dominio` import fails dep-cruiser; layer rules in CI | `.dependency-cruiser.js` has all 6 layer rules: `ui-to-dominio`, `web-to-dominio-direct`, `dominio-to-io`, `aplicacion-to-db`, `db-to-aplicacion-runtime` (with `viaNot: ['type-only']` — D10 port-inversion), `sync-to-db`. `pnpm exec dependency-cruiser .` returns 0 errors. Static analysis of rules confirms D10 semantics. | ✅ COMPLIANT (with design deviation on `no-sqlite` — see WARNING) |
| **R5: CI skeleton** | PR opened → all 5 steps pass | PR1 CI skeleton only runs 2 of 5 steps (`install` + `biome ci`); `typecheck`/`test`/`build` deferred to PR5. This is explicitly acknowledged in tasks.md PR1.T5 and design.md CI design. | ⚠️ PARTIAL (PR-bounded; non-blocking for PR1 but the `test` step that IS planned for PR5 is currently broken — see CRITICAL above) |

**Compliance summary**: 4/6 fully compliant, 1/6 partial, 1/6 critical failure.

---

## Correctness (Static Evidence)

| Requirement | Status | Notes |
|-------------|--------|-------|
| `pnpm-workspace.yaml` declares `apps/*` + `packages/*` | ✅ Implemented | Matches design exactly (3 lines) |
| Root `package.json` engines node=22, pnpm>=9 | ✅ Implemented | engines present; `packageManager: pnpm@9.12.0` pinned |
| Root `package.json` scripts: build/test/typecheck/lint/ci | ✅ Implemented | All present + extras (`depcruise`, `no-sqlite`, `format`) |
| `turbo.json` pipelines with `^build` for `build` & `typecheck` | ✅ Implemented | `build.dependsOn: ["^build"]`, `typecheck.dependsOn: ["^build"]` |
| `turbo.json` defines `test`, `lint`, `ci` pipelines | ✅ Implemented | `ci.dependsOn: [build, typecheck, test, lint]` |
| Topological order: dominio before aplicacion | ✅ Implemented | `aplicacion#build` deps = `[config, dominio, sync]` (per `turbo build --dry-run=json`) |
| `biome.json` extends `@ganaweb/config/biome-preset` | ✅ Implemented | Single line extension; preset has `noExplicitAny: "error"`, strict style |
| `packages/config/tsconfig.base.json` strict | ✅ Implemented | strict + noImplicitAny + strictNullChecks + exactOptionalPropertyTypes + noUncheckedIndexedAccess + all strict flags |
| `packages/config/tsconfig.react.json` extends base + JSX | ✅ Implemented | extends base; jsx: react-jsx; adds DOM/DOM.Iterable |
| `packages/config/biome-preset.json` | ✅ Implemented | has files.ignore (incl. docs/** for PR1), linter rules (noExplicitAny: error), formatter config |
| 6 package stubs + apps/web have package.json + tsconfig.json | ✅ Implemented | All 7 packages verified; each tsconfig extends config base (or react for ui/web) |
| `.dependency-cruiser.js` D10 port-inversion (db→aplicacion type-only) | ✅ Implemented | `db-to-aplicacion-runtime` rule has `viaNot: ['type-only']` |
| `.dependency-cruiser.js` no-sqlite rule | ⚠️ MISSING from dep-cruiser | Replaced by separate `pnpm no-sqlite` shell script — see WARNING |
| `.github/workflows/ci.yml` valid YAML, install + biome ci steps | ✅ Implemented | Valid YAML; 5 steps; triggers on push to master + PR |
| `pnpm install` resolves all 6 packages + apps/web | ✅ Implemented | 8 workspace projects resolved |

---

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| D3 — dep-cruiser with layer-rules + no-sqlite | ⚠️ Partial | Layer rules ✅; no-sqlite dep-cruiser rule dropped, replaced by `pnpm no-sqlite` grep. The grep covers source literals (wa-sqlite/OPFS/sqlite-wasm/sql.js) which dep-cruiser cannot see. Functionally equivalent. |
| D7 — dominio-only coverage gate | ➖ Deferred | Coverage gate logic lives in PR5 (no test in PR1 anyway). No conflict. |
| D9 — TanStack Start web | ➖ Deferred | `apps/web` exists as stub; actual TanStack Start code in PR5 |
| D10 — Port-inversion (db→aplicacion type-only) | ✅ Yes | Forbidden rule has `viaNot: ['type-only']` |
| Drizzle PG only, no SQLite | ✅ Yes | `pnpm no-sqlite` passes; `db` package deps are `aplicacion` + `config` only |

---

## TDD Compliance (Strict TDD is on, but inapplicable to PR1)

| Check | Result | Details |
|-------|--------|---------|
| TDD evidence reported | ➖ N/A | PR1 is config/scaffolding; no domain logic to TDD |
| Tests exist for tasks | ➖ N/A | Apply-progress correctly notes "Standard (no TDD — PR1 is config/scaffolding; strict_tdd mode is active but only applies to domain logic in PR2+)" |
| RED/GREEN cycles | ➖ N/A | PR2+ |

---

## Issues Found

### CRITICAL

**C1. `pnpm turbo test` (and `pnpm turbo ci`) fail on PR1**
- **Where**: `packages/dominio/package.json` line 11 — `"test": "vitest run"`
- **Symptom**: `vitest run` exits 1 with "No test files found" when `tests/` is empty (PR1 has no domain tests). Turbo propagates the failure.
- **Impact**:
  - Breaks Spec Req 2 (Turborepo task graph defines a working `test` pipeline).
  - Will break the full CI in PR5 — the design's Req 5 scenario calls `pnpm turbo test` as step 4 of 5.
  - Blocks `pnpm turbo ci` (depends on test) — `pnpm ci` at root will fail today.
  - Blocks merge if anyone runs `pnpm ci` or `pnpm turbo test` locally.
- **Why apply-progress missed it**: The PR1 verification list was: `install · turbo build · turbo typecheck · biome ci · dep-cruiser · YAML CI valid`. `pnpm turbo test` was not exercised. Verification surface was incomplete.
- **Fix (1 line)**: change to `"vitest run --passWithNoTests"`. (Vitest 2.x supports this flag — it exits 0 when no test files match, which is the right behavior for an empty stub.) PR2 will then write the first test and the script will start exiting 0 via the normal path.

### WARNING

**W1. `packages/config/tsconfig.json` is an extra file not in PR1.T2 spec**
- **Spec says**: `packages/config/{package.json,tsconfig.base.json,tsconfig.react.json,biome-preset.json}` (4 files)
- **Implementation has**: 5 files (the 4 above + a `tsconfig.json` consuming the base with `include: ["**/*.json"]`)
- **Why it exists**: `packages/config` has no `src/`, so `tsc --noEmit` on a `tsconfig.json` extending the base would fail with TS18003 (no input files). The implementer added a self-referential tsconfig to make `turbo typecheck` pass.
- **Why this matters**: The spec's file list is the contract; the extra file is a silent deviation. It's defensible (necessary to make the typecheck pipeline work for the config package), but it should either (a) be explicitly added to the spec for PR2+ review, or (b) be replaced with a `find`/`grep` shell-conditional like the other packages use, so the file count matches spec.
- **Severity**: WARNING — non-blocking, the file is small (8 lines) and harmless.

**W2. dep-cruiser `no-sqlite` rule missing — replaced by shell-script grep**
- **Design spec (D3)**: dep-cruiser config has a `no-sqlite` rule (`{ name: 'no-sqlite', from: {}, to: { path: 'node:.*|$', ... } }`) plus a grep backstop.
- **Implementation**: dep-cruiser has no `no-sqlite` rule. The grep backstop is wired as a `pnpm no-sqlite` script in root `package.json`. The CI design (PR5) uses the grep, so the dep-cruiser rule was redundant in practice.
- **Note**: The design's dep-cruiser `no-sqlite` rule looked syntactically suspect (`path: 'node:.*|$'` is ambiguous in dep-cruiser's path language). Dropping it is reasonable.
- **Severity**: WARNING — design deviation, but functionally equivalent (grep catches what dep-cruiser would have). PR5 should add this back as a dep-cruiser rule if the team wants a single-source check, or update design.md to reflect the chosen mechanism.

### SUGGESTION

**S1. PR1 CI skeleton only covers 2 of 5 spec Req 5 steps**
- The full CI (`install → biome ci → typecheck → test → build → depcruise → coverage gate → no-sqlite → migrate/seed/health`) lands in PR5.
- This is explicitly PR-bounded (PR1.T5 says "skeleton (install + biome ci only; full pipeline in PR5)").
- Non-blocking for PR1, but means Req 5's "PR gate is green" scenario is not yet fully verifiable. When PR5 lands, it MUST verify the full pipeline, including the `pnpm turbo test` step that is currently broken (see C1).

**S2. Apply-progress verification surface was incomplete**
- The PR1 verify list omitted `pnpm turbo test` and `pnpm turbo ci`. This allowed C1 to slip through. Future PRs (especially PR2, which adds the first test) should run the full `turbo test` AND `turbo ci` in their verify step, not just `turbo build`/`typecheck`.

**S3. Engine warning on `pnpm install`**
- `WARN Unsupported engine: wanted: {"node":"22"} (current: {"node":"v24.18.0"})`. Not a failure (pnpm allows it), but CI uses Node 22 and the `.nvmrc` is "22" — local development on Node 24 will see this warning. Consider adding `engineStrict: true` to the root `package.json` if the team wants CI-env parity enforced.

---

## Verdict

**FAIL** — one CRITICAL bug (C1: `pnpm turbo test` fails) must be fixed before PR1 can merge. Estimated fix: 1 line change in `packages/dominio/package.json` (`"vitest run --passWithNoTests"`).

After the fix, the verdict becomes **PASS WITH WARNINGS**:
- W1 (extra `packages/config/tsconfig.json`) — non-blocking, but should be acknowledged.
- W2 (no-sqlite dep-cruiser rule dropped) — non-blocking, can be resolved in PR5.

---

## Verification Commands Run

| Command | Result |
|---------|--------|
| `pnpm install` | ✅ 8 projects resolved, lockfile current |
| `pnpm turbo build` | ✅ 7/7 success, 7/7 cached on rerun (stable cache) |
| `pnpm turbo build --dry-run=json` | ✅ Confirms `aplicacion#build` depends on `dominio` (topology correct) |
| `pnpm turbo typecheck` | ✅ 13/13 success |
| `pnpm turbo lint` | ✅ 7/7 success |
| `pnpm turbo test` | ❌ **FAILS** — `@ganaweb/dominio#test` exits 1 |
| `pnpm turbo ci` | ❌ **FAILS** — depends on test |
| `pnpm exec biome ci .` | ✅ 21 files, 0 errors |
| `pnpm exec dependency-cruiser .` | ✅ 0 errors, 43 warnings (all in `docs/`) |
| `pnpm no-sqlite` | ✅ 0 violations |
| `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"` | ✅ Valid YAML |
| `git diff master..chore/scaffold-pr1-root-config --stat` | ✅ 25 files, +608 LOC (within 800-line budget) |

---

## Artifacts

- `openspec/changes/scaffold-monorepo/verify-pr1.md` (this file)
- Engram observation: `sdd/scaffold-monorepo/verify-pr1`

---

## Next Steps

1. **Fix C1**: change `packages/dominio/package.json` line 11 to `"test": "vitest run --passWithNoTests"`.
2. Commit the fix as a follow-up on the same branch (e.g., `chore(dominio): pass-with-no-tests for empty PR1 stub`).
3. Re-run `pnpm turbo test` and `pnpm turbo ci` to confirm green.
4. Push branch and open PR1 for review (only after fix).
5. After PR1 merges, proceed to PR2 (`packages/dominio` with TDD-RED for RN-001).
