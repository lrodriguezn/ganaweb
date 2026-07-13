# Design: Complete Animals CRUD Flow

## Technical Approach

Add a vertical slice across `apps/web`, `ui`, `dominio`, `aplicacion`, `db`, and `sync`. Domain rules stay pure; use cases coordinate permission, transactions, repositories, reference checks, files, and outbox; web routes bind loaders/actions only. Visual implementation is governed by validated OpenPencil live canvas screens 03/04/18/19/20/21 on page `GanaWeb` (`page-1`) plus `docs/ganaweb-design.md`; the prior OpenPencil-unavailable risk is resolved for these animal CRUD screens.

## Architecture Decisions

| Topic | Choice | Rationale |
|---|---|---|
| Routing/security | Use `/fincas/$fincaId/animales`, `/nuevo`, `/$animalId`, `/$animalId/editar`; every loader/action revalidates session, finca membership, animal ownership, and permission. | Existing shell/auth patterns already centralize session decisions; URL finca is never authority. |
| Use cases | Create `crearAnimal`, `actualizarAnimal`, `eliminarAnimal`, `reactivarAnimal`, image operations, `obtenerFichaAnimal`. | Matches specs and keeps routes thin/testable. |
| Delete safety | Add one `AnimalReferenceCheckerPort` used for code immutability, delete eligibility, timeline references, and reactivation conflicts. | Prevents divergent reference definitions across UI, domain, and DB. |
| Images/sync | Data outbox remains separate from binary queue; OPFS/local blob state feeds authenticated file storage. | Image upload failures must not block animal metadata sync. |
| UI parity | Map routes to dedicated responsive containers, composing existing `AnimalCard`, `Timeline`, badges, primitives, and new animal form/gallery/ficha components. | Reuses package UI contracts while matching named OpenPencil screens. |

## Data Flow

`Route loader/action -> requireAnimalPermission -> use case -> dominio rules -> transaction ports -> db/file adapters -> sync_outbox/binary_queue -> UI pending states`. Delete evaluates reference summary + online + permission/self-service; physical delete writes audit and tombstone atomically.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/src/routes/_app/fincas/$fincaId/animales*.tsx` | Create | List, create/edit, ficha, actions. |
| `apps/web/src/server/animal-actions.server.ts` | Create | Session/finca/RBAC wrapper. |
| `packages/ui/src/ganado/animal-*` | Create/Modify | Table, form, ficha header, gallery, genealogy, delete dialog, responsive screen shells. |
| `packages/dominio/src/animal*.ts` | Modify | CA-CRE/UPD/IMG/DEL/TL pure validators and result unions. |
| `packages/aplicacion/src/casos-uso/animales/*` | Create | Use cases and DTO contracts. |
| `packages/aplicacion/src/puertos/*animal*` | Modify/Create | Repository, references, timeline, files, queue, transactions. |
| `packages/db/src/schema/{imagenes,auditoria,sync,animales}.ts` | Modify | Principal link, audit, queue/tombstone adapters, reference queries. |
| `packages/sync/src/*animal*` | Create/Modify | Animal operation envelopes, tombstones, binary queue statuses, conflict review. |

## Interfaces / Contracts

```ts
type DeleteAnimalResult =
  | { tipo: "eliminado"; via: "permiso" | "autoservicio" }
  | { tipo: "inactivado"; eventos: number }
  | { tipo: "denegado"; razon: string }

interface AnimalReferenceCheckerPort {
  summarize(animalId: string, fincaId: string): Promise<{
    eventCount: number; offspringCount: number; blocksCodeChange: boolean;
  }>
}
```

Create requires `codigo`, `nombre`, `sexo_key`, implicit finca. `color`/`raza` stay optional. `codigo` is read-only when `blocksCodeChange` is true.

## UI Mapping

| OpenPencil screen | Route/component responsibility |
|---|---|
| 18 Animales · Desktop (`f-300165`) | Desktop table: 44px rows, filters, search, pagination, selection bar, `BtnNuevo`. |
| 03 Animales · Mobile (`frame-0185`) | Mobile cards, bottom nav, FAB, long-press selection, filter/search. |
| 19 Ficha Animal · Desktop (`f-400107`) | Two-column ficha: summary/gallery/genealogy + timeline card. |
| 04 Ficha Animal · Mobile (`frame-0232`) | Mobile ficha header, metric cards, tabs/pills, timeline, bottom nav. |
| 20 Nuevo Animal · Desktop (`f-400191`) | Centered create/edit form card with Código, Nombre, arete, Sexo, Raza, date, Color, Calidad, Origen, parent, Potrero/Sector/Lote/Grupo, Save/Cancel. |
| 21 Nuevo Animal · Mobile (`f-400233`) | Fullscreen form, 52px header, 80px sticky footer, Código, Nombre, Sexo, Raza, date, Madre, Potrero, contextual create hint for raza. |

All screens use semantic tokens, high contrast, no decorative shadows, 44px+ targets, sticky save, info offline notes, Spanish copy.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | CA rules, references, delete matrix, principal invariant | Vitest TDD in `packages/dominio`. |
| Integration | Use cases, PG/SQLite adapters, outbox/binary queue, RBAC denial | Vitest dual fixtures when available. |
| E2E | Offline create with image, referenced delete -> inactivate, read-only RBAC, responsive screen parity | Playwright + visual/DOM assertions mapped to OpenPencil screen responsibilities. |

## Threat Matrix

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A: no executable classification. | None. | None. |
| Git repository selection | N/A: no VCS commands. | None. | None. |
| Commit state | N/A: no commit automation. | None. | None. |
| Push state | N/A: no push automation. | None. | None. |
| PR commands | N/A: no PR automation. | None. | None. |

Routing boundary: RED tests cover forged `fincaId`, cross-finca `animalId`, missing permissions, and direct mutations.

## Migration / Rollout

Add minimal schema deltas only: `animales_imagenes.es_principal`/active invariant if absent, immutable delete audit, tombstone/binary queue metadata if absent. Roll out in chained PRs: domain/use-case contracts, db/sync adapters, UI, web routes, E2E/visual hardening.

## Open Questions

- [ ] None blocking for OpenPencil validation; live canvas frame inspection succeeded for the required animal CRUD screens.
