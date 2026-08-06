/**
 * Ruta del panel de sanidad (Issue #212, RF-SANIDAD v0.2 §4).
 *
 * SAN-001: `/fincas/$fincaId/sanidad` dentro del shell desktop (el sidebar
 * estándar ya lo renderiza `_app.tsx`; D-006). Es la ruta padre del historial
 * (`sanidad/historial.tsx`): cuando el pathname apunta al hijo renderiza
 * `<Outlet/>` (mismo patrón que `animales.tsx`/`configuracion.tsx`).
 *
 * Degradación por card: el loader invoca una server function por fuente en
 * paralelo, cada una con `.catch` fail-closed → `null`. El fallo de UNA card
 * nunca tumba el panel (la vista renderiza un aviso local por card caída).
 * La autorización de fondo la revalida cada server function (PE-002/SAN-063);
 * acá el denial se degrada a `null` (fail-closed de presentación).
 *
 * SAN-003/SAN-014: los drawers de registro de aplicación (FormularioVacuna
 * con `productoIdInicial`) y de entrada de almacén (FormularioEntradaAlmacen
 * cableado a `registrarEntradaAlmacenFn`) viven en la vista. El guardado de
 * la aplicación es el placeholder de SAN-047 (el caso de uso real llega con
 * #211); la entrada de almacén sí guarda (#210).
 */

import type {
  AlertaStockPanel,
  PanelSanidadMetricas,
  PeriodosRefuerzosSanidad,
  PermisoUsuario,
  UltimaAplicacionPanel,
} from "@ganaweb/aplicacion"
import {
  type AccesoPanelSanidadDestino,
  type DatosEntradaAlmacen,
  Drawer,
  DrawerContent,
  FormularioEntradaAlmacen,
  FormularioVacuna,
  PanelSanidad,
  type ProductoEntradaAlmacen,
  type ProductoSanitario,
  crearPermisos,
} from "@ganaweb/ui"
import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router"
import { useState } from "react"
import { registrarEntradaAlmacenFn } from "../../../../server/sanidad-almacen.js"
import { listarCatalogoSanidadFn } from "../../../../server/sanidad-catalogo-actions.js"
import {
  listarProximasPanelSanidadFn,
  listarStockPanelSanidadFn,
  listarUltimasPanelSanidadFn,
  obtenerMetricasPanelSanidadFn,
} from "../../../../server/sanidad-panel.js"

/** Data del loader: una fuente por card, `null` = card degradada (CM-042). */
export interface SanidadPanelLoaderData {
  readonly fincaNombre: string
  /** PE-001: permisos efectivos (serializables; el set se arma en la vista). */
  readonly permisos: readonly PermisoUsuario[]
  readonly metricas: PanelSanidadMetricas | null
  readonly proximas: PeriodosRefuerzosSanidad | null
  readonly ultimas: readonly UltimaAplicacionPanel[] | null
  readonly stock: readonly AlertaStockPanel[] | null
  /** Catálogo activo para el select del registro de aplicación (SAN-003). */
  readonly productosVacuna: readonly ProductoSanitario[]
  /** Catálogo activo para el select de la entrada de almacén (SAN-014). */
  readonly productosEntrada: readonly ProductoEntradaAlmacen[]
}

export const Route = createFileRoute("/_app/fincas/$fincaId/sanidad")({
  loader: async ({ params, context }): Promise<SanidadPanelLoaderData> => {
    const { fincaId } = params
    const sesion = context.sesion
    // Degradación por card: cada fuente se atrapa por separado (fail-closed).
    const [metricas, proximas, ultimas, stock, catalogo] = await Promise.all([
      obtenerMetricasPanelSanidadFn({ data: { fincaId } }).catch(() => null),
      listarProximasPanelSanidadFn({ data: { fincaId } }).catch(() => null),
      listarUltimasPanelSanidadFn({ data: { fincaId } }).catch(() => null),
      listarStockPanelSanidadFn({ data: { fincaId } }).catch(() => null),
      listarCatalogoSanidadFn({ data: { fincaId, soloActivos: true } }).catch(() => null),
    ])

    const filasCatalogo = catalogo !== null && catalogo.tipo === "catalogo" ? catalogo.filas : []
    return {
      fincaNombre: sesion.fincaActivaNombre,
      permisos: sesion.permisos,
      metricas: metricas !== null && metricas.tipo === "ok" ? metricas.metricas : null,
      proximas: proximas !== null && proximas.tipo === "ok" ? proximas.periodos : null,
      ultimas: ultimas !== null && ultimas.tipo === "ok" ? ultimas.aplicaciones : null,
      stock: stock !== null && stock.tipo === "ok" ? stock.alertas : null,
      productosVacuna: filasCatalogo.map((fila) => ({
        id: fila.id,
        descripcion: fila.descripcion,
        mlPorDosis: fila.mlMgPorDosis,
        dosisDisponibles: fila.stockDisponible,
      })),
      productosEntrada: filasCatalogo.map((fila) => ({
        id: fila.id,
        codigo: fila.codigo,
        descripcion: fila.descripcion,
      })),
    }
  },
  component: SanidadRoute,
})

function SanidadRoute() {
  const data = Route.useLoaderData()
  const { fincaId } = Route.useParams()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // Guarda de Outlet: si el pathname apunta al historial, renderiza el hijo.
  if (pathname !== `/fincas/${fincaId}/sanidad`) return <Outlet />

  return (
    <SanidadRouteView
      fincaId={fincaId}
      data={data}
      onVerHistorial={() => void navigate({ to: `/fincas/${fincaId}/sanidad/historial` })}
      onNavegar={(ruta) => void navigate({ to: ruta })}
    />
  )
}

export interface SanidadRouteViewProps {
  readonly fincaId: string
  readonly data: SanidadPanelLoaderData
  readonly onVerHistorial: () => void
  readonly onNavegar: (ruta: string) => void
}

export function SanidadRouteView({
  fincaId,
  data,
  onVerHistorial,
  onNavegar,
}: SanidadRouteViewProps) {
  const permisos = crearPermisos([...data.permisos])
  const [aplicacionAbierta, setAplicacionAbierta] = useState(false)
  const [productoPrecargado, setProductoPrecargado] = useState<string | null>(null)
  const [entradaAbierta, setEntradaAbierta] = useState(false)
  const [erroresEntrada, setErroresEntrada] = useState<Record<string, string>>({})

  // SAN-003: abrir el registro con el producto precargado ("" = sin precarga).
  const abrirRegistroAplicacion = (productoId: string) => {
    setProductoPrecargado(productoId === "" ? null : productoId)
    setAplicacionAbierta(true)
  }

  // SAN-014/#210: la entrada de almacén guarda vía la server function.
  const guardarEntradaAlmacen = async (datos: DatosEntradaAlmacen) => {
    const resultado = await registrarEntradaAlmacenFn({ data: { fincaId, ...datos } })
    if (resultado.tipo === "registrada") {
      setErroresEntrada({})
      setEntradaAbierta(false)
      return
    }
    if (resultado.tipo === "validacion") {
      setErroresEntrada(Object.fromEntries(resultado.errores.map((e) => [e.campo, e.detalle])))
    }
  }

  // SAN-006: destinos de la card Accesos. Catálogo/Almacén llegan con #213.
  const navegarAcceso = (destino: AccesoPanelSanidadDestino) => {
    switch (destino) {
      case "historial":
        onVerHistorial()
        return
      case "diagnosticos":
        onNavegar(`/fincas/${fincaId}/configuracion/diagnosticos`)
        return
      case "catalogo":
      case "almacen":
        // #213: puntos de navegación documentados (tabs mobile Sanidad).
        return
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PanelSanidad
        fincaNombre={data.fincaNombre}
        permisos={permisos}
        metricas={data.metricas}
        proximas={data.proximas}
        ultimas={data.ultimas}
        stock={data.stock}
        onRegistrarAplicacion={abrirRegistroAplicacion}
        onEntradaAlmacen={() => {
          setErroresEntrada({})
          setEntradaAbierta(true)
        }}
        hrefHistorial={`/fincas/${fincaId}/sanidad/historial`}
        onVerHistorial={onVerHistorial}
        onNavegarAcceso={navegarAcceso}
      />

      {/* SAN-003: registro de aplicación con producto precargado. El guardado
          es el placeholder de SAN-047 — el caso de uso real llega con #211. */}
      <Drawer open={aplicacionAbierta} onOpenChange={setAplicacionAbierta}>
        <DrawerContent className="rounded-t-sheet h-[90vh]">
          <FormularioVacuna
            animales={[]}
            productos={[...data.productosVacuna]}
            {...(productoPrecargado !== null ? { productoIdInicial: productoPrecargado } : {})}
            onGuardar={async () => {
              setAplicacionAbierta(false)
            }}
          />
        </DrawerContent>
      </Drawer>

      {/* SAN-014/#210: entrada de almacén cableada a registrarEntradaAlmacenFn. */}
      <Drawer open={entradaAbierta} onOpenChange={setEntradaAbierta}>
        <DrawerContent className="rounded-t-sheet">
          <div className="p-4 pb-safe">
            <h2 className="text-section font-semibold text-foreground mb-4">
              Nueva entrada de almacén
            </h2>
            <FormularioEntradaAlmacen
              productos={[...data.productosEntrada]}
              errores={erroresEntrada}
              onGuardar={guardarEntradaAlmacen}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
