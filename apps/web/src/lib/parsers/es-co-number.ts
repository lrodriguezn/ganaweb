/**
 * es-CO number parser/format helper.
 *
 * v1.3 spec §3.5: `precio_compra` and `peso_compra` are entered in es-CO
 * format (`.` as thousand separator, `,` as decimal separator). The form
 * submits the raw string via `FormData`; the route mapper must normalize
 * it into a JavaScript `number` before the dominio use case sees it. The
 * inverse helper `formatEsCONumber` is used by the form's display layer
 * to rehydrate the field after a successful round-trip.
 *
 * Why a shared helper: both `nuevo.tsx` and `editar.tsx` need the same
 * parsing semantics. Keeping it in one place (design.md R2: dominio has
 * zero deps; the web layer may depend on its own lib) avoids the v1.0
 * silent-drop bug where one route accepted the value and the other did
 * not.
 */

const ES_CO_NUMBER_FORMATTER = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 2,
})

/**
 * Parse an es-CO-formatted numeric string from a `FormDataEntryValue`
 * into a JavaScript `number`. Returns `undefined` for empty, whitespace,
 * non-string, or invalid input so the downstream consumer can use
 * `...(value !== undefined ? { key: value } : {})` to drop the field
 * rather than persist `NaN`.
 *
 * Accepted forms:
 * - `"1.500,75"` → `1500.75`
 * - `"450,30"` → `450.3`
 * - `"0,5"` → `0.5`
 * - `"-1.500,75"` → `-1500.75`
 * - `"1500"` → `1500` (no decimal)
 *
 * Rejected forms (return `undefined`):
 * - `""` / `"   "` / `null` / non-string
 * - `"abc"`
 * - `"1.500,75,5"` (multiple commas — ambiguous)
 */
export function parseEsCONumber(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (trimmed.length === 0) return undefined
  // Remove thousand separators (`.` in es-CO) and normalize the decimal
  // separator (`,`) to `.` so the JS parser sees a valid literal. Any
  // remaining non-numeric characters (or a second `,` from user typo)
  // make the parse fail safely.
  const normalized = trimmed.replace(/\./g, "").replace(",", ".")
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * Inverse of `parseEsCONumber`. The form's `Intl.NumberFormat("es-CO")`
 * display layer uses `maximumFractionDigits: 2`; this helper mirrors that
 * contract so a successful round-trip is possible. Non-finite inputs
 * (`null`, `undefined`, `NaN`, `Infinity`) format as `""` so the form
 * can substitute the placeholder.
 */
export function formatEsCONumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return ""
  if (!Number.isFinite(value)) return ""
  return ES_CO_NUMBER_FORMATTER.format(value)
}
