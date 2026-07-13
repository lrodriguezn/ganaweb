## Exploration: Compact CRUD flow for animals

### Current State
Original request: "iniciamos nueva feature: objetivo: agregar flujo compecto para CRUD de animales ... Openpencil ... schema_v3_corregido.sql ... ganaweb-design.md ... design_brief_app_ganadera.md".

The repo already has the animal foundation, but not the full CRUD flow. The shell exposes an `Animales` entry, yet `apps/web` has no animals routes beyond the shell navigation. `packages/dominio` only contains `AnimalResumen` and RN-001 (`validarCodigoUnicoPorFinca`), `packages/aplicacion` only defines `AnimalRepositoryPort`, and `packages/db` only ships a minimal `animales` table subset plus the auth repository. The full SQL source (`docs/schema_v3_corregido.sql`) already models the richer animal aggregate and related tables (potreros, sectores, lotes, grupos, hierros, propietarios, imágenes, eventos, historics).

The UI layer is more ready than the app layer: `packages/ui` already exports `AnimalCard`, `Timeline`, `EmptyState`, `EstadoBadge`, `Sidebar`, `BottomNav`, and `AppHeader`. The design brief, however, defines a larger route contract for animals: list, ficha animal, and new/edit screens on mobile and desktop. That contract does not yet exist in `apps/web`.

### Affected Areas
- `apps/web/src/routes/_app.tsx` — shell already points to `/animales`, but the route itself is missing.
- `apps/web/src/routes/_app/animales*` — new list, detail, create, and edit routes are needed.
- `packages/ui/src/ganado/animal-card.tsx`, `timeline.tsx`, `empty-state.tsx`, `estado-badge.tsx` — usable building blocks for list and ficha surfaces.
- `packages/ui/src/ganado/types.ts` — current `AnimalResumen` shape is UI-oriented and does not yet mirror the full DB schema.
- `packages/dominio/src/animal.ts`, `rn-001.ts` — domain currently covers only the uniqueness rule; more animal rules are not modeled yet.
- `packages/aplicacion/src/puertos/animal-repository-port.ts` — repository contract exists, but no animal use cases or flows consume it yet.
- `packages/db/src/schema/animales.ts`, `schema/index.ts` — only a minimal animal table is exported; the full schema in `docs/schema_v3_corregido.sql` is broader.
- `docs/design_brief_app_ganadera.md` and `docs/ganaweb-design.md` — define the target screens, responsive behavior, and navigation contract.
- `.github/PULL_REQUEST_TEMPLATE.md` — PRs must link an approved issue; GitHub-flow should be treated as a prerequisite for implementation, not a late add-on.

### Approaches
1. **Compact session-driven CRUD slice** — keep the current session-based shell, add `/animales`, `/animales/nuevo`, and `/animales/$id` routes, and wire them to minimal use cases/repository calls.
   - Pros: smallest change set; reuses current shell/session model; faster to land.
   - Cons: diverges from the design brief's finca-in-URL contract; may require a follow-up route refactor.
   - Effort: Medium

2. **Design-brief-aligned vertical slice** — implement the animals flow with the route structure from the design brief (`/fincas/$fincaId/animales`, `/fincas/$fincaId/animales/$animalId/*`, plus new/edit), backed by application use cases and DB adapters.
   - Pros: matches OpenPencil/design docs; avoids future route churn; cleanly supports deep links per finca.
   - Cons: more plumbing now; may touch shell/context assumptions and needs more coordination.
   - Effort: High

### Recommendation
Prefer the design-brief-aligned slice, but confirm the URL strategy first: the current app shell is session-driven while the design brief is finca-in-URL driven. Once that is settled, implement the list/ficha/new/edit flow as one vertical slice and reuse the existing UI primitives instead of inventing new ones.

### Risks
- Route contract mismatch: current shell uses session state, while the design brief expects finca-scoped URLs.
- Data-shape mismatch: UI `AnimalResumen` is smaller than the SQL animal aggregate, so adapters must be explicit.
- Scope creep: the SQL schema includes events/history/images; CRUD should stay focused on core animal lifecycle unless the proposal expands.

### Ready for Proposal
Yes — but the orchestrator should ask the user to confirm the route convention (session-based vs `/fincas/$fincaId/...`) and delete behavior (hard delete vs inactivate) before design work.
