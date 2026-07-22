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

## Rule Citations

- PE-001, PE-002, PE-003, PE-007 — finca authorization and permission enforcement.
