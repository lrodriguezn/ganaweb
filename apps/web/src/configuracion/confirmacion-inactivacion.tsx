/**
 * Confirmación de inactivar/activar un maestro (issue #150, CM-044/CM-045).
 *
 * Nunca hay botón de eliminar (RN-050): el ciclo de vida se resuelve con
 * estado. La confirmación es explícita (AlertDialog) con el copy del
 * requisito; CM-046 recuerda bajo la tabla que los registros usados en
 * eventos se conservan en históricos.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ganaweb/ui"

export interface ConfirmacionEstadoProps {
  readonly nombreRegistro: string
  /** true → activar; false → inactivar. */
  readonly activar: boolean
  readonly procesando: boolean
  readonly onConfirmar: () => void
  readonly onCancelar: () => void
}

export function ConfirmacionCambioEstado({
  nombreRegistro,
  activar,
  procesando,
  onConfirmar,
  onCancelar,
}: ConfirmacionEstadoProps) {
  return (
    <AlertDialog open onOpenChange={(abierto) => !abierto && !procesando && onCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {activar ? `¿Activar ${nombreRegistro}?` : `¿Inactivar ${nombreRegistro}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {activar
              ? "Volverá a aparecer en los formularios y en las listas."
              : "Dejará de aparecer en formularios y listas; se conserva en históricos."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={procesando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={procesando} onClick={onConfirmar}>
            {procesando ? "Procesando…" : activar ? "Activar" : "Inactivar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
