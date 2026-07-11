# Exploration: five-style appearance rollout

## status
complete

## executive_summary
The repo is still wired for a binary style model (`campo` vs `moderna` via `theme-b`), but the current design docs now define five user-selectable styles: `Campo`, `Moderno`, `indigo`, `cielo`, and `grafito`. The `.op` design already contains screen 16/17 variants for each style, so the main gap is product/runtime implementation, not mockup coverage.

## artifacts
- `openspec/changes/cinco-estilos-apariencia/exploration.md`
- topic key: `architecture/five-style-appearance-rollout`

## next_recommended
- Create a new feature request issue for the five-style rollout.
- Plan a chained PR tracker if implementation is expected to exceed ~400 changed lines.
- In the next phase, define the style-token architecture before touching components.

## risks
- Current CSS cascade only supports one B theme (`theme-b`); adding 3 more styles will require a broader token model.
- `EstiloSwitcher`, `AvatarMenu`, and `AparienciaCard` are hard-coded to Campo/Moderna labels and values.
- Screen 16/17 design variants exist, but the app runtime does not yet have matching style switching logic.

## skill_resolution
- paths-injected

## openpencil_findings
- Screen 16 (`Apariencia · Mobile`) exists as 5 variants in `docs/ganaweb-diseno.op`: default + `(Moderna)`, `(Índigo)`, `(Cielo)`, `(Grafito)`; each variant changes the mobile shell/FAB/bottom-nav colors to match the style.
- Screen 17 (`Menú Avatar · Desktop`) also has 5 variants; the default variant and style-specific variants update the avatar dropdown, active style card, dark-mode toggle, and menu surface colors.
- The `.op` file already encodes the five proposed style cards: `EstiloCard-campo`, `EstiloCard-moderna`, `EstiloCard-indigo`, `EstiloCard-cielo`, `EstiloCard-grafito`.
- OpenPencil MCP could not open the local file path directly in this session, so the design file was inspected via raw JSON reads.

## github_flow_recommendation
- Open a new `feature_request` issue (not a bug-only issue) because this is a product expansion from 2 to 5 styles.
- Use change name/branch base: `cinco-estilos-apariencia`.
- Use chained PRs if the implementation spans tokens, selector UI, shell surfaces, and screen routing; this is very likely the safer review strategy.
