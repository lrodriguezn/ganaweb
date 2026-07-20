# Diagnosis BUG-001: SelectConCreacion selection not registering

## Summary

BUG-001 was **reproduced and fixed** within PR-5 of `selects-animales-catalogo-real-offline`.

**Root cause**: `SelectConCreacionField` in `packages/ui/src/ganado/animal-crud.tsx` used an uncontrolled pattern with a **no-op `onChange` handler**. The hidden native `<input>` (rendered by `SelectConCreacion`) never updated after selection because its value was bound to the parent's `value` prop (which was the static `defaultValue`), and `onChange` did nothing.

**Fix**: Convert `SelectConCreacionField` to a controlled component using `useState<string | null>(defaultValue ?? null)` and wire `onChange` to `setSelectedValue`. The hidden input now reflects the chosen option, and FormData carries the canonical ID on submit.

## Hypothesis vs Evidence

### Initial hypothesis (from proposal.md)

The leading hypothesis was that the bug was caused by a **mock ID prefix mismatch**: the mock fixture used `color-negro` while the DB seed uses `col-negro`. If the form was doing `value ===` matching internally, the hidden input would stay empty.

### Evidence from diagnosis

1. **Tests with real-data IDs REPRODUCED the bug** — even with canonical DB IDs (`raza-angus`, `col-negro`), the click did NOT register. This ruled out the mock-ID-mismatch hypothesis as the sole cause.

2. **Root cause analysis** of `SelectConCreacionField`:
   ```tsx
   // BEFORE (buggy — uncontrolled, no-op onChange):
   <SelectConCreacion
     value={defaultValue ?? null}
     onChange={() => {
       // uncontrolled — the hidden native input mirrors the chosen id
     }}
   />
   ```
   The comment was wrong. The hidden input is `value={value ?? ""}` where `value` comes from the prop, which is `defaultValue ?? null` — it never changes.

3. **The `SelectConCreacion` primitive was NOT the problem**. The primitive correctly:
   - Calls `onChange(option.value)` on `Command.Item.onSelect`
   - Renders `<input type="hidden" name={name} value={value ?? ""} />`
   - Shows the selected label in the trigger text

   The issue was that the wrapper component (`SelectConCreacionField`) swallowed the `onChange` call.

## Fix

**File**: `packages/ui/src/ganado/animal-crud.tsx` (1 function: `SelectConCreacionField`)

```tsx
// AFTER (controlled, onChange wires to state):
const [selectedValue, setSelectedValue] = useState<string | null>(defaultValue ?? null)
<SelectConCreacion
  value={selectedValue}
  onChange={(next) => setSelectedValue(next)}
/>
```

**Lines changed**: ~5 lines (add `useState`, replace `value` and `onChange`).

## Test Evidence

### RED phase (before fix)

3 regression tests in `packages/ui/tests/animal-ui.test.tsx` FAILED:
- `raza click → FormData carries canonical id` — `formData.get("raza")` was `""` (empty)
- `color click → FormData carries canonical id` — `formData.get("color")` was `""` (empty)
- `keyboard navigation (Enter) selects the first option` — `formData.get("raza")` was `""` (empty)

### GREEN phase (after fix)

All 3 regression tests PASS:
- `raza click → FormData carries "raza-angus"` ✅
- `color click → FormData carries "col-negro"` ✅
- `keyboard navigation → FormData carries "raza-angus"` ✅

All 28 existing tests continue to pass (no regression).

### Full test suite

| Suite | Tests | Status |
|-------|-------|--------|
| `packages/aplicacion` | 65/65 | ✅ |
| `packages/db` | 23/23 + 2 skipped | ✅ |
| `packages/ui` | 31/31 (28 existing + 3 BUG-001) | ✅ |
| `tests/` (root) | 11/11 (including 4 new loader tests) | ✅ |

## Conclusion

BUG-001 was NOT caused by mock ID prefix mismatch (though that mismatch exists and was documented). The root cause was an **uncontrolled component pattern** in `SelectConCreacionField` that prevented the hidden native input from updating after selection. The fix is minimal (5 lines), scoped to `animal-crud.tsx`, and does NOT touch `select-con-creacion.tsx` (the primitive was correct).

Tasks 2.1–2.3 of `bug-2026-07-01-formulario-animales` are marked as **absorbed by** this change.
