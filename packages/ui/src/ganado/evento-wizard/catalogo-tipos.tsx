import { Baby, Hand, Heart, Milk, Scale, Stethoscope, Syringe, Truck, Wallet } from "lucide-react"

import type { CategoriaMeta, TipoEventoMeta, TipoEventoWizard } from "./types"

/**
 * Catálogo UI de los 11 tipos canónicos del requisito §2.
 *
 * NO duplica reglas de dominio: `dominio` y `tipoGrupal` son strings
 * opacos para el shell; el mapping a `EVENTOS_CANONICOS` vive en el
 * server (`apps/web/src/server/eventos-wizard.server.ts`).
 *
 * `grupal: false` codifica las exclusiones de EV-CAP-007 (parto) y la
 * matriz §2 (muerte/condición corporal pendientes de migración de
 * `registro_grupal_id`).
 */
export const TIPOS_EVENTO_WIZARD: readonly TipoEventoMeta[] = [
  {
    id: "servicio",
    label: "Servicio",
    dominio: "reproductivo",
    categoria: "reproductivo",
    icon: Heart,
    domClass: "text-dom-repro bg-dom-repro-bg",
    grupal: true,
  },
  {
    id: "palpacion",
    label: "Palpación",
    dominio: "reproductivo",
    categoria: "reproductivo",
    icon: Hand,
    domClass: "text-dom-repro bg-dom-repro-bg",
    grupal: true,
  },
  {
    id: "parto",
    label: "Parto",
    dominio: "reproductivo",
    categoria: "reproductivo",
    icon: Baby,
    domClass: "text-dom-repro bg-dom-repro-bg",
    grupal: false,
  },
  {
    id: "aplicacion_sanitaria",
    label: "Aplicación sanitaria",
    dominio: "sanidad",
    categoria: "sanidad",
    icon: Syringe,
    domClass: "text-dom-sanidad bg-dom-sanidad-bg",
    grupal: true,
  },
  {
    id: "revision_veterinaria",
    label: "Revisión veterinaria",
    dominio: "sanidad",
    categoria: "sanidad",
    icon: Stethoscope,
    domClass: "text-dom-sanidad bg-dom-sanidad-bg",
    grupal: true,
  },
  {
    id: "pesaje",
    label: "Pesaje",
    dominio: "productivo",
    categoria: "productivo",
    icon: Scale,
    domClass: "text-dom-manejo bg-dom-manejo-bg",
    grupal: true,
  },
  {
    id: "produccion_lactea",
    label: "Producción láctea",
    dominio: "productivo",
    categoria: "productivo",
    icon: Milk,
    domClass: "text-dom-produccion bg-dom-produccion-bg",
    grupal: true,
  },
  {
    id: "condicion_corporal",
    label: "Condición corporal",
    dominio: "productivo",
    categoria: "productivo",
    icon: Scale,
    domClass: "text-dom-manejo bg-dom-manejo-bg",
    // Matriz §2: requiere migración de `registro_grupal_id` antes de grupal.
    grupal: false,
  },
  {
    id: "venta",
    label: "Venta",
    dominio: "movimientos",
    categoria: "movimientos",
    icon: Wallet,
    domClass: "text-dom-manejo bg-dom-manejo-bg",
    grupal: true,
  },
  {
    id: "muerte",
    label: "Muerte",
    dominio: "movimientos",
    categoria: "movimientos",
    icon: Heart,
    domClass: "text-dom-repro bg-dom-repro-bg",
    // Matriz §2: requiere migración de `registro_grupal_id` antes de grupal.
    grupal: false,
  },
  {
    id: "traslado",
    label: "Traslado",
    dominio: "movimientos",
    categoria: "movimientos",
    icon: Truck,
    domClass: "text-dom-manejo bg-dom-manejo-bg",
    grupal: true,
  },
]

export const CATEGORIAS_EVENTO: readonly CategoriaMeta[] = [
  { id: "reproductivo", label: "Reproductivo" },
  { id: "sanidad", label: "Sanidad" },
  { id: "productivo", label: "Productivo" },
  { id: "movimientos", label: "Movimientos" },
]

export function metaDeTipo(id: TipoEventoWizard): TipoEventoMeta {
  const meta = TIPOS_EVENTO_WIZARD.find((t) => t.id === id)
  if (!meta) throw new Error(`Tipo de evento desconocido: ${id}`)
  return meta
}

export function tiposPorCategoria(categoria: CategoriaMeta["id"]): readonly TipoEventoMeta[] {
  return TIPOS_EVENTO_WIZARD.filter((t) => t.categoria === categoria)
}
