# Delta for user-auth

## ADDED Requirements

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

- `app-shell.md` (ui) — `AppHeader` Requirement, Component API `fincaNombre: string` prop; this delta makes the value real instead of slug-derived.
- PE-002, PE-003 — finca authorization; the active finca is the one identified by `fincaActivaId`, and its display name MUST be the same value the user approved.
- T-003 — Domain names in Spanish; `fincaActivaNombre` is the human-readable `fincas.nombre` value, which is already a Spanish string in the database.
