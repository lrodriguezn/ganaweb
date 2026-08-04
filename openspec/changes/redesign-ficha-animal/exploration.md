## Exploration: Redesign Ficha Animal (Desktop)

### Current State

The animal ficha ("ficha de animales") is the detail screen for a single animal in GanaWeb. It is served by a TanStack Start route at `/_app/fincas/$fincaId/animales/$animalId` and rendered through two UI components: `AnimalFichaDesktopScreen` and `AnimalFichaMobileScreen`, composed in `packages/ui/src/ganado/animal-crud.tsx`.

**Route wiring** (`apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId.tsx`):
- Loader calls `getAnimalFichaAction({ fincaId, animalId })` → `obtenerFichaAnimal` use case.
- Server handler returns `{ tipo: "ficha", animal, imagenes, genealogia, estadoBanner, timeline: { items, nextCursor? }, permissions }`.
- Route renders `<AnimalFichaDesktopScreen>` on `md:` and `<AnimalFichaMobileScreen>` below `md:`.
- Sub-routes: `$animalId/editar.tsx` (edit form), `$animalId/imagenes.tsx` (gallery).
- Below the screens, the route also renders delete/reactivate controls and `AnimalDeleteDialogCopy`.

**Data shape returned to the UI today** (`AnimalResumen` in `packages/dominio/src/animal.ts` and `packages/ui/src/ganado/types.ts`):
- Identity: `id`, `codigoAnimal`, `nombreAnimal`, `sexo`, `estadoActual`, `salud`.
- Reproductive: `categoriaReproductiva` (vacia | servida | prenada | parida | novilla | no_aplica).
- Dates: `fechaNacimiento`, `fechaCompra` (epoch seconds).
- Optional: `codigoRfid`, `tipoExplotacionId`, `tatuado`, `herrado`, `descornado`, `esDeMonta`, `numeroPezones`, `calidadAnimalId`, `hierroId`, `propietarioId`.
- Location: `potrero`, `lote` (resolved strings on `AnimalListItem`).
- **Missing from the type but present in DB**: `razaId`, `colorId` (FK to `config_razas`/`config_colores`), `madreId`, `padreId`, `donadoraId`, `precioCompra`, `pesoCompra`, `comentarios`.

**Current ficha layout (desktop)**:
1. `AnimalFichaHeader`: photo placeholder, code/name, 3 badges (`EstadoAnimalBadge`, `CategoriaBadge`, `SaludBadge`), Edit + Registrar evento buttons, 2 metric cards (Edad, Último peso — both hardcoded to "—").
2. 2-column grid of `InfoCard`:
   - **Datos**: Código, Nombre, RFID, Tipo explotación, Nº pezones, Hierro, Propietario, Calidad, boolean flags (tatuado/herrado/descornado/monta).
   - **Genealogía**: Madre/Padre/Donadora + crías list.
   - **Timeline**: `AnimalTimeline` groups events by year descending; uses `domainStyle()` for 4 domain colors but only renders generic `Baby`/`Camera` icons.
   - **Reproducción**: placeholder "Sin datos reproductivos pendientes."
   - **Peso**: placeholder "Sin peso reciente."

**Current ficha layout (mobile)**:
- Header + horizontal tab strip (Timeline / Datos / Fotos / Genealogía — all static, only Timeline is active).
- Same `InfoCard` blocks stacked.
- `BottomNav` with FAB wired to `onRegistrarEvento` (currently a no-op in the route).

**Timeline data source** (`DrizzleAnimalTimelineRepository` in `packages/db/src/animal-infrastructure.ts:1230`):
- **Stub implementation**: returns only a single synthetic event `{ id: "{animalId}-created", titulo: "Animal registrado" }`. Does NOT union the 11+ event tables that exist in the schema (`pesos`, `servicios`, `palpaciones`, `partos`, `partosCrias`, `produccionesLacteas`, `aplicacionesSanitarias`, `revisionesVeterinarias`, `animalesCondicionCorporal`, `ventas`, `muertes`, `animalesUbicacionHistorico`).
- `toTimelineItem` in the server handler hardcodes `dominio: "manejo"` and `tipo: "reubicacion"`, ignoring the actual event type.

**Event registration** (`EventDrawer` in `packages/ui/src/ganado/event-drawer/index.tsx`):
- 3-step drawer: tipo → alcance → formulario.
- 6 event types wired: peso, vacuna, servicio, palpación, parto, producción.
- Only `FormularioVacuna` is implemented; other forms are TODO.
- Drawer is NOT wired from the ficha desktop screen's "Registrar evento" button (the route passes `canCreateEvents` but the button's `onClick` is not connected to drawer state).

**Edit flow** (`$animalId/editar.tsx`):
- Reuses `AnimalFormScreen` with `formVariant="edit"`.
- Loads ficha via `getAnimalFichaAction`, maps to `AnimalFormInitialValues` via `mapAnimalFichaToLoaderData` (currently hardcodes demo values for raza/color/calidad/lugarCompra because the ficha response doesn't carry resolved names).
- 11 editable fields mapped to dominio's `DatosActualizacionAnimal.cambios`.
- On success navigates back to `/animales` list (NOT back to ficha).

**Design system**:
- CSS tokens in `packages/ui/src/styles/globals.css` already define the target palette: `pasto-600/700/100`, `tierra-200/400/600/900`, `crema-50`, `dom-repro/sanidad/produccion/manejo` + `-bg` variants.
- Dark mode: implemented via `html.dark` class with parallel token values.
- 5 themes (GanaWeb default, Moderna, Índigo, Cielo, Grafito) each with light+dark variants — matches the 10 OpenPencil pages.
- Radius tokens: `rounded-card` (12px), `rounded-control` (8px) — align with design.
- Touch target: `min-h-[--h-touch]` (44px).
- Typography scale: `text-title`, `text-section`, `text-support`, `text-caption` — map roughly to design's 20/12/11/10px sizes.

**Testing**:
- `packages/ui/tests/animal-ui.test.tsx` — renders `AnimalFichaDesktopScreen` and `AnimalFichaMobileScreen`, asserts frame testids (`op-f-400107`, `op-frame-0232`), card regions, tab structure.
- `apps/web/tests/animal-web-flow.test.ts` — exercises `harness.ficha()` end-to-end, asserts timeline pagination, edit route loader wiring.
- `packages/aplicacion/tests/animal-use-cases.test.ts` — tests `obtenerFichaAnimal` use case with mocked deps.
- `tests/e2e/animales.spec.ts` — Playwright E2E for animals flow.

### Affected Areas

- `packages/ui/src/ganado/animal-crud.tsx` — `AnimalFichaDesktopScreen`, `AnimalFichaHeader`, `AnimalTimeline`, `InfoCard`, `DatosAnimal`, `AnimalFichaMobileScreen`. Primary visual rewrite target.
- `packages/ui/src/ganado/types.ts` — `AnimalResumen` needs new fields (raza/color resolved names, computed age, latest weight, reproductive summary, body condition).
- `packages/dominio/src/animal.ts` — same domain type; new fields or a new `FichaAnimalResumen` projection.
- `packages/aplicacion/src/casos-uso/animales/index.ts` — `obtenerFichaAnimal` must aggregate additional data (reproductive summary, latest weight, body condition, computed age).
- `packages/db/src/animal-infrastructure.ts` — `DrizzleAnimalTimelineRepository` must be rewritten to union the 11+ event tables; new read-model methods for reproductive summary, GDP, IEP, días abiertos, condición corporal.
- `apps/web/src/server/animal-actions.server.ts` — `toAnimalListItem` and `toTimelineItem` mappers must carry the new fields; ficha handler must pass through the aggregated data.
- `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId.tsx` — route must wire the EventDrawer, pass new data to screens, handle tab state.
- `packages/ui/src/ganado/event-drawer/index.tsx` — must be wired from the ficha's "Registrar evento" button; remaining 5 form implementations pending.
- `packages/ui/tests/animal-ui.test.tsx` — snapshot/structure assertions will need updating to match the new layout.

### Approaches

1. **Visual-only rewrite (UI layer only)**
   - Rewrite `AnimalFichaDesktopScreen` and `AnimalFichaHeader` to match the target layout (breadcrumb, title+badges+meta, 3 left cards + right timeline card with tabs).
   - Keep the existing data contract; render "—" or "Sin datos" for fields that don't exist yet (raza, color, peso, GDP, IEP, días abiertos, condición corporal, partos count, último servicio/palpación).
   - Implement the 5-tab timeline UI but keep the single flat data source (all events under "Resumen" / "Eventos"; other tabs show empty state).
   - **Pros**: Smallest blast radius, no domain/DB changes, can ship in one PR, tests only need UI updates.
   - **Cons**: Screen will look designed but be largely hollow — most cards will show placeholders. Doesn't deliver functional value for the reproductive/production/sanidad sections.
   - **Effort**: Low-Medium (2-3 days).

2. **Full-stack redesign (data + UI)**
   - Extend `obtenerFichaAnimal` to aggregate: resolved raza/color names (JOIN config tables), computed age, latest weight + GDP, last service/palpación/parturition, gestation days, IEP, días abiertos, body condition, partos count.
   - Rewrite `DrizzleAnimalTimelineRepository` to UNION the 11+ event tables with proper domain/tipo mapping and domain-colored icons.
   - Add 5-tab timeline with per-domain filtering.
   - Wire `EventDrawer` from "Registrar evento" button.
   - Rewrite `AnimalFichaDesktopScreen` to match the target layout.
   - **Pros**: Delivers a functional screen that matches the design end-to-end; real data in all cards.
   - **Cons**: Large blast radius across 4 packages (dominio, aplicacion, db, ui); needs new read-model queries, new types, new tests. Timeline UNION is a non-trivial SQL change.
   - **Effort**: High (7-10 days).

3. **Phased: visual shell + data enrichment (recommended)**
   - **Phase A (this change)**: Visual rewrite of the desktop ficha shell — new layout, new header, new card structure, 5-tab timeline UI, EventDrawer wiring. Data-dependent cards show graceful empty states with the correct structure (labels, units, formatting) so the screen is visually complete.
   - **Phase B (follow-up change)**: Data enrichment — extend `obtenerFichaAnimal` to populate the new fields, rewrite the timeline repository to union event tables.
   - **Phase C (follow-up change)**: Mobile ficha redesign (out of scope for this change since the design canvas doesn't include mobile).
   - **Pros**: Ships a visually complete screen fast; isolates the risky data-layer work into focused follow-ups; each phase is testable independently.
   - **Cons**: Requires accepting placeholder data in Phase A; two additional changes to close the loop.
   - **Effort**: Phase A Medium (3-4 days); Phases B+C are separate changes.

### Recommendation

**Approach 3 (phased)**. The design canvas defines a visually rich screen with many data fields that don't exist in the current data contract. Trying to land both the visual rewrite and the data-layer rewrite in a single change creates unnecessary risk and makes the PR unreviewable. Splitting into phases lets us:
1. Ship the visual shell immediately (users see the new design).
2. Wire the data layer incrementally (each new field is a small, testable addition).
3. Keep the mobile decision explicit (out of scope for now — the canvas doesn't include it).

### Risks

- **Timeline stub**: The current `DrizzleAnimalTimelineRepository` returns only the creation event. The 5-tab timeline UI will be mostly empty until Phase B lands. Mitigation: render empty states per tab with clear messaging.
- **Data field gaps**: Raza, color, peso, GDP, IEP, días abiertos, condición corporal, partos count, último servicio/palpación are NOT in `AnimalResumen` today. The DB has `razaId`/`colorId` as FKs but the read model doesn't resolve them to names. Mitigation: Phase A renders these as structured placeholders; Phase B fills them.
- **Edit flow**: After edit, the route navigates to `/animales` (list) instead of back to the ficha. The redesign should consider navigating back to the ficha. Mitigation: note in proposal as a UX improvement.
- **EventDrawer not wired**: The "Registrar evento" button on the desktop ficha doesn't open the drawer. Mitigation: Phase A wires the drawer open state.
- **Mobile scope**: The design canvas intentionally contains only the desktop screen. The mobile ficha will remain unchanged until a separate design is provided. Mitigation: proposal explicitly scopes to desktop only.
- **Test breakage**: `animal-ui.test.tsx` asserts the current card structure (Datos, Genealogía, Timeline, Reproducción, Peso as separate `InfoCard` regions). The visual rewrite will break these assertions. Mitigation: update tests in the same phase.

### Ready for Proposal

**Yes.** The exploration has enough detail to write a functional proposal. The orchestrator should tell the user:

> "Exploration complete. The current ficha is a functional but visually sparse screen with stub data (hardcoded '—' for age/weight, placeholder cards for reproduction/weight, timeline showing only the creation event). The design system already has all the tokens needed for the target design. I recommend a phased approach: Phase A rewrites the desktop visual shell (3-4 days), Phase B enriches the data layer (separate change), Phase C redesigns mobile (separate change, needs design). The proposal will scope to Phase A (desktop visual rewrite) with explicit out-of-scope for mobile and data enrichment."
