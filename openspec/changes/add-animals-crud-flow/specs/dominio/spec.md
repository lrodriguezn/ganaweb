# Delta for Dominio

## ADDED Requirements

### Requirement: Animal create validations

`packages/dominio` MUST expose pure validations for the CA-CRE rule surface that can be decided without I/O: required `codigo`, `nombre`, and `sexo_key`; trimmed case-insensitive code uniqueness when the caller supplies existing finca animals; conditional origin/date requirements when applicable; genealogy constraints from caller-supplied parent summaries; estimated birth-date note; and system-owned default fields. Color and breed/raza MUST NOT be required by create validation. CA-CRE-006 persistence concerns such as transactions, location/weight/image writes, and outbox records are explicitly owned by application orchestration plus PR2 DB/sync adapters, not by domain.

#### Scenario: Required minimum fields
- GIVEN code, name, and sex are valid
- WHEN create validation runs
- THEN the result is valid and cites the applied CA rules.

#### Scenario: Optional color and breed
- GIVEN code, name, and sex are valid with no color or breed
- WHEN create validation runs
- THEN the result remains valid.

#### Scenario: Invalid mother
- GIVEN `madre_id` references a male or another finca
- WHEN create validation runs
- THEN validation fails with CA-CRE-003.

### Requirement: Animal update and delete validations

Domain rules MUST validate CA-UPD-001..003 and the pure CA-DEL-001..009 decisions without I/O: referenced-code lock from caller-supplied reference facts, non-editable event-derived fields, version conflict input, physical delete eligibility, self-service delete, inactivation decision, and reactivation code check from supplied active-code facts. Reference table queries, tombstones, immutable audit persistence, and purge execution are explicitly owned by PR2 DB/sync/application adapters.

#### Scenario: Code immutable when referenced
- GIVEN the dependency summary says the animal has events
- WHEN code change validation runs
- THEN the change is rejected.

#### Scenario: Self-service delete allowed
- GIVEN creator, age, permission, online status, and reference summary satisfy CA-DEL-008
- WHEN delete eligibility is evaluated
- THEN the result permits physical delete via `autoservicio`.

### Requirement: Animal image validations

Domain rules MUST validate pure CA-IMG invariants: active image limit, allowed metadata decisions, exactly one active principal image, principal reassignment candidate when unlinking, and purge eligibility from caller-supplied link facts/dates. Authenticated storage, OPFS/local binary state, upload queues, physical blob deletion, and purge jobs are explicitly owned by application/file/sync adapters in PR2/PR3 scope.

#### Scenario: Principal image uniqueness
- GIVEN multiple active image links exist
- WHEN a principal is selected
- THEN exactly one active link is principal.
