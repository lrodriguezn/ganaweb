# Design: Animal Form Bug Remediation

## Technical Approach

Add the catalog slice without changing established form ownership. A global reader loads active `config_key_values` for `opcion = "sexo"`, strictly decodes them in application code, composes a Drizzle adapter in web, and supplies `{ label, value }` options. It has no finca scope.

## Preserved Design History

| Area | Established decision retained |
|---|---|
| BUG-001 | Diagnosis first: only a failing desktop/mobile route regression permits a select correction. |
| BUG-002 | The purchase-date wrapper owns controlled ISO state; bounds compare local calendar days. |
| BUG-003 | Prefer bottom/start with collision padding, but allow safe Radix flips; assert trigger/label safety, not forced placement. |
| BUG-004 | Calendar styling/navigation belongs in the shared primitive and uses tokens only. |
| Delivery | Ordered `BUG-001 → BUG-002 → BUG-003 → BUG-004` feature-branch chain, each regression-contained and at most 400 changed lines. |

## Architecture Decisions

| Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|
| Clean boundary | Application port, raw DTO, strict decoder, and use case; Drizzle adapter; web composition. | Drizzle in routes/UI; domain dependency. | Retains `dominio` zero dependencies and the existing application-to-adapter pattern. |
| Sex decoding | Accept only raw literals `"0"`, `"1"`, and `"2"`, producing numeric `0 \| 1 \| 2`. Reject `null`, unknown, `"01"`, duplicates, and empty active results. Never use `Number`, `parseInt`, defaults, or partial options. | Coercion/fallback/first duplicate. | Catalog corruption must be visible and cannot change persisted meaning. |
| Determinism | Sort valid options by numeric value, then `key`, then `id`. | Database order. | Stable UI and tests. |
| Server authority | On create/edit, reload the catalog and strictly revalidate submitted `sexoKey` against it before a write. | Trusting the rendered options. | Client state can be stale or tampered. |
| Failure mode | Production loader/action renders or returns a safe visible unavailable/error state, logs failure category with option/row identifiers, and aborts writes. Test/story/E2E composition may explicitly inject fixtures. | Demo/hardcoded production options or silent degradation. | Outages remain observable; no false data entry. |
| Boundaries | `estado` and `salud` remain event-derived/non-editable. Numeric `tipo_ingreso_id` persistence with expressive domain strings is future work. | Adding new selects or persistence now. | Keeps this catalog slice narrow. |

## Data Flow and Contracts

```text
config_key_values (opcion=sexo, activo=1)
  → DrizzleCatalogoGlobalAdapter → ListarCatalogoSexo/strict decoder
  → route loader → AnimalFormScreen { label, value }
FormData "sexoKey" → server action → reload/revalidate → crearAnimal
```

```ts
type SexoCatalogoOption = { readonly label: string; readonly value: 0 | 1 | 2 }
interface CatalogoGlobalPort {
  listarActivos(opcion: "sexo"): Promise<readonly CatalogoRaw>
}
```

The adapter filters `opcion` and `activo` in SQL and returns `id`, `key`, and nullable `value`. The web boundary serializes numeric values for the native control, then matches the submitted literal exactly. Decode, query, or revalidation failure emits no partial options and performs no write.

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/aplicacion/src/puertos/catalogo-global-port.ts` | Create | Global port and raw DTO. |
| `packages/aplicacion/src/casos-uso/listar-catalogo-sexo.ts` | Create | Decoder, validation, ordering, typed UI DTO. |
| `packages/aplicacion/src/index.ts` | Modify | Export port/use case. |
| `packages/db/src/catalogo-global-infrastructure.ts` | Create | Drizzle `configKeyValues` adapter. |
| `packages/db/src/index.ts` | Modify | Export adapter factory. |
| `apps/web/src/server/animal-actions.server.ts` | Modify | Production composition and mutation revalidation. |
| `apps/web/src/server/animal-actions.ts` | Modify | Serializable catalog/failure action contract. |
| `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx` | Modify | Load/pass sex options; show safe unavailable state. |
| `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/editar.tsx` | Modify | Apply the same edit contract. |
| `packages/aplicacion/tests/catalogo-sexo.test.ts` | Create | Decoder RED/GREEN seams. |
| `packages/db/tests/catalogo-global-infrastructure.test.ts` | Create | Global adapter contract. |
| `apps/web/tests/animal-catalogo-sexo.test.tsx` | Create | Loader/action revalidation, visible failure, fixture injection. |

## Testing Strategy

| Layer | What to test | Approach |
|---|---|---|
| Unit | Literal decoder, null/unknown/noncanonical/duplicate/empty failures, inactive exclusion, ordering. | Port fake; RED before use case. |
| Web | `{label,value}` mapping, production no-fallback, stale/tampered submitted value, write abort. | Inject catalog port/fixture; assert visible error and no action write. |
| Integration/E2E | Drizzle `opcion`/`activo` predicate; create/edit selected value is revalidated. | Add when integration harness is restored; current integration availability is false. |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary is changed.

## Migration / Rollout

No schema migration. Deliver as one catalog work unit under 400 changed lines if feasible; otherwise make adapter/application and web wiring consecutive reviewable slices, each with tests. Rollback removes only the port/use case, adapter, composition, and co-located tests; no existing date/BUG slice is reverted.

## Open Questions

- [ ] Which existing structured logger/error presentation is the required web implementation target?
- [ ] Restore the integration driver harness before adapter integration closure.
