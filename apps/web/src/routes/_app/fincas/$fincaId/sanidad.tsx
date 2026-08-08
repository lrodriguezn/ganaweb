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
 * con `productoIdInicial`/`animalesIdsIniciales`) y de entrada de almacén
 * (FormularioEntradaAlmacen cableado a `registrarEntradaAlmacenFn`) viven en
 * la vista. El guardado de la aplicación cablea a `registrarAplicacionFn` y
 * la lista de animales para el drawer a `listarAnimalesSanidadFn` (#211).
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
  type AlertaStockRefuerzoMovil,
  CatalogoProductosSanitariosMobile,
  type DatosEntradaAlmacen,
  Drawer,
  DrawerContent,
  type EntradaAlmacenFila,
  type FilaProductoSanitarioUI,
  FormularioEntradaAlmacen,
  FormularioProductoSanitario,
  FormularioVacuna,
  ListadoEntradasAlmacen,
  PanelSanidad,
  type ProductoEntradaAlmacen,
  type ProductoSanitario,
  type RefuerzoCardItem,
  SanidadMobileView,
  SeccionRefuerzos,
  crearPermisos,
  useMatchMedia,
} from "@ganaweb/ui"
import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router"
import { useCallback, useEffect, useState } from "react"
import {
  listarAnimalesSanidadFn,
  listarCatalogoSanidadFn,
  listarEntradasAlmacenFn,
  listarProximasPanelSanidadFn,
  listarStockPanelSanidadFn,
  listarUltimasPanelSanidadFn,
  obtenerMetricasPanelSanidadFn,
  registrarAplicacionFn,
  registrarEntradaAlmacenFn,
} from "../../../../server/sanidad-mobile.js"

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
    const periodosRefuerzos = proximas !== null && proximas.tipo === "ok" ? proximas.periodos : null
    return {
      fincaNombre: sesion.fincaActivaNombre,
      permisos: sesion.permisos,
      metricas: metricas !== null && metricas.tipo === "ok" ? metricas.metricas : null,
      proximas:
        periodosRefuerzos === null
          ? null
          : {
              estaSemana: periodosRefuerzos.estaSemana.map((fila) => ({
                productoId: fila.productoId,
                codigo: fila.codigo,
                descripcion: fila.descripcion,
                proposito: fila.proposito,
                cantidadAnimales: fila.cantidadAnimales,
                venceFecha: fila.venceFecha,
                animalIds: [...fila.animalIds],
              })),
              proximaSemana: periodosRefuerzos.proximaSemana.map((fila) => ({
                productoId: fila.productoId,
                codigo: fila.codigo,
                descripcion: fila.descripcion,
                proposito: fila.proposito,
                cantidadAnimales: fila.cantidadAnimales,
                venceFecha: fila.venceFecha,
                animalIds: [...fila.animalIds],
              })),
              esteMes: periodosRefuerzos.esteMes.map((fila) => ({
                productoId: fila.productoId,
                codigo: fila.codigo,
                descripcion: fila.descripcion,
                proposito: fila.proposito,
                cantidadAnimales: fila.cantidadAnimales,
                venceFecha: fila.venceFecha,
                animalIds: [...fila.animalIds],
              })),
            },
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
  // D9 (Issue #213): switch responsive en la misma ruta. Default `true` (SSR-safe).
  const esMovil = useMatchMedia("(max-width: 767px)")
  const permisos = crearPermisos([...data.permisos])
  const [aplicacionAbierta, setAplicacionAbierta] = useState(false)
  const [productoPrecargado, setProductoPrecargado] = useState<string | null>(null)
  const [animalesPrecargados, setAnimalesPrecargados] = useState<readonly string[]>([])
  const [animalesDrawer, setAnimalesDrawer] = useState<
    readonly {
      id: string
      codigoAnimal: string
      nombreAnimal: string | null
      sexo: "macho" | "hembra" | "pajuela"
      salud: "sano" | "enfermo"
      estadoActual: "activo" | "vendido" | "muerto"
    }[]
  >([])
  const [erroresAplicacion, setErroresAplicacion] = useState<Record<string, string>>({})
  const [entradaAbierta, setEntradaAbierta] = useState(false)
  const [erroresEntrada, setErroresEntrada] = useState<Record<string, string>>({})
  // U4 (#213): edición de producto sanitario. El drawer se abre con
  // `FormularioProductoSanitario` precargado. La inactivación se hace
  // dentro de `CatalogoProductosSanitariosMobile` (AlertDialog interno).
  const [productoEditar, setProductoEditar] = useState<FilaProductoSanitarioUI | null>(null)

  // SAN-003/SAN-011: abrir el registro con el producto y los animales precargados
  // ("" = sin precarga; [] = selección abierta, comportamiento existente).
  const abrirRegistroAplicacion = (productoId: string, animalIds: readonly string[]) => {
    setProductoPrecargado(productoId === "" ? null : productoId)
    setAnimalesPrecargados([...animalIds])
    setAplicacionAbierta(true)
    // SAN-043: la lista de animales se pide a la fecha del evento (hoy).
    const hoy = new Date()
    const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`
    void cargarAnimalesDrawer(fecha)
  }

  // SAN-043: cargar los animales EN_FINCA a la fecha del evento para el drawer.
  // Si la fuente cae, el drawer abre con `animalesPrecargados` (o vacío) — la
  // selección manual sigue disponible.
  const cargarAnimalesDrawer = async (fecha: string) => {
    try {
      const resultado = await listarAnimalesSanidadFn({ data: { fincaId, fecha } })
      if (resultado.tipo === "lista") {
        setAnimalesDrawer(
          resultado.animales.map((a) => ({
            id: a.id,
            codigoAnimal: a.codigo,
            nombreAnimal: a.nombre,
            // El puerto ya filtró EN_FINCA a la fecha; los demás campos del
            // AnimalResumen no se usan en el drawer (sólo id/codigo/nombre).
            sexo: "hembra" as const,
            salud: "sano" as const,
            estadoActual: "activo" as const,
          })),
        )
      }
    } catch {
      setAnimalesDrawer([])
    }
  }

  // SAN-040..SAN-047: el guardado del registro invoca el caso de uso #208 vía
  // `registrarAplicacionFn` (#211). La unión del resultado se mapea 1:1: en
  // `aplicado` cerramos el drawer; en `validacion` los errores van al form.
  const guardarAplicacion = async (datos: {
    readonly productoId: string
    readonly dosis: number
    readonly fecha: string
    readonly proximaDosis: string | null
    readonly comentarios?: string
    readonly animalesIds: string[]
  }) => {
    const resultado = await registrarAplicacionFn({
      data: {
        fincaId,
        productoId: datos.productoId,
        dosis: datos.dosis,
        fecha: datos.fecha,
        ...(datos.proximaDosis !== null ? { proximaDosis: datos.proximaDosis } : {}),
        animalIds: datos.animalesIds,
        ...(datos.comentarios !== undefined ? { comentarios: datos.comentarios } : {}),
      },
    })
    const errores = erroresAplicacionDe(resultado)
    if (errores === null) {
      setErroresAplicacion({})
      setAplicacionAbierta(false)
      return
    }
    setErroresAplicacion(errores)
  }

  // Mapea el resultado del harness a errores presentables por campo (CM-042).
  // null = "aplicado" (cerrar drawer); {} o record = drawer sigue abierto.
  function erroresAplicacionDe(
    resultado: Awaited<ReturnType<typeof registrarAplicacionFn>>,
  ): Record<string, string> | null {
    if (resultado.tipo === "aplicado") return null
    if (resultado.tipo === "validacion") {
      return Object.fromEntries(resultado.errores.map((e) => [e.campo, e.detalle]))
    }
    if (resultado.tipo === "conflicto" || resultado.tipo === "error") {
      return { formulario: resultado.detalle }
    }
    if (resultado.tipo === "permiso_denegado") {
      // El harness devuelve `permiso` (RBAC) y el caso de uso `detalle`; la
      // unión conserva ambos. La UI sólo necesita un mensaje presentable.
      if ("detalle" in resultado) return { formulario: resultado.detalle }
      return {
        formulario: `No tiene permiso para registrar la aplicación (${resultado.permiso}).`,
      }
    }
    // "no_autenticado" / "finca_no_autorizada" — sin detalle, mensaje neutro.
    return { formulario: "No se pudo registrar la aplicación." }
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
      {esMovil ? (
        <SanidadRouteMovil
          data={data}
          fincaId={fincaId}
          permisos={permisos}
          onRegistrarAplicacion={abrirRegistroAplicacion}
          onEntradaAlmacen={() => {
            setErroresEntrada({})
            setEntradaAbierta(true)
          }}
          onEditarProducto={setProductoEditar}
          onInactivarProducto={() => {
            // El AlertDialog vive dentro de CatalogoProductosSanitariosMobile;
            // el guardado se cablea en una iteración posterior (CRUD offline
            // E2E TS-004, fuera de #213). El tab Catálogo ya consume
            // `listarCatalogoSanidadFn` para listar; el callback es no-op
            // mientras no haya server function de cambio de estado bundleable
            // en `sanidad-mobile.ts` (#213 lo deja documentado).
          }}
        />
      ) : (
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
      )}

      {/* SAN-003/SAN-011/SAN-043: drawer del registro cableado a las server
          functions de #211. La precarga de animales sólo aplica cuando la
          card de Próximas la aporta (animalIds > 0); sin ella la selección
          se abre con todos los animales EN_FINCA a la fecha. */}
      <Drawer open={aplicacionAbierta} onOpenChange={setAplicacionAbierta}>
        <DrawerContent className="rounded-t-sheet h-[90vh]">
          <FormularioVacuna
            animales={[...animalesDrawer]}
            productos={[...data.productosVacuna]}
            {...(productoPrecargado !== null ? { productoIdInicial: productoPrecargado } : {})}
            {...(animalesPrecargados.length > 0
              ? { animalesIdsIniciales: animalesPrecargados }
              : {})}
            erroresServidor={erroresAplicacion}
            onGuardar={guardarAplicacion}
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

      {/* U4 (#213): edición de producto sanitario desde el tab Catálogo. */}
      <Drawer
        open={productoEditar !== null}
        onOpenChange={(abierto) => {
          if (!abierto) setProductoEditar(null)
        }}
      >
        <DrawerContent className="rounded-t-sheet h-[90vh]">
          <div className="p-4 pb-safe">
            <h2 className="text-section font-semibold text-foreground mb-4">
              Editar producto sanitario
            </h2>
            {productoEditar === null ? null : (
              <FormularioProductoSanitario
                inicial={{
                  codigo: productoEditar.codigo,
                  descripcion: productoEditar.descripcion,
                  mlMgPorDosis: productoEditar.mlMgPorDosis,
                  tipoTratamiento: productoEditar.tipoTratamiento,
                  precioDosis: productoEditar.precioDosis,
                  comentarios: productoEditar.comentarios,
                }}
                onEnviar={() => {
                  setProductoEditar(null)
                }}
                onCancelar={() => setProductoEditar(null)}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

/**
 * Issue #213 / D9: vista mobile del panel de sanidad. Reutiliza los datos
 * del loader y el `PermisosUsuario`. El tab Refuerzos renderiza
 * `SeccionRefuerzos` con los datos ya calculados en el servidor
 * (degradación por card: si `proximas` o `stock` son `null`, las
 * secciones se renderizan vacías).
 *
 * Los tabs Catálogo y Almacén se cablean en U4; en U3 se renderizan
 * con un placeholder honesto que nombra la próxima integración.
 */
function SanidadRouteMovil({
  data,
  fincaId,
  permisos,
  onRegistrarAplicacion,
  onEntradaAlmacen,
  onEditarProducto,
  onInactivarProducto,
}: {
  readonly data: SanidadPanelLoaderData
  readonly fincaId: string
  readonly permisos: ReturnType<typeof crearPermisos>
  readonly onRegistrarAplicacion: (productoId: string, animalIds: readonly string[]) => void
  readonly onEntradaAlmacen: () => void
  readonly onEditarProducto: (fila: FilaProductoSanitarioUI) => void
  readonly onInactivarProducto: (fila: FilaProductoSanitarioUI, activo: boolean) => void
}) {
  const refuerzoAItems = (
    filas: readonly {
      readonly productoId: string
      readonly codigo: string
      readonly descripcion: string
      readonly proposito: string
      readonly cantidadAnimales: number
      readonly venceFecha: string
      readonly animalIds: readonly string[]
    }[],
  ): readonly RefuerzoCardItem[] =>
    filas.map((fila) => ({
      productoId: fila.productoId,
      codigo: fila.codigo,
      descripcion: fila.descripcion,
      proposito: fila.proposito,
      cantidadAnimales: fila.cantidadAnimales,
      venceFecha: fila.venceFecha,
      animalIds: [...fila.animalIds],
    }))

  const estaSemana = data.proximas ? refuerzoAItems(data.proximas.estaSemana) : []
  const proximaSemana = data.proximas ? refuerzoAItems(data.proximas.proximaSemana) : []

  const stockMovil: readonly AlertaStockRefuerzoMovil[] = (data.stock ?? []).map((alerta) => {
    if (alerta.estado === "bajo") {
      return {
        productoId: alerta.productoId,
        descripcion: alerta.descripcion,
        estado: "bajo",
        dosis: alerta.dosisDisponibles,
      }
    }
    if (alerta.estado === "agotado") {
      return {
        productoId: alerta.productoId,
        descripcion: alerta.descripcion,
        estado: "agotado",
      }
    }
    return {
      productoId: alerta.productoId,
      descripcion: alerta.descripcion,
      estado: "ok",
    }
  })

  return (
    <SanidadMobileView
      fincaNombre={data.fincaNombre}
      permisos={permisos}
      tabInicial="refuerzos"
      tabPermitidas={["catalogo", "almacen", "refuerzos"]}
      contenidoRefuerzos={
        <SeccionRefuerzos
          permisos={permisos}
          estaSemana={estaSemana}
          proximaSemana={proximaSemana}
          stock={stockMovil}
          onRegistrarAplicacion={onRegistrarAplicacion}
        />
      }
      contenidoCatalogo={
        <TabCatalogoMobile
          fincaId={fincaId}
          permisos={permisos}
          onEditar={onEditarProducto}
          onInactivar={onInactivarProducto}
        />
      }
      contenidoAlmacen={<TabAlmacenMobile fincaId={fincaId} onAbrirDrawer={onEntradaAlmacen} />}
    />
  )
}

/**
 * Tab Catálogo mobile (Issue #213, U4, SAN-013). Carga filas vía
 * `listarCatalogoSanidadFn` al montar; `onEditar` abre el drawer con
 * `FormularioProductoSanitario`; `onInactivar` con AlertDialog.
 * CRUD gateado por `sanidad:editar` / `sanidad:anular` (SAN-060).
 */
function TabCatalogoMobile({
  fincaId,
  permisos,
  onEditar,
  onInactivar,
}: {
  readonly fincaId: string
  readonly permisos: ReturnType<typeof crearPermisos>
  readonly onEditar: (fila: FilaProductoSanitarioUI) => void
  readonly onInactivar: (fila: FilaProductoSanitarioUI, activo: boolean) => void
}) {
  const [filas, setFilas] = useState<readonly FilaProductoSanitarioUI[] | null>(null)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const cargar = useCallback(async () => {
    try {
      const resultado = await listarCatalogoSanidadFn({ data: { fincaId, soloActivos: false } })
      if (resultado.tipo === "catalogo") {
        setFilas(
          resultado.filas.map((fila) => ({
            id: fila.id,
            codigo: fila.codigo,
            descripcion: fila.descripcion,
            mlMgPorDosis: fila.mlMgPorDosis,
            tipoTratamiento: fila.tipoTratamiento,
            precioDosis: fila.precioDosis,
            comentarios: fila.comentarios,
            activo: fila.activo,
            stockDisponible: fila.stockDisponible,
            estadoStock: fila.estadoStock,
          })),
        )
        setErrorCarga(null)
      } else {
        setFilas([])
      }
    } catch {
      setErrorCarga("No se pudo cargar el catálogo.")
      setFilas([])
    }
  }, [fincaId])
  useEffect(() => {
    void cargar()
  }, [cargar])

  if (errorCarga !== null) {
    return <p className="text-support text-muted-foreground">{errorCarga}</p>
  }
  if (filas === null) {
    return <p className="text-support text-muted-foreground">Cargando catálogo…</p>
  }

  return (
    <CatalogoProductosSanitariosMobile
      filas={filas}
      permisos={permisos}
      onEditar={onEditar}
      onCambiarEstado={onInactivar}
    />
  )
}

/**
 * Tab Almacén mobile (Issue #213, U4, SAN-014). Carga entradas vía
 * `listarEntradasAlmacenFn`; FAB abre el drawer de entrada. El guardado
 * lo hace `SanidadRouteView` vía `registrarEntradaAlmacenFn`.
 */
function TabAlmacenMobile({
  fincaId,
  onAbrirDrawer,
}: {
  readonly fincaId: string
  readonly onAbrirDrawer: () => void
}) {
  const [entradas, setEntradas] = useState<readonly EntradaAlmacenFila[] | null>(null)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const cargar = useCallback(async () => {
    try {
      const resultado = await listarEntradasAlmacenFn({ data: { fincaId } })
      if (resultado.tipo === "lista") {
        setEntradas(
          resultado.entradas.map((entrada) => ({
            id: entrada.id,
            fecha: entrada.fecha,
            productoCodigo: entrada.productoCodigo,
            productoDescripcion: entrada.productoDescripcion,
            dosis: entrada.dosis,
            precioPorDosis: entrada.precioPorDosis,
            comentario: entrada.comentario,
          })),
        )
        setErrorCarga(null)
      } else {
        setEntradas([])
      }
    } catch {
      setErrorCarga("No se pudo cargar el almacén.")
      setEntradas([])
    }
  }, [fincaId])
  useEffect(() => {
    void cargar()
  }, [cargar])

  if (errorCarga !== null) {
    return <p className="text-support text-muted-foreground">{errorCarga}</p>
  }
  if (entradas === null) {
    return <p className="text-support text-muted-foreground">Cargando almacén…</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <ListadoEntradasAlmacen entradas={entradas} />
      <button
        type="button"
        onClick={onAbrirDrawer}
        className="self-end min-h-[--h-touch] rounded-full bg-pasto-600 px-4 py-2 text-on-primary"
        aria-label="Nueva entrada de almacén"
      >
        + Entrada
      </button>
    </div>
  )
}
