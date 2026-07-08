import { ArrowRightLeft, Baby, Hand, Heart, Milk, Scale, Syringe } from "lucide-react";

import { cn } from "../lib/utils";
import type { DominioEvento, EventoTimeline, TipoEvento } from "./types";

/**
 * Timeline — historial de eventos de la ficha animal.
 * Spec: especificaciones_diseno_css.md §6.9
 * Regla: el color del nodo comunica CATEGORÍA (dominio), nunca estado.
 */

const DOMINIO_STYLE: Record<DominioEvento, { bg: string; fg: string }> = {
  reproduccion: { bg: "bg-dom-repro-bg", fg: "text-dom-repro" },
  sanidad: { bg: "bg-dom-sanidad-bg", fg: "text-dom-sanidad" },
  produccion: { bg: "bg-dom-produccion-bg", fg: "text-dom-produccion" },
  manejo: { bg: "bg-dom-manejo-bg", fg: "text-dom-manejo" },
};

const TIPO_ICON: Record<TipoEvento, React.ComponentType<{ className?: string }>> = {
  peso: Scale,
  vacuna: Syringe,
  servicio: Heart,
  palpacion: Hand,
  parto: Baby,
  produccion: Milk,
  reubicacion: ArrowRightLeft,
};

const fmtFecha = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export interface TimelineProps {
  eventos: EventoTimeline[];
  className?: string;
}

export function Timeline({ eventos, className }: TimelineProps) {
  return (
    <ol className={cn("relative ms-3.5 border-s-2 border-tierra-200", className)}>
      {eventos.map((evento) => {
        const Icon = TIPO_ICON[evento.tipo];
        const style = DOMINIO_STYLE[evento.dominio];
        return (
          <li key={evento.id} className="relative ps-8 pb-5 last:pb-0">
            <span
              aria-hidden="true"
              className={cn(
                "absolute -start-[15px] top-0 size-7 rounded-full",
                "flex items-center justify-center ring-4 ring-background",
                style.bg,
              )}
            >
              <Icon className={cn("size-3.5", style.fg)} />
            </span>
            <time
              dateTime={evento.fecha}
              className="text-caption text-muted-foreground block"
            >
              {fmtFecha.format(new Date(evento.fecha))}
            </time>
            <p className="text-support font-medium">{evento.titulo}</p>
            {evento.detalle && (
              <p className="text-support text-muted-foreground">{evento.detalle}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
