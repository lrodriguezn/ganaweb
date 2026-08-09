import { useEffect, useRef } from "react"

import { CATEGORIAS_EVENTO, TIPOS_EVENTO_WIZARD, metaDeTipo } from "./catalogo-tipos"
import type { DominioEventoWizard, PermisosEfectivosPorDominio, TipoEventoWizard } from "./types"

/**
 * Paso 1 del wizard (EV-CAP-001): selector de tipo agrupado por categoría.
 *
 * RBAC: solo se renderizan los tipos cuyo `dominio:crear` está en los
 * permisos efectivos. La autorización real la enforce el server
 * (boundary #226 → 403 si falta); este filtro es fail-closed visual.
 */
export interface PasoTipoProps {
  readonly tipoInicial?: TipoEventoWizard | undefined
  readonly categoriaContextual?: DominioEventoWizard | undefined
  readonly permisosEfectivos: PermisosEfectivosPorDominio
  readonly onSeleccionar: (tipo: TipoEventoWizard) => void
  readonly onVerTodosTipos: () => void
}

export function PasoTipo({
  tipoInicial,
  categoriaContextual,
  permisosEfectivos,
  onSeleccionar,
  onVerTodosTipos,
}: PasoTipoProps) {
  const categoriaRefs = useRef<Partial<Record<DominioEventoWizard, HTMLElement>>>({})
  const verTodosRef = useRef<HTMLButtonElement>(null)
  const tiposAutorizados = TIPOS_EVENTO_WIZARD.filter(
    (tipo) => permisosEfectivos[tipo.dominio] === true,
  )
  const tiposVisibles = categoriaContextual
    ? tiposAutorizados.filter((tipo) => tipo.categoria === categoriaContextual)
    : tiposAutorizados

  useEffect(() => {
    if (!categoriaContextual) return
    const section = categoriaRefs.current[categoriaContextual]
    if (section) {
      section.scrollIntoView({ block: "nearest" })
      section.focus({ preventScroll: true })
      return
    }
    verTodosRef.current?.focus()
  }, [categoriaContextual])

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 space-y-5"
      data-testid="evento-wizard-type-scroll"
    >
      {categoriaContextual && (
        <button
          ref={verTodosRef}
          type="button"
          onClick={onVerTodosTipos}
          className="min-h-11 text-support font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ver todos los tipos
        </button>
      )}
      {CATEGORIAS_EVENTO.map((categoria) => {
        const tiposDeCategoria = tiposVisibles.filter((t) => t.categoria === categoria.id)
        if (tiposDeCategoria.length === 0) return null
        return (
          <section
            ref={(section) => {
              if (section) categoriaRefs.current[categoria.id] = section
            }}
            key={categoria.id}
            aria-labelledby={`cat-${categoria.id}`}
            data-testid={`evento-wizard-category-${categoria.id}`}
            tabIndex={-1}
          >
            <h3 id={`cat-${categoria.id}`} className="text-support font-semibold mb-2">
              {categoria.label}
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {tiposDeCategoria.map((tipo) => {
                const Icon = tipo.icon
                const activo = tipoInicial === tipo.id
                const meta = metaDeTipo(tipo.id)
                void meta
                return (
                  <button
                    key={tipo.id}
                    type="button"
                    onClick={() => onSeleccionar(tipo.id)}
                    aria-pressed={activo}
                    aria-label={`${tipo.label}${tipo.grupal ? "" : " — solo individual"}`}
                    className={`min-h-16 rounded-card border bg-card flex flex-col items-center justify-center gap-1 px-2 py-2 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      activo ? "border-pasto-600" : "border-input"
                    }`}
                  >
                    <span
                      className={`size-9 rounded-full flex items-center justify-center ${tipo.domClass}`}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-caption text-center font-medium">{tipo.label}</span>
                    {!tipo.grupal && (
                      <span className="text-[10px] leading-tight text-muted-foreground">
                        Solo individual
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
      {categoriaContextual && tiposVisibles.length === 0 && (
        // biome-ignore lint/a11y/useSemanticElements: status announcements belong in a paragraph, not a form-associated <output>.
        <p className="text-support text-muted-foreground text-center py-6" role="status">
          No tienes tipos autorizados en esta categoría.
        </p>
      )}
      {!categoriaContextual && tiposAutorizados.length === 0 && (
        // biome-ignore lint/a11y/useSemanticElements: status announcements belong in a paragraph, not a form-associated <output>.
        <p className="text-support text-muted-foreground text-center py-6" role="status">
          No tienes permisos de creación para ningún dominio. Pide a un administrador que habilite
          eventos.
        </p>
      )}
    </div>
  )
}
