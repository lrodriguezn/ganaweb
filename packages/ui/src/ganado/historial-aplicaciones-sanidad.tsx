/**
 * HistorialAplicacionesSanidad — historial filtrable de aplicaciones
 * (Issue #212, D-005/SAN-004).
 *
 * Componente presentacional (IA-003): reutiliza el patrón de tablas y los
 * controles de `packages/ui`. Los filtros y la paginación se resuelven en la
 * ruta (viven en la URL); este componente solo reporta los cambios vía
 * `onCambiarFiltros` / `onCambiarPagina`. Las filas llegan ya filtradas y
 * paginadas del read model (D-005).
 *
 * Columnas (SAN-004): fecha, producto, objetivo (animal|lote + N animales),
 * animal/lote, dosis y responsable.
 */

import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "../lib/utils"
import { Button } from "../primitives/button"
import { Input } from "../primitives/input"
import { Label } from "../primitives/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../primitives/select"

/** D-005: filtros del historial (todos opcionales, en la URL). */
export interface FiltrosHistorialSanidadVista {
  readonly productoId: string
  /** ISO YYYY-MM-DD inclusivo. */
  readonly desde: string
  /** ISO YYYY-MM-DD inclusivo. */
  readonly hasta: string
  /** Texto libre que acota por animal o lote. */
  readonly animalOLote: string
}

/** SAN-004/D-005: fila del historial. */
export interface FilaHistorialSanidadVista {
  readonly id: string
  /** ISO YYYY-MM-DD. */
  readonly fecha: string
  readonly productoCodigo: string
  readonly productoDescripcion: string
  readonly objetivo: "animal" | "lote"
  readonly cantidadAnimales: number
  readonly animalCodigo: string | null
  readonly loteDescripcion: string | null
  readonly dosis: number
  readonly responsable: string | null
}

export interface ProductoFiltroHistorial {
  readonly id: string
  readonly codigo: string
  readonly descripcion: string
}

export interface HistorialAplicacionesSanidadProps {
  readonly filas: readonly FilaHistorialSanidadVista[]
  readonly total: number
  readonly pagina: number
  readonly tamanoPagina: number
  readonly productos: readonly ProductoFiltroHistorial[]
  readonly filtros: FiltrosHistorialSanidadVista
  readonly onCambiarFiltros: (filtros: FiltrosHistorialSanidadVista) => void
  readonly onCambiarPagina: (pagina: number) => void
}

const CELDA = "px-3 py-2 text-support text-foreground align-top"
const CELDA_MUTED = "px-3 py-2 text-support text-muted-foreground align-top num"

export function HistorialAplicacionesSanidad({
  filas,
  total,
  pagina,
  tamanoPagina,
  productos,
  filtros,
  onCambiarFiltros,
  onCambiarPagina,
}: HistorialAplicacionesSanidadProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / tamanoPagina))
  const cambiarFiltro = (cambio: Partial<FiltrosHistorialSanidadVista>) =>
    onCambiarFiltros({ ...filtros, ...cambio })

  return (
    <div className="space-y-4">
      {/* D-005: filtros producto / fecha / animal-lote */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="historial-producto">Producto</Label>
          <Select
            value={filtros.productoId}
            onValueChange={(productoId) => cambiarFiltro({ productoId })}
          >
            <SelectTrigger id="historial-producto">
              <SelectValue placeholder="Todos los productos" />
            </SelectTrigger>
            <SelectContent>
              {productos.map((producto) => (
                <SelectItem key={producto.id} value={producto.id}>
                  {producto.codigo} · {producto.descripcion}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="historial-desde">Desde</Label>
          <Input
            id="historial-desde"
            type="date"
            value={filtros.desde}
            onChange={(evento) => cambiarFiltro({ desde: evento.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="historial-hasta">Hasta</Label>
          <Input
            id="historial-hasta"
            type="date"
            value={filtros.hasta}
            onChange={(evento) => cambiarFiltro({ hasta: evento.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="historial-animal-lote">Animal o lote</Label>
          <Input
            id="historial-animal-lote"
            value={filtros.animalOLote}
            onChange={(evento) => cambiarFiltro({ animalOLote: evento.target.value })}
            placeholder="Buscar animal o lote"
          />
        </div>
      </div>

      {/* Tabla del historial */}
      {filas.length === 0 ? (
        <p className="rounded-card border bg-card p-4 text-support text-muted-foreground">
          Sin aplicaciones registradas con los filtros actuales.
        </p>
      ) : (
        <div className="rounded-card border bg-card overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Historial de aplicaciones sanitarias</caption>
            <thead>
              <tr className="border-b bg-muted/30">
                <th scope="col" className="px-3 py-2 text-caption font-medium text-muted-foreground">
                  Fecha
                </th>
                <th scope="col" className="px-3 py-2 text-caption font-medium text-muted-foreground">
                  Producto
                </th>
                <th scope="col" className="px-3 py-2 text-caption font-medium text-muted-foreground">
                  Animal / Lote
                </th>
                <th scope="col" className="px-3 py-2 text-caption font-medium text-muted-foreground">
                  Dosis
                </th>
                <th scope="col" className="px-3 py-2 text-caption font-medium text-muted-foreground">
                  Responsable
                </th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.id} className="border-b last:border-b-0">
                  <td className={CELDA_MUTED}>{fila.fecha}</td>
                  <td className={CELDA}>
                    <span className="block font-medium">{fila.productoDescripcion}</span>
                    <span className="block text-caption text-muted-foreground">
                      {fila.productoCodigo}
                    </span>
                  </td>
                  <td className={CELDA}>
                    {fila.objetivo === "lote" ? (
                      <>
                        <span className="block font-medium">{fila.loteDescripcion ?? "Lote"}</span>
                        <span className="block text-caption text-muted-foreground num">
                          {fila.cantidadAnimales} animales
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="block font-medium">{fila.animalCodigo ?? "—"}</span>
                        <span className="block text-caption text-muted-foreground num">
                          {fila.cantidadAnimales} animal
                        </span>
                      </>
                    )}
                  </td>
                  <td className={CELDA_MUTED}>{fila.dosis}</td>
                  <td className={CELDA_MUTED}>{fila.responsable ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* D-005: paginación */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-support text-muted-foreground num">
          Página {pagina} de {totalPaginas} · {total} registros
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => onCambiarPagina(pagina - 1)}
            disabled={pagina <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            Anterior
          </Button>
          <Button
            variant="outline"
            onClick={() => onCambiarPagina(pagina + 1)}
            disabled={pagina >= totalPaginas}
            aria-label="Página siguiente"
          >
            Siguiente
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
