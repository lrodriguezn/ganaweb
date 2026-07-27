# Delta for DB

## ADDED Requirements

### Requirement: PostgreSQL unaccent capability migration

An additive PostgreSQL migration MUST idempotently provision the `unaccent` extension and deployment validation MUST prove it can be invoked by the listing role before accent-normalized search is enabled. The migration MUST NOT edit an applied migration. If provision or use is unavailable, the deployment MUST fail safely with an explicit capability blocker and MUST NOT silently use case-only matching; a persisted normalized-column fallback requires separate design approval.

#### Scenario: Idempotent provision and use
- GIVEN a fresh or already-provisioned PostgreSQL database
- WHEN the migration and capability validation run repeatedly
- THEN `unaccent` is available and usable, with no duplicate-extension or migration-ledger failure.

#### Scenario: Provisioning or use is denied
- GIVEN the migration role cannot create the extension or the listing role cannot invoke it
- WHEN migration or validation executes
- THEN it fails before accepting accent search, records the capability blocker, and preserves the prior safe database state.

#### Scenario: Applied migration correction
- GIVEN an earlier migration has been applied
- WHEN a correction is needed
- THEN a new forward migration is used and the applied migration remains unchanged.
