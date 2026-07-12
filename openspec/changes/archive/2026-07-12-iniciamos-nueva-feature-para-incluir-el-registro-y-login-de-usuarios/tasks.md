# Tasks: User Registration and Login

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1,100-1,700 |
| 800-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 schema/ports → PR 2 use cases → PR 3 web session/routes → PR 4 approval |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High
800-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Auth schema and ports | PR 1 | `pnpm turbo typecheck` | N/A: no route behavior | `packages/db/src/schema/auth.ts`, auth port files |
| 2 | Application auth use cases | PR 2 | `pnpm turbo test --filter=@ganaweb/aplicacion` | N/A: framework-free use cases | `packages/aplicacion/src/casos-uso/auth/*` |
| 3 | Public auth/session web flow | PR 3 | `pnpm turbo test --filter=@ganaweb/web` | `pnpm dev`: register/login/pending manually | `apps/web/src/server/auth.ts`, auth routes, `_app.tsx` |
| 4 | Minimal admin approval | PR 4 | `pnpm turbo test --filter=@ganaweb/web` | Admin approves pending user manually | admin approval route/action |

## Phase 1: Foundation / Schema / Ports

- [x] 1.1 RED: add import/type tests for `packages/db/src/schema/auth.ts` covering users, passwords, sessions, logins, and pending/approved finca membership.
- [x] 1.2 Create `packages/db/src/schema/auth.ts` and export it from `packages/db/src/schema/index.ts`, matching first-slice tables from `docs/schema_v3_corregido.sql` only.
- [x] 1.3 RED: add architecture tests proving `packages/aplicacion/src` imports no DB, route, or UI code.
- [x] 1.4 Create `packages/dominio/src/usuario.ts` and `packages/aplicacion/src/puertos/auth-repository-port.ts` with Spanish domain names and framework-free auth DTOs.

## Phase 2: Application Use Cases

- [x] 2.1 RED: add use-case tests for duplicate registration rejection, pending registration outcome, approved login, pending decision, logout revocation, and non-admin approval rejection.
- [x] 2.2 Implement `packages/aplicacion/src/casos-uso/auth/*` for `registrarUsuario`, `iniciarSesion`, `cerrarSesion`, `obtenerSesionActual`, and `autorizarUsuarioFinca`.
- [x] 2.3 Ensure public application exports expose no 2FA, recovery, verification, social-login, account-deletion, full-RBAC, or offline-session contracts.

## Phase 3: DB Adapter and Web Integration

- [x] 3.1 RED: add repository contract tests for password hash use, login audit, session hash storage/revocation, and approved membership lookup; stage DB harness if unavailable.
- [x] 3.2 Create `packages/db/src/auth-repository.ts` implementing application ports with argon2id passwords and SHA-256 opaque session token hashes.
- [x] 3.3 RED: add route/server-function tests for unauthenticated guard, pending guard, Spanish pending copy, session identity, and logout access removal.
- [x] 3.4 Create `apps/web/src/server/auth.ts`, `routes/login.tsx`, `routes/registro.tsx`, `routes/pendiente.tsx`, and update `routes/_app.tsx` with server-side guards and session-derived shell context.

## Phase 4: Admin Approval / Verification

- [x] 4.1 RED: add web tests for finca-admin approval success and non-admin rejection under PE-001/PE-003/PE-007.
- [x] 4.2 Create `apps/web/src/routes/_app/admin/usuarios-pendientes.tsx` with the minimal approval action only.
- [x] 4.3 Run `pnpm turbo typecheck`, `pnpm turbo test`, and `pnpm turbo build`; document unavailable runners with staged expectations instead of skipping scenarios.

## Out of Scope

- [x] Do not implement 2FA, password recovery, email verification, social login, account deletion, full RBAC admin UI, offline auth/session sync, or account-deletion/offline permission mutation flows.
