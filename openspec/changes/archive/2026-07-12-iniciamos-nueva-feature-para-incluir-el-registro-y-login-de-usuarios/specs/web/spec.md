# Delta for Web

## ADDED Requirements

### Requirement: Auth routes and Spanish product flow

`apps/web` MUST expose login, registration, pending-authorization, and logout flows using Spanish product copy appropriate for Colombia.

#### Scenario: Registration shows pending state

- GIVEN a visitor completes registration
- WHEN the account is created
- THEN the web app routes them to a pending authorization screen
- AND the copy explains that a finca admin must authorize access.

#### Scenario: Approved login enters app shell

- GIVEN an approved user submits valid credentials
- WHEN login succeeds
- THEN the protected app shell renders with the authenticated user context.

### Requirement: Server-side route and action guards

`apps/web` MUST guard protected routes and server actions against unauthenticated and pending users on the server side. PE-002 applies.

#### Scenario: Unauthenticated protected navigation

- GIVEN a visitor has no valid session
- WHEN they request a protected app route
- THEN the server denies protected content and requires login.

#### Scenario: Pending protected navigation

- GIVEN a pending user has a valid session
- WHEN they request a protected app route
- THEN the server denies protected content and shows pending authorization.

### Requirement: Session-aware shell and logout

`apps/web` MUST replace demo identity/logout stubs in protected surfaces with session-derived identity and real logout behavior.

#### Scenario: Shell uses session identity

- GIVEN an approved user has an active session
- WHEN the app shell renders
- THEN user identity comes from the server session, not demo data.

#### Scenario: Logout clears app access

- GIVEN an authenticated user selects logout
- WHEN the logout request completes
- THEN the server session is invalidated and protected routes require login.

### Requirement: Minimal finca-admin approval surface

`apps/web` MUST provide only the minimal admin-facing action needed to approve pending finca users, not a full RBAC administration UI.

#### Scenario: Admin approves from minimal surface

- GIVEN a finca admin views a pending user they may administer
- WHEN they approve the user
- THEN the user becomes authorized for that finca.

#### Scenario: Full RBAC UI remains out of scope

- GIVEN this first auth slice is delivered
- WHEN admin functionality is reviewed
- THEN it contains no full role-management console, account deletion, or offline permission mutation UI.

## Rule Citations

- PE-001, PE-002, PE-003, PE-007 — finca admin approval and guarded access.
- IA-003 — Reuse `packages/ui` components for surfaced UI.
