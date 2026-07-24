# Proposal: Rediseñar layout del formulario Crear/Editar animal

## Intent

El formulario actual renderiza 22 campos en muro plano de 2 columnas, sin secciones ni colapsable. Contradice §3.1 de `crud_animales.md` v1.5 (el 90 % se completan con código+sexo+origen+fecha; el resto debe vivir en un colapsable). Redistribución **estructural, no estética**.

**Refs**: Issue #97, `crud_animales.md` §3.5.

## Scope

**In**
- 4 `<section>` + 1 `<Collapsible>` "Detalles adicionales" en `AnimalFormScreen` (CA-UI-009..012)
- Grillas proporcionales: `1fr 1.4fr 1fr`, `1fr 1fr 1.2fr`+`1fr 1fr`, `1fr 1fr 1fr 1fr`
- Colapsable: cerrado en CREATE; en EDIT abre con "N con datos" (CA-UI-009); error interno fuerza apertura + foco (CA-UI-010)
- Footer sticky con hint de sync **solo offline** (CA-UI-005/015)
- Quitar `required` de `tipoExplotacionId` (CA-UI-014)
- "Estimar por edad" DENTRO del popover del `DatePicker` (CA-UI-013, CA-CRE-004)
- Mobile: 1 columna, 48px, UBICACIÓN apilada, footer pegajoso (§3.5.6)

**Out**
- Use cases, ports, adapters, cargadores, `FIELD_RENDERERS`, payload, validación, imágenes, temas, tokens, schema, dominio — sin cambios
- Filtro mobile de subset de campos — puede eliminarse

## Capabilities

> Contrato con `sdd-spec`.

**New**: None.
**Modified**: `animal-crud-ui` — añadir requisito `Layout en 4 secciones + bloque colapsable` con escenarios derivados de CA-UI-009..015. Cita explícita a §3.5.

## Approach

Reemplazar el `fields.map()` plano en `AnimalFormScreen` por 4 `<section>` (IDENTIFICACIÓN, CARACTERÍSTICAS, ORIGEN, UBICACIÓN) + 1 `<Collapsible>`. `FIELD_RENDERERS` se invocan por nombre; `name` de `FormData` no cambia. `DatePicker` extiende con `children` opcional en `Popover.Content` para "Estimar por edad". Mobile hereda mismas secciones en una columna.

## Affected Areas

| Area | Impact |
|---|---|
| `packages/ui/src/ganado/animal-crud.tsx` | Modified (secciones + colapsable) |
| `packages/ui/src/primitives/date-picker.tsx` | Modified (`children` opcional) |
| `apps/web/.../animales/nuevo.tsx` | Verified |
| `apps/web/.../animales/$animalId/editar.tsx` | Verified |
| `openspec/specs/animal-crud-ui/spec.md` | Delta (nuevo requisito) |

## Risks

| Risk | L | Mitigation |
|---|---|---|
| Conteo desincroniza al cambiar `sexo` | M | `useMemo`; `esDeMonta` excluido si `sexo !== "0"` |
| Slot de `DatePicker` rompe consumidores | L | `children` opcional, default intacto |
| Paridad mobile/desktop rota | M | Un JSX + `cn()` mode-driven; E2E en ambos anchos |
| Hex literal en tema oscuro | L | Lint bloquea hex/`dark:`; check 10 temas (CA-UI-018) |
| Foco no respeta `prefers-reduced-motion` | L | `scrollIntoView({ block: "nearest" })` sin animación |

## Rollback Plan

`git revert` del merge. Submit, validación, payload y `FIELD_RENDERERS` no cambian, así que revertir el JSX restaura el muro plano. `DatePicker` es backward-compatible (slot opcional). Si UBICACIÓN móvil rompe touch targets, revertir solo ese bloque. La delta spec se archiva sin fusionar.

## Dependencies

- `packages/ui/src/primitives/collapsible.tsx` (Radix, ya disponible)
- `packages/ui/src/primitives/date-picker.tsx` (extender, no reescribir)
- Tokens: `bg-card`, `text-foreground`, `rounded-card`, `text-caption`, `text-support`, `--shadow-card`, `num`, `space-y-6`, `p-4`/`p-5`
- Sin nuevas dependencias npm

## Success Criteria

- [ ] E2E layout 4 secciones + colapsable con encabezados (CA-UI-009..012, §9.5)
- [ ] Vista inicial = 10 campos; UBICACIÓN = 4 selects en una fila (§9.5b)
- [ ] EDIT con detalles → colapsable abre solo + "N con datos" (CA-UI-009)
- [ ] Error en colapsable → apertura + foco (CA-UI-010)
- [ ] Asterisco solo en Código/Sexo/Origen/Fecha (CA-UI-014)
- [ ] ORIGEN solo renderiza condicionales del modo activo (CA-UI-011/007)
- [ ] "Estimar por edad" dentro del popover, no botón permanente (CA-UI-013)
- [ ] Hint de sync solo offline (CA-UI-005)
- [ ] Paridad mobile: 1 columna, 48px, footer pegajoso (§3.5.6)
- [ ] Cero hex/`dark:`/`style={{}}` con color (CA-UI-016, T-004)
- [ ] Render correcto en los 10 temas (CA-UI-018)

## Future / Out of Scope

Creación contextual inline (stub), sync offline de catálogos (Phase 2 — `catalogo-animal-offline`), color swatch con `meta.hex` (Phase 2).
