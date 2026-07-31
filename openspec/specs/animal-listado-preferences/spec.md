# Animal Listado Preferences Specification

## Purpose

Define validated online animal-list preferences scoped to an authorized user and finca.

## Requirements

### Requirement: Authorized Finca-Scoped Preferences

The system MUST retrieve and store preferences only for an authenticated user authorized for the requested finca under PE-001–003. It MUST NOT disclose or alter another user’s or finca’s preferences.

#### Scenario: Authorized preference retrieval
- GIVEN an authorized user and finca with saved preferences
- WHEN the user retrieves that finca’s preferences
- THEN the system returns only that user-and-finca preference.

#### Scenario: Cross-scope request
- GIVEN a user lacks access to a requested finca
- WHEN the user retrieves or stores preferences
- THEN the system denies the request without exposing or changing preferences.

### Requirement: Validated Preference Values and Defaults

The system MUST accept only registered columns and page sizes 25, 50, or 100. It MUST preserve `codigo` and `nombre` as visible mandatory columns. Missing, invalid, or reset preferences MUST resolve to the 29 base columns and page size 25.

#### Scenario: Valid preference is retained
- GIVEN an authorized user selects registered columns and page size 50
- WHEN the preference is stored and later retrieved
- THEN the same normalized selection and size are returned.

#### Scenario: Invalid or reset preference
- GIVEN invalid values or a reset action
- WHEN the preference is resolved
- THEN it uses the 29 base columns, page size 25, `codigo`, and `nombre`.

### Requirement: Last-Write-Wins Preference Storage

The system MUST make the latest accepted save authoritative for one user-and-finca scope. A failed save MUST leave the prior persisted preference unchanged and report failure to the caller.

#### Scenario: Concurrent saves
- GIVEN two accepted saves for the same user and finca
- WHEN the later save completes after an earlier save
- THEN subsequent retrieval returns the later selection.

#### Scenario: Failed save
- GIVEN a valid in-session selection and a persistence failure
- WHEN its save fails
- THEN the system reports failure and retains the prior persisted preference.

## Rule Citations

- PE-001–003.
