# Exploration: GanaWeb — Síntesis de trabajo de planificación

> **Change**: `exploracion-inicial`
> **Date**: 2026-07-07
> **Phase**: sdd-explore
> **Purpose**: Synthesize five dimensions of existing planning work before first implementation change.

---

## 1. Diseño (Design System)

### What the docs establish

The design system is documented in `ganaweb-design.md` (v1.2) and `design_brief_app_ganadera.md` (v1.1). It is mature and implementation-ready.

**Core design principles:**
- **Mobile-first**: primary user is in the field with one hand, gloves, direct sunlight. Desktop is secondary (office admin).
- **High contrast always**: light mode reads in sunlight (AA/AAA); dark mode is functional (4-5 AM milking), not cosmetic.
- **Flat with borders**: zero decorative shadows in both themes.
- **Offline is normal state, not error**: offline notes use `info` semantic (blue), never warning.

**Design tokens** (v1.2):
- Color: semantic (state) separated from domain (event category). Semantic = `exito`/`alerta`/`peligro`/`info`; Domain = `reproduccion` (purple), `sanidad` (coral), `produccion` (teal), `manejo` (blue).
- Dark mode: warm palette (not blue-gray). Primary is lighter (`#4C9D62`) with **dark text** on top. `brand-panel` for large brand surfaces (login).
- Typography: Inter family only (rural connectivity), `tabular-nums` mandatory for figures.
- Radius: control 8px, card 12px, sheet 16px, badge 999px.
- Touch minimum: 44px. Mobile frame: 390×844.

**Navigation architecture:**
- Desktop: fixed sidebar (Inicio, Animales, Eventos, Sanidad, Reportes, Tareas, Configuración). Header with FincaSwitcher, global search (Cmd+K), ThemeToggle, SyncPill, avatar.
- Mobile: bottom nav 5 items (Inicio, Animales, [+] Registrar, Tareas, Más). Configuración under "Más". [+] opens EventDrawer.
- FincaSwitcher: route change (`/fincas/$fincaId`), not global state.

**Key rules:**
- T-004: No `dark:` variants in components — theming via CSS tokens only.
- Semantic ≠ domain: never mix state colors with event category colors.
- One strong accent per view.
- Actionable items above fold.

### Gaps / Risks
- **No formal design tokens file** (JSON/TOML) — tokens are in CSS variables (`globals.css`). This works for Tailwind v4 but may limit tooling integration.
- **Accessibility audit** was done in v1.2 (muted contrast fixes) but no automated a11y testing setup is specified.
- **Responsive breakpoint behavior** is documented but no Figma/wireframe artifacts are present (the `.op` file is binary/unreadable).

### What needs to be built first
- Migrate `globals.css` tokens into Tailwind v4 config within `packages/ui`.
- Set up the `packages/ui` structure with shadcn/ui base + ganado/ components.

---

## 2. Arquitectura (Architecture)

### What the docs establish

The architecture is documented in `arquitectura_funcional.md` (v1.0) and `especificaciones_tecnicas.md` (v1.0). It follows Clean/Hexagonal architecture with strict layer separation.

**Monorepo structure** (ADR A1):
```
ganaweb/
├─ apps/web/              # TanStack Start (UI + server functions)
├─ packages/
│  ├─ dominio/            # Entities, RN/TR/PE rules as PURE functions (zero deps)
│  ├─ aplicacion/         # Use cases = domain events + ports
│  ├─ db/                 # Drizzle schema (PG + SQLite) + repositories + migrations
│  ├─ sync/               # Sync protocol (shared client/server)
│  ├─ ui/                 # Component library (ganado/ v1.2.1) + tokens
│  └─ config/             # Shared tsconfig, biome, presets
```

**Dependency rule** (verified in CI with `dependency-cruiser`):
```
ui ──────────────┐
apps/web ──► aplicacion ──► dominio
   │              ▲
   └──► db ───────┘
```

- `dominio`: entities, value objects, state machine, RN/TR rules as pure functions. NO imports of Drizzle, React, fetch, or any I/O. TDD lives here.
- `aplicacion`: one use case per domain event (§4 AF). Validates permissions (PE-002), executes domain rules, writes via **ports** (interfaces). **Same use case runs offline against SQLite and online against Postgres** — this symmetry is the heart of the design.
- `db`: Drizzle implementations of ports ×2 (PG driver and wa-sqlite driver).
- `apps/web`: only orchestrates — routes, loaders, server functions. **Pages contain no business rules**.

**Offline/Online symmetry:**
- Source of truth: Postgres. Replica: one SQLite (OPFS) per downloaded farm.
- Push: case use writes to local SQLite + enqueues in `sync_outbox` (same transaction). Server applies idempotently (UUID key).
- Pull: incremental by `updated_at` + `id` cursor. Logical deletes travel as updates.
- Conflict resolution: RN-060 (uniqueness: first wins, second goes to review queue); RN-061 (state: last-write-wins by event timestamp; lifecycle by severity MUERTO > VENDIDO > EN_FINCA).

**Key architectural rules:**
- PE-001: UI and server decide by **permission**, never by role name.
- PE-002: Every server function revalidates permission server-side.
- PE-003: Effective permissions resolved per active farm.
- PE-004: Offline permissions travel with local replica; revocation takes effect at next sync.
- T-001: No hardcoded business thresholds — all from `config_parametros_finca`.
- T-002: Every event insert is append-only + outbox row + idempotent effects.
- T-003: Domain names in **Spanish** (`registrarPalpacion`, `categoriaReproductiva`); infra can use English.
- T-004: No `dark:` in components — theming via tokens.
- IA-001: On ambiguity or contradiction between docs: stop and ask, never invent a rule.
- IA-002: Don't create tables, columns, or permissions outside schema v3 without proposing first.
- IA-003: Reuse `packages/ui` components before creating new ones.

### Gaps / Risks
- **No code scaffolded yet** — the monorepo structure exists only in docs. The first change must scaffold it.
- **Sync protocol is specified but not implemented** — the `sync_outbox` table exists in schema but the push/pull logic, conflict resolution, and snapshot mechanism are not coded.
- **SQLite WASM (wa-sqlite + OPFS)** requires `COOP: same-origin` and `COEP: require-corp` headers — must be configured in Nitro server and verified in E2E.
- **`navigator.storage.persist()`** needed at first login to reduce OPFS eviction on iOS/Safari.
- **Dependency cruiser** is mentioned but not configured yet.

### What needs to be built first
1. Monorepo scaffolding (pnpm workspaces, Turborepo, package structure).
2. `packages/dominio` with entity types and first RN rules (TDD).
3. `packages/db` with Drizzle schema generated from `schema_v3_corregido.sql`.
4. `packages/ui` with component library migration.

---

## 3. Especificaciones Técnicas (Technical Specifications)

### What the docs establish

**Stack choices** (ADRs A1-A12):
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Repository | Monorepo GitHub, pnpm + Turborepo | Single place, atomic refactors, build cache |
| Framework | TanStack Start (fullstack) | Single deploy artifact, end-to-end type safety |
| ORM | Drizzle | Same typed schema for PG and SQLite |
| Server DB | PostgreSQL 17 | Multi-farm source of truth |
| Client DB | SQLite WASM (wa-sqlite) + OPFS | Installable PWA, local replica per farm |
| Sync | Custom over `sync_outbox` | Full conflict control, schema already models it |
| Distribution | PWA installable | No stores, immediate update, Capacitor as future path |
| UI | Tailwind v4 + shadcn/ui + custom `ui` package | Already built (ganaweb-componentes v1.2.1) |
| Testing | Vitest + Playwright + TDD in domain | §5 |
| Lint/Format | Biome | Single fast tool (replaces ESLint+Prettier) |
| Deploy | Docker multi-stage + Dokploy on VPS | §7 |
| CI/CD | GitHub Actions + Dokploy webhook | §8 |

**Testing strategy:**
- Unit (dominio): Vitest, TDD mandatory, ≥90% coverage gate.
- Integration: Vitest + SQLite in-memory / Postgres (Testcontainers). Each use case tested **twice** (PG and SQLite) with same suite.
- E2E: Playwright, critical flows on production build + ephemeral Postgres + `seed_v3` demo.
- Sync contract: Vitest, property-based where applicable (fast-check).

**Testing rules:**
- TS-001: Every citable business rule has at least one test naming it: `describe('RN-014 parto exige PRENADA', ...)`.
- TS-002: Property test for TR-014: recalculate `categoria_reproductiva` from event sequence == cached value.
- TS-003: Fixtures = `seed_v3.ts` (demo level). Tests don't invent their own catalogs.
- TS-004: Non-negotiable E2E minimums: (1) login + "keep session"; (2) register group vaccine **offline** → reconnect → verify sync and stock; (3) farm switch with pending items (warning dialog); (4) RBAC: read-only user doesn't see Configuración or create buttons.
- TS-005: KPI tests validate against exact definitions from §6 AF (edge cases included).

**Build/Deploy:**
- Docker multi-stage: `node:22-alpine` build → `node:22-alpine` runtime (only Nitro output).
- `docker-compose.yml`: web + postgres:17-alpine.
- Dokploy: Compose project type, Traefik for TLS, secrets in Dokploy variable manager.
- Migrations: `pnpm --filter db migrate` as Dokploy pre-deploy command.
- CI pipeline: install → biome ci → typecheck → test → build → e2e → coverage gate.

**Version base:** Node 22 LTS, pnpm ≥9, TypeScript `strict: true`, PostgreSQL 17.

### Gaps / Risks
- **All testing layers show `available: false`** in openspec config — runners not scaffolded yet.
- **No `pnpm-workspace.yaml`**, `turbo.json`, `biome.json` exist yet.
- **Testcontainers for Postgres** integration tests require Docker in CI — not yet configured.
- **Property-based testing** (fast-check) for sync contract is mentioned but no examples exist.
- **Renovate bot** is mentioned but not configured.

### What needs to be built first
1. `pnpm-workspace.yaml` + `turbo.json` + root `package.json`.
2. `packages/config` with shared tsconfig, biome config.
3. Vitest configuration for `packages/dominio` with TDD setup.
4. `packages/db` Drizzle config for both PG and SQLite.

---

## 4. Diseño de Opción (Decision Design / Tradeoffs)

### Key architectural decisions and tradeoffs

**ADR A2: TanStack Start over Next.js/Remix**
- **Pros**: Fullstack in one artifact, extreme type safety, server functions as "backend" (real backend is sync + domain, not public API).
- **Cons**: Smaller ecosystem than Next.js, less battle-tested.
- **Escape hatch**: If public API needed, create `apps/api` (Hono) in monorepo consuming `packages/dominio` and `packages/aplicacion`. Layer rules guarantee no rewrite needed.

**ADR A6: Custom sync over Firebase/Supabase/CRDTs**
- **Pros**: Full control over conflict resolution (RN-060/061), schema already models it, no external dependency.
- **Cons**: Must implement push/pull, conflict resolution, snapshot, idempotency — significant engineering.
- **Tradeoff**: The `sync_outbox` table is already in the schema. The protocol is fully specified (§6 of especificaciones_tecnicas.md). This is a "known hard" vs "unknown hard" tradeoff.

**ADR A5: SQLite WASM (wa-sqlite) over IndexedDB/Dexie**
- **Pros**: Same Drizzle schema for PG and SQLite, SQL query power, offline-first with real relational queries.
- **Cons**: OPFS has browser support limitations, requires COOP/COEP headers, iOS/Safari eviction risk.
- **Mitigation**: `navigator.storage.persist()` at first login; aggressive sync on reconnect (outbox is irreplaceable).

**ADR A8: Tailwind v4 + shadcn/ui + custom `ui` package**
- **Pros**: Component library already built (v1.2.1), design tokens established, dark mode works via CSS variables.
- **Cons**: shadcn/ui components are copy-pasted (not a versioned dependency) — updates require manual merging.
- **Decision**: Accept this tradeoff. The `ganado/` components encapsulate all design decisions; pages only compose.

**Schema design choices:**
- `categoria_reproductiva` is **cached** on `animales` table (derived from events, not manually edited). TR-014: recalculable from event sequence. This is a performance optimization for list queries.
- `estado_animal_key` is integer-based (from `config_key_values`), while `categoria_reproductiva` is TEXT CHECK. Mixed approach — v3 migration left some legacy integer keys.
- `sync_outbox` uses JSONB payload — flexible but requires schema validation on the server side.
- Roles are per-farm (`usuarios_roles_asignacion.finca_id` can be NULL for global roles). This enables the multi-farm RBAC model.

**Offline conflict resolution strategy:**
- Uniqueness conflicts (e.g., same animal code created on two devices): first to server wins, second goes to review queue. **Nothing is silently discarded** (RN-060).
- State conflicts: last-write-wins by event timestamp for location/health; lifecycle by severity (MUERTO > VENDIDO > EN_FINCA) for close timestamps (RN-061).
- Stock can go negative (RN-041): this is a reconciliation alert, not an error. Design accepts this to avoid blocking field work.

### Gaps / Risks
- **Mixed type approach** in schema (integer keys vs TEXT CHECK) — some fields like `sexo_key`, `estado_animal_key` are integers referencing `config_key_values`, while `categoria_reproductiva` is TEXT. This creates inconsistency in the domain model.
- **JSONB in sync_outbox** — no schema validation specified for the payload. Could lead to data corruption if client sends malformed data.
- **No versioning strategy** for the sync protocol — what happens when client and server have different schema versions?
- **No rate limiting** specification beyond login/recuperation — what about API abuse from offline clients pushing large batches?

---

## 5. Componentes Básicos (Basic Components)

### Component inventory

The component library is at `docs/ganaweb-componentes/ganaweb/src/` (v1.2.1). It is a **reference implementation** — not yet integrated into a monorepo package.

| Component | Purpose | Key Props | Patterns | Dependencies |
|-----------|---------|-----------|----------|--------------|
| **types.ts** | Domain types shared by all components | `AnimalResumen`, `FincaResumen`, `MaestroResumen`, `Permiso`, `PermisosUsuario` | RBAC helpers: `crearPermisos()`, `tienePermiso()` for O(1) permission checks | None |
| **EstadoBadge** | Semantic status badge | `variant` (exito/alerta/peligro/info/neutral), `size`, `withDot`, `icon` | CVA variants; domain mappers: `CategoriaBadge`, `SaludBadge`, `EstadoAnimalBadge`, `StockBadge` | class-variance-authority |
| **MetricCard** | Dashboard single-metric card | `label`, `value`, `context`, `contextTone`, `critical`, `onPress` | Navigable (v1.2): converts to button when `onPress` provided; skeleton variant | None |
| **AnimalCard** | Mobile animal list row | `animal`, `selectionMode`, `selected`, `onPress`, `onLongPress` | Long-press (450ms) activates selection mode; useRef for timer cleanup (v1.2 fix); min-height 72px | lucide-react |
| **SyncPill** | Global sync indicator (always visible) | `estado`, `pendientes`, `compact`, `onClick` | Three states: sincronizado (green dot), pendiente (amber pill), offline (cloud icon); never blocking modal | lucide-react |
| **Timeline** | Animal event history | `eventos: EventoTimeline[]` | Domain-colored nodes (purple/coral/teal/blue); vertical 2px border; Intl.DateTimeFormat es-CO | lucide-react |
| **EmptyState** | Empty state with required action | `icon`, `title`, `description`, `actionLabel`, `onAction` | Always with action, never just text; uses shadcn Button | @/components/ui/button |
| **FincaSwitcher** | Multi-farm selector (header) | `fincas`, `fincaActivaId`, `offline`, `puedeCrearFinca`, `onSeleccionar` | Shared `FincaList` for dropdown/drawer; pending items warning dialog; dynamic roles (string, not enum); disabled farms shown (never hidden) when offline | shadcn DropdownMenu, AlertDialog |
| **MaestroCard/MaestroGrid/MaestrosProgreso** | Configuration index | `maestro: MaestroResumen`, `onPress` | Grouped by personas/ubicacion/clasificacion; blocking-empty alert ("Vacío · requerido para..."); progress indicator "5 de 8 requeridos completos" | lucide-react |
| **ThemeToggle** | Light/dark mode switch | `className` | localStorage persistence; anti-flash script in `<head>`; `dark` class on `<html>` | lucide-react |
| **EventDrawer** | Quick event registration (3-step) | `open`, `animalesPreseleccionados`, `tipoPreseleccionado`, `onGuardar` | 3-step flow: tipo → alcance → formulario; skips steps when pre-selected; `FormularioVacuna` as reference implementation | shadcn Drawer, Select, Input, Label, Collapsible, Button |
| **FormularioVacuna** | Vaccine form (reference) | `animales`, `productos`, `onGuardar`, `onVolver` | Common value for batch + per-animal selection; product stock from local replica; shortcut chips for next dose (+21d/+6m/+1y); collapsible optional fields; sticky footer with real count | shadcn components |

**Utility:**
- `utils.ts`: `cn()` helper (clsx + tailwind-merge) — standard shadcn pattern.

**Styles:**
- `globals.css`: Full token system (v1.2) with light/dark modes, Tailwind v4 `@theme inline` integration, typography scale, radius, spacing, layout variables.

### Patterns observed
1. **Props-down, events-up**: Components receive data via props, emit events via callbacks. No internal data fetching.
2. **Local replica, never network**: Catalogs come from props (SQLite local replica). Components never fetch.
3. **Domain language in Spanish**: Labels, badges, messages use Colombian Spanish domain vocabulary.
4. **CVA for variants**: `class-variance-authority` for component variants (EstadoBadge).
5. **Accessibility built-in**: `aria-pressed`, `aria-current`, `aria-label`, `sr-only` for screen readers, `focus-visible:ring` for keyboard navigation.
6. **Touch-first sizing**: All interactive elements ≥ 44px (`--h-touch`).

### Gaps / Risks
- **No package.json or tsconfig** found in the component library — it's a reference, not a buildable package yet.
- **Missing forms**: Only `FormularioVacuna` is implemented. The EventDrawer contract expects: `FormularioPeso`, `FormularioPalpacion`, `FormularioServicio`, `FormularioParto`, `FormularioProduccion`. These are documented as "follow the same contract" but not built.
- **Missing components from design brief**: `AnimalTable` (desktop TanStack Table), `EventTable`, `Command` (global search), `Recharts` chart wrappers, genealogy SVG tree.
- **shadcn/ui dependency**: The components import from `@/components/ui/*` (shadcn). These base components must be installed via `npx shadcn@latest add ...` before the ganado/ components work.
- **No tests**: The component library has no unit or visual regression tests.

---

## Domain Model Summary (from schema_v3_corregido.sql)

### Core Entities

| Entity | Table | Key Fields | Relationships |
|--------|-------|------------|---------------|
| **Usuario** | `usuarios` | id, nombre, email, email_verificado, intentos_fallidos, bloqueado_hasta | → sesiones, contrasenas, fincas, roles |
| **Finca** | `fincas` | id, codigo, nombre, departamento, municipio, area_hectareas | → potreros, sectores, lotes, grupos, parametros, maestros |
| **Animal** | `animales` | id, finca_id, codigo, nombre, fecha_nacimiento, sexo_key, estado_animal_key, categoria_reproductiva, ind_descartado | → madre_id (self), padre_id (self), potrero, sector, lote, grupo, hierro, propietario, raza |
| **Servicio** | `servicios` | id, animal_id, fecha, tipo (monta/inseminacion/transferencia), padre_id, pajuela_id, inseminador_id, efectivo | → animal, pajuela, inseminador (veterinarios) |
| **Palpación** | `palpaciones` | id, animal_id, servicio_id, fecha, resultado (prenada/vacia/dudoso) | → animal, servicio, diagnostico |
| **Parto** | `partos` | id, animal_id, servicio_id, fecha, machos, hembras, muertos, tipo_parto | → animal, servicio, crias (via partos_crias) |
| **Peso** | `pesos` | id, animal_id, fecha, peso_kg, tipo_peso (nacimiento/destete/control/compra/venta) | → animal |
| **Producción Láctea** | `producciones_lacteas` | id, animal_id, fecha, cantidad_am, cantidad_pm, potrero_id (snapshot) | → animal, potrero (snapshot) |
| **Aplicación Sanitaria** | `aplicaciones_sanitarias` | id, animal_id, producto_id, fecha, dosis, precio_dosis (snapshot), proxima_dosis | → animal, producto_sanitario |
| **Venta** | `ventas` | id, animal_id, fecha, motivo_venta_id, precio | → animal, motivo_venta |
| **Muerte** | `muertes` | id, animal_id, fecha, causa_muerte_id | → animal, causa_muerte |
| **Registro Grupal** | `registros_grupales` | id, finca_id, tipo_evento, total_animales, anulado_en | → finca, lotes, potreros |

### State Machines

**1. Animal Lifecycle** (`estado_animal_key`):
```
[*] → EN_FINCA (nacimiento/compra)
EN_FINCA → VENDIDO (venta event)
EN_FINCA → MUERTO (muerte event)
VENDIDO → [*] (terminal)
MUERTO → [*] (terminal)
```
- TR-001: VENDIDO and MUERTO are terminal and mutually exclusive.
- TR-002: Terminal animals keep `activo=1` (historical); excluded from operational lists by `estado`, not `activo`.
- TR-003: Anulling sale/death returns to EN_FINCA.

**2. Reproductive Category** (`categoria_reproductiva`, females only, event-derived):
```
[*] → NOVILLA (born female)
NOVILLA → VACIA (reaches aptitude: age/peso, RN-010)
VACIA → SERVIDA (Servicio)
SERVIDA → PRENADA (Palpación resultado=prenada)
SERVIDA → VACIA (Palpación resultado=vacia)
PRENADA → PARIDA (Parto tipo≠aborto)
PRENADA → VACIA (Parto tipo=aborto or Palpación=vacia)
PARIDA → VACIA (end of puerperio, parameter default 45 days)
PARIDA → SERVIDA (Servicio, early heat)
```
- TR-010: Category changes ONLY by events or daily puerperio job. Never manually edited.
- TR-011: Palpación `resultado=dudoso` does NOT transition; generates re-palpation task at +30 days.
- TR-014: Field is a **cache**; source of truth is event sequence. Recalculation must match.

**3. Etapa Productiva** (derived, not persisted):
- Calculated from `edad = hoy − fecha_nacimiento` against `config_rangos_edades` (filtered by sex).
- Seed: Cría (0-8m), Levante (8-18m), Novilla/Torete (18-30m), Adulto (30+m).

### Key Constraints
- `uq_animales_finca_codigo`: Animal code unique per farm (RN-001).
- `uq_usuarios_fincas`: User-farm access unique.
- `uq_usuarios_roles`: User-role-farm assignment unique.
- `uq_parametros_finca_codigo`: Parameter code unique per farm.
- `uq_sesiones_token`: Session refresh token hash unique.
- `UNIQUE (animal_id, fecha)` on `producciones_lacteas`: one milk record per animal per day.

---

## KPI Inventory (from kpis_reportes_ganaderos.sql)

| KPI | Name | What it measures | Key formula |
|-----|------|------------------|-------------|
| **KPI-01** | Tasa de concepción por reproductor | Conception rate by bull/semen | `servicios efectivos / servicios evaluados × 100`, by `COALESCE(pajuela_id, padre_id)`. Min 5 evaluated services to show. |
| **KPI-02** | Efectividad por inseminador | Inseminator effectiveness | Same as KPI-01 filtered `tipo='inseminacion'`, grouped by `inseminador_id`. |
| **KPI-03** | Intervalo entre partos (IEP) | Days between consecutive partos | `LAG(fecha) OVER (PARTITION BY animal_id)`, excluding abortos. Target: 365-400 days. |
| **KPI-04** | Días abiertos | Open days since last parto | `fecha_concepcion − fecha_ultimo_parto` (or `hoy − fecha_ultimo_parto` if open). Target: <110 days. |
| **KPI-05** | Producción láctea | Daily milk production | `Σ(cantidad_am + cantidad_pm)` by date, groupable by potrero/lote (using location **snapshot**). |
| **KPI-06** | Ganancia diaria de peso (GDP) | Daily weight gain | `(peso_final − peso_inicial) / (fecha_final − fecha_inicial)`. Requires ≥2 weighings and ≥14 days separation. |
| **KPI-07** | Peso ajustado al destete (205d) | Adjusted weaning weight | `peso_nacimiento + ((peso_destete − peso_nacimiento) / edad_destete_dias) × 205`. |
| **KPI-08** | Costo sanitario | Sanitary cost | `Σ(dosis × precio_dosis snapshot)` per animal and per potrero (current potrero, not historical). |
| **KPI-09** | Refuerzos pendientes | Pending boosters | `proxima_dosis ≤ hoy + 30d` without subsequent application of same product to same animal. Only EN_FINCA. |
| **KPI-10** | Inventario sanitario | Sanitary inventory | View `inventario_sanitario`: `Σentradas − Σaplicaciones`. States: agotado (≤0), bajo (<20), ok. |
| **KPI-11** | Composición del hato | Herd composition | Counts on EN_FINCA + activo=1: total, by sex, preñadas, enfermos, descarte. |
| **KPI-12** | Natalidad | Birth rate | `crías nacidas vivas / hembras aptas promedio × 100`, annualized. New in v3. |
| **KPI-13** | Mortalidad | Mortality rate | `muertes / inventario promedio × 100`, by causa and etapa. New in v3. |

**Implementation note**: All queries filter by `finca_id ($1)` for multi-tenancy. KPIs are online-only (against Postgres). Reports are online-only; field captures only.

---

## First-Change Recommendation

### Recommended: `scaffold-monorepo` — Monorepo scaffolding + tooling setup

**Why this first:**
1. **No code exists yet** — only planning docs, schema, seed, and component library. Everything depends on having a buildable project structure.
2. **The dependency rule** (§3 of especificaciones_tecnicas.md) requires packages to exist before any domain code can be written.
3. **Testing is mandatory** (TDD in dominio, ≥90% coverage) — Vitest must be configured before the first line of domain code.
4. **The component library** needs to be migrated into `packages/ui` before any UI work.
5. **The schema** needs to be converted to Drizzle migrations before any data work.

**What the first change should include:**
1. `pnpm-workspace.yaml` + root `package.json` + `turbo.json` + `biome.json`.
2. Package scaffolding: `packages/dominio`, `packages/aplicacion`, `packages/db`, `packages/sync`, `packages/ui`, `packages/config`.
3. `packages/config`: shared `tsconfig.json` base, biome presets.
4. `packages/dominio`: first entity types + one RN rule with TDD test (e.g., RN-001: código unique per farm).
5. `packages/db`: Drizzle schema generated from `schema_v3_corregido.sql` (PG + SQLite).
6. `packages/ui`: migrate `globals.css` + `utils.ts` + shadcn base components + first ganado/ component (e.g., `EstadoBadge`).
7. `apps/web`: TanStack Start minimal app with health check route.
8. Vitest configuration with TDD setup for `packages/dominio`.
9. `dependency-cruiser` config for dependency rule verification.
10. GitHub Actions CI pipeline skeleton.

**Estimated scope**: This will likely exceed the 400-line PR budget. Recommend **chained PRs**:
- PR 1: Root config (pnpm, turbo, biome, tsconfig) + empty package stubs.
- PR 2: `packages/dominio` with first entity + TDD test.
- PR 3: `packages/db` with Drizzle schema.
- PR 4: `packages/ui` with component library migration.
- PR 5: `apps/web` minimal TanStack Start app.

---

## Risks

1. **No code exists** — the gap between planning docs and implementation is 100%. Every decision must be validated by building.
2. **Sync protocol complexity** — the custom sync is the hardest technical challenge. It's well-specified but untested. Recommend building it incrementally (online-only first, then outbox, then pull, then conflict resolution).
3. **SQLite WASM browser support** — OPFS and wa-sqlite have browser compatibility caveats. Must verify early on target browsers.
4. **Mixed type approach in schema** — integer keys vs TEXT CHECK creates inconsistency. Recommend standardizing during Drizzle schema generation.
5. **Component library completeness** — only 13 of the needed components exist. Missing: all event forms except vacuna, desktop table, charts, genealogy tree, global search.
6. **KPI queries reference PostgreSQL-specific syntax** (`LAG`, `WINDOW`, `FILTER`) — these won't work in SQLite. Reports are online-only by design, but this should be enforced architecturally.
7. **No testing infrastructure** — Vitest, Playwright, Testcontainers, fast-check all need setup before any test can run.
8. **Review budget** — the monorepo scaffold change will be large. Must use chained PRs.

---

## Ready for Proposal

**Yes** — the planning documentation is comprehensive and internally consistent. The five dimensions (design, architecture, technical specs, decisions, components) are well-defined and cross-referenced.

**What to tell the user:**
- The exploration is complete. All planning docs have been analyzed and synthesized.
- The recommended first change is `scaffold-monorepo` (monorepo scaffolding + tooling setup).
- This change should be split into chained PRs due to scope.
- The next SDD phase is `sdd-propose` to formalize the first change proposal.

**Key discovery**: The project has excellent planning documentation — rare for a greenfield project. The domain rules (RN/TR/PE) are citable and test-ready. The design system is implementation-ready. The architecture is well-thought-out with documented escape hatches. The main risk is the gap between docs and code (100% — nothing is built yet).
