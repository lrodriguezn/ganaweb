/**
 * Shared spreadsheet-injection neutralizer (LA-073).
 *
 * A cell whose first character is one of the dangerous formula prefixes
 * (`= + - @ \t \r`) is prefixed with a single quote so spreadsheet engines
 * (Excel, LibreOffice, Google Sheets) treat it as inert text instead of
 * evaluating it as a formula. Safe values pass through unchanged.
 *
 * Pure and isolated: consumed by the CSV and XLSX generators (and PDF text)
 * so the neutralization rule has a single owner. Grammar-agnostic — it acts
 * on the rendered cell string regardless of the filter grammar that produced
 * the row.
 */

/** The six dangerous formula prefixes (LA-073), in canonical order. */
export const PREFIJOS = ["=", "+", "-", "@", "\t", "\r"] as const

export function neutralizarCelda(valor: string): string {
  return PREFIJOS.some((prefijo) => valor.startsWith(prefijo)) ? `'${valor}` : valor
}
