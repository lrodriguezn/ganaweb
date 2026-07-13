# Proposal: Complete Animals CRUD Flow

## Intent

Deliver finca-scoped animal CRUD for field capture and lifecycle safety. Feature doc v1.2 is source of truth: events are consumed for timeline/reference checks, not created here. References: RN-001, RN-020, RN-050, RN-060, RN-061, TR-001, TR-002, PE-002/003/006.

## Scope

### In Scope
- Use cases: create/update/delete/reactivate, image operations, ficha with timeline.
- Create top-level required fields are `codigo`, `nombre`, and `sexo_key`, with implicit `finca_id`; origin/date inputs remain conditional business fields only when the selected flow requires them. Color and breed/raza are optional.
- Permissions: `animales:ver/crear/editar/inactivar/eliminar`; server revalidates permission/finca membership, never URL `fincaId` alone.
- List defaults/search/filters; ficha timeline sources/order/pagination/year grouping and inactive/sold/dead banners.
- Images: max 5, compression, auth storage, principal flag on `animales_imagenes`, binary queue, timeline item, unlink/purge.
- Delete: server chooses physical delete vs inactivate; supports tombstone sync, self-service recent-error delete, immutable audit.

### Out of Scope
- Creating animal events: weights, services, vaccines, sales, deaths, movement.
- Bulk import, analytics, public image URLs, S3 adapter.

## Capabilities

### New Capabilities
- `animal-management`: Animal CRUD, ficha, images, timeline, safe update/delete/reactivation.

### Modified Capabilities
- `web`: Guarded finca routes/actions and responsive flows.
- `ui`: Animal cards, timeline, badges, empty states, Spanish copy.
- `dominio`: CA validations for create/update/images/delete.
- `aplicacion`: Animal use cases/ports with offline/outbox contracts.
- `db`: Feature-required image/deletion-audit deltas only.
- `sync`: CRUD outbox, tombstones, conflicts, binary queue.

## Approach

Use the design-brief vertical slice: pure domain rules, framework-independent use cases, guarded server functions, and minimal schema deltas. `imagenes`/`animales_imagenes` already exist; add only v1.2 principal-link/audit pieces.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/web/src/routes/_app/fincas*/animales*` | New | List, create, ficha, edit, image/delete. |
| `packages/dominio/src/animal*` | Modified | CA create/update/delete/image validations. |
| `packages/aplicacion/src` | Modified | Animal use cases, ports, DTOs. |
| `packages/db/src/schema` | Modified | Minimal image bridge/audit deltas and adapters. |
| `packages/sync/src` | Modified | Outbox, tombstone, binary queue. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Delete safety misses references | High | Centralize CA-UPD-001 dependency check. |

## Rollback Plan

Revert animal routes/use cases/adapters/schema deltas as one slice. Keep shell navigation; disable/empty Animales if needed. Reverse migrations only before production data depends on them.

## Dependencies

- Feature doc v1.2; `docs/schema_v3_corregido.sql`; design docs; specs for web/ui/dominio/aplicacion/db/sync.

## Success Criteria

- [ ] §8 use cases work online/offline with server-side permission/finca validation.
- [ ] CA-CRE/UPD/IMG/DEL/TL rules meet §9 tests.
- [ ] List/ficha/timeline/images/delete match v1.2 without event creation.
- [ ] Required create fields are enforced as `codigo`, `nombre`, and `sexo_key`; color/raza remain optional.
