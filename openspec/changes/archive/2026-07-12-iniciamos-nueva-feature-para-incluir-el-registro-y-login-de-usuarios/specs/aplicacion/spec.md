# Delta for Aplicación

## MODIFIED Requirements

### Requirement 1: Ports and auth use cases only

`packages/aplicacion` MUST contain port definitions, shared DTO/input types, and framework-independent auth use cases required for registration, login, logout, session lookup, guard decisions, and finca-admin approval. It MUST NOT contain repository implementations, DB driver code, route code, or UI logic.
(Previously: `packages/aplicacion` contained only port/interface definitions and no use-case implementations.)

#### Scenario: No infrastructure logic

- GIVEN a file listing of `packages/aplicacion/src`
- WHEN every `.ts` file is inspected
- THEN no repository implementation, DB driver import, route handler, or UI logic is present.

## ADDED Requirements

### Requirement: Auth ports and use cases

`packages/aplicacion` MUST define framework-independent contracts and use cases for self-serve registration, password login, logout, session persistence checks, pending authorization checks, and finca-admin approval.

#### Scenario: Registration returns pending outcome

- GIVEN valid registration input
- WHEN the registration use case completes
- THEN it returns a pending authorization outcome without granting protected app access.

#### Scenario: Approved login returns session outcome

- GIVEN approved user credentials are valid
- WHEN the login use case completes
- THEN it returns an authenticated session outcome.

### Requirement: Authorization decisions are explicit

`packages/aplicacion` MUST expose authorization decisions that distinguish unauthenticated, pending, and approved users so web guards can enforce PE-002 server-side.

#### Scenario: Pending decision blocks app use

- GIVEN a session belongs to a pending user
- WHEN authorization is evaluated
- THEN the decision is pending and protected app use is denied.

#### Scenario: Approved decision allows finca access

- GIVEN a session belongs to an approved finca user
- WHEN authorization is evaluated
- THEN the decision allows access for that finca.

### Requirement: Auth exclusions remain outside application contracts

`packages/aplicacion` MUST NOT add use cases for 2FA, password recovery, email verification, social login, account deletion, full RBAC administration, or offline auth/session sync in this change.

#### Scenario: Out-of-scope contracts are absent

- GIVEN the application package public API is inspected
- WHEN auth contracts are listed
- THEN no 2FA, recovery, verification, social login, deletion, full RBAC admin, or offline session sync use case is exposed.

## Rule Citations

- PE-001, PE-002, PE-003, PE-007 — permission checks and approval outcomes.
