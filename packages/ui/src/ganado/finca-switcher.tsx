import { useState } from "react";
import { Check, ChevronDown, CloudOff, Plus, Search } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../primitives/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../primitives/dropdown-menu";
import { cn } from "../lib/utils";
import { EstadoBadge } from "./estado-badge";
import type { FincaResumen } from "./types";

/**
 * FincaSwitcher — selector multi-finca del shell (header).
 * Spec: ganaweb-design.md v1.1 §FincaSwitcher.
 *
 * Reglas encapsuladas:
 * - Cada finca es una fila informada: nombre + rol + estado de sync.
 * - Sin conexión, las fincas SIN réplica del dispositivo se muestran
 *   deshabilitadas (nunca ocultas) con "Requiere conexión · sin datos locales".
 * - La activa lleva fondo de selección + check.
 * - "+ Crear finca" solo si puedeCrearFinca.
 * - En mobile, montar el MISMO <FincaList/> dentro de un Drawer en vez
 *   del DropdownMenu (el contenido es compartido).
 */

export interface FincaSwitcherProps {
  fincas: FincaResumen[];
  fincaActivaId: string;
  /** true cuando el dispositivo está sin conexión */
  offline: boolean;
  puedeCrearFinca?: boolean;
  onSeleccionar: (finca: FincaResumen) => void;   // navega a /fincas/{id}
  onCrearFinca?: () => void;
  className?: string;
}

export function FincaSwitcher(props: FincaSwitcherProps) {
  const activa = props.fincas.find((f) => f.id === props.fincaActivaId);
  // v1.2: si la finca actual tiene pendientes, informar antes del cambio
  // (los pendientes NO se pierden: quedan en la cola local). Informar, no bloquear.
  const [destino, setDestino] = useState<FincaResumen | null>(null);

  const seleccionar = (finca: FincaResumen) => {
    const hayPendientes = (activa?.pendientes ?? 0) > 0 && activa?.sync === "pendiente";
    if (hayPendientes && finca.id !== props.fincaActivaId) setDestino(finca);
    else props.onSeleccionar(finca);
  };

  return (
    <>
    {destino && activa && (
      <AlertDialog open onOpenChange={(o) => !o && setDestino(null)}>
        <AlertDialogContent className="rounded-sheet">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-section">
              Cambiar a {destino.nombre}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-support">
              Tienes {activa.pendientes} registros de {activa.nombre} sin
              sincronizar. No se pierden: se subirán al recuperar señal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[--h-touch]">Quedarme</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-[--h-touch]"
              onClick={() => { props.onSeleccionar(destino); setDestino(null); }}
            >
              Cambiar de finca
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )}
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2 rounded-lg bg-muted px-3 h-9",
          "text-support font-medium text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          props.className,
        )}
      >
        {activa ? `Finca ${activa.nombre}` : "Elegir finca"}
        <ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[340px] p-0 rounded-card">
        <FincaList {...props} onSeleccionar={seleccionar} />
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}

/** Contenido compartido: úsalo también dentro de un Drawer en mobile. */
export function FincaList({
  fincas,
  fincaActivaId,
  offline,
  puedeCrearFinca = false,
  onSeleccionar,
  onCrearFinca,
}: FincaSwitcherProps) {
  const conBuscador = fincas.length > 5;
  return (
    <div>
      {conBuscador && (
        <div className="flex items-center gap-2 px-3 py-2 border-b text-caption text-muted-foreground">
          <Search aria-hidden="true" className="size-3.5" />
          Buscar finca…
        </div>
      )}
      <ul>
        {fincas.map((finca) => {
          const esActiva = finca.id === fincaActivaId;
          const bloqueada = offline && !finca.tieneDatosLocales;
          return (
            <li key={finca.id} className="border-b last:border-b-0">
              <button
                type="button"
                disabled={bloqueada}
                onClick={() => onSeleccionar(finca)}
                aria-current={esActiva ? "true" : undefined}
                className={cn(
                  "w-full min-h-[--h-touch] px-3 py-2.5 flex items-center gap-3 text-left",
                  esActiva && "bg-seleccion",
                  bloqueada ? "opacity-55 cursor-not-allowed" : "hover:bg-muted/60",
                )}
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-support font-medium truncate">
                    {finca.nombre}
                  </span>
                  {bloqueada ? (
                    <span className="block text-caption text-muted-foreground mt-0.5">
                      Requiere conexión · sin datos locales
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 mt-1">
                      {/* v1.2.1: el rol es dinámico (tabla usuarios_roles);
                          se muestra tal cual y se destaca vía esAdmin */}
                      <EstadoBadge variant={finca.esAdmin ? "exito" : "neutral"}>
                        {finca.rol}
                      </EstadoBadge>
                      <SyncEstado finca={finca} />
                    </span>
                  )}
                </span>
                {esActiva && (
                  <Check aria-hidden="true" className="size-4 text-pasto-600 shrink-0" />
                )}
                {bloqueada && (
                  <CloudOff aria-hidden="true" className="size-4 text-muted-foreground shrink-0" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {puedeCrearFinca && onCrearFinca && (
        <button
          type="button"
          onClick={onCrearFinca}
          className="w-full min-h-[--h-touch] px-3 flex items-center gap-1.5 border-t
                     text-support font-medium text-pasto-600 hover:bg-muted/60"
        >
          <Plus aria-hidden="true" className="size-3.5" />
          Crear finca
        </button>
      )}
    </div>
  );
}

function SyncEstado({ finca }: { finca: FincaResumen }) {
  if (finca.sync === "sincronizado")
    return <span className="text-caption text-exito-600">● sincronizada</span>;
  if (finca.sync === "pendiente")
    return (
      <span className="text-caption text-alerta-600 num">
        ● {finca.pendientes ?? 0} pendientes
      </span>
    );
  return <span className="text-caption text-muted-foreground">● offline</span>;
}
