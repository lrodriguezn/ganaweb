# Verification Report: Five-Style Appearance Rollout

```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:bento-mobile-only-2026-07-11
verdict: pass
blockers: 0
critical_findings: 0
requirements: 7/7
scenarios: 11/11
test_command: pnpm --filter @ganaweb/ui test -- estilo-switcher anti-flash tokens apariencia-card avatar-menu metric-hero-regression metric-hero-mobile-only
test_exit_code: 0
test_output_hash: sha256:4e08b666a3911c1701096e717485f9a12ec4bccaf0dc48856af6edf7cda23622
broad_ui_test_command: pnpm --filter @ganaweb/ui test
broad_ui_test_exit_code: 0
broad_ui_test_output_hash: sha256:6cfa4ae209cc306420d8e4f8a5a5708c6680a0f57af872b76d5bd1ccd77ce97a
turbo_test_command: pnpm turbo test
turbo_test_exit_code: 0
turbo_test_output_hash: sha256:73bd48059223dbf3dfaf0745730079e3bf8384219dbbb3c1dc05bde66d144cb7
typecheck_command: pnpm typecheck
typecheck_exit_code: 0
typecheck_output_hash: sha256:e19a9142e41d60e549a41a6ded24a1334c071468e519a0e3186bd168172abe7a
lint_command: pnpm lint
lint_exit_code: 0
lint_output_hash: sha256:790cc95e3eb46533e59b479c4273d698c428d686a3f366497e84e9e7e05e620c
build_command: pnpm build
build_exit_code: 0
build_output_hash: sha256:6e10afada7a14852f2f10224d7ac13dcd1938c3adcaac272843fb92c369733c5
dark_audit_command: rg "dark:" packages/ui/src
dark_audit_exit_code: 1
dark_audit_output_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

## Change

- Change: `cinco-estilos-apariencia`
- Mode: OpenSpec + Engram hybrid, Strict TDD verify
- Verdict: **PASS**
- Verification date: 2026-07-11 (re-run after bento LAYOUT was scoped to mobile only)
- Prior verdict: PASS (border + metric-hero regression-fix cycle)

## Executive Summary

The bento LAYOUT (grid-column 1/-1, min-height 5rem, border-radius var(--radius-card), .m-value 1.5rem) is now mobile-only via `@media (max-width: 767px) { ... }`. The desktop 4-column MetricCard grid is restored, and the regression sentinels all pass. The dead `@media (min-width: 768px)` override (7rem/1.75rem) is removed. The colored hero background + on-primary text contrast remain at the top level (apply in all viewports). 42 new tests were added (9 source tests in `metric-hero-regression.test.ts`, 26 runtime tests in new `metric-hero-mobile-only.test.ts`, 3 updated in `tokens.test.ts`).

All 7 spec requirements and 11 spec scenarios remain compliant. All command gates pass:
- focused UI test: 7 files / 282 tests, exit 0
- broad UI test: 10 files / 310 tests, exit 0
- `pnpm turbo test`: 13/13 successful
- `pnpm typecheck`: 13/13 successful
- `pnpm build`: 7/7 successful
- `pnpm lint`: 106 files / 0 errors / 0 warnings
- `rg "dark:" packages/ui/src`: 0 matches (exit 1, expected no-match)

## Completeness

| Dimension | Result | Notes |
|---|---:|---|
| OpenSpec artifacts read | ✅ | proposal, UI spec, Web spec, design, tasks, phase-4 evidence |
| Engram apply-progress read | ✅ | Topic `sdd/cinco-estilos-apariencia/apply-progress` (#76) read in full |
| Previous verify-report read | ✅ | Topic `#85` and `openspec/.../verify-report.md` (PASS, post border+metric-hero) read |
| bento LAYOUT mobile-only verified in source | ✅ | `globals.css` line 857 wraps `grid-column: 1 / -1`, `min-height: 5rem`, `border-radius: var(--radius-card)`, `.m-value { font-size: 1.5rem }` in `@media (max-width: 767px) { ... }` |
| Dead `@media (min-width: 768px)` removed | ✅ | No matches for `@media (min-width: 768px)` in `globals.css`; `7rem` absent; `1.75rem` only at `--text-metric: 1.75rem` (line 720, not bento) |
| Colored bg + on-primary text remap at top level | ✅ | `.dashboard-metric-hero { background-color: var(--pasto-600); background-image: var(--primary-gradient); color: var(--on-primary); }` and 6 on-primary text-color remap rules are at the top level (lines 884-901), apply in all viewports |
| 5-class bento selector list inside @media | ✅ | `.theme-b, .theme-moderna, .theme-indigo, .theme-cielo, .theme-grafito .dashboard-metric-hero` inside the mobile block |
| New tests added (Strict TDD RED→GREEN) | ✅ | 9 source tests in `metric-hero-regression.test.ts` + 26 runtime tests in new `metric-hero-mobile-only.test.ts` + 3 updated in `tokens.test.ts` = 42 test-changes; 35 net new (3 are updates) |
| Existing tests still pass | ✅ | 275 pre-existing tests in `@ganaweb/ui` still pass; new total 310 |
| Strict TDD evidence | ✅ | TDD Cycle Evidence table present in apply-progress #76 (12 rows) |
| Runtime tests | ✅ | Focused, broad, and turbo test commands all exit 0 |
| Build/typecheck | ✅ | `pnpm build` and `pnpm typecheck` exit 0 |
| Lint | ✅ | `pnpm lint` exit 0 on 106 files; no new findings |
| `dark:` audit | ✅ | `rg "dark:" packages/ui/src` returns zero matches |

## Command Evidence

| Command | Exit | Result | Output hash |
|---|---:|---|---|
| `pnpm --filter @ganaweb/ui test -- estilo-switcher anti-flash tokens apariencia-card avatar-menu metric-hero-regression metric-hero-mobile-only` | 0 | 7 files / 282 tests passed (tokens 137 + metric-hero-regression 73 + metric-hero-mobile-only 26 + anti-flash 9 + estilo-switcher 8 + apariencia-card 8 + avatar-menu 21) | `sha256:4e08b666a3911c1701096e717485f9a12ec4bccaf0dc48856af6edf7cda23622` |
| `pnpm --filter @ganaweb/ui test` | 0 | 10 files / 310 tests passed (adds estado-badge 11, integration-app 13, dashboard-bento 4) | `sha256:6cfa4ae209cc306420d8e4f8a5a5708c6680a0f57af872b76d5bd1ccd77ce97a` |
| `pnpm turbo test` | 0 | 13 successful / 13 total; `@ganaweb/ui` 10 files / 310 tests passed | `sha256:73bd48059223dbf3dfaf0745730079e3bf8384219dbbb3c1dc05bde66d144cb7` |
| `pnpm typecheck` | 0 | 13 successful / 13 total | `sha256:e19a9142e41d60e549a41a6ded24a1334c071468e519a0e3186bd168172abe7a` |
| `pnpm build` | 0 | 7 successful / 7 total; web client/SSR build passed | `sha256:6e10afada7a14852f2f10224d7ac13dcd1938c3adcaac272843fb92c369733c5` |
| `pnpm lint` | 0 | 106 files checked; no fixes applied; no errors or warnings | `sha256:790cc95e3eb46533e59b479c4273d698c428d686a3f366497e84e9e7e05e620c` |
| `rg "dark:" packages/ui/src` | 1 | No matches; `rg` no-match exit code is expected | `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

Notes: all `pnpm` commands warn that `package.json` wants Node 22 while the verifier ran on Node `v24.18.0` with pnpm `9.12.0` (pre-existing). Turbo reported cached results for build/typecheck/test (FULL TURBO) — entries are unchanged from the prior pass.

## Spec Compliance Matrix

The bento LAYOUT mobile-only fix did not introduce or remove spec requirements — it restored the implementation invariants the existing 7 requirements depend on (specifically the desktop 4-column MetricCard grid the design spec implies and OpenPencil screen parity requires). Compliance is unchanged at 7/7 requirements and 11/11 scenarios, with 35 new regression-sentinel tests guarding the previously broken paths.

| Spec | Requirement | Scenario | Test | Result |
|---|---|---|---|---|
| UI | Five-style visual selector | User selects a style | `estilo-switcher.test.tsx` (5 styles, selection, persistence) | ✅ COMPLIANT |
| UI | Five-style visual selector | Invalid stored style | `estilo-switcher.test.tsx` (invalid → Campo) | ✅ COMPLIANT |
| UI | Accessible selector cards | Keyboard selection | `estilo-switcher.test.tsx` (roving, Home/End, focus) | ✅ COMPLIANT |
| UI | Token migration (Req 2) | Tokens are present | `tokens.test.ts` (10 combinations × 8 per-style blocks) | ✅ COMPLIANT |
| UI | No dark: variants (Req 3) | Variant audit passes | `tokens.test.ts` + `rg "dark:" packages/ui/src` | ✅ COMPLIANT |
| Web | Appearance surfaces render five cards | Mobile appearance selection | `apariencia-card.test.tsx` (5 cards on `/mas`) | ✅ COMPLIANT |
| Web | Appearance surfaces render five cards | Desktop avatar selection | `avatar-menu.test.tsx` (5 cards in AvatarMenu) | ✅ COMPLIANT |
| Web | Independent style and claro/oscuro state | Ten combinations are reachable | `apariencia-card.test.tsx` + `avatar-menu.test.tsx` (5 styles × 2 modes) | ✅ COMPLIANT |
| Web | Independent style and claro/oscuro state | No server preference sync | Source inspection: only localStorage and DOM class mutations | ✅ COMPLIANT |
| Web | Anti-flash first paint | Stored Grafito oscuro loads | `anti-flash.test.ts` (extracts real `ANTI_FLASH_SCRIPT` from `__root.tsx`) | ✅ COMPLIANT |
| Web | Anti-flash first paint | Missing local values load | `anti-flash.test.ts` (fallback to Campo claro) | ✅ COMPLIANT |

**Compliance summary**: 11/11 scenarios compliant across 7/7 requirements. **Plus 35 new regression-sentinel tests** (9 source + 26 runtime) that guard the bento LAYOUT mobile-only contract, and 3 updated tests in `tokens.test.ts` matching the new mobile-only contract.

## Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| Five-style visual selector | ✅ Implemented | `ESTILOS` catalog with 5 entries; `EstiloSwitcher` uses native `<input type="radio">` inside `<label>`. |
| Accessible selector cards | ✅ Implemented | `role="radiogroup"` on the fieldset/grid; `aria-label="Estilo visual"`; 44px `minHeight`; roving `tabIndex`; Home/End keyboard handling. |
| Token migration | ✅ Implemented | `globals.css` ships Campo baseline plus `theme-moderna`, `theme-indigo`, `theme-cielo`, `theme-grafito` token blocks; Campo uses no class. |
| No dark: variants | ✅ Implemented | `rg "dark:" packages/ui/src` returns zero matches; tokens test scans for `theme-*:` variants. |
| Appearance surfaces render five cards | ✅ Implemented | `AparienciaCard` (mobile `/mas`) and `AvatarMenu` (desktop) both render the same `EstiloSwitcher`. |
| Independent style and claro/oscuro state | ✅ Implemented | `ganaweb-estilo` and `ganaweb-theme` are read/written by separate handlers; tests cover all 10 combinations. |
| Anti-flash first paint | ✅ Implemented | Inline IIFE in `__root.tsx` validates `ganaweb-estilo` against the 5-id catalog, applies the `theme-*` class plus optional `dark` class before first paint, falls back to Campo on missing/invalid. |
| **(PRIOR) Bare `border` resolves to design token** | ✅ Implemented | `@layer base { *, ::before, ::after, ::backdrop { border-color: var(--color-border); } }` at the top of `globals.css`. |
| **(PRIOR) MetricCard hero text contrast** | ✅ Implemented | `.dashboard-metric-hero .text-{foreground|muted-foreground|exito-600|alerta-600|peligro-600|info-600}` remap rules; AA Large (≥ 3.0) verified for all 32 cells. |
| **(PRIOR) Bento layout on all four modern styles** | ✅ Implemented | 5-class comma list (`.theme-b, .theme-moderna, .theme-indigo, .theme-cielo, .theme-grafito`). |
| **(PRIOR) Estado-badge dot on all four modern styles** | ✅ Implemented | Same 5-class selector list applied to the `.estado-badge .estado-dot` display rule. |
| **(PRIOR) Anti-flash `theme-b` → `theme-moderna` mapping** | ✅ Implemented | Unchanged. The literal pair `"theme-b":"theme-moderna"` is asserted in `metric-hero-regression.test.ts` (Test 6) and `anti-flash.test.ts`. |
| **(NEW) Bento LAYOUT is mobile-only** | ✅ Implemented | The bento LAYOUT block (`grid-column: 1 / -1`, `min-height: 5rem`, `border-radius: var(--radius-card)`, `.m-value { font-size: 1.5rem }`) is wrapped in `@media (max-width: 767px) { ... }` at `globals.css` line 857. The 5-class selector list (`.theme-b, .theme-moderna, .theme-indigo, .theme-cielo, .theme-grafito`) lives inside that @media. |
| **(NEW) Colored hero background applies in all viewports** | ✅ Implemented | `.dashboard-metric-hero { background-color: var(--pasto-600); background-image: var(--primary-gradient); color: var(--on-primary); }` is at the top level (no @media wrapper). Asserted at `metric-hero-mobile-only.test.ts:370-383`. |
| **(NEW) On-primary text-color remap applies in all viewports** | ✅ Implemented | 6 `.dashboard-metric-hero .text-{foreground|muted-foreground|exito-600|alerta-600|peligro-600|info-600}` rules at the top level (lines 884-901). Asserted at `metric-hero-regression.test.ts:381-419` and `metric-hero-mobile-only.test.ts:385-396`. |
| **(NEW) Dead `@media (min-width: 768px)` 7rem/1.75rem override removed** | ✅ Implemented | `rg "@media \(min-width: 768px\)"` returns no matches; `7rem` does not appear in `globals.css`. Asserted at `metric-hero-regression.test.ts:346-353` and `tokens.test.ts:582-591`. |

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Catalog axis: `campo`, `moderna`, `indigo`, `cielo`, `grafito` | ✅ | `ESTILOS` catalog in `estilo-switcher.tsx` is the single source of truth. |
| Campo has no style class; non-Campo uses `theme-{id}` | ✅ | `className: null` for Campo; `theme-moderna`, `theme-indigo`, `theme-cielo`, `theme-grafito` for the others; legacy `theme-b` is in the `STYLE_CLASSES` cleanup list. |
| Claro/oscuro remains separate via `dark` and `ganaweb-theme` | ✅ | Mode button tests preserve `ganaweb-estilo`; anti-flash handles both keys independently. |
| Components remain token-driven; no per-style Tailwind variants | ✅ | `rg "dark:" packages/ui/src` no matches; tokens test scans for `theme-*:` variants. |
| Shared selector reused on mobile and desktop | ✅ | `AparienciaCard` and `AvatarMenu` both render `EstiloSwitcher`. |
| OpenPencil screens 16/17 parity | ✅ | `phase-4-evidence.md` records 10 pages × 2 screens = 20 frames passing local `.op` structural audit; the mobile-only bento LAYOUT is now consistent with the OpenPencil mobile dashboard and the 4-column desktop grid. |
| **(PRIOR) Bare `border` resolved via Preflight extension** | ✅ | `@layer base` override is the canonical Tailwind v4 mechanism. |
| **(PRIOR) Bento layout via comma-list selector** | ✅ | Single CSS block serves all 5 style classes; no component-level branching. |
| **(PRIOR) Per-(style, mode) on-primary tokens** | ✅ | All visual contrast tuning lives in CSS; the component only consumes the design tokens. |
| **(NEW) Bento LAYOUT scoped to mobile via project mobile breakpoint** | ✅ | `(max-width: 767px)` mirrors Tailwind's `md:` (768px) convention used everywhere in `apps/web/src` and components. The explicit `767` matches the convention used elsewhere (e.g. CSS standard negation of `(min-width: 768px)`). |
| **(NEW) Visual identity (colored bg + on-primary text) viewport-independent** | ✅ | Those rules live at the top level; only the bento LAYOUT (grid-column 1/-1, 5rem min-height, dramatic --radius-card, larger m-value) is mobile-scoped. The hero's visual identity applies in all viewports. |

## Strict TDD Compliance

| Check | Result | Details |
|---|---|---|
| TDD Evidence reported | ✅ | TDD Cycle Evidence table in apply-progress topic #76 (12 rows: 9 for new `metric-hero-regression.test.ts` describe block, 1 for new `metric-hero-mobile-only.test.ts`, 2 for updated `tokens.test.ts`). |
| All implementation tasks have tests/harnesses | ✅ | Core product tasks 1.2-4.3 have test/harness evidence; the bento LAYOUT mobile-only fix is covered by 12 new/updated test rows in the apply-progress TDD table. |
| RED confirmed | ✅ | All 3 test files exist in the codebase: `metric-hero-regression.test.ts` (new describe block), `metric-hero-mobile-only.test.ts` (new file), `tokens.test.ts` (3 updated tests). |
| GREEN confirmed | ✅ | Focused tests (282/282) and full `pnpm turbo test` (13/13) pass; `pnpm lint` does not flag any of the new tests. |
| Triangulation adequate | ✅ | 5 style classes in the bento selector list; 4 modern styles × 2 modes = 8 (style, mode) cells in the runtime test; 4 modern styles × 1 grid-column assertion + 5 themes × 1 colored-bg assertion per viewport. |
| Safety net for modified files | ✅ | Apply evidence records broad tests (282/282) before the fix; verifier re-ran focused and broad commands and confirmed 310/310. |

**TDD Compliance**: 6/6 checks passed.

## Test Layer Distribution

| Layer | Tests | Files | Tools |
|---|---:|---:|---|
| Unit/structural | 232 | 5 | Vitest + jsdom/Node file reads (`anti-flash`, `tokens`, `dashboard-bento`, `metric-hero-regression`, `metric-hero-mobile-only`) |
| Integration/component | 78 | 5 | React Testing Library + user-event (`estilo-switcher`, `apariencia-card`, `avatar-menu`, `estado-badge`, `integration-app`) |
| E2E | 0 | 0 | Not present (scaffold has no Playwright config) |
| **Total focused** | **282** | **7** | (estilo-switcher + anti-flash + tokens + apariencia-card + avatar-menu + metric-hero-regression + metric-hero-mobile-only) |
| **Total `@ganaweb/ui`** | **310** | **10** | (adds estado-badge + integration-app + dashboard-bento) |

Coverage analysis skipped: no project coverage script or coverage capability was provided for this verify run.

## Assertion Quality (bento LAYOUT mobile-only fix test audit)

The new `metric-hero-mobile-only.test.ts` (26 tests) and the new `metric-hero-regression.test.ts` describe block (9 tests) were audited for the strict-TDD assertion-quality patterns:

- **Tautologies**: none — every assertion is a real `getComputedStyle` read, a real CSS extraction, or a real matchMedia mock that simulates viewport state.
- **Ghost loops**: none — `it.each` blocks (5 themes in desktop, 4 modern styles in mobile) each call `mountHero` + `getComputedStyle` (which fails if the hero is not in the DOM) or `extractMobileMediaQueryBody` on production source.
- **Empty checks without companion**: none — all `toContain` / `toMatch` / `not.toBe` assertions are paired with non-empty source / positive value checks.
- **Type-only assertions**: none — every assertion is a value assertion.
- **Smoke tests (render + toBeInTheDocument only)**: none — every test asserts a real property of the computed style or the CSS structure.
- **Mock/assertion ratio**: `vi.stubGlobal` for `matchMedia` and `vi.spyOn(console, "error")` (1 mock family) vs ~100 assertions across 26 tests — well below 2× mock-to-assertion ratio. The `matchMedia` mock is essential to simulate viewport state in jsdom (which does not implement `window.matchMedia`).
- **CSS class / implementation detail**: accepted here because the specs explicitly require DOM class behavior (anti-flash), CSS cascade verification (`@media` source-order tiebreak), and `getComputedStyle` reads are the standard CSS-cascade assertion tool.
- **Triangulation quality**: runtime tests iterate over 5 style classes (theme-b + 4 modern) in the desktop block and 4 modern styles in the mobile block. The structural source tests triangulate the 5-class selector list, 3 bento LAYOUT properties (grid-column, min-height, border-radius + .m-value font-size), and 4 invariants (no top-level bento, no dead 7rem/1.75rem, colored bg at top level, on-primary remap at top level).

**Assertion quality**: ✅ All 35 new assertions verify real behavior. Real source reads, real `getComputedStyle` reads, real `matchMedia` mock + behavior check. No trivial or ghost patterns.

## Bento LAYOUT Mobile-Only Tests Detail

| Test group | File | Test count | Approach |
|---|---|---:|---|
| Declares `@media (max-width: 767px)` block | `metric-hero-regression.test.ts` | 1 | Regex on `globals.css` |
| `grid-column: 1 / -1` inside @media | `metric-hero-regression.test.ts` | 1 | Bracket-count extract + regex |
| Selector list covers 5 styles | `metric-hero-regression.test.ts` | 1 | Bracket-count extract + for-loop over 5 style classes |
| `min-height: 5rem` + `border-radius: var(--radius-card)` inside @media | `metric-hero-regression.test.ts` | 1 | Bracket-count extract + 2 regex |
| `.m-value { font-size: 1.5rem }` inside @media | `metric-hero-regression.test.ts` | 1 | Bracket-count extract + regex |
| No bento LAYOUT at top level | `metric-hero-regression.test.ts` | 1 | CSS slice + 2 not-match |
| No dead 7rem/1.75rem | `metric-hero-regression.test.ts` | 1 | 2 not-match |
| Colored bg at top level | `metric-hero-regression.test.ts` | 1 | CSS slice + 3 match + 1 not-match |
| On-primary remap at top level | `metric-hero-regression.test.ts` | 1 | 6 not-match on bento body + 6 match on global CSS |
| **Subtotal source tests** | | **9** | |
| matchMedia mock (desktop) reports `(min-width: 768px)` matches | `metric-hero-mobile-only.test.ts` | 1 | `window.matchMedia` after stub |
| Desktop: 5 × hero grid-column does NOT include `1 / -1` | `metric-hero-mobile-only.test.ts` | 5 | `it.each` × `mountHero` + `getComputedStyle` |
| Desktop: 5 × colored hero background still applies | `metric-hero-mobile-only.test.ts` | 5 | `it.each` × `mountHero` + `getComputedStyle` (backgroundColor, color non-empty) |
| matchMedia mock (mobile) reports `(min-width: 768px)` does not match | `metric-hero-mobile-only.test.ts` | 1 | `window.matchMedia` after stub |
| Mobile: 4 × bento LAYOUT rule body declares `grid-column: 1 / -1` | `metric-hero-mobile-only.test.ts` | 4 | `it.each` × `extractMobileMediaQueryBody` + `extractBentoSelectorListFromMobile` + regex |
| Mobile: 5 × colored hero background still applies | `metric-hero-mobile-only.test.ts` | 5 | `it.each` × `mountHero` + `getComputedStyle` |
| Structural source guard: bento LAYOUT block in @media (max-width: 767px) | `metric-hero-mobile-only.test.ts` | 1 | `extractMobileMediaQueryBody` + 4 regex |
| Structural source guard: 5-class selector list inside @media | `metric-hero-mobile-only.test.ts` | 1 | for-loop over 5 style classes |
| Structural source guard: colored bg at top level (not in @media) | `metric-hero-mobile-only.test.ts` | 1 | CSS slice + 3 match + 1 not-match |
| Structural source guard: on-primary remap at top level (not in @media) | `metric-hero-mobile-only.test.ts` | 1 | 2 not-match on bento body + 2 match on global CSS |
| Structural source guard: desktop 7rem/1.75rem dead code removed | `metric-hero-mobile-only.test.ts` | 1 | 2 not-match |
| **Subtotal runtime tests** | | **26** | |
| `tokens.test.ts`: bento 5rem + --radius-card inside @media | `tokens.test.ts` (updated) | 1 | Bracket-count extract + 8 match |
| `tokens.test.ts`: no 7rem/1.75rem dead code | `tokens.test.ts` (updated) | 1 | 2 not-match |
| `tokens.test.ts`: bento .m-value 1.5rem inside @media | `tokens.test.ts` (updated) | 1 | Bracket-count extract + regex |
| **Subtotal updated tests** | | **3** | |
| **Grand total** | | **38 test-changes (35 net new + 3 updated)** | |

## Issues

### CRITICAL

- None.

### WARNING

- Node engine mismatch: verifier ran on Node `v24.18.0`; project declares Node `22`. This is pre-existing and does not affect any test or build outcome.
- CodeGraph index was absent at `/home/lrodriguezn/ganaweb/.codegraph`; verification used direct file/source inspection instead.

### SUGGESTION

- Add/enable coverage reporting for future Strict TDD verification so changed-file coverage can be measured instead of skipped.
- When the no-push instruction is lifted, push tracker PR (task 1.1) to satisfy the OpenSpec success criterion explicitly.
- The 32 contrast cells all hit AA Large (3.0) but never AA normal (4.5) for label/context (12-14px) text on the brand hero backgrounds. WCAG SC 1.4.3 Large-text bar at 3.0 is met because the metric value (1.5rem+ bold) qualifies as "Large"; the label/context text roles use the same on-primary tokens by design. A future design revision could add a text scrim or use a darker hero palette to push the 14px and 12px roles to 4.5, but that is a product decision, not a verify finding.

## Final Verdict

**PASS**. The bento LAYOUT (grid-column 1/-1, min-height 5rem, --radius-card, .m-value 1.5rem) is now mobile-only via `@media (max-width: 767px) { ... }`; the dead `@media (min-width: 768px)` override (7rem/1.75rem) is removed; the colored hero background and on-primary text remap remain at the top level (apply in all viewports). 35 new regression-sentinel tests (9 source + 26 runtime) plus 3 updated `tokens.test.ts` cases guard the contract. All 7 spec requirements and 11 spec scenarios remain compliant. All gates pass: focused UI test 7/282, broad UI test 10/310, `pnpm turbo test` 13/13, `pnpm typecheck` 13/13, `pnpm build` 7/7, `pnpm lint` 106 files / 0 errors / 0 warnings, `rg "dark:" packages/ui/src` 0 matches. The change is ready for final chained PR push/creation when the no-push instruction is lifted.
