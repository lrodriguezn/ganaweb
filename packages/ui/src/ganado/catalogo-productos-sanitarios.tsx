import { useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../primitives/alert-dialog"
import { Button } from "../primitives/button"
import { EstadoBadge } from "./estado-badge"
import { type PermisosUsuario, tienePermiso } from "./types"

/**
 * Catálogo de productos sanitarios — componentes reutilizables
 * (Issue #209, RF-SANIDAD v0.2 §6/§12).
 *
 * Reglas encapsuladas:
 * - SAN-022/KPI-10: cada fila muestra el stock calculado (RN-041, llega del
 *   caso de uso vía vista `inventario_sanitario`) + semáforo:
 *   agotado ≤ 0 · bajo < umbral · ok. El umbral NUNCA vive aquí (T-001):
 *   el estado llega ya calculado.
 * - PE-001/SAN-061: las acciones se gatean por PERMISO (`tienePermiso`),
 *   nunca por nombre de rol.
 * - RN-050/SAN-021: no hay botón de eliminar en ninguna vista; la única
 *   baja es inactivar/reactivar, con confirmación explícita (AlertDialog).
 * - SAN-020: el formulario expone los campos del catálogo y muestra los
 *   errores del dominio con forma `{ campo, detalle }`.
 * - SAN-080/SAN-081 (T-004): tokens del diseño vía clases semánticas
 *   (`exito`/`alerta`/`peligro`); theming por tokens, sin variantes de modo.
 *
 * El shell de la página `/fincas/$fincaId/sanidad` pertenece a #212/#213;
 * estos componentes son los bloques que ese shell compone.
 */

export type EstadoStockProductoUI = "agotado" | "bajo" | "ok"

/** Fila serializable que el caso de uso `listarCatalogoProductoSanitario` produce. */
export interface FilaProductoSanitarioUI {
  readonly id: string
  readonly codigo: string
  readonly descripcion: string
  readonly mlMgPorDosis: number | null
  readonly tipoTratamiento: string
  readonly precioDosis: number | null
  readonly comentarios: string | null
  readonly activo: boolean
  /** RN-041: stock SIEMPRE calculado; puede ser negativo (reconciliación). */
  readonly stockDisponible: number
  /** KPI-10: semáforo calculado por el caso de uso con el umbral efectivo. */
  readonly estadoStock: EstadoStockProductoUI
}

export interface CatalogoProductosSanitariosProps {
  readonly filas: readonly FilaProductoSanitarioUI[]
  /** Permisos efectivos de la finca activa — gating por permiso (PE-001). */
  readonly permisos: PermisosUsuario
  readonly procesando?: boolean
  readonly onEditar: (fila: FilaProductoSanitarioUI) => void
  /** SAN-021: `activo=false` inactiva; `activo=true` reactiva. */
  readonly onCambiarEstado: (fila: FilaProductoSanitarioUI, activo: boolean) => void
}

const ETIQUETAS_TIPO_TRATAMIENTO: Readonly<Record<string, string>> = {
  reproductivo: "Reproductivo",
  no_reproductivo: "No reproductivo",
  vacuna: "Vacuna",
}

function etiquetaTipoTratamiento(tipo: string): string {
  return ETIQUETAS_TIPO_TRATAMIENTO[tipo] ?? tipo
}

/** SAN-022: semáforo KPI-10 — colores semánticos del diseño (SAN-080). */
export function SemaforoStockProducto({
  stockDisponible,
  estadoStock,
}: {
  readonly stockDisponible: number
  readonly estadoStock: EstadoStockProductoUI
}) {
  if (estadoStock === "agotado") return <EstadoBadge variant="peligro">Agotado</EstadoBadge>
  if (estadoStock === "bajo") {
    return <EstadoBadge variant="alerta">{`${stockDisponible} dosis`}</EstadoBadge>
  }
  return <EstadoBadge variant="exito">OK</EstadoBadge>
}

interface EstadoPendiente {
  readonly fila: FilaProductoSanitarioUI
  readonly activo: boolean
}

/**
 * SAN-021: confirmación explícita del cambio de estado. El copy recuerda
 * que el producto se conserva en históricos (RN-050: nunca borrado).
 */
export function ConfirmacionEstadoProducto({
  pendiente,
  procesando,
  onConfirmar,
  onCancelar,
}: {
  readonly pendiente: EstadoPendiente | null
  readonly procesando?: boolean
  readonly onConfirmar: () => void
  readonly onCancelar: () => void
}) {
  if (pendiente === null) return null
  const { fila, activo } = pendiente
  return (
    <AlertDialog open onOpenChange={(abierto) => !abierto && !procesando && onCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {activo ? `¿Reactivar ${fila.codigo}?` : `¿Inactivar ${fila.codigo}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {activo
              ? "Volverá a aparecer en los selects de captura y en el catálogo."
              : "Dejará de aparecer en formularios y listas; se conserva en históricos."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={procesando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={procesando} onClick={onConfirmar}>
            {activo ? "Reactivar" : "Inactivar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function BotonesFila({
  fila,
  puedeEditar,
  puedeCambiarEstado,
  procesando,
  onEditar,
  onSolicitarCambioEstado,
}: {
  readonly fila: FilaProductoSanitarioUI
  readonly puedeEditar: boolean
  readonly puedeCambiarEstado: boolean
  readonly procesando: boolean
  readonly onEditar: (fila: FilaProductoSanitarioUI) => void
  readonly onSolicitarCambioEstado: (pendiente: EstadoPendiente) => void
}) {
  if (!puedeEditar && !puedeCambiarEstado) return null
  return (
    <div className="flex items-center justify-end gap-2">
      {puedeEditar ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={procesando}
          onClick={() => onEditar(fila)}
        >
          {`Editar ${fila.codigo}`}
        </Button>
      ) : null}
      {puedeCambiarEstado ? (
        <Button
          type="button"
          variant={fila.activo ? "outline" : "secondary"}
          size="sm"
          disabled={procesando}
          onClick={() => onSolicitarCambioEstado({ fila, activo: !fila.activo })}
        >
          {fila.activo ? `Inactivar ${fila.codigo}` : `Reactivar ${fila.codigo}`}
        </Button>
      ) : null}
    </div>
  )
}

function useCatalogoState(props: CatalogoProductosSanitariosProps) {
  const [pendiente, setPendiente] = useState<EstadoPendiente | null>(null)
  const puedeEditar = tienePermiso(props.permisos, "sanidad", "editar")
  const puedeCambiarEstado = tienePermiso(props.permisos, "sanidad", "anular")

  const confirmar = () => {
    if (pendiente === null) return
    props.onCambiarEstado(pendiente.fila, pendiente.activo)
    setPendiente(null)
  }

  return { pendiente, setPendiente, puedeEditar, puedeCambiarEstado, confirmar }
}

/**
 * Catálogo en tabla (desktop). Columnas: código, descripción, tipo, stock
 * calculado (RN-041), semáforo KPI-10 y acciones gateadas por permiso.
 */
export function CatalogoProductosSanitariosDesktop(props: CatalogoProductosSanitariosProps) {
  const { pendiente, setPendiente, puedeEditar, puedeCambiarEstado, confirmar } =
    useCatalogoState(props)
  const procesando = props.procesando ?? false

  return (
    <div className="flex flex-col gap-3">
      {props.filas.length === 0 ? (
        <p className="text-support text-muted-foreground">
          No hay productos sanitarios en el catálogo.
        </p>
      ) : (
        <table className="w-full border-collapse text-support">
          <thead>
            <tr className="border-b text-left text-caption text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Código</th>
              <th className="py-2 pr-3 font-medium">Descripción</th>
              <th className="py-2 pr-3 font-medium">Tipo</th>
              <th className="py-2 pr-3 text-right font-medium">Stock</th>
              <th className="py-2 pr-3 font-medium">Estado</th>
              <th className="py-2 font-medium">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {props.filas.map((fila) => (
              <tr key={fila.id} className="border-b last:border-b-0">
                <td className="py-2.5 pr-3 font-medium">{fila.codigo}</td>
                <td className="py-2.5 pr-3">{fila.descripcion}</td>
                <td className="py-2.5 pr-3">{etiquetaTipoTratamiento(fila.tipoTratamiento)}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{fila.stockDisponible}</td>
                <td className="py-2.5 pr-3">
                  <SemaforoStockProducto
                    stockDisponible={fila.stockDisponible}
                    estadoStock={fila.estadoStock}
                  />
                </td>
                <td className="py-2.5">
                  <BotonesFila
                    fila={fila}
                    puedeEditar={puedeEditar}
                    puedeCambiarEstado={puedeCambiarEstado}
                    procesando={procesando}
                    onEditar={props.onEditar}
                    onSolicitarCambioEstado={setPendiente}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ConfirmacionEstadoProducto
        pendiente={pendiente}
        procesando={procesando}
        onConfirmar={confirmar}
        onCancelar={() => setPendiente(null)}
      />
    </div>
  )
}

/** Catálogo en cards (mobile) — misma información y reglas que la tabla. */
export function CatalogoProductosSanitariosMobile(props: CatalogoProductosSanitariosProps) {
  const { pendiente, setPendiente, puedeEditar, puedeCambiarEstado, confirmar } =
    useCatalogoState(props)
  const procesando = props.procesando ?? false

  return (
    <div className="flex flex-col gap-3">
      {props.filas.length === 0 ? (
        <p className="text-support text-muted-foreground">
          No hay productos sanitarios en el catálogo.
        </p>
      ) : (
        props.filas.map((fila) => (
          <div key={fila.id} className="rounded-card border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">{fila.codigo}</span>
                <span className="text-support text-muted-foreground">{fila.descripcion}</span>
                <span className="text-caption text-muted-foreground">
                  {etiquetaTipoTratamiento(fila.tipoTratamiento)}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="tabular-nums">{fila.stockDisponible}</span>
                <SemaforoStockProducto
                  stockDisponible={fila.stockDisponible}
                  estadoStock={fila.estadoStock}
                />
              </div>
            </div>
            <div className="mt-3">
              <BotonesFila
                fila={fila}
                puedeEditar={puedeEditar}
                puedeCambiarEstado={puedeCambiarEstado}
                procesando={procesando}
                onEditar={props.onEditar}
                onSolicitarCambioEstado={setPendiente}
              />
            </div>
          </div>
        ))
      )}
      <ConfirmacionEstadoProducto
        pendiente={pendiente}
        procesando={procesando}
        onConfirmar={confirmar}
        onCancelar={() => setPendiente(null)}
      />
    </div>
  )
}
