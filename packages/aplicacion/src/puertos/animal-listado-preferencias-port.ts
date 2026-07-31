/**
 * #110 — Application port for per-user/per-finca animal-list preferences.
 *
 * The port is storage-agnostic: `cols` carries normalized column ids as
 * plain strings (the canonical registry lives in the web layer). The
 * Drizzle adapter in `@ganaweb/db` enforces PE-001–003 via the authz-CTE
 * pattern before reading or writing.
 */

/** Normalized preference value object — codigo+nombre always present. */
export interface AnimalListadoPreferencias {
  readonly cols: readonly string[]
  readonly pageSize: 25 | 50 | 100
}

export interface AnimalListadoPreferenciasPort {
  /** Returns the stored preference for the scope, or 29/25 defaults on miss. */
  obtener(req: { usuarioId: string; fincaId: string }): Promise<AnimalListadoPreferencias>
  /** Last-write-wins upsert; a thrown error leaves the prior row unchanged. */
  guardar(req: { usuarioId: string; fincaId: string } & AnimalListadoPreferencias): Promise<void>
}
