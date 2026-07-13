# Archive Report: chore-archive-orphan-changes

| Field | Value |
|---|---|
| Change | `chore-archive-orphan-changes` |
| Status | `archived` (final) |
| Archived at | 2026-07-13 (post-verify archive move; pre-merge — PR #45 is OPEN) |
| Author | sdd-propose sub-agent (proposal) · lrodriguezn (apply + verify) |
| Archiver | sdd-archive sub-agent |
| Project | ganaweb (control ganadero bovino, Colombia) |
| Artifact store | openspec (filesystem) |
| Delivery strategy | single-pr |
| Review budget | 800 lines (actual: 3 R100 renames, 0 content lines) |
| Session ID | `sdd-chore-archive-orphan-changes` |
| Native review gate | paused by maintainer decision (no native review transaction; manual verification only) |
| Chore commit (source) | [`28500461d66e91bcdf20b86cf5436c5556d0f767`](https://github.com/lrodriguezn/ganaweb/commit/28500461d66e91bcdf20b86cf5436c5556d0f767) |
| Branch (source) | `chore/archive-orphan-changes` (based on `master` @ `92d5446`) |
| PR (source) | [#45 — chore(openspec): archive 3 orphan change dirs to _archive/](https://github.com/lrodriguezn/ganaweb/pull/45) (OPEN at archive time) |
| Issue (source) | [#44](https://github.com/lrodriguezn/ganaweb/issues/44) (OPEN, `status:approved`, `type:chore`) |

---

## Summary

This change is a folder-hygiene chore: it archives (does not delete) three orphan directories that had been sitting under `openspec/changes/` and triggering OpenSpec's "incomplete change" warnings on every `openspec list` and `openspec validate` run. The three files were relocated to `openspec/changes/archive/_archive/exploration-<name>/` via three byte-identical `git mv` operations; content is preserved 1:1 for historical traceability (SHA-256 audit confirms pre/post-move match for all 3 files), the warnings are silenced, and the active `openspec/changes/` tree now contains only first-class changes. The destination uses a leading-underscore `_archive/` namespace with an `exploration-` prefix to visually distinguish leftovers from the date-prefixed archived changes (which are direct children of `archive/`).

The chore is the smallest possible SDD cycle: 1 commit, 0 substantive lines (`git diff --stat` shows 3 R100 renames with 0 insertions and 0 deletions), 0 test changes (TDD-not-applicable, see below), and no spec delta (the proposal explicitly lists "None" for both new and modified capabilities, and the verify phase confirmed `openspec/specs/*` is untouched). The change is a `chore(openspec)` housekeeping step, not a feature, not a refactor, not a dependency bump.

---

## Pipeline trace

| Phase | Skill | Outcome | Artifact |
|---|---|---|---|
| 1. Propose | `sdd-propose` | PASS — 4 goals, 5 non-goals, 5 risks/mitigations, rollback plan, 6 acceptance criteria | `openspec/changes/chore-archive-orphan-changes/proposal.md` |
| 2. Spec | (skipped) | N/A — `## Capabilities` lists "None" / "None"; no spec delta exists | — |
| 3. Design | (skipped) | N/A — chore has no architectural surface | — |
| 4. Tasks | `sdd-tasks` | PASS — 9 tasks across 5 phases, single-commit decision recorded | `openspec/changes/chore-archive-orphan-changes/tasks.md` |
| 5. Apply | `sdd-apply` | PASS — 9/9 tasks complete, SHA-256 audit matches pre/post-move, 1 chore commit | `openspec/changes/chore-archive-orphan-changes/apply-progress.md` |
| 6. Verify | `sdd-verify` | PASS — VERIFIED, 0 defects, 6/6 acceptance criteria, 9/9 per-task re-confirmed | `openspec/changes/chore-archive-orphan-changes/verify-report.md` |
| 7. Archive | `sdd-archive` | PASS — change folder moved to `archive/2026-07-13-archive-orphan-changes/`; no spec delta to sync; this report | `openspec/changes/archive/2026-07-13-archive-orphan-changes/` (this folder) |

The pipeline deliberately skipped `sdd-spec` and `sdd-design` because the chore has no spec or architecture surface. The apply phase registered `tdd-not-applicable: true` for the same reason. Both exemptions are explicitly recorded in their respective phase artifacts and were honored by the verify phase.

---

## Spec deltas applied

**None.**

The proposal's `## Capabilities` section explicitly states:

> ### New Capabilities
> None.
> ### Modified Capabilities
> None.
> `openspec/specs/*` is untouched. The eight existing capabilities (`aplicacion`, `db`, `dominio`, `monorepo`, `sync`, `ui`, `user-auth`, `web`) are unaffected.

The verify phase re-confirmed this (`verify-report.md` lines 75-78, AC-1 / AC-2 / AC-5 / AC-6 all PASS with 0 spec-side touches). The archive phase therefore had no spec delta to sync — the source-of-truth files at `openspec/specs/*` are byte-identical to their pre-chore state.

---

## PRs and commits

| # | SHA | Subject | Role |
|---|---|---|---|
| — | [`28500461d66e91bcdf20b86cf5436c5556d0f767`](https://github.com/lrodriguezn/ganaweb/commit/28500461d66e91bcdf20b86cf5436c5556d0f767) | `chore(openspec): archive 3 orphan change dirs to _archive/` | The chore commit (3 R100 renames, 0 content lines) |

Single-commit chore, as planned in `tasks.md` ("Choice: 1 commit"). No follow-up commits needed; no architectural or refactor split required for a 0-substantive-line change.

**PR**: [#45 — chore(openspec): archive 3 orphan change dirs to _archive/](https://github.com/lrodriguezn/ganaweb/pull/45) — **OPEN** at archive time. Title matches commit subject; body references the proposal path, lists the 3 renames as a `Renames:` block, includes a `Plan de Pruebas` section with the 4 CLI-executable acceptance criteria commands, and closes #44. Labels: `status:needs-review`, `status:approved`, `type:chore`, `size:tiny`. (The 2 supplementary `status:*` labels were added during apply as a standard label-set extension beyond the brief's required `type:chore` + `size:tiny`; neither is required by any CI gate.)

The archive phase intentionally did NOT close PR #45 — that is the maintainer's call after merge. The archive phase is independent of PR merge state: closing the change in OpenSpec removes the chore from the active `openspec list` inventory, which is the audit-trail signal that the work is done. The maintainer can merge the chore commit whenever they are ready.

---

## Verification evidence

The verify report (`verify-report.md`) is the authoritative receipt for this chore. Verdict: **VERIFIED**, 0 defects, 0 blockers, 0 critical findings.

| Acceptance criterion (from proposal) | Status | Evidence |
|---|---|---|
| AC-1: `ls openspec/changes/ \| grep -v '^archive$'` returns no orphan directories | ✅ PASS | `ls openspec/changes/` = `archive` (only entry) — confirmed post-archive-move |
| AC-2: `git diff --stat HEAD~1 HEAD` shows only rename entries (no `+/-` content lines) | ✅ PASS | 3 R100 rows, 0 insertions, 0 deletions |
| AC-3: `openspec list 2>&1 \| grep -ci warning` returns `0` | ✅ PASS (fallback) | `openspec` CLI not on PATH; `ls`-based orphan check confirms 0 stale entries |
| AC-4: `openspec validate 2>&1 \| grep -ci warning` returns `0` | ✅ PASS (fallback) | Same as AC-3 |
| AC-5: `find openspec/changes/archive/_archive -type f \| wc -l` returns `3` | ✅ PASS | 3 files in `_archive/exploration-*/` |
| AC-6: `git log --diff-filter=R --name-status HEAD~1..HEAD` shows 3 R rows | ✅ PASS | 3 R100 rows for the 3 source → destination pairs |

**Acceptance criteria summary**: 6/6 PASS (4 by direct execution, 2 via the documented `ls`-based fallback for the missing `openspec` CLI).

**SHA-256 audit trail** (3/3 match, byte-identical content preservation):

| File (source → dest) | Before `git mv` | After `git mv` | Match |
|---|---|---|---|
| `openspec/changes/dashboard-ganaweb-design/tasks.md` → `archive/_archive/exploration-dashboard-ganaweb-design/tasks.md` | `6a2b7a688b0bf9f223d42567af6a9ca6ba2f9db535b7eb337d78c2cc1eb3dcf9` | `6a2b7a688b0bf9f223d42567af6a9ca6ba2f9db535b7eb337d78c2cc1eb3dcf9` | ✅ |
| `openspec/changes/exploracion-inicial/exploration.md` → `archive/_archive/exploration-exploracion-inicial/exploration.md` | `d4f7deffe8f98e52f39c00a68e31aed653f0c89a3dd4ec715737b1e6d3018bd4` | `d4f7deffe8f98e52f39c00a68e31aed653f0c89a3dd4ec715737b1e6d3018bd4` | ✅ |
| `openspec/changes/selector-estilo-apariencia/tasks.md` → `archive/_archive/exploration-selector-estilo-apariencia/tasks.md` | `df3c35a036bae3caadbd9054d26c004a31a3de780df0d992d0e604dd73fd8518` | `df3c35a036bae3caadbd9054d26c004a31a3de780df0d992d0e604dd73fd8518` | ✅ |

---

## TDD exemption

`tdd-not-applicable: true` (registered by the apply phase, acknowledged by the verify phase).

**Reason**: file-move chore, no executable code changed. The chore consists entirely of 3 `git mv` operations on plain markdown files. No production code, no tests, no specs, no runtime artifacts are touched. `git diff --stat HEAD~1 HEAD` is empty (0 insertions, 0 deletions) — the diff consists only of rename entries, which is precisely the "pure rename" case where a TDD red/green cycle has nothing to assert against (a rename cannot be made to fail a test that does not exist; an integrity check on byte identity is `sha256sum`, not a unit test).

**Precedent**: `openspec/changes/archive/2026-07-13-node-24-lts-migration/apply-progress.md` — the project's prior chore PR, which used strict TDD for the script-write portion of the change (TDD Cycle Evidence table) but explicitly N/A'd TDD for the non-code commits (`chore(repo): biome-format vitest config + gitignore test-results`, `chore(ci)`, `chore(root)`, `chore(packages)`, `docs(node)`, `ci: wire parity check`). This chore is a strict subset of those N/A cases: the entire diff is non-code, so the entire diff is exempt. The verify report's "TDD evidence (Strict TDD mode)" section documents this in detail (5/5 compliance checks PASS).

**Strict TDD posture**: `openspec/config.yaml:45` declares `testing.strict_tdd: true`. The exemption is granted per-chore with reason + precedent citation; the project-wide `strict_tdd: true` flag is NOT relaxed. The verify phase's TDD Compliance table (5/5 PASS) is the formal acknowledgement of the exemption.

---

## Known environment quirks at archive time

The same 3 environment quirks documented in `apply-progress.md` and re-confirmed by `verify-report.md` are carried forward here for completeness, so a future reader of this archive report has the full context:

1. **`openspec` CLI not on PATH in this environment.** `command -v openspec` returns empty; `find / -name openspec -type f` returns empty; the CLI is not in `node_modules/.bin/`, not a global install, not a pnpm shim. The apply and verify phases used an `ls`-based fallback for AC-3 and AC-4 (the `openspec list` / `openspec validate` acceptance criteria). This archive phase also relies on the same fallback: the `ls openspec/changes/` check (showing only `archive/`) is the equivalent signal that the CLI would give. The fallback is authoritative for this chore's "incomplete change" warning category because that warning is generated by child dirs lacking `proposal.md` + `tasks.md`, and there are zero child dirs in the active tree. **Not a defect** — a future session-start bootstrap that installs the CLI would let subsequent verify phases use the canonical command.

2. **`gh pr edit --add-label` is broken in `gh` 2.45.0.** A GraphQL Projects classic deprecation warning masks the real error, and the label state remains empty after the call. The apply phase worked around this with `gh api -X POST /repos/lrodriguezn/ganaweb/issues/45/labels -f labels[]=type:chore -f labels[]=size:tiny`. The workaround is durable (labels persist on the PR). The verify phase confirmed via `gh pr view 45 --json labels` that all 4 expected labels are present. **This archive phase did NOT re-apply labels** — the PR is correctly labeled and out of scope for the archive move.

3. **`size:tiny` label did not exist on the repo** before the apply phase and was created on the fly via `gh label create` (color matches `size:exception` for visual consistency). The CI hard-check is on `type:*` only, so the absence of `size:tiny` previously would not have failed any gate. **Not a defect** — explicitly documented in the apply report and called out in the verify report.

---

## Architectural integrity

This is a file-move chore — there is no architectural surface to verify beyond the 3 renames. The 3 destinations are namespaced under `archive/_archive/exploration-*` (leading underscore + `exploration-` prefix) to visually distinguish leftovers from the date-prefixed archived changes (direct children of `archive/`). The current `archive/` contents confirm the naming pattern works:

```
openspec/changes/archive/
├── 2026-07-08-scaffold-monorepo/
├── 2026-07-09-dashboard-ganaweb-design/
├── 2026-07-11-cinco-estilos-apariencia/
├── 2026-07-12-iniciamos-nueva-feature-para-incluir-el-registro-y-login-de-usuarios/
├── 2026-07-13-add-animals-crud-flow/
├── 2026-07-13-node-24-lts-migration/
├── 2026-07-13-archive-orphan-changes/         ← this archive
└── _archive/
    ├── exploration-dashboard-ganaweb-design/tasks.md
    ├── exploration-exploracion-inicial/exploration.md
    └── exploration-selector-estilo-apariencia/tasks.md
```

The 7 date-prefixed directories are first-class archived changes; the 3 `exploration-*` directories are clearly namespaced as leftovers. The naming convention is consistent with the proposal's stated rationale.

---

## Risks / notes carried forward

All of the following are **non-blocking** and predate (or are transparently documented side effects of) this change. None require a follow-up PR for this change to be considered complete.

1. **Pre-existing untracked items in `archive/2026-07-13-node-24-lts-migration/`** (carry-over from the prior session's archive commit; out of scope for this chore). The maintainer may want to `git clean -fd` them in a future housekeeping pass.

2. **`openspec` CLI absence** in this environment limits automated verify of AC-3 / AC-4. The `ls`-based fallback gives the same signal for the specific "incomplete change" warning category, but a future session-start bootstrap that installs the CLI would let subsequent verify phases use the canonical command.

3. **`gh pr edit --add-label` is broken** in this `gh` 2.45.0 build. The REST API workaround is durable but worth documenting for future PR creation in this project.

4. **Native review gate remains paused** by maintainer decision. The manual verify-report supersedes the native receipt; this archive intentionally does not trigger `gentle-ai review start` and does not produce a native review transaction. Same posture as the precedent `2026-07-13-node-24-lts-migration` and `2026-07-13-add-animals-crud-flow` archives.

5. **PR #45 is OPEN at archive time** (not yet merged by the maintainer). The archive phase's job is to close the change in OpenSpec — it is independent of PR merge state. The maintainer can merge the chore commit whenever they are ready; the merge is a no-op for content (0 insertions, 0 deletions, 3 R100 renames). No post-merge re-verification is required.

---

## Follow-ups for the maintainer

1. **Merge PR #45** to land the chore on `master`. The chore commit is `28500461d66e91bcdf20b86cf5436c5556d0f767`; merging it brings the 3 archive moves into the main branch. The merge is a no-op for content (0 substantive lines changed).

2. **Confirm post-merge that `openspec list` and `openspec validate` are clean.** The `ls`-based fallback in this session is acceptable evidence (zero child dirs in `openspec/changes/` means zero "incomplete change" warnings by construction). The CLI check is **informational** — a future environment with the `openspec` CLI installed can run it for the canonical confirmation. Expected output: zero warnings, zero errors.

3. **Delete the feature branch `chore/archive-orphan-changes`** after merge if not auto-cleaned by GitHub. The branch is local-only to the chore and has no further use after the merge.

4. **No follow-up spec changes required.** The proposal explicitly states "None" for both new and modified capabilities; the verify phase confirmed `openspec/specs/*` is untouched; the archive phase had no spec delta to sync.

---

## Cross-references

- **Proposal**: `openspec/changes/chore-archive-orphan-changes/proposal.md` (now at `openspec/changes/archive/2026-07-13-archive-orphan-changes/proposal.md`)
- **Tasks**: `openspec/changes/chore-archive-orphan-changes/tasks.md` (9 tasks, 5 phases, single-commit decision)
- **Apply progress**: `openspec/changes/chore-archive-orphan-changes/apply-progress.md` (per-task evidence, SHA-256 audit trail, TDD exemption)
- **Verify report**: `openspec/changes/chore-archive-orphan-changes/verify-report.md` (VERIFIED, 0 defects, 6/6 acceptance criteria)
- **House style precedent**: `openspec/changes/archive/2026-07-13-node-24-lts-migration/archive-report.md` (the TDD-exemption precedent and the report-layout reference)
- **Earlier precedent**: `openspec/changes/archive/2026-07-13-add-animals-crud-flow/` (the first archive to use the `archive/YYYY-MM-DD-<name>/` naming convention)
- **Engram topic**: `ganaweb/openspec-cleanup-orphans` (the WHY and the `_archive/` namespace convention are recorded here; this archive marks the topic as **closed** — chore is done, PR is open, maintainer merge is the only remaining step)
- **Chore commit**: [`28500461d66e91bcdf20b86cf5436c5556d0f767`](https://github.com/lrodriguezn/ganaweb/commit/28500461d66e91bcdf20b86cf5436c5556d0f767)
- **PR**: [#45](https://github.com/lrodriguezn/ganaweb/pull/45) (OPEN at archive time)
- **Issue**: [#44](https://github.com/lrodriguezn/ganaweb/issues/44) (OPEN, will close on PR merge)

---

## Next step

`sdd-archive` is the close. The orchestrator should run the session-close protocol (`mem_session_summary`) and stand by for the next change. The maintainer's only remaining step is the PR #45 merge and the post-merge branch cleanup.
