# Delta for Animal Listado Server Contract

## ADDED Requirements

### Requirement: Session Resolution Executes Inside the Error Boundary

The animal list HTTP handler MUST resolve the caller identity (`getUsuarioId()`) INSIDE the try/catch error boundary, not before it. Any failure during session or authorization resolution MUST be caught and mapped to a sanitized `500` `ApiErrorDto` carrying a `requestId`, and MUST trigger `reportError`. The handler MUST NOT leak driver errors, stack traces, or PostgreSQL detail to the client.

Authorization MUST remain fail-closed: a session-resolution or authorization throw MUST deny access and MUST NOT produce a `200` response or any data access. Permission gating and per-finca resolution are unchanged (PE-001, PE-002, PE-003); only the catch location moves.

#### Scenario: Degraded session resolution returns sanitized 500

- GIVEN PostgreSQL is degraded and `getUsuarioId()` throws during session resolution
- WHEN the HTTP handler processes a list request
- THEN it returns `500` with an `ApiErrorDto` containing a `requestId`
- AND `reportError` is called and no driver/stack detail is exposed.

#### Scenario: Fail-closed — no 200 without an authorized session

- GIVEN session resolution throws before an authorized session is established
- WHEN the HTTP handler processes a list request
- THEN it MUST NOT return `200` and MUST NOT read or return animal data.

#### Scenario: Authorization denial remains fail-closed

- GIVEN a valid session whose authorization for the requested finca is denied
- WHEN the HTTP handler processes a list request
- THEN it denies access and MUST NOT return `200` with another finca's data.

#### Scenario: Healthy session is unaffected

- GIVEN a valid, authorized session
- WHEN the HTTP handler processes a well-formed list request
- THEN it returns `200` with the caller's per-finca rows as before.

## Rule Citations

- PE-001 / PE-002 / PE-003 — permission gating and per-finca resolution unchanged; only the catch location moves.
- RN-001 — `uq_animales_finca_codigo` untouched.
