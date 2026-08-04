/**
 * Hub Configuración · Maestros (issue #149, RF-CONFIG-MAESTROS v1.0).
 *
 * CM-001: ruta `/fincas/$fincaId/configuracion`. Es la ruta padre del
 * sub-menú mobile de grupos (`configuracion/grupo/$grupoId.tsx`, S-1/CM-009):
 * cuando el pathname apunta a un hijo renderiza `<Outlet/>` (mismo patrón
 * que `animales.tsx`).
 *
 * RBAC (CM-002/CM-015/CM-021): `beforeLoad` redirige a "/" sin
 * `configuracion:ver`; el loader redirige los denials del server function
 * (`no_autenticado` → /login, resto → "/"). La autorización de fondo es la
 * del harness (PE-002); esto es fail-closed de presentación.
 *
 * CM-014: `pendingComponent` con skeleton; error de RPC (catch del loader)
 * con estado de error + reintento (`router.invalidate()`); items degradados
 * muestran "—" y el hub sigue.
 *
 * CM-015 (nota): las cards navegan a `maestro.ruta`; las rutas CRUD llegan
 * en el issue #150, así que el tap produce un 404 temporal ESPERADO hasta
 * que aterricen.
 */

import {
  EmptyState,
  MaestroCard,
  MaestroFilaConsolidada,
  MaestroGrid,
  type MaestroResumen,
  MaestrosProgreso,
} from "@ganaweb/ui"
import {
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
  useRouterState,
} from "@tanstack/react-router"
import { AlertCircle, ChevronLeft } from "lucide-react"
import {
  FILAS_CONSOLIDADAS_MOVIL,
  type FilaConsolidadaMovil,
  type MaestroHubId,
  rutaConfiguracionGrupo,
} from "../../../../configuracion/definicion-maestros.js"
import { puedeVerConfiguracion } from "../../../../configuracion/permisos-configuracion.js"
import { resumenMaestrosAction } from "../../../../server/configuracion-actions.js"

export type ConfiguracionHubLoaderResult =
  | { readonly tipo: "resumen"; readonly items: readonly MaestroResumen[] }
  | { readonly tipo: "error" }

export const Route = createFileRoute("/_app/fincas/$fincaId/configuracion")({
  beforeLoad: ({ context }) => {
    if (!puedeVerConfiguracion(context.sesion.permisos)) throw redirect({ to: "/" })
  },
  loader: async ({ params }) => {
    const resultado = await resumenMaestrosAction({ data: { fincaId: params.fincaId } }).catch(
      (): ConfiguracionHubLoaderResult => ({ tipo: "error" }),
    )
    if (resultado.tipo === "no_autenticado") throw redirect({ to: "/login" })
    if (resultado.tipo === "finca_no_autorizada" || resultado.tipo === "permiso_denegado") {
      throw redirect({ to: "/" })
    }
    return resultado
  },
  pendingComponent: ConfiguracionHubSkeleton,
  component: ConfiguracionHub,
})

/** CM-009/S-1: modelo de la lista mobile — maestros sueltos + filas consolidadas. */
export type FilaMovil =
  | { readonly tipo: "maestro"; readonly maestro: MaestroResumen }
  | { readonly tipo: "consolidada"; readonly fila: FilaConsolidadaMovil; readonly conteo: string }

/**
 * Orden del frame-20188: los 15 maestros en orden, reemplazando cada grupo
 * consolidado por su fila única en la posición del primer miembro. El conteo
 * compuesto se construye de los miembros; los degradados aportan "—".
 */
export function construirFilasMovil(items: readonly MaestroResumen[]): readonly FilaMovil[] {
  const porId = new Map(items.map((item) => [item.id, item]))
  const filasEmitidas = new Set<string>()
  const filas: FilaMovil[] = []
  for (const item of items) {
    const consolidada = FILAS_CONSOLIDADAS_MOVIL.find((fila) =>
      fila.miembros.includes(item.id as MaestroHubId),
    )
    if (consolidada) {
      if (filasEmitidas.has(consolidada.id)) continue
      filasEmitidas.add(consolidada.id)
      const conteo = consolidada.miembros
        .map((id) => {
          const miembro = porId.get(id)
          return miembro === undefined || miembro.degradado ? "—" : String(miembro.registros)
        })
        .join(" · ")
      filas.push({ tipo: "consolidada", fila: consolidada, conteo })
      continue
    }
    filas.push({ tipo: "maestro", maestro: item })
  }
  return filas
}

function ConfiguracionHub() {
  const resultado = Route.useLoaderData()
  const params = Route.useParams()
  const navigate = useNavigate()
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  if (pathname !== `/fincas/${params.fincaId}/configuracion`) return <Outlet />

  return (
    <ConfiguracionHubView
      fincaId={params.fincaId}
      resultado={resultado}
      onNavegar={(ruta) => void navigate({ to: ruta })}
      onReintentar={() => void router.invalidate()}
    />
  )
}

export interface ConfiguracionHubViewProps {
  readonly fincaId: string
  readonly resultado: ConfiguracionHubLoaderResult
  readonly onNavegar: (ruta: string) => void
  readonly onReintentar: () => void
}

export function ConfiguracionHubView({
  fincaId,
  resultado,
  onNavegar,
  onReintentar,
}: ConfiguracionHubViewProps) {
  const navegarAMaestro = (maestro: MaestroResumen) => onNavegar(maestro.ruta)
  return (
    <div className="mx-auto max-w-6xl space-y-4 md:space-y-6">
      {/* CM-003: header de pantalla — desktop sin back, mobile con back */}
      <header className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onNavegar("/")}
          aria-label="Volver"
          className="md:hidden -ms-2 grid place-items-center size-10 min-h-[--h-touch] rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
        <h1 className="text-[15px] font-medium text-foreground">Configuración</h1>
      </header>

      <section aria-label="Maestros" className="space-y-3">
        <div>
          {/* CM-011: badge de progreso junto al título */}
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-title font-semibold text-foreground">Maestros</h2>
            {resultado.tipo === "resumen" && <MaestrosProgreso maestros={[...resultado.items]} />}
          </div>
          <p className="text-caption text-muted-foreground mt-0.5">
            Datos base que alimentan los formularios de registro
          </p>
        </div>

        {resultado.tipo === "error" ? (
          <EmptyState
            icon={AlertCircle}
            title="No se pudieron cargar los maestros"
            description="Revisa tu conexión e intenta de nuevo."
            actionLabel="Reintentar"
            onAction={onReintentar}
          />
        ) : (
          <>
            {/* CM-004/CM-005: desktop — 15 cards agrupadas */}
            <div className="hidden md:block">
              <MaestroGrid maestros={[...resultado.items]} onPress={navegarAMaestro} />
            </div>
            {/* CM-009/CM-010: mobile — filas 56px, consolidadas + globales */}
            <nav aria-label="Maestros" className="md:hidden flex flex-col gap-2">
              {construirFilasMovil(resultado.items).map((filaMovil) =>
                filaMovil.tipo === "maestro" ? (
                  <MaestroCard
                    key={filaMovil.maestro.id}
                    maestro={filaMovil.maestro}
                    variante="fila"
                    onPress={navegarAMaestro}
                  />
                ) : (
                  <MaestroFilaConsolidada
                    key={filaMovil.fila.id}
                    label={filaMovil.fila.label}
                    conteo={filaMovil.conteo}
                    onPress={() => onNavegar(rutaConfiguracionGrupo(fincaId, filaMovil.fila.id))}
                  />
                ),
              )}
            </nav>
          </>
        )}
      </section>
    </div>
  )
}

/** CM-014: skeleton del hub mientras corre el loader. */
const CLAVES_SKELETON = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6", "sk-7", "sk-8"] as const

function ConfiguracionHubSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 md:space-y-6" aria-busy="true">
      <div className="h-5 w-32 rounded bg-muted animate-pulse" />
      <div className="space-y-3">
        <div className="h-6 w-48 rounded bg-muted animate-pulse" />
        <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CLAVES_SKELETON.map((clave) => (
            <div key={clave} className="h-16 rounded-card bg-muted animate-pulse" />
          ))}
        </div>
        <div className="md:hidden flex flex-col gap-2">
          {CLAVES_SKELETON.map((clave) => (
            <div key={clave} className="h-14 rounded-card bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
