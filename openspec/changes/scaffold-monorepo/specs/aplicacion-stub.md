# Aplicación Stub Specification

## Purpose

Creates the `packages/aplicacion` package with the port interfaces that future use cases will implement, establishing the dependency boundary between `apps/web`, `packages/dominio`, and `packages/db` without adding concrete use cases in this change.

## Requirements

### Requirement 1: Port interfaces only

`packages/aplicacion` MUST contain only port (interface) definitions and shared DTO/input types; it MUST NOT contain use-case implementations, repository code, or framework-specific logic.

#### Scenario: No use-case logic

- GIVEN a file listing of `packages/aplicacion/src`
- WHEN every `.ts` file is inspected
- THEN no executable use-case function or repository implementation is present.

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

## Rule Citations

- T-003 — Domain names in Spanish: `AnimalRepositoryPort`, `RelojDelSistemaPort`, `OutboxPort` method names may use Spanish domain verbs.
- PE-001..PE-004 — Permission rules out of scope this change; ports leave room for future permission checks.
