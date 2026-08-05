/**
 * Ruta CRUD genérica de maestros + catálogos globales (issue #150/#151,
 * RF-CONFIG-MAESTROS v1.0).
 *
 * Issue #152 — FIX de routing: los catálogos globales vivían en un segmento
 * dinámico hermano (`$catalogo.tsx`) que TanStack Router registraba PRIMERO,
 * sombreando esta ruta y dejando los CRUD de maestros inalcanzables (toda
 * URL `/configuracion/<slug>` caía en el catálogo y los slugs de maestro
 * rebotaban al hub). Ahora hay UN ÚNICO segmento dinámico que despacha por
 * slug: catálogo global (CM-025/CM-053) o maestro editable (CM-021..CM-045).
 *
 * CM-021/CM-022: gate `configuracion:ver` en `beforeLoad` (patrón del hub);
 * los botones de escritura se gatean en la vista y el servidor re-valida
 * (PE-002). `$maestro` se valida contra los slugs editables y los tres
 * catálogos globales; desconocidos redirigen al hub en vez de 404.
 *
 * Loader: `listarMaestroAction` con la consulta por defecto (lotes-grupos
 * carga `lotes`, CM-035 — el tab es estado de la vista) o
 * `listarCatalogoGlobalAction` para los globales. Denials del server
 * function redirigen (no_autenticado → /login, resto → "/"); fallo RPC →
 * `{tipo:"error"}` con reintento (CM-014 patrón hub).
 *
 * CM-037/S-2: el loader pide pageSize 100 (scroll completo) y
 * `consultarMaestroNormalizado` corrige a 25/página si total ≥ 100.
 */

import type { FilaCatalogoGlobalConfiguracion } from "@ganaweb/aplicacion"
import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router"
import {
  type ConfiguracionCatalogoLoaderResult,
  ConfiguracionCatalogoView,
  catalogoPorSlug,
} from "../../../../../configuracion/catalogo-global.js"
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
import { listarCatalogoGlobalAction } from "../../../../../server/configuracion-actions.js"

export type ConfiguracionMaestroLoaderResult =
  | ({ readonly tipo: "lista" } & MaestroListadoDatos)
  | { readonly tipo: "error" }

/** Unión del loader de la ruta única: lista CRUD, lista de catálogo o error. */
export type ConfiguracionSlugLoaderResult =
  | ConfiguracionMaestroLoaderResult
  | { readonly tipo: "lista"; readonly filas: readonly FilaCatalogoGlobalConfiguracion[] }

export const Route = createFileRoute("/_app/fincas/$fincaId/configuracion/$maestro")({
  beforeLoad: ({ context, params }) => {
    if (!puedeVerConfiguracion(context.sesion.permisos)) throw redirect({ to: "/" })
    const esMaestro = Boolean(definicionMaestroCrudPorSlug(params.maestro))
    const esCatalogo = Boolean(catalogoPorSlug(params.maestro))
    if (!esMaestro && !esCatalogo) {
      throw redirect({ to: "/fincas/$fincaId/configuracion", params: { fincaId: params.fincaId } })
    }
  },
  loader: async ({ params }) => {
    const definicionCatalogo = catalogoPorSlug(params.maestro)
    if (definicionCatalogo) {
      const resultado = await listarCatalogoGlobalAction({
        data: { catalogo: definicionCatalogo.catalogo },
      }).catch(() => null)
      if (resultado === null) return { tipo: "error" } as const
      if (resultado.tipo === "no_autenticado") throw redirect({ to: "/login" })
      if (resultado.tipo === "finca_no_autorizada" || resultado.tipo === "permiso_denegado") {
        throw redirect({ to: "/" })
      }
      return { tipo: "lista", filas: resultado.filas } as const
    }

    const definicion = definicionMaestroCrudPorSlug(params.maestro)
    if (!definicion)
      throw redirect({ to: "/fincas/$fincaId/configuracion", params: { fincaId: params.fincaId } })
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

  // Catálogo global solo lectura (CM-025/CM-053): vista dedicada.
  const definicionCatalogo = catalogoPorSlug(params.maestro)
  if (definicionCatalogo) {
    return (
      <ConfiguracionCatalogoView
        fincaId={params.fincaId}
        definicion={definicionCatalogo}
        resultado={resultado as ConfiguracionCatalogoLoaderResult}
        onNavegar={(ruta) => void navigate({ to: ruta })}
        onReintentar={() => void router.invalidate()}
      />
    )
  }

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
      resultado={resultado as ConfiguracionMaestroLoaderResult}
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
