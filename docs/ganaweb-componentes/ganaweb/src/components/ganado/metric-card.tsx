import { cn } from "@/lib/utils";

/**
 * MetricCard — cifra de dashboard con un solo dato dominante.
 * v1.2: navegable — "Enfermos: 7" exige acción; con onPress la card es un
 * botón que lleva a la vista filtrada (los filtros viven en la URL).
 */
export interface MetricCardProps {
  label: string;
  value: string | number;
  context?: string;
  contextTone?: "exito" | "alerta" | "peligro" | "info" | "neutral";
  critical?: boolean;
  /** v1.2: convierte la card en botón (navegar a la vista filtrada) */
  onPress?: () => void;
  className?: string;
}

const CONTEXT_TONE: Record<NonNullable<MetricCardProps["contextTone"]>, string> = {
  exito: "text-exito-600",
  alerta: "text-alerta-600",
  peligro: "text-peligro-600",
  info: "text-info-600",
  neutral: "text-muted-foreground",
};

export function MetricCard({
  label,
  value,
  context,
  contextTone = "neutral",
  critical = false,
  onPress,
  className,
}: MetricCardProps) {
  const contenido = (
    <>
      <p className="text-caption font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-metric num mt-1",
          critical ? "text-peligro-600" : "text-foreground",
        )}
      >
        {value}
        {context && (
          <span className={cn("text-support font-normal ms-1.5", CONTEXT_TONE[contextTone])}>
            {context}
          </span>
        )}
      </p>
    </>
  );

  const base = "rounded-card border bg-card p-4 text-left w-full";

  if (onPress) {
    return (
      <button
        type="button"
        onClick={onPress}
        className={cn(
          base,
          "hover:bg-muted/40 active:bg-muted transition-colors duration-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className,
        )}
      >
        {contenido}
      </button>
    );
  }
  return <div className={cn(base, className)}>{contenido}</div>;
}

export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-card border bg-card p-4", className)}>
      <div className="h-3 w-20 rounded bg-muted animate-pulse" />
      <div className="mt-2 h-7 w-16 rounded bg-muted animate-pulse" />
    </div>
  );
}
