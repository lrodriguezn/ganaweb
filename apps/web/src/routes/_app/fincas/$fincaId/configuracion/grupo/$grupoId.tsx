/**
 * Sub-menú mobile de grupo consolidado (issue #149, S-1/CM-009).
 *
 * Segunda pantalla del hub mobile: una fila por maestro miembro de la fila
 * consolidada (`FILAS_CONSOLIDADAS_MOVIL`) con su conteo. `$grupoId` se
 * valida contra la definición; un id desconocido redirige al hub (no 404).
 *
 * Mismo gate RBAC que el hub (CM-021) y mismos estados CM-014 (skeleton,
 * error con reintento, degradados con "—").
 *
 * CM-015 (nota): las filas navegan a `maestro.ruta`; las rutas CRUD llegan
 * en el issue #150 (404 temporal esperado).
 */

import { EmptyState, MaestroCard, type MaestroResumen } from "@ganaweb/ui"
import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router"
import { AlertCircle, ChevronLeft } from "lucide-react"
import {
  type FilaConsolidadaMovil,
  filaConsolidadaPorId,
} from "../../../../../../configuracion/definicion-maestros.js"
import { puedeVerConfiguracion } from "../../../../../../configuracion/permisos-configuracion.js"
import { resumenMaestrosAction } from "../../../../../../server/configuracion-actions.js"

export type ConfiguracionGrupoLoaderResult =
  | { readonly tipo: "resumen"; readonly items: readonly MaestroResumen[] }
  | { readonly tipo: "error" }

export const Route = createFileRoute("/_app/fincas/$fincaId/configuracion/grupo/$grupoId")({
  beforeLoad: ({ context, params }) => {
    if (!puedeVerConfiguracion(context.sesion.permisos)) throw redirect({ to: "/" })
    if (!filaConsolidadaPorId(params.grupoId)) {
      throw redirect({
        to: "/fincas/$fincaId/configuracion",
        params: { fincaId: params.fincaId },
      })
    }
  },
  loader: async ({ params }) => {
    const resultado = await resumenMaestrosAction({ data: { fincaId: params.fincaId } }).catch(
      (): ConfiguracionGrupoLoaderResult => ({ tipo: "error" }),
    )
    if (resultado.tipo === "no_autenticado") throw redirect({ to: "/login" })
    if (resultado.tipo === "finca_no_autorizada" || resultado.tipo === "permiso_denegado") {
      throw redirect({ to: "/" })
    }
    return resultado
  },
  pendingComponent: ConfiguracionGrupoSkeleton,
  component: ConfiguracionGrupo,
})

/** Miembros en el orden de la definición; ausentes se omiten (fail-closed). */
export function miembrosDeFila(
  fila: FilaConsolidadaMovil,
  items: readonly MaestroResumen[],
): readonly MaestroResumen[] {
  const porId = new Map(items.map((item) => [item.id, item]))
  return fila.miembros.flatMap((id) => {
    const miembro = porId.get(id)
    return miembro ? [miembro] : []
  })
}

function ConfiguracionGrupo() {
  const resultado = Route.useLoaderData()
  const params = Route.useParams()
  const navigate = useNavigate()
  const router = useRouter()
  const fila = filaConsolidadaPorId(params.grupoId)
  if (!fila) return null // inalcanzable: beforeLoad redirige

  return (
    <ConfiguracionGrupoView
      fincaId={params.fincaId}
      fila={fila}
      resultado={resultado}
      onNavegar={(ruta) => void navigate({ to: ruta })}
      onReintentar={() => void router.invalidate()}
    />
  )
}

export interface ConfiguracionGrupoViewProps {
  readonly fincaId: string
  readonly fila: FilaConsolidadaMovil
  readonly resultado: ConfiguracionGrupoLoaderResult
  readonly onNavegar: (ruta: string) => void
  readonly onReintentar: () => void
}

export function ConfiguracionGrupoView({
  fincaId,
  fila,
  resultado,
  onNavegar,
  onReintentar,
}: ConfiguracionGrupoViewProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onNavegar(`/fincas/${fincaId}/configuracion`)}
          aria-label="Volver a Maestros"
          className="-ms-2 grid place-items-center size-10 min-h-[--h-touch] rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
        <h1 className="text-[15px] font-medium text-foreground">{fila.label}</h1>
      </header>

      {resultado.tipo === "error" ? (
        <EmptyState
          icon={AlertCircle}
          title="No se pudieron cargar los maestros"
          description="Revisa tu conexión e intenta de nuevo."
          actionLabel="Reintentar"
          onAction={onReintentar}
        />
      ) : (
        <section aria-label={fila.label} className="flex flex-col gap-2">
          {miembrosDeFila(fila, resultado.items).map((maestro) => (
            <MaestroCard
              key={maestro.id}
              maestro={maestro}
              variante="fila"
              onPress={(m) => onNavegar(m.ruta)}
            />
          ))}
        </section>
      )}
    </div>
  )
}

/** CM-014: skeleton del sub-menú mientras corre el loader. */
const CLAVES_SKELETON_GRUPO = ["sk-1", "sk-2", "sk-3"] as const

function ConfiguracionGrupoSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-4" aria-busy="true">
      <div className="h-5 w-48 rounded bg-muted animate-pulse" />
      <div className="flex flex-col gap-2">
        {CLAVES_SKELETON_GRUPO.map((clave) => (
          <div key={clave} className="h-14 rounded-card bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  )
}
