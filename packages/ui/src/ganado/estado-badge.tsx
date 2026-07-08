import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";
import type { CategoriaReproductiva, EstadoAnimal, Salud } from "./types";

/**
 * EstadoBadge — badge semántico del dominio ganadero.
 * Spec: especificaciones_diseno_css.md §6.2
 * Regla: el color comunica ESTADO (nunca categoría de evento) y el texto
 * es siempre la palabra del dominio ganadero.
 */
const estadoBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        exito: "bg-exito-100 text-exito-600",
        alerta: "bg-alerta-100 text-alerta-600",
        peligro: "bg-peligro-100 text-peligro-600",
        info: "bg-info-100 text-info-600",          // v1.2: informativo (offline, tips)
        neutral: "bg-muted text-muted-foreground",
      },
      size: {
        md: "px-2.5 py-0.5 text-caption",
        sm: "px-2 py-px text-[11px]",               // v1.2: tablas densas
      },
    },
    defaultVariants: { variant: "neutral", size: "md" },
  },
);

export interface EstadoBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof estadoBadgeVariants> {
  icon?: React.ReactNode; // lucide de 12px opcional
  /** v1.2: punto del color pleno — escaneo periférico y daltonismo */
  withDot?: boolean;
}

export function EstadoBadge({
  className,
  variant,
  size,
  icon,
  withDot = false,
  children,
  ...props
}: EstadoBadgeProps) {
  return (
    <span className={cn(estadoBadgeVariants({ variant, size }), className)} {...props}>
      {withDot && (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current shrink-0" />
      )}
      {icon}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Mapeos del dominio: una sola fuente de verdad estado -> variante    */
/* ------------------------------------------------------------------ */

const CATEGORIA_MAP: Record<
  CategoriaReproductiva,
  { label: string; variant: EstadoBadgeProps["variant"] }
> = {
  prenada: { label: "Preñada", variant: "exito" },
  parida: { label: "Parida", variant: "exito" },
  servida: { label: "Servida", variant: "alerta" },
  vacia: { label: "Vacía", variant: "neutral" },
  novilla: { label: "Novilla", variant: "neutral" },
  no_aplica: { label: "—", variant: "neutral" },
};

const SALUD_MAP: Record<Salud, { label: string; variant: EstadoBadgeProps["variant"] }> = {
  sano: { label: "Sana", variant: "exito" },
  enfermo: { label: "Enferma", variant: "peligro" },
};

const ESTADO_MAP: Record<
  EstadoAnimal,
  { label: string; variant: EstadoBadgeProps["variant"] }
> = {
  activo: { label: "Activo", variant: "exito" },
  vendido: { label: "Vendido", variant: "neutral" },
  muerto: { label: "Muerto", variant: "peligro" },
};

export function CategoriaBadge({ categoria }: { categoria: CategoriaReproductiva }) {
  const { label, variant } = CATEGORIA_MAP[categoria];
  return <EstadoBadge variant={variant}>{label}</EstadoBadge>;
}

export function SaludBadge({ salud }: { salud: Salud }) {
  const { label, variant } = SALUD_MAP[salud];
  return <EstadoBadge variant={variant}>{label}</EstadoBadge>;
}

export function EstadoAnimalBadge({ estado }: { estado: EstadoAnimal }) {
  const { label, variant } = ESTADO_MAP[estado];
  return <EstadoBadge variant={variant}>{label}</EstadoBadge>;
}

/** Badge de stock para el módulo sanitario (KPI 10) */
export function StockBadge({ dosis }: { dosis: number }) {
  if (dosis <= 0) return <EstadoBadge variant="peligro">Agotado</EstadoBadge>;
  if (dosis < 20)
    return (
      <EstadoBadge variant="alerta" className="num">
        {dosis} dosis
      </EstadoBadge>
    );
  return (
    <EstadoBadge variant="exito" className="num">
      {dosis} dosis
    </EstadoBadge>
  );
}
