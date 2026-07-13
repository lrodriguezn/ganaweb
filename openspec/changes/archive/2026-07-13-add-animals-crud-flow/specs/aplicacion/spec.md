# Delta for Aplicación

## ADDED Requirements

### Requirement: Animal use cases and ports

`packages/aplicacion` MUST define framework-independent use cases for `crearAnimal`, `actualizarAnimal`, `eliminarAnimal`, `reactivarAnimal`, image operations, and `obtenerFichaAnimal`, backed by ports for animals, references, timeline, files, permissions, clock, transactions, and outbox. `crearAnimal` MUST require `codigo`, `nombre`, and `sexo_key`; color and breed/raza MUST remain optional.

Application owns orchestration for infrastructure-dependent CA rules: it gathers reference summaries, permissions, clock/online facts, image metadata, and transaction/outbox/file-queue ports, then delegates pure outcomes to `packages/dominio`. It MUST NOT push DB, OPFS, sync, table-reference queries, or binary storage concerns into domain.

#### Scenario: Create use case pipeline
- GIVEN valid code, name, sex, and permissions
- WHEN `crearAnimal` runs
- THEN it validates permission, domain rules, transactional writes, and outbox entries.

#### Scenario: Permission denied
- GIVEN the user lacks the required animal permission
- WHEN any animal mutation use case runs
- THEN it returns an authorization failure before mutation.

### Requirement: Ficha and timeline query contract

`obtenerFichaAnimal` MUST return animal header data, images, genealogy, state banner, and a cursor-paginated timeline from CA-TL-001 sources while preserving offline-readable DTOs.

#### Scenario: Cursor timeline page
- GIVEN a ficha request includes a timeline cursor
- WHEN the use case runs
- THEN it returns the next 20 timeline items and next cursor if present.

### Requirement: Offline/outbox behavior

Animal create, update, inactivate, reactivate, and image-link changes MUST append outbox records; binary uploads MUST use a separate file queue so data sync is not blocked by image blobs.

The concrete persistence of CA-CRE-006 transaction details, CA-IMG storage/auth/OPFS/binary queue state, and CA-DEL tombstone/audit rows is implemented by PR2/PR3 adapters according to their owning specs.

#### Scenario: Offline image add
- GIVEN an image is added offline
- WHEN the use case completes
- THEN data changes are queued and the blob is queued separately with pending upload state.
