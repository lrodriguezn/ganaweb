/**
 * ListadoEntradasAlmacen — tab Almacén (Issue #210, SAN-014).
 *
 * Componente presentacional reutilizable: cada entrada muestra fecha,
 * producto, dosis, precio y comentario. El stock calculado (RN-041) se
 * muestra como alerta de reconciliación cuando es negativo (SAN-031):
 * nunca como un error que bloquee el listado.
 */

export interface EntradaAlmacenFila {
  readonly id: string
  /** ISO YYYY-MM-DD. */
  readonly fecha: string
  readonly productoCodigo: string
  readonly productoDescripcion: string
  readonly dosis: number
  readonly precioPorDosis: number | null
  readonly comentario: string | null
}

export interface ListadoEntradasAlmacenProps {
  readonly entradas: readonly EntradaAlmacenFila[]
  /**
   * RN-041: stock calculado actual (vista `inventario_sanitario`). Negativo =
   * alerta de reconciliación, no error (SAN-031).
   */
  readonly stockDisponible?: number
}

export function ListadoEntradasAlmacen({ entradas, stockDisponible }: ListadoEntradasAlmacenProps) {
  return (
    <div className="flex flex-col gap-3">
      {stockDisponible !== undefined && stockDisponible < 0 ? (
        <div
          role="alert"
          className="rounded-xl border border-alerta bg-card p-3 text-support text-muted-foreground"
        >
          El stock calculado es negativo ({stockDisponible} dosis). Registra una entrada de
          corrección para reconciliar el inventario.
        </div>
      ) : null}

      {entradas.length === 0 ? (
        <p className="p-3 text-support text-muted-foreground">
          Sin entradas de almacén registradas.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entradas.map((entrada) => (
            <li key={entrada.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-support font-medium">{entrada.productoDescripcion}</span>
                <span className="text-caption text-muted-foreground">{entrada.fecha}</span>
              </div>
              <div className="text-caption text-muted-foreground">{entrada.productoCodigo}</div>
              <div className="mt-1 flex flex-wrap gap-x-4 text-support">
                <span>{entrada.dosis} dosis</span>
                <span>{entrada.precioPorDosis === null ? "—" : entrada.precioPorDosis}</span>
                <span>{entrada.comentario === null ? "—" : entrada.comentario}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
