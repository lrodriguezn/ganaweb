# Delta for DB

## ADDED Requirements

### Requirement: Auth schema exports

`packages/db` MUST expose typed Drizzle schema definitions for the auth tables required by first-slice user authentication, including users, password credentials, login audit/session records, and finca membership/authorization state from `docs/schema_v3_corregido.sql`.

#### Scenario: Auth tables are importable

- GIVEN an application auth adapter imports the DB schema
- WHEN it references user, password, session, login, and user-finca membership tables
- THEN TypeScript provides typed columns and relations without importing driver internals.

#### Scenario: Out-of-scope auth tables are not required

- GIVEN the SQL schema also includes recovery, 2FA, verification, and broader RBAC tables
- WHEN this change is implemented
- THEN those flows MUST NOT be required for registration, login, session persistence, or finca approval.

### Requirement: Authorization state is representable

`packages/db` MUST represent whether a registered user is pending or authorized for a finca so server-side guards can distinguish unauthenticated, pending, and approved access.

#### Scenario: Pending membership is persisted

- GIVEN a new account is registered
- WHEN its finca relationship is stored
- THEN the DB layer can persist a pending authorization state.

#### Scenario: Approved membership is queryable

- GIVEN a finca admin approves a user
- WHEN protected access is checked
- THEN the DB layer can return the user's approved finca authorization.

## Rule Citations

- PE-001, PE-002, PE-003, PE-007 — authorization checks rely on persisted finca-user permission state.
