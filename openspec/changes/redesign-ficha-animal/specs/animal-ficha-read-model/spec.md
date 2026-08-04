# Delta for animal-ficha-read-model

## ADDED Requirements

### Requirement: Enriched Ficha Projection

`obtenerFichaAnimal` MUST return, in addition to identity fields: resolved raza and color names, computed age, latest weighing with GDP since the previous weighing, a reproductive summary, and the latest body condition. Unavailable values MUST be absent (null/empty), never fabricated.

#### Scenario: Animal with full history

- GIVEN an animal with birth date, assigned raza/color, weighings, reproductive events and a body-condition record
- WHEN obtenerFichaAnimal is executed
- THEN the projection includes resolved raza/color names, computed age, latest weight with GDP, reproductive summary and body condition

#### Scenario: Animal without history

- GIVEN an animal with no weighings, reproductive events or condition records
- WHEN obtenerFichaAnimal is executed
- THEN identity fields are present and every summary field is null/empty

### Requirement: Reproductive Summary Derived From Events

The reproductive summary — último servicio, última palpación, días de gestación, partos count with last date, IEP and días abiertos — MUST be derived from the animal's event sequence; stored cache fields MUST NOT override event-derived values (TR-010, TR-014).

#### Scenario: Summary matches event sequence

- GIVEN registered servicios, palpaciones and partos for the animal
- WHEN obtenerFichaAnimal is executed
- THEN último servicio, palpación, gestación, partos, IEP and días abiertos equal the values derived from those events

#### Scenario: Male animal has no reproductive summary

- GIVEN a male animal with categoriaReproductiva `no_aplica` (TR-013)
- WHEN obtenerFichaAnimal is executed
- THEN the reproductive summary is empty

### Requirement: Weight and Body Condition Summary

The projection MUST include the latest weighing with its date, GDP computed against the immediately previous weighing, and the latest body condition with its scale label.

#### Scenario: GDP from two weighings

- GIVEN weighings at two different dates
- WHEN obtenerFichaAnimal is executed
- THEN the latest weight and GDP since the previous weighing are returned

#### Scenario: Single weighing has no GDP

- GIVEN exactly one weighing
- WHEN obtenerFichaAnimal is executed
- THEN the latest weight is returned and GDP is absent

### Requirement: Computed Age

Age MUST be computed from `fechaNacimiento` relative to the current date. When `fechaNacimiento` is absent, age MUST be absent.

#### Scenario: Age computed from birth date

- GIVEN an animal with a known fechaNacimiento
- WHEN obtenerFichaAnimal is executed
- THEN the projection reports the age elapsed since that date

#### Scenario: Missing birth date

- GIVEN an animal without fechaNacimiento
- WHEN obtenerFichaAnimal is executed
- THEN age is absent
