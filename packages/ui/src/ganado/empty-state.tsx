import * as React from "react";

import { Button } from "../primitives/button";
import { cn } from "../lib/utils";

/**
 * EmptyState — patrón único de estado vacío en toda la app.
 * Spec: especificaciones_diseno_css.md §6.10
 * Regla: siempre con acción ("Registra el primer peso"), nunca solo texto.
 */
export interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-8 text-muted-foreground" />
      <p className="text-section font-semibold mt-3">{title}</p>
      {description && (
        <p className="text-support text-muted-foreground mt-1 max-w-xs">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="secondary" className="mt-4 min-h-[--h-touch]" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
