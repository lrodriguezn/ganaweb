# Sync Port Stub Specification

## Purpose

Defines the public boundary of the future offline/online sync protocol in `packages/sync` as typed port interfaces only, so `aplicacion` can depend on stable contracts without coupling to the eventual implementation.

## Requirements

### Requirement 1: Port interfaces only

`packages/sync` MUST contain TypeScript interfaces (ports) and type definitions; it MUST NOT contain implementation logic, database access, or network calls.

#### Scenario: No logic in package

- GIVEN a file listing of `packages/sync/src`
- WHEN every `.ts` file is inspected
- THEN no function body performs I/O, mutation, or algorithmic sync logic.

### Requirement 2: Push port contract

`packages/sync` MUST define a `SyncPushPort` interface describing the contract for pushing a batch of outbox entries to the server and receiving per-entry outcomes (applied / conflict).

#### Scenario: aplicacion depends on push port

- GIVEN `packages/aplicacion` imports `SyncPushPort`
- WHEN a future use case calls `push(batch)`
- THEN the return type distinguishes success from conflict without exposing transport details.

### Requirement 3: Pull port contract

`packages/sync` MUST define a `SyncPullPort` interface describing incremental pull by finca with a stable cursor (`updated_at` + `id`).

#### Scenario: aplicacion depends on pull port

- GIVEN `packages/aplicacion` imports `SyncPullPort`
- WHEN a future use case calls `pull(fincaId, cursor)`
- THEN the response returns changed rows and a new cursor.

### Requirement 4: Conflict resolver port contract

`packages/sync` MUST define a `ConflictResolverPort` interface for resolving state conflicts per RN-061 (last-write-wins by event timestamp; life-cycle severity: `MUERTO` > `VENDIDO` > `EN_FINCA`).

#### Scenario: Resolver contract is explicit

- GIVEN two conflicting animal state records
- WHEN `aplicacion` invokes the resolver through its port
- THEN the returned winner follows the severity rule declared in RN-061.

### Requirement 5: Zero runtime dependencies

`packages/sync` MUST NOT depend on `packages/db`, `packages/aplicacion`, or `apps/web`; it MAY depend only on `packages/config` for TypeScript/Biome presets.

#### Scenario: Dependency graph check

- GIVEN `dependency-cruiser` runs
- WHEN it evaluates `packages/sync`
- THEN no forbidden imports are reported.

## Rule Citations

- RN-060 — Global consistency conflicts resolved at sync; nothing discarded silently.
- RN-061 — Conflict resolution rules for state and life-cycle.
- T-003 — Domain terms in Spanish where applicable (`fincaId`, `estadoAnimal`).
