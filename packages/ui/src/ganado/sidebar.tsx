import { Settings } from "lucide-react"

import { cn } from "../lib/utils"
import type { ItemNav } from "./types"

/**
 * Sidebar — navegación fija del shell en desktop (≥ 768px).
 * Spec: `specs/app-shell.md` §Sidebar + `ganaweb-design.md` v1.2 §Arquitectura
 * de navegación.
 *
 * Reglas encapsuladas:
 * - 240px de ancho, alto de viewport, oculto en mobile (`hidden md:flex` —
 *   la conmutación con BottomNav es CSS, no JS, para evitar hydration
 *   mismatch).
 * - Logo arriba: cuadrado 30px `rounded-lg bg-primary` + "GanaWeb" 15px/600.
 * - Los ítems los pasa el consumidor (`items: ItemNav[]`); el shell no
 *   conoce el dominio: ni hardcodea "Inicio/Animales/…", ni el orden.
 * - Activo: `bg-seleccion` (token) + `text-pasto-700` (light) /
 *   `text-primary-soft-text` (dark). Inactivo: `text-muted-foreground`.
 * - `Configuración` SIEMPRE está en el footer cuando `puedeConfigurar`
 *   es true (la entrada vive solo en el sidebar, no en el BottomNav —
 *   en mobile queda bajo "Más").
 */
export interface SidebarProps {
  items: ItemNav[]
  /** id del ítem actualmente activo (lo entrega la ruta) */
  activoId: string
  onNavigate: (item: ItemNav) => void
  /** Si true, muestra "Configuración" pinneado en el footer */
  puedeConfigurar?: boolean
  /** Handler del footer "Configuración" — separado para que la ruta
   *  decida si navega a `/configuracion` o abre un sheet de masters. */
  onConfigurar?: () => void
  className?: string
}

export function Sidebar({
  items,
  activoId,
  onNavigate,
  puedeConfigurar = false,
  onConfigurar,
  className,
}: SidebarProps) {
  return (
    <aside
      className={cn("hidden md:flex w-[240px] shrink-0 flex-col border-r bg-card", className)}
      aria-label="Navegación principal"
    >
      <div className="flex items-center gap-2.5 px-4 h-14 border-b">
        <span
          aria-hidden="true"
          className="size-[30px] rounded-lg bg-primary text-primary-foreground grid place-items-center"
        >
          <span className="text-section font-bold leading-none">G</span>
        </span>
        <span className="text-[15px] font-semibold tracking-tight">GanaWeb</span>
      </div>

      <nav className="flex-1 px-2 py-3" aria-label="Secciones">
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const Icon = item.icon
            const activo = item.id === activoId
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(item)}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "w-full min-h-[--h-touch] px-3 flex items-center gap-3 rounded-lg",
                    "text-support font-medium transition-colors duration-100",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    activo
                      ? "bg-seleccion text-pasto-700"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {puedeConfigurar && (
        <div className="px-2 py-3 border-t">
          <button
            type="button"
            onClick={onConfigurar}
            className={cn(
              "w-full min-h-[--h-touch] px-3 flex items-center gap-3 rounded-lg",
              "text-support font-medium text-muted-foreground",
              "hover:bg-muted/60 hover:text-foreground transition-colors duration-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <Settings aria-hidden="true" className="size-4 shrink-0" />
            <span className="flex-1 text-left">Configuración</span>
          </button>
        </div>
      )}
    </aside>
  )
}
