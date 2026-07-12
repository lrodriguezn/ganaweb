# Design: User Registration and Login

## Technical Approach

Implement session-first auth in TanStack Start: public `/login` and `/registro` routes call server functions, while the existing pathless `/_app` shell becomes the protected layout. Server functions delegate to `@ganaweb/aplicacion` use cases; `@ganaweb/db` implements persistence ports with Drizzle. Domain/application rules stay outside routes, preserving `apps/web → aplicacion → dominio` and forbidding `aplicacion → db`.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Session DB + httpOnly cookie vs client token | More server plumbing, lower XSS blast radius | Use opaque session cookie + `usuarios_sesiones.refresh_token_hash`. |
| Use cases in routes vs application layer | Faster but breaks dependency direction | Routes only call `registrarUsuario`, `iniciarSesion`, `cerrarSesion`, `autorizarUsuarioFinca`, `obtenerSesionActual`. |
| Full RBAC UI vs minimal approval | Smaller scope but limited admin UX | Add minimal finca-admin approval action and server authorization check only. |
| Native schema subset vs generated full schema | Reviewable but must match SQL manually | Add required auth tables from `docs/schema_v3_corregido.sql`; defer recovery/2FA behavior. |

## Data Flow

```text
/registro form → server fn → aplicacion use case → AuthRepositoryPort → db/Drizzle
          └─ creates usuarios + usuarios_contrasena + optional inactive usuarios_fincas

/login form → server fn → password verify + usuarios_login audit → usuarios_sesiones
          └─ set httpOnly cookie → requireAuthorizedSession → / or /pendiente

/_app beforeLoad → obtenerSesionActual → finca membership + role/permission check
          ├─ no session: /login
          ├─ pending/no active finca: /pendiente
          └─ authorized: shell props replace USUARIO_DEMO/FINCAS_DEMO
```

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/dominio/src/usuario.ts` | Create | Domain types: `Usuario`, `EstadoAutorizacion`, finca role summary. |
| `packages/aplicacion/src/casos-uso/auth/*.ts` | Create | Register/login/logout/session/approval use cases. |
| `packages/aplicacion/src/puertos/auth-repository-port.ts` | Create | Ports for users, passwords, sessions, login audit, finca authorization. |
| `packages/db/src/schema/auth.ts` | Create | Drizzle tables: `usuarios`, `usuarios_contrasena`, `usuarios_login`, `usuarios_sesiones`, `usuarios_fincas`, roles/permissions subset. |
| `packages/db/src/schema/index.ts` | Modify | Export auth schema/types. |
| `packages/db/src/auth-repository.ts` | Create | Drizzle implementation of application auth ports. |
| `apps/web/src/server/auth.ts` | Create | TanStack Start server functions and cookie/session helpers. |
| `apps/web/src/routes/login.tsx`, `registro.tsx`, `pendiente.tsx` | Create | Public auth UI aligned with OpenPencil screens. |
| `apps/web/src/routes/_app.tsx` | Modify | Add `beforeLoad` guard; replace demo identity/logout/fincas with session context. |
| `apps/web/src/routes/_app/admin/usuarios-pendientes.tsx` | Create | Minimal finca-admin approval route/action. |

## Interfaces / Contracts

```ts
type SesionAutorizada = {
  usuarioId: string
  nombre: string
  email: string
  fincaActivaId: string
  rol: "Administrador" | "Operario" | string
  permisos: readonly { modulo: string; accion: string }[]
}
```

Password hashes use argon2id. Session tokens are random opaque values; only SHA-256 hashes are stored. Cookies: `httpOnly`, `sameSite=lax`, `secure` in production, path `/`, expiry from `usuarios_sesiones.fecha_expiracion`. Logout revokes the DB session and clears the cookie.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Application auth rules, pending gate, password verification decisions | Vitest with fake ports; RED tests first. |
| Integration | Drizzle schema constraints, login audit, session revocation, admin approval | DB-backed Vitest where available; otherwise repository contract tests staged for first DB harness. |
| E2E | Register → pending; pending cannot access `/_app`; admin approves; user logs in/out | Playwright when harness exists; interim route/server-function tests. |

## Threat Matrix

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A: no executable-file classification | None | None |
| Git repository selection | N/A: design only, no git automation | Work-unit guidance only | None |
| Commit state | N/A | Work-unit guidance only | None |
| Push state | N/A | Work-unit guidance only | None |
| PR commands | N/A | Chained PRs considered, no command composition | None |

## Migration / Rollout

No data migration for existing users because auth tables are new. Delivery should be sliced under the 800-line budget: schema/ports, use cases, public auth routes, protected shell/session cookies, approval flow. Ask before chained PR execution if tasks forecast over budget.

## Open Questions

- [ ] Exact initial finca-admin seed/role source for approving first users.
