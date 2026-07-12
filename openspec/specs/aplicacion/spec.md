# Aplicación Specification

## Purpose

Creates the `packages/aplicacion` package with port interfaces, shared DTO/input types, and framework-independent auth use cases for registration, login, logout, session lookup, guard decisions, and finca-admin approval. Establishes the dependency boundary between `apps/web`, `packages/dominio`, and `packages/db`.

## Requirements

### Requirement 1: Ports and auth use cases only

`packages/aplicacion` MUST contain port definitions, shared DTO/input types, and framework-independent auth use cases required for registration, login, logout, session lookup, guard decisions, and finca-admin approval. It MUST NOT contain repository implementations, DB driver code, route code, or UI logic.

#### Scenario: No infrastructure logic

- GIVEN a file listing of `packages/aplicacion/src`
- WHEN every `.ts` file is inspected
- THEN no repository implementation, DB driver import, route handler, or UI logic is present.

### Requirement 2: Repository port for animals

`packages/aplicacion` MUST define an `AnimalRepositoryPort` interface with operations needed to verify RN-001, such as `buscarPorCodigoYFinca(codigo, fincaId)`.

#### Scenario: Port is consumed by a future use case

- GIVEN a future `CrearAnimal` use case
- WHEN it imports `AnimalRepositoryPort`
- THEN it can request an animal by código and finca without knowing the storage technology.

### Requirement 3: System clock port

`packages/aplicacion` MUST define a `RelojDelSistemaPort` interface that provides the current date/time, so future use cases remain testable and deterministic.

#### Scenario: Tests control time

- GIVEN a future use case depends on `RelojDelSistemaPort`
- WHEN a test provides a fixed clock
- THEN the use case produces deterministic timestamps.

### Requirement 4: Outbox port stub

`packages/aplicacion` MUST define an `OutboxPort` interface for appending domain events to the sync outbox, matching the shape expected by `packages/sync` without implementing it.

#### Scenario: aplicacion depends on sync contract

- GIVEN `packages/aplicacion` imports `OutboxPort`
- WHEN its signature is compared to `packages/sync` push/pull types
- THEN the event payload shape is compatible.

### Requirement 5: Dependency direction

`packages/aplicacion` MAY depend on `packages/dominio` and `packages/sync`; it MUST NOT depend on `packages/db` or `apps/web`.

#### Scenario: Layer rule holds

- GIVEN `dependency-cruiser` runs in CI
- WHEN it evaluates `packages/aplicacion`
- THEN no imports from `packages/db` or `apps/web` are reported.

### Requirement 6: Auth ports and use cases

`packages/aplicacion` MUST define framework-independent contracts and use cases for self-serve registration, password login, logout, session persistence checks, pending authorization checks, and finca-admin approval.

#### Scenario: Registration returns pending outcome

- GIVEN valid registration input
- WHEN the registration use case completes
- THEN it returns a pending authorization outcome without granting protected app access.

#### Scenario: Approved login returns session outcome

- GIVEN approved user credentials are valid
- WHEN the login use case completes
- THEN it returns an authenticated session outcome.

### Requirement 7: Authorization decisions are explicit

`packages/aplicacion` MUST expose authorization decisions that distinguish unauthenticated, pending, and approved users so web guards can enforce PE-002 server-side.

#### Scenario: Pending decision blocks app use

- GIVEN a session belongs to a pending user
- WHEN authorization is evaluated
- THEN the decision is pending and protected app use is denied.

#### Scenario: Approved decision allows finca access

- GIVEN a session belongs to an approved finca user
- WHEN authorization is evaluated
- THEN the decision allows access for that finca.

### Requirement 8: Auth exclusions remain outside application contracts

`packages/aplicacion` MUST NOT add use cases for 2FA, password recovery, email verification, social login, account deletion, full RBAC administration, or offline auth/session sync in this change.

#### Scenario: Out-of-scope contracts are absent

- GIVEN the application package public API is inspected
- WHEN auth contracts are listed
- THEN no 2FA, recovery, verification, social login, deletion, full RBAC admin, or offline session sync use case is exposed.

## Rule Citations

- T-003 — Domain names in Spanish: `AnimalRepositoryPort`, `RelojDelSistemaPort`, `OutboxPort` method names may use Spanish domain verbs.
- PE-001..PE-004 — Permission rules out of scope this change; ports leave room for future permission checks.
- PE-001, PE-002, PE-003, PE-007 — permission checks and approval outcomes.
