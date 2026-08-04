# Archive Report: redesign-ficha-animal

**Change**: redesign-ficha-animal
**Epic**: GitHub issue #164 (slices #165 / #166 / #167 auto-closed; follow-up #175)
**Archived to**: `openspec/changes/archive/2026-08-04-redesign-ficha-animal/`
**Archive date**: 2026-08-04
**Artifact store mode**: openspec
**Verdict**: PASS WITH WARNINGS (admitted by validator; evidence_revision `sha256:c743841e7814b45c71d0983833cb23136724f0035140a995788a2c2dec51950f`)

## Final State (authoritative at close)

All work was merged to `master` through four chained PRs:

| PR | Slice | Commit | Content |
|----|-------|--------|---------|
| #168 | 1 — visual shell | `ed19abf` | UI shell, drawer wiring, edit-return navigation |
| #170 | 2 — read model | `a4f4f0c` | `obtenerFichaAnimal` projection, dominio pure functions, Drizzle read model |
| #174 | 3 — timeline union | `a5e0454` | UNION ALL over 11 tables, keyset cursor, domain-filter pagination |
| #176 | theme-loop test follow-up | `2204b45` | Ten-appearance theme-fidelity runtime test (tests-only) |

Master head at archive time: `2204b45`.

**Final test evidence at 2204b45** (per orchestrator, authoritative over intermediate snapshots):
- `pnpm turbo test --force`: 13/13 tasks, **1251 passed / 0 failed / 26 skipped**
- `pnpm turbo build --force`: 7/7 tasks
- `pnpm turbo typecheck --force`: 13/13 tasks
- `pnpm exec biome ci .`: 359 files, exit 0

**Spec compliance**: 15/15 requirements, 29/29 scenarios compliant (per `verify-report.md`, validator-admitted).

**Tasks**: 19/19 complete (all checkboxes marked in `tasks.md`).

## Specs Synced

Three NEW capabilities — main spec files created from the delta specs (no prior main spec existed for these domains).

| Domain | Action | Requirements | Scenarios |
|--------|--------|--------------|-----------|
| `animal-ficha-desktop-ui` | Created | 7 (Header Composition, Summary Cards, Tabbed Timeline, Pagination Control, Drawer Wiring, Edit Return, Theme Fidelity) | 12 |
| `animal-ficha-read-model` | Created | 4 (Enriched Projection, Reproductive Summary, Weight/Condition, Computed Age) | 8 |
| `animal-timeline` | Created | 4 (Union Coverage, Domain/Tipo Mapping, Chronological Ordering, Cursor Pagination) | 9 |

Main specs written:
- `openspec/specs/animal-ficha-desktop-ui/spec.md`
- `openspec/specs/animal-ficha-read-model/spec.md`
- `openspec/specs/animal-timeline/spec.md`

## Archive Contents

- `proposal.md` ✅
- `exploration.md` ✅
- `specs/` ✅ (3 delta specs preserved as authored)
- `design.md` ✅
- `tasks.md` ✅ (19/19 tasks complete — no stale unchecked boxes)
- `verify-report.md` ✅ (validator-admitted, PASS WITH WARNINGS)

## Warnings Carried Forward (non-blocking)

These are documented deviations / follow-ups. None block archive; none belong to this change's scope going forward.

1. **Timeline UNION parity for annulled `registros_grupales`** — the ficha summary read model excludes events nested in annulled group registrations (TR-014), but the timeline UNION does not (design D1 has no join in the branch shape). Spec is silent. **Carry-over**: follow-up change to exclude annulled group events from the timeline for parity with the summary cards.
2. **8 pre-existing stale Playwright specs in `tests/e2e/animales.spec.ts`** — failures in `create-animal ×2`, `BUG-003 popover ×2`, `PR-5 potrero ×2`, `PR-5 tipoExplotación ×2`. Verified unrelated to this change: none touch the ficha route, no slice modified those spec bodies or the create-form code under test, and the collapsed UBICACIÓN section they trip on predates slice 1 by 11 days (`edc62ff`, 2026-07-24). **Carry-over**: refresh those specs independently.
3. **Pagination label fallback** — spec text names the control "Ver N eventos más"; the server returns no total count (design D1), so the rendered label is the count-less fallback "Ver más eventos" when the pending count is unknown. Behavior (append next page, hide when exhausted) is fully compliant and both label modes are unit-tested. **Carry-over**: cosmetic only; no action required unless product wants to add a total count.

## Design Decisions Honored

| ID | Decision | Status |
|----|----------|--------|
| D1 | UNION ALL + keyset cursor (one round trip) | ✅ |
| D2 | Server-side tab filtering with `normalizarTabTimeline` guard | ✅ |
| D3 | Keyset cursor base64url `{f, id}`, tamper/garbage → first page | ✅ |
| D4 | Dominio pure functions with injected `hoy` (zero deps) | ✅ |
| D5 | New projection `FichaAnimalResumen`; list contract untouched | ✅ |
| D6 | Rewrite in place, preserve `AnimalFichaDesktopScreen` export | ✅ |
| D7 | No new indexes / no migrations | ✅ |

## TDD Compliance

6/6 checks passed (per verify-report): TDD evidence recorded for all 3 slices; all tasks mapped to existing test files; RED/GREEN/TRIANGULATE/REFACTOR cycles documented; ~62 change-specific tests across 8 files covering unit / integration / harness / e2e layers.

## Changed-File Coverage (where measurable)

- `packages/dominio/src/animal-ficha.ts` — 100% stmts / 100% branch / 100% funcs / 100% lines
- `packages/db/src/animal-infrastructure.ts` (new region L1230–1562) — 97.4% stmts (uncovered tail belongs to adjacent pre-existing class)
- Average changed-file coverage: **98.7%**

## SDD Cycle Complete

The change has been fully explored, proposed, specced, designed, tasked, implemented (across 3 chained PRs + 1 test follow-up), verified, and archived. The three new capabilities are now part of the main spec source of truth.

Ready for the next change.
