# Archive Report: node-24-lts-migration

| Field | Value |
|---|---|
| Change | `node-24-lts-migration` |
| Status | `archived` (final) |
| Archived at | 2026-07-13T18:09:00Z (post-merge archive move) |
| Author | sdd-propose-go-ai (proposal) · lrodriguezn (apply + verify) |
| Archiver | sdd-archive-go-ai |
| Project | ganaweb (control ganadero bovino, Colombia) |
| Artifact store | openspec (filesystem) |
| Delivery strategy | single-pr |
| Review budget | 800 lines (actual: 19 files, 389 insertions, 14 deletions) |
| Session ID | `sdd-node-24-lts-migration` |
| Native review gate | paused by maintainer decision (no native review transaction; manual verification only) |

---

## Summary

This change promotes the monorepo's Node runtime floor from Node 22 to Node 24 LTS, and adds a governance gate that prevents `@types/node` from drifting from the declared `engines.node` major. The driver motivation was a persistent cosmetic warning: the team has been running `v24.18.0` locally for months, but the repo, CI, and `openspec/specs/monorepo/spec.md` all still declared Node 22 — producing `Unsupported engine` warnings on every `pnpm install` and an out-of-date spec against de facto reality. The change chose "promote de facto to de jure" over a local downgrade.

The before/after split is mechanical on the surface, but the design pairs the runtime bump with a parity check that hardens against the same drift recurring. Before this change, no automated check enforced that `@types/node` matched `engines.node` — the warning was the only signal. After this change, `scripts/check-node-types-parity.mjs` (exposed as `pnpm parity:node-types` and wired into CI between `Install dependencies` and `Biome CI`) reads the root `engines.node` major, walks every workspace `package.json`, and fails the build if any `@types/node` range starts with anything other than `^24`. The script is itself tested with three vitest cases against fixture roots covering the matching, drifting, and root-only paths.

Source code, layer rules, and the dependency graph were intentionally out of scope. The substantive PR diff is 19 files / 389 insertions / 14 deletions — well under the 800-line review budget. The lockfile delta (65 insertions, 62 deletions) is generated content and is treated as separate from the review count. No production code, no business logic, no domain rules changed. The change is a tooling/governance shift, not a feature.

---

## Pipeline trace

| Phase | Skill | Outcome | Artifact |
|---|---|---|---|
| 1. Propose | `sdd-propose-go-ai` | PASS — 5 goals, 6 non-goals, approach recorded | `openspec/changes/node-24-lts-migration/proposal.md` |
| 2. Spec | `sdd-spec-go-ai` | PASS — 1 MODIFIED + 1 ADDED requirement, 3 scenarios | `openspec/changes/node-24-lts-migration/specs/monorepo/spec.md` |
| 3. Design | `sdd-design-go-ai` | PASS — TDD-first, 2 follow-up notes recorded | `openspec/changes/node-24-lts-migration/design.md` |
| 4. Tasks | `sdd-tasks-go-ai` | PASS — 8 commit work units + 2 follow-up slots | `openspec/changes/node-24-lts-migration/tasks.md` |
| 5. Apply | `sdd-apply-go-ai` | PASS — 11 substantive commits, Strict TDD red→green→refactor | `openspec/changes/node-24-lts-migration/apply-progress.md` |
| 6. Verify | `sdd-verify-go-ai` | PASS — 9/9 gate commands, 3/3 TDD tests, post-merge clean | `openspec/changes/node-24-lts-migration/verify-report.md` |
| 7. Archive | `sdd-archive-go-ai` | PASS — ADDED requirement synced to main spec; folder moved | `openspec/changes/archive/2026-07-13-node-24-lts-migration/` (this folder) |

---

## Spec deltas applied

The verify phase confirmed `MODIFIED Requirement 1` was already in the main spec (apply phase committed it directly as `e7b765a spec(monorepo): bump node 22 to node 24 lts`). The archive phase's responsibility was to sync the `ADDED Requirement` that lived only in the delta spec.

| Delta element | Main spec status (pre-archive) | Main spec status (post-archive) | Notes |
|---|---|---|---|
| MODIFIED Requirement 1: Workspace definition — "Node 22" → "Node 24 LTS" | ✅ Present (`openspec/specs/monorepo/spec.md:11`, applied at `e7b765a`) | ✅ Present (unchanged) | Apply phase committed this directly to the main spec |
| ADDED Requirement 6: TypeScript Node types major-version parity | ❌ Missing (only in delta spec) | ✅ Present (added as `### Requirement 6` at end of `## Requirements`) | Archive-phase commit `bbc6ee6` — text and scenarios verbatim from delta spec |

The new Requirement 6 is appended after Requirement 5 in `openspec/specs/monorepo/spec.md` to preserve the original 1–5 numbering. Body text and both `#### Scenario:` blocks were copied verbatim from the delta spec per OpenSpec convention; only the heading was renumbered to `### Requirement 6:` to match the local convention (existing main spec uses `### Requirement N: <title>` rather than `### Requirement: <title>`).

---

## PRs and commits

| # | SHA | Subject | Role |
|---|---|---|---|
| — | [`82f9bbf`](https://github.com/lrodriguezn/ganaweb/commit/82f9bbf) | `test(scripts): add failing parity check test + fixture` | TDD RED — tests + fixtures, script intentionally absent |
| — | [`57d8636`](https://github.com/lrodriguezn/ganaweb/commit/57d8636) | `feat(scripts): add node-types parity check` | TDD GREEN — `scripts/check-node-types-parity.mjs` (176 lines), 3/3 tests pass |
| — | [`80a0f2f`](https://github.com/lrodriguezn/ganaweb/commit/80a0f2f) | `chore(lockfile): regenerate for node 24` | root `@types/node` bump + lockfile regen, `argon2` prebuild verified on Node 24.18.0 |
| — | [`acacc27`](https://github.com/lrodriguezn/ganaweb/commit/acacc27) | `chore(ci): bump node-version to 24` | `.github/workflows/ci.yml:49` `node-version: 24` |
| — | [`d3e8cdf`](https://github.com/lrodriguezn/ganaweb/commit/d3e8cdf) | `chore(root): declare node 24` | `.nvmrc: 24` + root `engines.node: "24"` + root `@types/node: ^24.13.0` |
| — | [`563c276`](https://github.com/lrodriguezn/ganaweb/commit/563c276) | `chore(packages): bump @types/node in 4 packages` | `apps/web`, `packages/{dominio,db,ui}` → `@types/node: ^24.13.0` |
| — | [`1b9337b`](https://github.com/lrodriguezn/ganaweb/commit/1b9337b) | `docs(node): update node 24 mentions` | `README.md` (3 lines) + `docs/especificaciones_tecnicas.md` (line 36) |
| — | [`e7b765a`](https://github.com/lrodriguezn/ganaweb/commit/e7b765a) | `spec(monorepo): bump node 22 to node 24 lts` | Main spec Requirement 1 reads "Node 24 LTS" |
| — | [`bb0042e`](https://github.com/lrodriguezn/ganaweb/commit/bb0042e) | `ci: wire parity check` | `ci.yml:55-56` new step "Node-types parity check" after install, before Biome |
| — | [`45a5615`](https://github.com/lrodriguezn/ganaweb/commit/45a5615) | `refactor(scripts): reduce parity script cognitive complexity` | biome `noExcessiveCognitiveComplexity` cleanup, 3/3 tests still pass (deviation from plan: 1 of 2 follow-ups) |
| — | [`f472cd8`](https://github.com/lrodriguezn/ganaweb/commit/f472cd8) | `chore(repo): biome-format vitest config + gitignore test-results` | hygiene: vitest config formatting + `test-results/` gitignore (deviation from plan: 2 of 2 follow-ups) |
| — | `0652f91` | `Merge pull request #41 from lrodriguezn/feat/node-24-lts-migration` | merge commit |

**PR**: [#41 — chore(deps): migrate runtime base from node 22 to node 24 lts](https://github.com/lrodriguezn/ganaweb/pull/41) — MERGED 2026-07-13T15:59:04Z into `master`. 11 substantive commits + 1 merge commit (planned 8 + 2 follow-ups, actual 11 = 9 work units + 2 follow-ups; both follow-ups transparently documented in `apply-progress.md` as work surfaced by the gate).

---

## Verification evidence

The 9-command post-merge verification gate ran on local `master` at `0652f91` and re-ran identically on the archive move commit. Every command exited 0.

| # | Command | Exit | Last lines | Pass |
|---|---|---|---|---|
| 1 | `node --version` | 0 | `v24.18.0` | ✅ |
| 2 | `pnpm install --frozen-lockfile` | 0 | `Lockfile is up to date / Already up to date / Done in 4.4s` | ✅ |
| 3 | `pnpm exec biome ci .` | 0 | `Checked 189 files in 547ms. No fixes applied.` | ✅ |
| 4 | `pnpm turbo typecheck` | 0 | `Tasks: 13 successful, 13 total / FULL TURBO` | ✅ |
| 5 | `pnpm turbo test` | 0 | `Tasks: 13 successful, 13 total / FULL TURBO` (dominio: 23/23 tests) | ✅ |
| 5b | `pnpm --filter @ganaweb/dominio exec vitest run --coverage` | 0 | `23 passed / All files 100% statements / 100% branch / 100% funcs / 100% lines` | ✅ |
| 6 | `pnpm exec dependency-cruiser .` | 0 | `x 48 dependency violations (0 errors, 48 warnings). 197 modules, 490 dependencies cruised.` | ✅ |
| 7 | `pnpm run no-sqlite` | 0 | (no `SQLite reference detected`) | ✅ |
| 8 | `pnpm parity:node-types` | 0 | `[check-node-types-parity] OK — 4 workspace(s) checked, all @types/node ranges match engines.node ^24.` | ✅ |
| 9 | `pnpm --filter @ganaweb/web build` | 0 | `dist/server/server.js 226.07 kB / dist/server/assets/index-xuD2zACx.js 445.54 kB / ✓ built in 4.96s` | ✅ |

**Gate result**: 9/9 PASS. Verdict: PASS (no CRITICAL findings, no blockers).

---

## TDD evidence

The parity script is the only TDD work unit in this change (the rest is mechanical runtime/type/ci bumps). The red→green→refactor cycle is intact in git history.

| Phase | Commit | Test state | Evidence |
|---|---|---|---|
| RED | `82f9bbf` | 3/3 tests fail with ENOENT (script not yet created) | `git show 82f9bbf --stat` lists test + fixtures + vitest config, NO `scripts/check-node-types-parity.mjs` |
| GREEN | `57d8636` | 3/3 tests pass | `pnpm exec vitest run tests/check-node-types-parity.test.ts` → `Test Files 1 passed / Tests 3 passed (3)` |
| REFACTOR | `45a5615` | 3/3 tests still pass | biome `noExcessiveCognitiveComplexity` clean, behavior unchanged |

**Triangulation**: 3 tests for 3 spec scenarios — `(1) matching ranges pass / (2) drifting range fails with file name in stderr / (3) root-only repo (no apps/ or packages/) passes`. Test (2) forces the script to actually read the range and compare (a "Fake It" `process.exit(0)` would pass test 1 but fail test 2). Test (3) forces explicit handling of the no-workspaces path (a "Fake It" returning `[]` would still pass tests 1+2 but fail test 3). Mock-to-assertion ratio: 0 mocks, 4 assertions — well under the 2× warning threshold.

**Coverage on the parity script**: not measured (the script is a CLI gate, not a library; its behavior is exercised via 3 subprocess tests + 1 live-on-repo gate run). The `@ganaweb/dominio` coverage gate (≥ 90% v8) was unaffected by this change; verified by gate 5b at 100% lines/branches/funcs/stmts on tested files.

---

## Risks / notes carried forward

All of the following are **non-blocking** and predate (or are transparently documented side effects of) this change. None require a follow-up PR for this change to be considered complete.

1. **Pre-existing `dependency-cruiser` warnings (48, 0 errors)** — all in `apps/web/src/{routes,server}`. The same warnings have been flagged in 5+ prior SDD verify-reports. Out of scope for a runtime-bump change. Future change.
2. **`pnpm install` deprecation warnings** on `@esbuild-kit/core-utils@3.3.2`, `@esbuild-kit/esm-loader@2.6.5`, `glob@10.5.0` — pre-existing transitive dependencies of drizzle-kit's prebuild tooling. No resolution path on this change.
3. **Turbo "no output files found" warnings** for `@ganaweb/{aplicacion,config,sync,ui,web}#test` — pre-existing; these packages do not yet produce test outputs to cache.
4. **`vitest` added to root `devDependencies`** (commit `82f9bbf`, lockfile line: `vitest: specifier: ^3.2.6, version: 3.2.7`). Required to run the TDD test at the repo root via `pnpm exec vitest run tests/check-node-types-parity.test.ts`. The maintainer may relocate the test to a specific workspace in a follow-up; the script and `pnpm parity:node-types` entry stay. Documented in `apply-progress.md` as a transparent trade-off.
5. **Historical exploration record** at `openspec/changes/exploracion-inicial/exploration.md:157` still says "Node 22 LTS" — intentionally untouched (audit-trail immutability).
6. **The 2 follow-up commits** (`45a5615` refactor, `f472cd8` hygiene) are deviations from the original 8-commit plan. They are surfaced honestly in the PR diff rather than amended in; per `work-unit-commits` "no amend" rule, each is a separate commit so the review history is auditable. Net effect: 9 work units + 2 hygiene commits, all transparently documented.
7. **Native review gate remains paused** by maintainer decision. The manual verify-report supersedes the native receipt; this archive intentionally does not trigger `gentle-ai review start` and does not produce a native review transaction. Same posture as the precedent `2026-07-13-add-animals-crud-flow` archive.

---

## Follow-ups

**None required by this change.** The SDD cycle for `node-24-lts-migration` is complete: proposed, specified, designed, tasked, applied, verified, archived. The change is closed.

Optional future work that is **not** part of this change's lifecycle:

- Address the 48 pre-existing `dependency-cruiser` warnings (separate change, separate spec delta).
- Relocate the parity test from the repo root into a specific workspace to remove the root `vitest` devDep (optional; cosmetic only).
- Track the change folder's full audit trail (`proposal.md`, `design.md`, `tasks.md`, `apply-progress.md`, `verify-report.md`, `specs/monorepo/spec.md`) in git rather than as untracked working-tree state — that would be a tooling change in the `sdd-apply` and `sdd-archive` skills, not in this change. (The precedent `add-animals-crud-flow` archive does track them; this change's folder pre-existed as untracked and was archived in the same state to avoid scope creep.)

---

## Next step

`sdd-archive` is the close. The orchestrator should run the session-close protocol (`mem_session_summary`) and stand by for the next change.
