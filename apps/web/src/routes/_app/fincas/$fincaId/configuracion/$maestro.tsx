/**
 * Ruta CRUD genérica de maestros (issue #150, RF-CONFIG-MAESTROS v1.0).
 *
 * CM-021/CM-022: gate `configuracion:ver` en `beforeLoad` (patrón del hub);
 * los botones de escritura se gatean en la vista y el servidor re-valida
 * (PE-002). `$maestro` se valida contra los slugs editables de este issue;
 * desconocidos o de otros issues (predio/razas/tipos-explotacion/calidades,
 * #151) redirigen al hub en vez de 404.
 *
 * Loader: `listarMaestroAction` con la consulta por defecto (lotes-grupos
 * carga `lotes`, CM-035 — el tab es estado de la vista). Denials del server
 * function redirigen (no_autenticado → /login, resto → "/"); fallo RPC →
 * `{tipo:"error"}` con reintento (CM-014 patrón hub).
 *
 * CM-037/S-2: el loader pide pageSize 100 (scroll completo) y
 * `consultarMaestroNormalizado` corrige a 25/página si total ≥ 100.
 */

import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router"
import {
  definicionMaestroCrudPorSlug,
  nombreMaestroPorSlug,
} from "../../../../../configuracion/definicion-maestros.js"
import {
  MaestroCrudView,
  type MaestroListadoDatos,
  PAGE_SIZE_COMPLETO,
  consultarMaestroNormalizado,
} from "../../../../../configuracion/maestro-crud.js"
import {
  puedeCrearConfiguracion,
  puedeEditarConfiguracion,
  puedeInactivarConfiguracion,
  puedeVerConfiguracion,
} from "../../../../../configuracion/permisos-configuracion.js"

export type ConfiguracionMaestroLoaderResult =
  | ({ readonly tipo: "lista" } & MaestroListadoDatos)
  | { readonly tipo: "error" }

export const Route = createFileRoute("/_app/fincas/$fincaId/configuracion/$maestro")({
  beforeLoad: ({ context, params }) => {
    if (!puedeVerConfiguracion(context.sesion.permisos)) throw redirect({ to: "/" })
    if (!definicionMaestroCrudPorSlug(params.maestro)) {
      throw redirect({ to: `/fincas/${params.fincaId}/configuracion` })
    }
  },
  loader: async ({ params }) => {
    const definicion = definicionMaestroCrudPorSlug(params.maestro)
    if (!definicion) throw redirect({ to: `/fincas/${params.fincaId}/configuracion` })
    const resultado = await consultarMaestroNormalizado({
      fincaId: params.fincaId,
      maestro: definicion.consulta,
      opciones: { pagina: 1, pageSize: PAGE_SIZE_COMPLETO },
    }).catch((): ConfiguracionMaestroLoaderResult => ({ tipo: "error" }))
    if (resultado.tipo === "no_autenticado") throw redirect({ to: "/login" })
    if (resultado.tipo === "finca_no_autorizada" || resultado.tipo === "permiso_denegado") {
      throw redirect({ to: "/" })
    }
    if (resultado.tipo === "error") return { tipo: "error" }
    return {
      tipo: "lista" as const,
      filas: resultado.filas,
      total: resultado.total,
      pagina: resultado.pagina,
      pageSize: resultado.pageSize,
    }
  },
  pendingComponent: ConfiguracionMaestroSkeleton,
  component: ConfiguracionMaestro,
})

function ConfiguracionMaestro() {
  const resultado = Route.useLoaderData()
  const params = Route.useParams()
  const { sesion } = Route.useRouteContext()
  const navigate = useNavigate()
  const router = useRouter()
  const definicion = definicionMaestroCrudPorSlug(params.maestro)
  if (!definicion) return null // inalcanzable: beforeLoad redirige

  return (
    <MaestroCrudView
      fincaId={params.fincaId}
      slug={definicion.slug}
      nombreMaestro={nombreMaestroPorSlug(definicion.slug) ?? definicion.singular}
      singular={definicion.singular}
      permisos={{
        crear: puedeCrearConfiguracion(sesion.permisos),
        editar: puedeEditarConfiguracion(sesion.permisos),
        inactivar: puedeInactivarConfiguracion(sesion.permisos),
      }}
      resultado={resultado}
      onRefrescar={() => void router.invalidate()}
      onVolver={() => void navigate({ to: `/fincas/${params.fincaId}/configuracion` })}
    />
  )
}

/** CM-014: skeleton mientras corre el loader. */
function ConfiguracionMaestroSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-4" aria-busy="true">
      <div className="h-5 w-48 rounded bg-muted animate-pulse" />
      <div className="h-12 rounded-card bg-muted animate-pulse" />
      <div className="space-y-2">
        {["sk-1", "sk-2", "sk-3", "sk-4"].map((clave) => (
          <div key={clave} className="h-12 rounded-card bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  )
}
