import { useState } from "react"

import { Button } from "../../primitives/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../primitives/dialog"
import type { EventoFeedItem, EventoHistorialItem } from "./types.js"

type EventoAuditable = EventoFeedItem | EventoHistorialItem

export interface AnulacionEventoDialogProps {
  readonly evento: EventoAuditable | null
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onConfirmar: (
    motivo: string,
  ) => Promise<{ tipo: "ok" } | { tipo: "error"; detalle: string }>
  readonly onCorregir: (evento: EventoAuditable) => void
}

export function AnulacionEventoDialog({
  evento,
  open,
  onOpenChange,
  onConfirmar,
  onCorregir,
}: AnulacionEventoDialogProps) {
  const [motivo, setMotivo] = useState("")
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  if (!evento) return null
  const tipo = evento.tipo.replaceAll("_", " ")
  const confirmado = evento.anulado || estado === "ok"

  const cerrar = (next: boolean) => {
    if (!next) {
      setMotivo("")
      setEstado("idle")
      setError(null)
    }
    onOpenChange(next)
  }

  const confirmar = async () => {
    if (!motivo.trim()) {
      setEstado("error")
      setError("El motivo es obligatorio para auditar la anulación.")
      return
    }
    setEstado("enviando")
    setError(null)
    const resultado = await onConfirmar(motivo.trim())
    if (resultado.tipo === "ok") {
      setEstado("ok")
      return
    }
    setEstado("error")
    setError(resultado.detalle)
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent data-testid="anulacion-evento-dialog">
        <DialogHeader>
          <DialogTitle>{confirmado ? "Evento anulado" : "Anular evento"}</DialogTitle>
          <DialogDescription>
            {confirmado
              ? "La fila conserva su auditoría y no se elimina. Puedes registrar una corrección como un evento nuevo."
              : `Vas a anular ${tipo}. Esta acción es append-only y quedará visible en el historial.`}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 text-support">
          <strong>Impacto:</strong>{" "}
          {evento.registroGrupalId
            ? "se anula la cabecera y sus hijos se consideran anulados por derivación."
            : "el evento deja de estar activo; los movimientos no restauran un estado si existe un evento posterior."}
        </div>

        {!confirmado && (
          <label className="grid gap-1 text-support font-medium">
            Motivo obligatorio
            <textarea
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Explica por qué se anula este evento"
              data-testid="anulacion-motivo"
              className="rounded-md border border-input bg-card p-2 text-support font-normal"
            />
          </label>
        )}

        {error && (
          <p role="alert" className="text-caption text-peligro-600">
            {error}
          </p>
        )}
        {estado === "ok" && (
          <output aria-live="polite" className="text-caption text-pasto-700">
            Anulación registrada correctamente.
          </output>
        )}

        <DialogFooter>
          {confirmado ? (
            <Button onClick={() => onCorregir(evento)} data-testid="anulacion-corregir">
              Registrar corrección
            </Button>
          ) : (
            <Button
              onClick={() => void confirmar()}
              disabled={estado === "enviando"}
              data-testid="anulacion-confirmar"
            >
              {estado === "enviando" ? "Registrando..." : "Confirmar anulación"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
