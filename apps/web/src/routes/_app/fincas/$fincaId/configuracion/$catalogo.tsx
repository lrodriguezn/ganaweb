/**
 * Catálogos globales solo lectura — Razas / Tipos de explotación /
 * Calidades (issue #151, RF-CONFIG-MAESTROS v1.0, CM-025/CM-053/CM-054).
 *
 * Decisión de diseño: UNA ruta parametrizada `$catalogo.tsx` en vez de tres
 * rutas hermanas — las tres vistas son idénticas salvo título y columnas
 * (CM-054), y los slugs de `MAESTROS_HUB` ("razas", "tipos-explotacion",
 * "calidades") ya fijan las URLs `/fincas/$fincaId/configuracion/<slug>`
 * que genera `rutaConfiguracionMaestro`. Un slug desconocido redirige al
 * hub (fail-closed, mismo patrón que `grupo/$grupoId.tsx`); los segmentos
 * estáticos `predio` y `grupo` tienen prioridad sobre `$catalogo` en el
 * enrutador.
 *
 * CM-053: listas SOLO lectura de registros activos con búsqueda (acá
 * client-side sobre las filas del loader) y nota muted de gestión global.
 * CM-025: CERO affordances de escritura — las filas no son botones y no
 * hay acciones de crear/editar/inactivar en ninguna parte de la vista.
 *
 * CM-054: Razas muestra `origen` y `tipo_produccion` como columnas
 * secundarias; Tipos de explotación y Calidades solo nombre + descripción.
 */

import type {
  CatalogoGlobalConfiguracion,
  FilaCatalogoGlobalConfiguracion,
} from "@ganaweb/aplicacion"
import { EmptyState, Input, Label } from "@ganaweb/ui"
import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router"
import { AlertCircle, ChevronLeft, Inbox, SearchX } from "lucide-react"
import { useMemo, useState } from "react"
import {
  MAESTROS_HUB,
  type MaestroHubId,
} from "../../../../../configuracion/definicion-maestros.js"
import { puedeVerConfiguracion } from "../../../../../configuracion/permisos-configuracion.js"
import { listarCatalogoGlobalAction } from "../../../../../server/configuracion-actions.js"

export interface DefinicionCatalogoRuta {
  readonly slug: string
  readonly catalogo: CatalogoGlobalConfiguracion
  readonly titulo: string
  /** CM-054: razas muestra las columnas secundarias origen/tipo_produccion. */
  readonly columnasRaza: boolean
}

function tituloDelHub(hubId: MaestroHubId): string {
  return MAESTROS_HUB.find((item) => item.id === hubId)?.nombre ?? hubId
}

/** Slugs exactos de `MAESTROS_HUB` para los tres catálogos globales. */
export const CATALOGOS_RUTA: readonly DefinicionCatalogoRuta[] = [
  { slug: "razas", catalogo: "razas", titulo: tituloDelHub("razas"), columnasRaza: true },
  {
    slug: "tipos-explotacion",
    catalogo: "tiposExplotacion",
    titulo: tituloDelHub("tiposExplotacion"),
    columnasRaza: false,
  },
  {
    slug: "calidades",
    catalogo: "calidades",
    titulo: tituloDelHub("calidades"),
    columnasRaza: false,
  },
]

export function catalogoPorSlug(slug: string): DefinicionCatalogoRuta | undefined {
  return CATALOGOS_RUTA.find((item) => item.slug === slug)
}

export type ConfiguracionCatalogoLoaderResult =
  | { readonly tipo: "lista"; readonly filas: readonly FilaCatalogoGlobalConfiguracion[] }
  | { readonly tipo: "error" }

export const Route = createFileRoute("/_app/fincas/$fincaId/configuracion/$catalogo")({
  beforeLoad: ({ context, params }) => {
    if (!puedeVerConfiguracion(context.sesion.permisos)) throw redirect({ to: "/" })
    if (!catalogoPorSlug(params.catalogo)) {
      throw redirect({ to: `/fincas/${params.fincaId}/configuracion` })
    }
  },
  loader: async ({ params }) => {
    const definicion = catalogoPorSlug(params.catalogo)
    if (!definicion) return { tipo: "error" } as const // inalcanzable: beforeLoad redirige
    const resultado = await listarCatalogoGlobalAction({
      data: { catalogo: definicion.catalogo },
    }).catch(() => null)
    if (resultado === null) return { tipo: "error" } as const
    if (resultado.tipo === "no_autenticado") throw redirect({ to: "/login" })
    if (resultado.tipo === "finca_no_autorizada" || resultado.tipo === "permiso_denegado") {
      throw redirect({ to: "/" })
    }
    return { tipo: "lista", filas: resultado.filas } as const
  },
  pendingComponent: ConfiguracionCatalogoSkeleton,
  component: ConfiguracionCatalogo,
})

function ConfiguracionCatalogo() {
  const resultado = Route.useLoaderData()
  const params = Route.useParams()
  const navigate = useNavigate()
  const router = useRouter()
  const definicion = catalogoPorSlug(params.catalogo)
  if (!definicion) return null // inalcanzable: beforeLoad redirige
  return (
    <ConfiguracionCatalogoView
      fincaId={params.fincaId}
      definicion={definicion}
      resultado={resultado}
      onNavegar={(ruta) => void navigate({ to: ruta })}
      onReintentar={() => void router.invalidate()}
    />
  )
}

/** Búsqueda insensible: minúsculas y sin diacríticos (es-CO). */
function normalizarBusqueda(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
}

export function filtrarFilas(
  filas: readonly FilaCatalogoGlobalConfiguracion[],
  busqueda: string,
): readonly FilaCatalogoGlobalConfiguracion[] {
  const consulta = normalizarBusqueda(busqueda)
  if (consulta === "") return filas
  return filas.filter((fila) => {
    const nombre = normalizarBusqueda(fila.nombre)
    const descripcion = fila.descripcion === null ? "" : normalizarBusqueda(fila.descripcion)
    return nombre.includes(consulta) || descripcion.includes(consulta)
  })
}

export interface ConfiguracionCatalogoViewProps {
  readonly fincaId: string
  readonly definicion: DefinicionCatalogoRuta
  readonly resultado: ConfiguracionCatalogoLoaderResult
  readonly onNavegar: (ruta: string) => void
  readonly onReintentar: () => void
}

export function ConfiguracionCatalogoView({
  fincaId,
  definicion,
  resultado,
  onNavegar,
  onReintentar,
}: ConfiguracionCatalogoViewProps) {
  const [busqueda, setBusqueda] = useState("")
  const filas = resultado.tipo === "lista" ? resultado.filas : []
  const filtradas = useMemo(() => filtrarFilas(filas, busqueda), [filas, busqueda])

  return (
    <div className="mx-auto max-w-6xl space-y-4 md:space-y-6">
      <header className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onNavegar(`/fincas/${fincaId}/configuracion`)}
          aria-label="Volver a Configuración"
          className="-ms-2 grid place-items-center size-10 min-h-[--h-touch] rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
        <h1 className="text-[15px] font-medium text-foreground">{definicion.titulo}</h1>
      </header>

      {resultado.tipo === "error" ? (
        <EmptyState
          icon={AlertCircle}
          title="No se pudo cargar el catálogo"
          description="Revisa tu conexión e intenta de nuevo."
          actionLabel="Reintentar"
          onAction={onReintentar}
        />
      ) : (
        <section aria-label={definicion.titulo} className="space-y-3">
          {/* CM-053: catálogo global gestionado por la administración. */}
          <p className="text-caption text-muted-foreground">
            Catálogo global gestionado por la administración de GanaWeb.
          </p>

          {filas.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Sin registros"
              description="El catálogo no tiene registros activos."
            />
          ) : (
            <>
              <div className="max-w-sm space-y-1.5">
                <Label htmlFor="busqueda-catalogo" className="sr-only">
                  Buscar en {definicion.titulo}
                </Label>
                <Input
                  id="busqueda-catalogo"
                  type="search"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Buscar por nombre"
                  className="h-10 min-h-[--h-touch]"
                />
              </div>

              {filtradas.length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title="Sin resultados"
                  description={`No hay coincidencias para "${busqueda.trim()}".`}
                />
              ) : (
                <>
                  {/* Desktop: tabla (patrón del listado existente). */}
                  <ListaCatalogoDesktop filas={filtradas} columnasRaza={definicion.columnasRaza} />
                  {/* Mobile: filas apiladas. */}
                  <ListaCatalogoMobile filas={filtradas} columnasRaza={definicion.columnasRaza} />
                </>
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}

const CLASE_TH =
  "px-4 py-2.5 text-left text-caption font-semibold text-muted-foreground uppercase tracking-wide"

function ListaCatalogoDesktop({
  filas,
  columnasRaza,
}: {
  readonly filas: readonly FilaCatalogoGlobalConfiguracion[]
  readonly columnasRaza: boolean
}) {
  return (
    <div className="hidden md:block overflow-hidden rounded-card border bg-card">
      <table className="w-full text-support">
        <thead>
          <tr className="border-b bg-muted/40">
            <th scope="col" className={CLASE_TH}>
              Nombre
            </th>
            <th scope="col" className={CLASE_TH}>
              Descripción
            </th>
            {columnasRaza ? (
              <>
                <th scope="col" className={CLASE_TH}>
                  Origen
                </th>
                <th scope="col" className={CLASE_TH}>
                  Tipo de producción
                </th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.id} className="border-b last:border-b-0">
              <td className="px-4 py-3 text-foreground">{fila.nombre}</td>
              <td className="px-4 py-3 text-muted-foreground">{fila.descripcion ?? "—"}</td>
              {columnasRaza ? (
                <>
                  <td className="px-4 py-3 text-muted-foreground">{fila.origen ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fila.tipoProduccion ?? "—"}</td>
                </>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ListaCatalogoMobile({
  filas,
  columnasRaza,
}: {
  readonly filas: readonly FilaCatalogoGlobalConfiguracion[]
  readonly columnasRaza: boolean
}) {
  return (
    <ul className="md:hidden flex flex-col gap-2">
      {filas.map((fila) => {
        const secundarias = columnasRaza
          ? [
              fila.origen ? `Origen: ${fila.origen}` : null,
              fila.tipoProduccion ? `Tipo de producción: ${fila.tipoProduccion}` : null,
            ].filter((texto): texto is string => texto !== null)
          : []
        return (
          <li key={fila.id} className="rounded-card border bg-card px-4 py-3">
            <p className="text-support font-medium">{fila.nombre}</p>
            {fila.descripcion !== null ? (
              <p className="text-caption text-muted-foreground mt-0.5">{fila.descripcion}</p>
            ) : null}
            {secundarias.length > 0 ? (
              <p className="text-caption text-muted-foreground mt-0.5">{secundarias.join(" · ")}</p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

/** Skeleton mientras corre el loader (CM-014, patrón del hub). */
const CLAVES_SKELETON_CATALOGO = ["sk-1", "sk-2", "sk-3", "sk-4"] as const

function ConfiguracionCatalogoSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-4" aria-busy="true">
      <div className="h-5 w-48 rounded bg-muted animate-pulse" />
      <div className="h-10 w-full max-w-sm rounded-md bg-muted animate-pulse" />
      <div className="space-y-2">
        {CLAVES_SKELETON_CATALOGO.map((clave) => (
          <div key={clave} className="h-14 rounded-card bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  )
}
