import { useState } from "react";
import { Baby, Hand, Heart, Milk, Scale, Syringe } from "lucide-react";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "../../primitives/drawer";
import { cn } from "../../lib/utils";
import type { AnimalResumen, TipoEvento } from "../types";
import { FormularioVacuna } from "./formulario-vacuna";

/**
 * EventDrawer — registro rápido de eventos para 1..N animales.
 * Spec: diseno_paginas_detallado.md §4 y especificaciones_diseno_css.md §6.5
 *
 * Flujo: Paso 1 (tipo) -> Paso 2 (alcance) -> Paso 3 (formulario).
 * Si se abre con `animalesPreseleccionados`, salta directo al paso 3
 * (caso: desde la ficha del animal o desde selección múltiple del listado).
 *
 * Este orquestador incluye el formulario de vacuna como referencia;
 * los demás formularios (peso, palpación, servicio...) siguen el mismo
 * contrato: reciben los animales y emiten onGuardar con las filas a insertar.
 */

const TIPOS: Array<{
  tipo: TipoEvento;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  domClass: string; // color de dominio del ícono
}> = [
  { tipo: "peso", label: "Peso", icon: Scale, domClass: "text-dom-manejo bg-dom-manejo-bg" },
  { tipo: "vacuna", label: "Vacuna", icon: Syringe, domClass: "text-dom-sanidad bg-dom-sanidad-bg" },
  { tipo: "servicio", label: "Servicio", icon: Heart, domClass: "text-dom-repro bg-dom-repro-bg" },
  { tipo: "palpacion", label: "Palpación", icon: Hand, domClass: "text-dom-repro bg-dom-repro-bg" },
  { tipo: "parto", label: "Parto", icon: Baby, domClass: "text-dom-repro bg-dom-repro-bg" },
  { tipo: "produccion", label: "Producción", icon: Milk, domClass: "text-dom-produccion bg-dom-produccion-bg" },
];

type Paso = "tipo" | "alcance" | "formulario";

export interface EventDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Animales ya elegidos (ficha o selección múltiple): salta al paso 3 */
  animalesPreseleccionados?: AnimalResumen[];
  /** Tipo ya elegido (ej. desde alerta de refuerzos): salta el paso 1 */
  tipoPreseleccionado?: TipoEvento;
  /** Callback al confirmar: el padre inserta en la cola local + outbox */
  onGuardar: (payload: {
    tipo: TipoEvento;
    animales: AnimalResumen[];
    datos: Record<string, unknown>;
  }) => Promise<void>;
  /** Loader de animales por lote — leído de la réplica del dispositivo, no de red */
  cargarAnimalesDeLote?: (loteId: string) => Promise<AnimalResumen[]>;
}

export function EventDrawer({
  open,
  onOpenChange,
  animalesPreseleccionados,
  tipoPreseleccionado,
  onGuardar,
}: EventDrawerProps) {
  const preseleccion = Boolean(animalesPreseleccionados?.length);
  const [tipo, setTipo] = useState<TipoEvento | undefined>(tipoPreseleccionado);
  const [animales, setAnimales] = useState<AnimalResumen[]>(
    animalesPreseleccionados ?? [],
  );

  const paso: Paso = !tipo ? "tipo" : animales.length === 0 ? "alcance" : "formulario";

  const reset = () => {
    if (!preseleccion) setAnimales([]);
    if (!tipoPreseleccionado) setTipo(undefined);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent
        className={cn(
          "rounded-t-sheet",
          paso === "formulario" ? "h-[90vh]" : "h-[50vh]",
        )}
      >
        {paso === "tipo" && (
          <>
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-section">¿Qué registrar?</DrawerTitle>
            </DrawerHeader>
            <div className="grid grid-cols-3 gap-2 px-4 pb-6">
              {TIPOS.map(({ tipo: t, label, icon: Icon, domClass }) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={cn(
                    "h-[88px] rounded-card border bg-card flex flex-col items-center",
                    "justify-center gap-2 active:bg-muted",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  <span
                    className={cn(
                      "size-9 rounded-full flex items-center justify-center",
                      domClass,
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-caption font-medium">{label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {paso === "alcance" && (
          <PasoAlcance onSeleccion={setAnimales} onVolver={() => setTipo(undefined)} />
        )}

        {paso === "formulario" && tipo === "vacuna" && (
          <FormularioVacuna
            animales={animales}
            onGuardar={async (datos) => {
              await onGuardar({ tipo: "vacuna", animales, datos });
              handleOpenChange(false);
            }}
            {...(preseleccion ? {} : { onVolver: () => setAnimales([]) })}
          />
        )}

        {/* Los demás formularios se montan aquí con el mismo contrato:
            {paso === "formulario" && tipo === "peso" && <FormularioPeso .../>} */}
      </DrawerContent>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */
/* Paso 2: alcance (lote o animal individual)                          */
/* Implementación de referencia — conectar los selects a la réplica    */
/* del dispositivo de lotes/animales.                                  */
/* ------------------------------------------------------------------ */
function PasoAlcance({
  onSeleccion,
  onVolver,
}: {
  onSeleccion: (animales: AnimalResumen[]) => void;
  onVolver: () => void;
}) {
  return (
    <>
      <DrawerHeader className="pb-2">
        <DrawerTitle className="text-section">¿A quiénes?</DrawerTitle>
      </DrawerHeader>
      <div className="px-4 pb-6 space-y-3">
        {/* Aquí van: RadioGroup (Lote/Potrero vs Animal único),
            Select de lote leyendo del catálogo local con contador de
            animales, y Command de búsqueda por código para el caso
            individual. Al confirmar: onSeleccion(animalesDelLote). */}
        <p className="text-support text-muted-foreground">
          Selector de lote/potrero o búsqueda por código — conectar a la
          réplica del dispositivo (nunca a red).
        </p>
        <button
          type="button"
          onClick={onVolver}
          className="text-support text-primary font-medium"
        >
          ‹ Cambiar tipo de evento
        </button>
      </div>
    </>
  );
}
