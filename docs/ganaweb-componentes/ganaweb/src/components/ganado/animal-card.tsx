import { useEffect, useRef } from "react";
import { ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoriaBadge, SaludBadge } from "./estado-badge";
import type { AnimalResumen } from "./types";

/**
 * AnimalCard — fila del listado de animales en mobile.
 * Spec: especificaciones_diseno_css.md §6.3
 * Reglas: código en peso 600 (identificador que el operario conoce),
 * altura mínima 72px, long-press activa modo selección.
 */
export interface AnimalCardProps {
  animal: AnimalResumen;
  /** Modo selección múltiple activo en la lista */
  selectionMode?: boolean;
  selected?: boolean;
  onPress: (animal: AnimalResumen) => void;
  onLongPress?: (animal: AnimalResumen) => void;
  className?: string;
}

const LONG_PRESS_MS = 450;

export function AnimalCard({
  animal,
  selectionMode = false,
  selected = false,
  onPress,
  onLongPress,
  className,
}: AnimalCardProps) {
  // v1.2: el timer vive en refs (antes era `let` en el cuerpo del
  // componente: se recreaba en cada render, dejando timeouts huérfanos
  // imposibles de cancelar y sin limpieza al desmontar).
  const pressTimer = useRef<ReturnType<typeof setTimeout>>();
  const longPressFired = useRef(false);

  useEffect(() => () => clearTimeout(pressTimer.current), []);

  const startPress = () => {
    if (!onLongPress) return;
    longPressFired.current = false;
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onLongPress(animal);
    }, LONG_PRESS_MS);
  };

  const cancelPress = () => clearTimeout(pressTimer.current);

  const handleClick = () => {
    if (longPressFired.current) return; // el long-press ya consumió el gesto
    onPress(animal);
  };

  const ubicacion = [animal.potrero, animal.lote].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={handleClick}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      aria-pressed={selectionMode ? selected : undefined}
      className={cn(
        "w-full min-h-[72px] rounded-card border bg-card p-3 text-left",
        "flex items-center gap-3 active:bg-muted transition-colors duration-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected && "border-primary bg-seleccion",
        className,
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-section truncate">
          <span className="font-semibold">{animal.codigoAnimal}</span>
          {animal.nombreAnimal && (
            <span className="font-normal text-muted-foreground">
              {" "}
              {animal.nombreAnimal}
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {animal.categoriaReproductiva &&
            animal.categoriaReproductiva !== "no_aplica" && (
              <CategoriaBadge categoria={animal.categoriaReproductiva} />
            )}
          <SaludBadge salud={animal.salud} />
        </div>
        {ubicacion && (
          <p className="text-caption text-muted-foreground mt-1 truncate">
            {ubicacion}
          </p>
        )}
      </div>

      {selectionMode ? (
        <span
          aria-hidden="true"
          className={cn(
            "size-6 rounded-md border flex items-center justify-center shrink-0",
            selected
              ? "bg-primary border-primary text-primary-foreground"
              : "border-input bg-card",
          )}
        >
          {selected && <Check className="size-4" />}
        </span>
      ) : (
        <ChevronRight
          aria-hidden="true"
          className="size-4 text-muted-foreground shrink-0"
        />
      )}
    </button>
  );
}
