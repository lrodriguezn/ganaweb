import { Plus } from "lucide-react"

import { cn } from "../lib/utils"
import type { ItemNav } from "./types"

/**
 * BottomNav — navegación fija del shell en mobile (< 768px).
 * Spec: `specs/app-shell.md` §BottomNav + `ganaweb-design.md` v1.2 §Mobile.
 *
 * Estructura: 5 slots en grid, FAB elevada en el centro.
 *
 *   [ items[0] ] [ items[1] ] [ FAB ] [ items[2] ] [ items[3] ]
 *
 * El consumer pasa EXACTAMENTE 4 ítems (Inicio, Animales, Tareas, Más);
 * la FAB en posición 3 es invariante del shell — es la acción primaria
 * del operario en campo (registrar evento). El icono del slot "Más" lo
 * elige el consumer (típicamente `Menu` / `MoreHorizontal`).
 *
 * La FAB se renderiza con `rounded-full` y queda elevada `-mt-3.5` para
 * sobresalir del borde superior del bottom nav (48px de diámetro, ver
 * también `Fab` standalone en T-004).
 *
 * v1.3 (T-003.2, D3, D12, REQ-BVA-001 / REQ-BVA-004):
 * - El `<nav>` lleva la clase literal `glass-shell` para que en B
 *   aplique el backdrop blur + fondo semi-transparente (la CSS rule
 *   dentro de @supports hace el override; en A y en navegadores sin
 *   soporte el color de superficie opaco se mantiene).
 * - El botón interno de la FAB lleva `bg-primary-gradient` además de
 *   `bg-primary`: en A --primary-gradient es `none` y solo se ve el
 *   color sólido; en B la capa del gradiente (definida en T-001.2) se
 *   pinta sobre el mismo primary.
 */
export interface BottomNavProps {
  /** 4 ítems: posiciones 1, 2, 4 y 5 (la 3 es la FAB, no viene en el array) */
  items: ItemNav[]
  activoId: string
  onNavigate: (item: ItemNav) => void
  onFab: () => void
  className?: string
}

export function BottomNav({ items, activoId, onNavigate, onFab, className }: BottomNavProps) {
  if (items.length !== 4) {
    // dev-only: el shell espera 4 ítems (slots 1, 2, 4, 5; la 3 es la FAB).
    // biome-ignore lint/suspicious/noConsole: dev warning intentional
    console.warn(`[BottomNav] expected exactly 4 items, got ${items.length}`)
  }
  const [a, b, c, d] = items
  return (
    <nav
      className={cn(
        "flex md:hidden fixed bottom-0 inset-x-0 z-30",
        "h-[--h-bottomnav] bg-card border-t pb-safe",
        "glass-shell",
        className,
      )}
      aria-label="Navegación inferior"
    >
      <div className="grid grid-cols-5 w-full">
        {a && <BottomSlot item={a} activo={a.id === activoId} onClick={() => onNavigate(a)} />}
        {b && <BottomSlot item={b} activo={b.id === activoId} onClick={() => onNavigate(b)} />}

        {/* Slot 3 — FAB centrada y elevada sobre el borde superior.
           La elevación es puramente posicional (`-mt-3.5`); el sistema
           de diseño no usa sombras (excepción documentada en design.md:
           solo barra flotante de selección múltiple). */}
        <div className="flex items-start justify-center -mt-3.5">
          <button
            type="button"
            onClick={onFab}
            aria-label="Registrar evento"
            className={cn(
              "size-12 rounded-full bg-primary text-primary-foreground",
              "bg-primary-gradient",
              "grid place-items-center shrink-0",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <Plus aria-hidden="true" className="size-5" />
          </button>
        </div>

        {c && <BottomSlot item={c} activo={c.id === activoId} onClick={() => onNavigate(c)} />}
        {d && <BottomSlot item={d} activo={d.id === activoId} onClick={() => onNavigate(d)} />}
      </div>
    </nav>
  )
}

function BottomSlot({
  item,
  activo,
  onClick,
}: {
  item: ItemNav
  activo: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 min-h-[--h-touch] py-1.5",
        "transition-colors duration-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        activo ? "text-pasto-600" : "text-muted-foreground",
      )}
    >
      <Icon aria-hidden="true" className="size-5" />
      <span className="text-caption font-medium leading-none">{item.label}</span>
    </button>
  )
}
