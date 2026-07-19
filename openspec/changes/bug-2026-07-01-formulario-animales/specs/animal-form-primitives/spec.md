# Delta for Animal Form Primitives

## MODIFIED Requirements

### Requirement: DatePicker primitive

The `DatePicker` primitive MUST render an es-CO formatted date (`dd/mm/aaaa`), MUST be controlled via ISO `value` and `onChange`, and MUST allow today while blocking later dates (RN-002). It MUST provide accessible error binding and the `Estimar por edad` action. Its calendar MUST use token-only typography and sizing, expose practical month/year navigation, and position through the viewport-aware portal so an opened calendar never obscures its trigger or label. It MUST NOT use hex literals or `dark:` variants.

(Previously: the primitive specified controlled date selection, no-future dates, accessibility, and age estimation only.)

#### Scenario: User picks a date

- GIVEN `DatePicker` renders with `value = ""` and `aria-invalid="true"` and `aria-describedby="err-fecha"`
- WHEN the user selects `15/03/2025`
- THEN `onChange` is called with `"2025-03-15"`
- AND the input carries both aria attributes
- AND an error node resolves by id `err-fecha`

#### Scenario: Future date is blocked

- GIVEN today is frozen as `15/07/2026`
- WHEN the calendar is opened
- THEN `15/07/2026` is selectable and later days are disabled
- AND `onChange` cannot emit a future ISO value

#### Scenario: Estimar por edad emits date and tag

- GIVEN the user invokes `Estimar por edad` with `3` years
- WHEN they confirm
- THEN `onChange` emits an ISO date ≈ 3 years back
- AND the form appends `[fecha estimada]` to `comentarios`

#### Scenario: Viewport collision preserves the trigger

- GIVEN the purchase-date trigger is near a viewport edge at desktop or mobile width
- WHEN the calendar opens after scrolling
- THEN collision behavior MAY flip the calendar without covering its trigger or label
- AND the calendar remains visible above its form container

#### Scenario: Shared calendar presentation is tokenized

- GIVEN either animal-form date picker renders in each supported theme
- WHEN the calendar is opened on desktop and mobile
- THEN caption, weekdays, day cells, and navigation use the defined token hierarchy and touch sizing
- AND no literal color or `dark:` variant is required

## ADDED Requirements

### Requirement: DatePicker visual closure evidence

BUG-003 and BUG-004 MUST each retain a focused visual regression before closure. BUG-003 evidence MUST use the agreed minimum reproducible viewport/scroll state; BUG-004 evidence MUST cover all ten catalog themes.

#### Scenario: BUG-003 minimum reproduction

- GIVEN the documented purchase-form viewport and scroll position
- WHEN the purchase calendar opens
- THEN the visual assertion proves the trigger and label are unobscured

#### Scenario: BUG-004 theme regression

- GIVEN the ten supported catalog themes
- WHEN either date calendar renders
- THEN visual assertions confirm token-driven readable hierarchy in every theme
