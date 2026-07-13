# Delta for Web

## ADDED Requirements

### Requirement: Finca-scoped animal routes and actions

`apps/web` MUST expose `/fincas/$fincaId/animales`, `/nuevo`, `/$animalId`, and edit/image/delete/reactivate actions. Every loader and server action MUST revalidate session, finca membership, and animal permission server-side; PE-002/PE-003 apply.

#### Scenario: Route access allowed
- GIVEN an approved user has `animales:ver` for the finca
- WHEN they request the animals list route
- THEN the route renders scoped animals for that finca.

#### Scenario: Server action denies forged finca
- GIVEN a request sends a valid animal id with another finca id in the URL
- WHEN a mutation server action runs
- THEN it uses server-validated membership/animal ownership and denies mismatch.

### Requirement: Animal CRUD web flows

The web app MUST support create, list, ficha, update, delete/inactivate, and reactivate flows matching the animal-management spec. Create forms MUST require `codigo`, `nombre`, and `sexo_key`, MUST keep color and breed/raza optional, and MUST include offline create/update/inactivate affordances plus online-only physical delete.

#### Scenario: Offline create with photo
- GIVEN the app is offline and the user has create permission
- WHEN they create an animal with code, name, sex, and a photo
- THEN the local animal appears with pending sync and pending upload state.

#### Scenario: Delete dialog communicates server decision
- GIVEN an animal has references
- WHEN the user chooses delete
- THEN the dialog offers inactivation and explains history is preserved.

### Requirement: Animal RBAC surfaces

Web surfaces MUST hide unavailable animal actions while treating server authorization as authoritative.

#### Scenario: Read-only UI
- GIVEN a user only has `animales:ver`
- WHEN list and ficha render
- THEN mutation controls are absent and direct mutation requests are denied.
