# Domain Animal Specification

## Purpose

Introduces the first domain entity (`Animal`) and the first enforceable business rule, RN-001 (código único por finca), as a pure function in `packages/dominio` with strict TDD discipline.

## Requirements

### Requirement 1: Zero-dependency domain package

`packages/dominio` MUST contain only pure domain logic and MUST NOT import any framework, ORM, runtime I/O, or other workspace package.

#### Scenario: Package graph check

- GIVEN `packages/dominio/package.json`
- WHEN its `dependencies` and `devDependencies` are inspected
- THEN no entries reference `react`, `drizzle-orm`, `@tanstack/*`, or other packages.

### Requirement 2: TDD for RN-001

The test for RN-001 MUST be written before its implementation, MUST be named `describe('RN-001: código único por finca')`, and MUST run under Vitest with the `dominio` coverage gate active.

#### Scenario: Test-first proof

- GIVEN no implementation of `validarCodigoUnicoPorFinca` exists
- WHEN the test file `rn-001.test.ts` is committed first
- THEN `pnpm turbo test` reports the test as failing (red) before any implementation is added.

### Requirement 3: RN-001 pure function contract

`packages/dominio` MUST expose a pure function `validarCodigoUnicoPorFinca(codigo, fincaId, animalesExistentes)` that returns a validation result indicating whether the proposed `codigo` is unique within the given `fincaId`.

#### Scenario: Duplicate code in same farm is rejected

- GIVEN finca `F01` already has an animal with código `A001`
- WHEN validating a new animal with código `A001` in finca `F01`
- THEN the result MUST be invalid and cite RN-001.

#### Scenario: Same code in different farms is allowed

- GIVEN finca `F01` has an animal with código `A001` and finca `F02` has no animal with código `A001`
- WHEN validating código `A001` in finca `F02`
- THEN the result MUST be valid.

#### Scenario: Empty existing list is valid

- GIVEN finca `F01` has no animals
- WHEN validating any non-empty código against an empty `animalesExistentes` list
- THEN the result MUST be valid.

### Requirement 4: Coverage gate on dominio

Coverage on `packages/dominio` MUST be ≥90% and MUST be enforced by CI.

#### Scenario: CI enforces coverage

- GIVEN a PR reduces `packages/dominio` coverage below 90%
- WHEN `pnpm turbo test -- --coverage` runs
- THEN the CI step fails.

## Rule Citations

- RN-001 — `codigo` de animal es único por finca.
- TS-001 — Test names its rule: `describe('RN-001 ...')`.
- TS-003 — Fixtures from `seed_v3.ts` when available.
- T-003 — Domain names in Spanish: `validarCodigoUnicoPorFinca`.
