## Exploration: user registration and login

### Current State
The app is already scaffolded as a TanStack Start monorepo. `apps/web` currently exposes `/`, `/mas`, and `/api/health`; there are no auth routes yet. The shell still uses demo user data and a stub logout handler, so registration/login is not wired end-to-end.

The database schema already defines a full auth-oriented model in `docs/schema_v3_corregido.sql`: `usuarios`, `usuarios_contrasena`, `usuarios_login`, `usuarios_sesiones`, recovery, 2FA, RBAC, and `usuarios_fincas`. However, `packages/db` only exports `fincas` and `animales` today, so the codebase has not caught up with the schema.

OpenPencil is available and contains the requested screens:
- `08 Login · Mobile`
- `09 Registro · Mobile`
- `10 Login · Desktop`

Key interactions from the design:
- Login mobile: tabs for `Iniciar sesión` / `Crear cuenta`, email/usuario field, password field with eye icon, `Mantener sesión iniciada`, primary CTA `Iniciar sesión`, and `¿Olvidaste tu contraseña?`.
- Registro mobile: same tabs, `Nombre completo`, `Correo`, `Contraseña`, optional `Código de finca (opcional)`, primary CTA `Crear cuenta`, and terms text.
- Login desktop: brand panel at left, login card at right, same login fields, and a `Crear cuenta` link below the card.

### Affected Areas
- `apps/web/src/routes/*` — new auth routes and routing flow are needed.
- `apps/web/src/routes/_app.tsx` — current demo user/logout stub will likely be replaced or bypassed once auth exists.
- `packages/db/src/schema/*` — auth tables must be modeled in Drizzle before use.
- `packages/db/src/index.ts` / exports — schema barrel currently omits user/auth tables.
- `packages/ui/src/ganado/*` — shell components already assume a logged-in user; they may need auth/session props or guards.
- `docs/schema_v3_corregido.sql` — source of truth for auth-related tables/constraints.

### Approaches
1. **Session-first app auth** — build login/register as full-stack routes backed by server functions and DB sessions.
   - Pros: matches schema, fits TanStack Start, keeps session logic server-side.
   - Cons: more plumbing upfront.
   - Effort: High

2. **Placeholder UI first** — add screens and navigation only, defer backend auth.
   - Pros: fast visual delivery.
   - Cons: conflicts with the schema and leaves security-critical flow incomplete.
   - Effort: Medium

### Recommendation
Use the session-first approach. The schema already anticipates secure auth (hashed passwords, login audit, recovery, 2FA, RBAC, farm membership), so the next phase should implement the backend/session contract before polishing the UI.

### Risks
- The schema supports more than the screens show (recovery, 2FA, verification, lockout); product scope is still ambiguous.
- `Registro Mobile` is the only registration design; there is no separate desktop register screen in the canvas.
- Current repo state includes unrelated modified `.github` files, so GitHub-flow work should start from a clean branch boundary.

### Ready for Proposal
No — the orchestrator should ask the user to confirm registration scope (self-serve vs invite/code-gated), password/reset/verification behavior, and whether desktop registration should reuse the mobile design or needs a separate desktop screen.
