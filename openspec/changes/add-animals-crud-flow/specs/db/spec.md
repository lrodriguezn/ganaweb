# Delta for DB

## ADDED Requirements

### Requirement: Animal CRUD schema coverage

`packages/db` MUST expose the animal aggregate columns and related event/reference tables needed by CA-CRE, CA-UPD, CA-TL, and CA-DEL checks, including version, active state, genealogy, location, weights, sales, deaths, and finca ownership.

DB owns the infrastructure side of CA-CRE-006 persistence, CA-DEL reference queries/audit/tombstones, and CA-IMG metadata/link constraints. Domain receives only pure facts/results and MUST NOT perform table reference queries.

#### Scenario: Reference checks are queryable
- GIVEN an animal id
- WHEN delete or code-edit eligibility is checked
- THEN DB adapters can detect references across CA-TL-001 sources and offspring roles.

### Requirement: Image principal and delete audit deltas

DB schema MUST support `animales_imagenes.es_principal` and immutable physical-delete audit. The prior “two new columns” ambiguity is resolved outside this change artifact and MUST NOT block spec/design work.

#### Scenario: One principal per animal
- GIVEN multiple active image links for an animal
- WHEN schema constraints/adapters are evaluated
- THEN they can enforce at most one active principal image.

#### Scenario: Physical delete audit
- GIVEN an animal is physically deleted
- WHEN the transaction commits
- THEN immutable audit data persists animal identity, finca, user, date, device, and delete path.

### Requirement: Authenticated image storage metadata

DB adapters MUST persist image metadata under finca ownership and MUST NOT require public URLs.

#### Scenario: Image metadata saved
- GIVEN an image is attached
- WHEN the transaction commits
- THEN `imagenes` and `animales_imagenes` records identify finca, path, metadata, active link, and principal status.
