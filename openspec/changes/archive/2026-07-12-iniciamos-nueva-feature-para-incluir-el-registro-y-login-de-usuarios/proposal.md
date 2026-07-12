# Proposal: User Registration and Login

## Intent

Enable self-serve user registration and secure login for GanaWeb using the discovered OpenPencil screens, backed by session-first authentication aligned with `docs/schema_v3_corregido.sql`. Registration is open, but a newly registered user MUST remain blocked from entering/using the app until a finca administrator authorizes them.

## Scope

### In Scope
- Mobile login and registration based on OpenPencil screens `08 Login · Mobile` and `09 Registro · Mobile`.
- Desktop login based on `10 Login · Desktop`; desktop registration may reuse the registration flow responsively.
- Server-side registration, password login, logout, session persistence, and route guarding.
- Pending-authorization state after registration, including Spanish user-facing copy appropriate for Colombia.
- Drizzle models/exports for required auth tables from `docs/schema_v3_corregido.sql`.
- Finca-admin authorization gate following permission rules PE-001, PE-002, PE-003, and PE-007.
- Reviewable delivery planning: implementation should be sliced into work units and chained PRs if forecast exceeds the 800-line review budget.

### Out of Scope
- 2FA, password recovery, email verification, social login, and account deletion.
- Full RBAC administration UI beyond the minimal admin authorization action.
- Offline auth/session sync and offline permission mutation handling.

## Capabilities

### New Capabilities
- `user-auth`: Self-serve registration, password login, server sessions, logout, pending authorization, and finca-admin approval gating.

### Modified Capabilities
- `db`: Add typed Drizzle auth schema exports for the required SQL auth tables.
- `web`: Add auth routes, session guards, pending screen, and replace demo shell identity/logout stubs.
- `aplicacion`: Add auth use-case ports/use cases while preserving clean dependency direction.

## Approach

Use the exploration-recommended session-first approach: TanStack Start routes call server functions/use cases; use hashed passwords, `usuarios_login`, `usuarios_sesiones`, and `usuarios_fincas`; never trust UI-only gating. The app shell should render only for authorized finca users; pending users see a waiting state until an admin approves access.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/src/routes/*` | New | Login, registration, pending, and guarded app routes. |
| `apps/web/src/routes/_app.tsx` | Modified | Replace demo user/logout with session-aware shell. |
| `packages/db/src/schema/*` | Modified | Add auth tables from corrected SQL schema. |
| `packages/aplicacion/src/*` | Modified | Auth use cases/ports. |
| `docs/schema_v3_corregido.sql` | Reference | Auth source of truth. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Auth scope expands into recovery/2FA/RBAC admin | Med | Keep first slice to registration, login, sessions, approval gate. |
| Unauthorized users reach app shell | Med | Enforce server-side guards per PE-002. |
| Large review diff | High | Split by schema, use cases, routes/UI, and admin approval work units. |

## Rollback Plan

Revert the auth route/use-case/schema commits as a feature slice, remove new auth migrations if unapplied, and restore the demo shell identity/logout stubs. Keep existing bootstrap specs unaffected.

## Dependencies

- OpenPencil screens `08 Login · Mobile`, `09 Registro · Mobile`, `10 Login · Desktop`.
- `docs/schema_v3_corregido.sql` and PE-001/PE-002/PE-003/PE-007 rules.

## Success Criteria

- [ ] A user can register but cannot enter the app until finca-admin approval.
- [ ] Approved users can log in, keep a server session, and log out.
- [ ] Protected routes reject unauthenticated and pending users server-side.
- [ ] First implementation plan can be reviewed within the 800-line budget or as chained PRs.
