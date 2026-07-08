# Monorepo Scaffold Specification

## Purpose

Defines the root workspace, tooling, and package graph so that every downstream package can build, test, and lint independently while enforcing the clean-architecture dependency rule (§3, `especificaciones_tecnicas.md`).

## Requirements

### Requirement 1: Workspace definition

The repository MUST declare `apps/*` and `packages/*` as pnpm workspaces via `pnpm-workspace.yaml` and a root `package.json` with Node 22 and pnpm ≥9 engines.

#### Scenario: Clean clone boots

- GIVEN a fresh clone of `ganaweb`
- WHEN a developer runs `pnpm install`
- THEN all workspace dependencies are installed and `pnpm turbo build` can execute.

### Requirement 2: Turborepo task graph

The root `turbo.json` MUST define `build`, `test`, `typecheck`, and `lint` pipelines with correct topological dependencies (`^build` for `build`, `^build` for `typecheck`).

#### Scenario: Build order is automatic

- GIVEN `packages/dominio` and `packages/aplicacion` exist
- WHEN `pnpm turbo build` runs
- THEN `dominio` builds before `aplicacion` and the cache keys are stable across CI runs.

### Requirement 3: Shared config package

`packages/config` MUST expose a shared TypeScript base config and a Biome preset that all other packages extend.

#### Scenario: Consistent tooling

- GIVEN a new package is added under `packages/`
- WHEN its `tsconfig.json` extends `packages/config/tsconfig.base.json`
- THEN `tsc --noEmit` and `biome ci .` use the same strict rules as every other package.

### Requirement 4: Dependency rule enforcement

`.dependency-cruiser.js` MUST codify and verify the layer graph: `apps/web → aplicacion → dominio`; `ui` MUST NOT depend on `dominio`; `aplicacion` depends on `db` only through ports.

#### Scenario: Violation blocks CI

- GIVEN a developer imports `packages/dominio` from `packages/ui`
- WHEN `dependency-cruiser` runs in CI
- THEN the job fails with a clear layer-rule message.

### Requirement 5: CI skeleton

`.github/workflows/ci.yml` MUST run, on every PR and push to `main`, in order: `pnpm install --frozen-lockfile`, `biome ci .`, `pnpm turbo typecheck`, `pnpm turbo test`, `pnpm turbo build`.

#### Scenario: PR gate is green

- GIVEN a PR is opened against `main`
- WHEN the CI workflow completes
- THEN all five steps pass before merge is allowed.
