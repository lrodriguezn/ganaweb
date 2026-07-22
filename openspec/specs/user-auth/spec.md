# User Auth Specification

## Purpose

Defines first-slice authentication for GanaWeb: self-serve registration, password login, server-side sessions, pending finca authorization, guarded access, and minimal finca-admin approval.

## Requirements

### Requirement: Self-serve registration creates pending users

The system MUST allow a person to create an account with identity and password fields, and MUST place the account in a pending authorization state until a finca admin approves access.

#### Scenario: New user registers successfully

- GIVEN an unregistered person provides valid registration data
- WHEN they submit the registration form
- THEN the account is created as pending
- AND the user sees Spanish copy explaining that finca approval is required.

#### Scenario: Duplicate identity is rejected

- GIVEN an account already exists for the submitted email or username
- WHEN registration is submitted again
- THEN the system MUST reject the request without creating a second account.

### Requirement: Login, logout, and session persistence

The system MUST authenticate approved users with a password, persist the authenticated state server-side, and allow logout to invalidate the active session.

#### Scenario: Approved user logs in

- GIVEN an approved user has valid credentials
- WHEN they log in
- THEN a server-side session is created
- AND subsequent requests recognize the authenticated user.

#### Scenario: User logs out

- GIVEN an authenticated user has an active session
- WHEN they log out
- THEN the active session is invalidated
- AND protected app access requires logging in again.

### Requirement: Pending users cannot use the app

The system MUST prevent pending users from entering or using the protected app, even after valid password authentication.

#### Scenario: Pending user logs in

- GIVEN a pending user provides valid credentials
- WHEN login succeeds
- THEN the user is routed to a pending authorization state
- AND protected app data and actions remain unavailable.

### Requirement: Server-side access guards

The system MUST enforce unauthenticated and pending-user restrictions on the server side, not only in UI navigation. PE-002 applies.

#### Scenario: Unauthenticated request to protected app

- GIVEN no valid server session exists
- WHEN a protected route or action is requested
- THEN the system MUST deny app access and require login.

#### Scenario: Pending request to protected app

- GIVEN a valid session belongs to a pending user
- WHEN a protected route or action is requested
- THEN the system MUST deny app access and keep the user in pending state.

### Requirement: Minimal finca-admin approval

The system MUST provide the minimal capability for a finca admin to approve a pending user for their finca according to PE-001, PE-003, and PE-007.

#### Scenario: Finca admin approves pending user

- GIVEN a finca admin can administer the target finca
- WHEN they approve a pending user
- THEN that user becomes authorized for the finca
- AND the user can enter the protected app on the next valid session check.

#### Scenario: Non-admin approval is rejected

- GIVEN a user lacks finca-admin permission
- WHEN they attempt to approve a pending user
- THEN the system MUST reject the approval.

### Requirement: First-slice auth exclusions

The system MUST NOT require or implement 2FA, password recovery, email verification, social login, account deletion, a full RBAC admin UI, or offline auth/session sync in this change.

#### Scenario: Out-of-scope links do not activate flows

- GIVEN the auth UI references an out-of-scope capability such as password recovery
- WHEN the user selects it in this first slice
- THEN no recovery, 2FA, verification, social, deletion, full RBAC, or offline session workflow is started.

### Requirement: SesionAutorizada carries the active finca display name

`SesionAutorizada` MUST include `fincaActivaNombre: string` so consumers do not need to derive a display name from `fincaActivaId`. The repository layer MUST populate this field from `fincas.nombre` for the user's active membership when constructing the session in `obtenerAutorizacionUsuario`. The value MUST be the human-readable name (e.g. `"La Esperanza"`), NOT the slug-style `fincaActivaId` (e.g. `"finca-esperanza"`).

#### Scenario: Session includes the real finca name

- GIVEN an authorized user with active membership on finca `finca-esperanza` whose `fincas.nombre` is `"La Esperanza"`
- WHEN `obtenerAutorizacionUsuario` builds the `SesionAutorizada`
- THEN the returned session MUST have `fincaActivaNombre: "La Esperanza"`
- AND `fincaActivaId: "finca-esperanza"`.

#### Scenario: Login flow carries the name

- GIVEN an approved user logs in via `iniciarSesion`
- WHEN the `LoginResult` is returned
- THEN `sesion.fincaActivaNombre` MUST equal `fincas.nombre` for the active membership
- AND consumers reading `sesion.fincaActivaNombre` MUST NOT need a second query.

#### Scenario: TypeScript enforces the field at every construction site

- GIVEN a `SesionAutorizada` literal is created without `fincaActivaNombre`
- WHEN `pnpm turbo typecheck` runs
- THEN the build MUST fail with a missing-property error, blocking any new construction site that forgets the field.

### Requirement: FincaSwitcher trigger renders the real finca name

The web app shell (`apps/web/src/routes/_app.tsx`) MUST build the `FincaResumen` passed to `AppHeader` using `sesion.fincaActivaNombre` as the `nombre` field. The route MUST NOT prepend a `"Finca "` prefix to `fincaActivaNombre` — `FincaSwitcher` owns that prefix. The trigger button text MUST be `"Finca {nombre}"` where `{nombre}` is the real finca name, never the slug or a double prefix.

#### Scenario: Trigger shows the real name with single prefix

- GIVEN `sesion.fincaActivaId = "finca-esperanza"` and `sesion.fincaActivaNombre = "La Esperanza"`
- WHEN the protected app shell renders
- THEN the `FincaSwitcher` trigger button MUST display `"Finca La Esperanza"`.

#### Scenario: No double "Finca " prefix

- GIVEN the shell renders the `FincaSwitcher` trigger
- WHEN the trigger text is read
- THEN it MUST NOT contain `"Finca Finca"` anywhere.

#### Scenario: No slug in trigger text

- GIVEN `sesion.fincaActivaId = "finca-esperanza"`
- WHEN the trigger renders
- THEN the string `"finca-esperanza"` MUST NOT appear in the trigger button text.

## Rule Citations

- PE-001, PE-002, PE-003, PE-007 — finca authorization and permission enforcement.
- `app-shell.md` (ui) — `AppHeader` Requirement, Component API `fincaNombre: string` prop; this delta makes the value real instead of slug-derived.
- PE-002, PE-003 — finca authorization; the active finca is the one identified by `fincaActivaId`, and its display name MUST be the same value the user approved.
- T-003 — Domain names in Spanish; `fincaActivaNombre` is the human-readable `fincas.nombre` value, which is already a Spanish string in the database.
