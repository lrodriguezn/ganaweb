# Animal Management Specification

## Purpose

Defines finca-scoped animal CRUD, ficha, images, timeline, safe deletion, and reactivation behavior for the first complete animals flow.

## Requirements

### Requirement: Finca-scoped animal access

Animal list, create, read, update, image, delete, and reactivate flows MUST be scoped to an authorized finca and MUST validate permission and finca membership server-side; URL `fincaId` alone MUST NOT be trusted (PE-002/PE-003).

#### Scenario: Authorized finca route
- GIVEN a user has `animales:ver` for finca F1
- WHEN they open `/fincas/F1/animales`
- THEN only F1 animals are returned.

#### Scenario: Tampered finca URL
- GIVEN a user lacks membership in finca F2
- WHEN they request an animal URL under F2
- THEN the server denies the action before reading or mutating data.

### Requirement: Create animal

Creating an animal MUST require `codigo`, `nombre`, `sexo_key`, and implicit finca. Origin/date inputs MAY be required only by the selected business flow; color and breed/raza MUST remain optional. The system MUST enforce CA-CRE-001..007 where applicable, set system defaults, and append outbox entries.

#### Scenario: Required minimum fields
- GIVEN valid code, name, and sex are supplied
- WHEN the user creates the animal
- THEN the animal is created with system defaults, version 1, and finca from context.

#### Scenario: Missing sex
- GIVEN valid code and name are supplied without sex
- WHEN creation is submitted
- THEN validation fails with a field-specific error.

#### Scenario: Conditional origin date
- GIVEN a selected origin flow requires a date and that date is missing
- WHEN creation is submitted
- THEN validation fails for that conditional business field without making color or breed required.

### Requirement: Create side effects

Create MUST write initial location history when location is captured, a weight event when weight is captured, image links when images are attached, and offline outbox/binary queue records without blocking local availability.

#### Scenario: Create with side effects
- GIVEN location, weight, and two images are supplied
- WHEN create succeeds
- THEN the animal, history, weight, image links, outbox, and binary queue records are committed consistently.

### Requirement: Animal listing

Listings MUST default to active animals in the active finca with `estado_animal_key=EN_FINCA`, sorted by code, searchable by code/name/ear tag/RFID, and filterable by reproductive category, health, potrero, and lote. Sold/dead and inactive animals MUST appear only through explicit toggles; inactive visibility requires `animales:inactivar`.

#### Scenario: Default list
- GIVEN active, sold, dead, and inactive animals exist
- WHEN the list loads without toggles
- THEN only active EN_FINCA animals are shown.

#### Scenario: Search and filters
- GIVEN animals across potreros and health states
- WHEN search and filters are applied
- THEN results match all criteria within the current finca.

### Requirement: Animal ficha and timeline

Ficha MUST show header, images, genealogy, state banner, and a timeline union of CA-TL-001 sources ordered by event date desc and created-at desc, paginated by 20, grouped by year for ranges over 12 months, excluding annulled group records.

#### Scenario: Timeline pagination
- GIVEN an animal has more than 20 timeline items across years
- WHEN the ficha opens
- THEN the first 20 newest items appear with year grouping and a “load more” affordance.

#### Scenario: Inactive state banner
- GIVEN an animal is inactive, sold, or dead
- WHEN the ficha opens
- THEN a persistent status banner appears and event actions are hidden.

### Requirement: Update animal

Updates MUST enforce CA-UPD-001..003: optimistic concurrency by `version`, immutable finca and event-derived fields, code immutable when referenced, and location changes only through movement events.

#### Scenario: Version conflict
- GIVEN another device updated the animal after the user loaded it
- WHEN the user saves with an old version
- THEN the update is rejected and the user is told to reload and reapply changes.

#### Scenario: Referenced code is locked
- GIVEN an animal has timeline events or offspring references
- WHEN edit mode opens
- THEN `codigo` is read-only with an explanation.

### Requirement: Animal images

Images MUST enforce max 5 active links, JPEG/PNG/WebP/HEIC input, WebP compression target, authenticated storage, one active principal image per animal, offline binary queue, timeline item on add, unlink on delete, and purge only after 30 days with no active links.

#### Scenario: Principal invariant
- GIVEN an animal has one principal image
- WHEN another image is marked principal
- THEN the previous principal is cleared in the same transaction.

#### Scenario: Image limit
- GIVEN an animal already has five active images
- WHEN a user attaches another image
- THEN the action is rejected.

### Requirement: Delete, inactivate, and reactivate

The server MUST decide physical delete versus inactivation. Physical delete is online-only and allowed only with no references plus `animales:eliminar` or CA-DEL-008 self-service; otherwise the animal is inactivated. Physical delete MUST create tombstone sync and immutable audit. Reactivation MUST validate code reuse.

#### Scenario: Physical delete by recent creator
- GIVEN the creator has `animales:crear`, created the animal less than 24 hours ago, and it has no events
- WHEN they delete online
- THEN the animal is physically deleted with tombstone and audit via `autoservicio`.

#### Scenario: Referenced animal is inactivated
- GIVEN the animal has events
- WHEN delete is requested
- THEN the server returns an inactivation outcome and preserves history.

#### Scenario: Reactivation conflict
- GIVEN an inactive animal code was reused
- WHEN reactivation is requested
- THEN the user must provide a new valid code.

### Requirement: RBAC behavior

Animal actions MUST respect `animales:ver`, `crear`, `editar`, `inactivar`, and `eliminar` with UI affordances hidden where unavailable and server checks always authoritative.

#### Scenario: Read-only user
- GIVEN a user has only `animales:ver`
- WHEN they view list and ficha
- THEN create, edit, image, delete, and reactivate actions are unavailable and server mutations are denied.
