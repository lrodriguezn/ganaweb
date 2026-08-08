import { CATEGORIAS_EVENTO, TIPOS_EVENTO_WIZARD, metaDeTipo } from "./catalogo-tipos"
import type { PermisosEfectivosPorDominio, TipoEventoWizard } from "./types"

/**
 * Paso 1 del wizard (EV-CAP-001): selector de tipo agrupado por categoría.
 *
 * RBAC: solo se renderizan los tipos cuyo `dominio:crear` está en los
 * permisos efectivos. La autorización real la enforce el server
 * (boundary #226 → 403 si falta); este filtro es fail-closed visual.
 */
export interface PasoTipoProps {
  readonly tipoInicial?: TipoEventoWizard | undefined
  readonly permisosEfectivos: PermisosEfectivosPorDominio
  readonly onSeleccionar: (tipo: TipoEventoWizard) => void
}

export function PasoTipo({ tipoInicial, permisosEfectivos, onSeleccionar }: PasoTipoProps) {
  const tiposVisibles = TIPOS_EVENTO_WIZARD.filter((t) => permisosEfectivos[t.dominio] === true)

  return (
    <div className="px-4 pb-6 space-y-5">
      {CATEGORIAS_EVENTO.map((categoria) => {
        const tiposDeCategoria = tiposVisibles.filter((t) => t.categoria === categoria.id)
        if (tiposDeCategoria.length === 0) return null
        return (
          <section key={categoria.id} aria-labelledby={`cat-${categoria.id}`}>
            <h3 id={`cat-${categoria.id}`} className="text-support font-semibold mb-2">
              {categoria.label}
            </h3>
            <div className="grid grid-cols-3 gap-2">
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
                    className={`h-[88px] rounded-card border bg-card flex flex-col items-center justify-center gap-2 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      activo ? "border-pasto-600" : "border-input"
                    }`}
                  >
                    <span
                      className={`size-9 rounded-full flex items-center justify-center ${tipo.domClass}`}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-caption font-medium">{tipo.label}</span>
                    {!tipo.grupal && <span className="sr-only">(solo individual)</span>}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
      {tiposVisibles.length === 0 && (
        // biome-ignore lint/a11y/useSemanticElements: status announcements belong in a paragraph, not a form-associated <output>.
        <p className="text-support text-muted-foreground text-center py-6" role="status">
          No tienes permisos de creación para ningún dominio. Pide a un administrador que habilite
          eventos.
        </p>
      )}
    </div>
  )
}
