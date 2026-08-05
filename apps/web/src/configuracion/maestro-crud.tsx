/**
 * Pantalla CRUD genérica de maestros (issue #150, RF-CONFIG-MAESTROS v1.0).
 *
 * CM-033: tabla desktop (nombre/código primero + estado + acciones) y filas
 * mobile ≥ 48px. CM-034: búsqueda case-insensitive; decisión S-2 (PR #161):
 * listas > 50 registros buscan en el servidor, el resto client-side sobre lo
 * cargado. CM-037/S-2: paginación 25/página SOLO si total ≥ 100; por debajo
 * se carga la lista completa (pageSize 100) con scroll. CM-035: Lotes ·
 * Grupos es UNA ruta con DOS tabs. CM-036: por defecto sólo activos, toggle
 * "Mostrar inactivos" con badge neutral. CM-038: estado vacío con CTA.
 * CM-046: nota de integridad bajo la tabla.
 *
 * El listado se refresca tras cada mutación con `router.invalidate()`
 * (CM-042) vía `onRefrescar` + una recarga local de la consulta vigente
 * (para no perder el filtro activo).
 */

import type { MaestroFila, MaestroListadoOpciones } from "@ganaweb/aplicacion"
import { Button, EmptyState, EstadoBadge, Input, Label, Toaster, cn, toast } from "@ganaweb/ui"
import { AlertCircle, ChevronLeft, Pencil, Plus, Power } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  type ListarMaestroServerResult,
  cambiarEstadoMaestroAction,
  crearMaestroAction,
  editarMaestroAction,
  listarMaestroAction,
} from "../server/configuracion-actions.js"
import { ConfirmacionCambioEstado } from "./confirmacion-inactivacion.js"
import type { MaestroConsultaId } from "./definicion-maestros.js"
import { MaestroFormPanel, SwitchMinimal } from "./maestro-form.js"

/** S-2 (PR #161): umbrales de búsqueda y paginación en servidor. */
export const UMBRAL_BUSQUEDA_SERVIDOR = 50
export const UMBRAL_PAGINACION = 100
export const PAGE_SIZE_PAGINA = 25
export const PAGE_SIZE_COMPLETO = 100

export function busquedaEnServidor(total: number): boolean {
  return total > UMBRAL_BUSQUEDA_SERVIDOR
}

export function muestraPaginacion(total: number): boolean {
  return total >= UMBRAL_PAGINACION
}

export function pageSizeParaTotal(total: number): 25 | 100 {
  return muestraPaginacion(total) ? PAGE_SIZE_PAGINA : PAGE_SIZE_COMPLETO
}

/** Búsqueda sin acentos ni mayúsculas (espejo del ILIKE+unaccent del servidor). */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
}

/** CM-034: campos de búsqueda client-side por familia (los mismos que el servidor). */
export function camposBusquedaPorFamilia(familia: MaestroConsultaId): readonly string[] {
  if (familia === "potreros" || familia === "sectores") return ["nombre", "codigo"]
  if (familia === "propietarios") return ["nombre", "numero_documento"]
  return ["nombre"]
}

export function filtrarFilasBusqueda(
  filas: readonly MaestroFila[],
  termino: string,
  campos: readonly string[],
): readonly MaestroFila[] {
  const objetivo = normalizarTexto(termino)
  if (objetivo.length === 0) return filas
  return filas.filter((fila) =>
    campos.some((campo) => normalizarTexto(String(fila[campo] ?? "")).includes(objetivo)),
  )
}

export interface MaestroListadoDatos {
  readonly filas: readonly MaestroFila[]
  readonly total: number
  readonly pagina: number
  readonly pageSize: number
}

/**
 * Consulta con corrección de umbral (S-2): si el total cruza el umbral de
 * paginación (≥ 100 ↔ < 100) respecto al pageSize pedido, reintenta UNA vez
 * con el pageSize correcto para que la vista y el contrato coincidan.
 */
export async function consultarMaestroNormalizado(input: {
  readonly fincaId: string
  readonly maestro: MaestroConsultaId
  readonly opciones?: MaestroListadoOpciones
}): Promise<ListarMaestroServerResult> {
  const respuesta = await listarMaestroAction({ data: input })
  if (respuesta.tipo !== "lista") return respuesta
  if (respuesta.total >= UMBRAL_PAGINACION && respuesta.pageSize === PAGE_SIZE_COMPLETO) {
    return listarMaestroAction({
      data: {
        ...input,
        opciones: { ...input.opciones, pagina: 1, pageSize: PAGE_SIZE_PAGINA },
      },
    })
  }
  if (
    respuesta.total < UMBRAL_PAGINACION &&
    respuesta.pageSize === PAGE_SIZE_PAGINA &&
    respuesta.filas.length < respuesta.total
  ) {
    return listarMaestroAction({
      data: {
        ...input,
        opciones: { ...input.opciones, pagina: 1, pageSize: PAGE_SIZE_COMPLETO },
      },
    })
  }
  return respuesta
}

export interface PermisosMaestroCrud {
  readonly crear: boolean
  readonly editar: boolean
  readonly inactivar: boolean
}

type ResultadoConsulta =
  | ({ readonly tipo: "lista" } & MaestroListadoDatos)
  | { readonly tipo: "error" }

function datosDeRespuesta(respuesta: ListarMaestroServerResult): ResultadoConsulta {
  if (respuesta.tipo !== "lista") return { tipo: "error" }
  return {
    tipo: "lista",
    filas: respuesta.filas,
    total: respuesta.total,
    pagina: respuesta.pagina,
    pageSize: respuesta.pageSize,
  }
}

function avisoDenegado(): void {
  toast({
    variant: "destructive",
    title: "Permiso insuficiente",
    description: "No tienes permiso para realizar esta acción.",
  })
}

/** CM-041: errores `{campo, detalle}` del servidor → errores de campo (1º por campo gana). */
function erroresDesdeValidacion(
  errores: readonly { readonly campo: string; readonly detalle: string }[],
): Record<string, string> {
  const porCampo: Record<string, string> = {}
  for (const error of errores) {
    if (porCampo[error.campo] === undefined) porCampo[error.campo] = error.detalle
  }
  return porCampo
}

/** CM-032: conflicto UNIQUE por finca → error de campo con copy es-CO. */
function erroresPorConflicto(campo: string): Record<string, string> {
  return {
    [campo]:
      campo === "codigo"
        ? "Ya existe un registro con ese código en la finca."
        : "Ya existe un registro con ese valor.",
  }
}

/** CM-042: toast de confirmación tras guardar. */
function avisoGuardadoExitoso(tipo: "creado" | "actualizado", singular: string): void {
  const mayuscula = singular.charAt(0).toUpperCase() + singular.slice(1)
  toast({
    title: tipo === "creado" ? `${mayuscula} creado` : `${mayuscula} actualizado`,
    description: "Los cambios ya están disponibles en la finca.",
  })
}

/** Envía el guardado (crear o editar según el estado del panel) con fallback de error RPC. */
async function enviarGuardadoMaestro(args: {
  readonly panel: PanelEstado
  readonly fincaId: string
  readonly familia: MaestroConsultaId
  readonly datos: Record<string, string | number | null>
}) {
  const fallo = { tipo: "error", detalle: "No se pudo guardar el registro." } as const
  if (args.panel?.modo === "editar") {
    return editarMaestroAction({
      data: {
        fincaId: args.fincaId,
        maestro: args.familia,
        id: args.panel.fila.id,
        datos: args.datos,
      },
    }).catch(() => fallo)
  }
  return crearMaestroAction({
    data: { fincaId: args.fincaId, maestro: args.familia, datos: args.datos },
  }).catch(() => fallo)
}

export interface MaestroListadoProps {
  readonly fincaId: string
  readonly familia: MaestroConsultaId
  /** Nombre de la lista para copy ("veterinarios", "lotes"). */
  readonly nombreLista: string
  readonly singular: string
  readonly permisos: PermisosMaestroCrud
  /** Semilla del loader (sólo la consulta por defecto la recibe). */
  readonly datosIniciales?: MaestroListadoDatos
  /** CM-042: router.invalidate() — refresca el loader tras mutaciones. */
  readonly onRefrescar: () => void
  /** Para tests: debounce de la búsqueda en servidor. */
  readonly debounceBusquedaMs?: number
}

type PanelEstado =
  | { readonly modo: "crear" }
  | { readonly modo: "editar"; readonly fila: MaestroFila }
  | null

export function MaestroListado({
  fincaId,
  familia,
  nombreLista,
  singular,
  permisos,
  datosIniciales,
  onRefrescar,
  debounceBusquedaMs = 300,
}: MaestroListadoProps) {
  const [resultado, setResultado] = useState<ResultadoConsulta>(() =>
    datosIniciales ? { tipo: "lista", ...datosIniciales } : { tipo: "error" },
  )
  const [cargando, setCargando] = useState(datosIniciales === undefined)
  const [termino, setTermino] = useState("")
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const [panel, setPanel] = useState<PanelEstado>(null)
  const [erroresForm, setErroresForm] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [confirmarEstado, setConfirmarEstado] = useState<{
    readonly fila: MaestroFila
    readonly activar: boolean
  } | null>(null)
  const [procesandoEstado, setProcesandoEstado] = useState(false)

  const consultaRef = useRef({ termino: "", incluirInactivos: false, pagina: 1 })
  useEffect(() => {
    consultaRef.current = {
      termino,
      incluirInactivos,
      pagina: resultado.tipo === "lista" ? resultado.pagina : 1,
    }
  })

  const totalBase = datosIniciales?.total ?? (resultado.tipo === "lista" ? resultado.total : 0)
  const enServidor = busquedaEnServidor(totalBase)

  const ejecutarConsulta = async (sobrescritos: {
    readonly busqueda?: string
    readonly incluirInactivos?: boolean
    readonly pagina?: number
  }) => {
    const actuales = consultaRef.current
    const busqueda = (sobrescritos.busqueda ?? actuales.termino).trim()
    const incluye = sobrescritos.incluirInactivos ?? actuales.incluirInactivos
    const ultimoTotal = resultado.tipo === "lista" ? resultado.total : (datosIniciales?.total ?? 0)
    setCargando(true)
    let respuesta: ListarMaestroServerResult
    try {
      respuesta = await consultarMaestroNormalizado({
        fincaId,
        maestro: familia,
        opciones: {
          pagina: sobrescritos.pagina ?? 1,
          pageSize: pageSizeParaTotal(ultimoTotal),
          incluirInactivos: incluye,
          ...(busqueda.length > 0 ? { busqueda } : {}),
        },
      })
    } catch {
      setCargando(false)
      setResultado({ tipo: "error" })
      return
    }
    setCargando(false)
    if (
      respuesta.tipo === "no_autenticado" ||
      respuesta.tipo === "finca_no_autorizada" ||
      respuesta.tipo === "permiso_denegado"
    ) {
      setResultado({ tipo: "error" })
      return
    }
    setResultado(datosDeRespuesta(respuesta))
  }

  // Consulta inicial cuando el loader no trae semilla (p. ej. tab Grupos).
  // biome-ignore lint/correctness/useExhaustiveDependencies: intencional — sólo corre en el montaje para no duplicar la semilla del loader.
  useEffect(() => {
    if (datosIniciales === undefined) void ejecutarConsulta({ pagina: 1 })
  }, [])

  // Búsqueda en servidor con debounce (CM-034/S-2: total > 50). Se salta el
  // montaje para no duplicar la consulta del loader.
  const busquedaInicial = useRef(true)
  // biome-ignore lint/correctness/useExhaustiveDependencies: intencional — el debounce se reinicia sólo al cambiar el término; el resto se lee por ref/closure.
  useEffect(() => {
    if (busquedaInicial.current) {
      busquedaInicial.current = false
      return
    }
    if (!enServidor) return
    const temporizador = setTimeout(() => {
      void ejecutarConsulta({ busqueda: termino, pagina: 1 })
    }, debounceBusquedaMs)
    return () => clearTimeout(temporizador)
  }, [termino])

  const filas = resultado.tipo === "lista" ? resultado.filas : []
  const total = resultado.tipo === "lista" ? resultado.total : 0
  const pagina = resultado.tipo === "lista" ? resultado.pagina : 1
  const paginasTotales = Math.max(1, Math.ceil(total / PAGE_SIZE_PAGINA))

  const filasVisibles = useMemo(() => {
    if (enServidor) return filas
    return filtrarFilasBusqueda(filas, termino, camposBusquedaPorFamilia(familia))
  }, [enServidor, filas, termino, familia])

  const muestraCodigo = familia === "potreros" || familia === "sectores"
  const muestraDocumento = familia === "propietarios"
  const conPaginacion = muestraPaginacion(total)

  const refrescarTrasMutacion = () => {
    onRefrescar()
    void ejecutarConsulta({})
  }

  const guardarPanel = async (datos: Record<string, string | number | null>) => {
    setGuardando(true)
    setErroresForm({})
    const respuesta = await enviarGuardadoMaestro({ panel, fincaId, familia, datos })
    setGuardando(false)

    if (respuesta.tipo === "creado" || respuesta.tipo === "actualizado") {
      avisoGuardadoExitoso(respuesta.tipo, singular)
      setPanel(null)
      refrescarTrasMutacion()
      return
    }
    if (respuesta.tipo === "validacion") {
      setErroresForm(erroresDesdeValidacion(respuesta.errores))
      return
    }
    if (respuesta.tipo === "conflicto") {
      setErroresForm(erroresPorConflicto(respuesta.campo))
      return
    }
    if (respuesta.tipo === "no_encontrado") {
      toast({
        variant: "destructive",
        title: "Registro no encontrado",
        description: "Es posible que otro usuario lo haya modificado.",
      })
      setPanel(null)
      refrescarTrasMutacion()
      return
    }
    if (respuesta.tipo === "permiso_denegado") {
      avisoDenegado()
      return
    }
    if (respuesta.tipo === "error") {
      toast({ variant: "destructive", title: "Algo salió mal", description: respuesta.detalle })
      return
    }
    toast({ variant: "destructive", title: "Algo salió mal", description: "Intenta de nuevo." })
  }

  const cambiarEstado = async () => {
    if (!confirmarEstado) return
    const { fila, activar } = confirmarEstado
    setProcesandoEstado(true)
    const respuesta = await cambiarEstadoMaestroAction({
      data: { fincaId, maestro: familia, id: fila.id, activo: activar },
    }).catch(() => ({ tipo: "error", detalle: "No se pudo actualizar el estado." }) as const)
    setProcesandoEstado(false)
    if (respuesta.tipo === "estado_actualizado") {
      toast({ title: activar ? "Registro activado" : "Registro inactivado" })
      setConfirmarEstado(null)
      refrescarTrasMutacion()
      return
    }
    if (respuesta.tipo === "permiso_denegado") {
      avisoDenegado()
      setConfirmarEstado(null)
      return
    }
    toast({
      variant: "destructive",
      title: "Algo salió mal",
      description:
        respuesta.tipo === "no_encontrado"
          ? "El registro ya no existe en esta finca."
          : "detalle" in respuesta
            ? respuesta.detalle
            : "Intenta de nuevo.",
    })
    setConfirmarEstado(null)
  }

  const abrirEditar = (fila: MaestroFila) => {
    if (!permisos.editar) return
    setErroresForm({})
    setPanel({ modo: "editar", fila })
  }

  const abrirCrear = () => {
    if (!permisos.crear) return
    setErroresForm({})
    setPanel({ modo: "crear" })
  }

  const panelAbierto = () => {
    if (!panel) return null
    return (
      <MaestroFormPanel
        titulo={panel.modo === "editar" ? `Editar ${panel.fila.nombre}` : `Nuevo ${singular}`}
        familia={familiaParaFormulario(familia)}
        vista={familia === "inseminadores" ? "inseminadores" : familia}
        {...(panel.modo === "editar" ? { valoresIniciales: panel.fila } : {})}
        errores={erroresForm}
        guardando={guardando}
        onGuardar={(datos) => void guardarPanel(datos)}
        onCerrar={() => setPanel(null)}
      />
    )
  }

  const hayTermino = termino.trim().length > 0
  const listaLista = !cargando && resultado.tipo === "lista"
  // CM-038: vacío sin filtro → CTA. Con filtro → "sin resultados".
  const vacioSinFiltro = listaLista && filasVisibles.length === 0 && !hayTermino
  const sinResultados = listaLista && filasVisibles.length === 0 && hayTermino

  // Contenido bajo la barra de herramientas (separado para mantener baja la
  // complejidad cognitiva del componente principal).
  const contenido = () => {
    if (resultado.tipo === "error") {
      return (
        <EmptyState
          icon={AlertCircle}
          title="No se pudo cargar la lista"
          description="Revisa tu conexión e intenta de nuevo."
          actionLabel="Reintentar"
          onAction={() => void ejecutarConsulta({})}
        />
      )
    }
    if (vacioSinFiltro) {
      // CM-038: estado vacío con CTA destacado.
      return (
        <EmptyState
          icon={Plus}
          title={`Aún no hay ${nombreLista}.`}
          description="Crea el primero."
          {...(permisos.crear ? { actionLabel: "+ Nuevo", onAction: abrirCrear } : {})}
        />
      )
    }
    return (
      <>
        {cargando ? (
          <div aria-busy="true" className="space-y-2">
            {["sk-1", "sk-2", "sk-3"].map((clave) => (
              <div key={clave} className="h-12 rounded-card bg-muted animate-pulse" />
            ))}
          </div>
        ) : sinResultados ? (
          <p className="py-8 text-center text-support text-muted-foreground">
            Sin resultados para “{termino.trim()}”.
          </p>
        ) : (
          <TablaMaestro
            filas={filasVisibles}
            muestraCodigo={muestraCodigo}
            muestraDocumento={muestraDocumento}
            permisos={permisos}
            onEditar={abrirEditar}
            onCambiarEstado={(objetivo, activar) => setConfirmarEstado({ fila: objetivo, activar })}
            conPaginacion={conPaginacion}
            pagina={pagina}
            paginasTotales={paginasTotales}
            onPaginar={(destino) => void ejecutarConsulta({ pagina: destino })}
            cargando={cargando}
          />
        )}

        {/* CM-046: nota de integridad (RN-050: no hay eliminar) */}
        <p className="text-caption text-muted-foreground">
          Los registros usados en eventos no se eliminan: se inactivan.
        </p>
      </>
    )
  }

  return (
    <div className="space-y-3">
      <BarraMaestro
        familia={familia}
        nombreLista={nombreLista}
        termino={termino}
        onTermino={setTermino}
        incluirInactivos={incluirInactivos}
        onToggleInactivos={(valor) => {
          setIncluirInactivos(valor)
          void ejecutarConsulta({ incluirInactivos: valor, pagina: 1 })
        }}
        puedeCrear={permisos.crear}
        onCrear={abrirCrear}
      />

      {contenido()}

      {panelAbierto()}

      {confirmarEstado ? (
        <ConfirmacionCambioEstado
          nombreRegistro={confirmarEstado.fila.nombre}
          activar={confirmarEstado.activar}
          procesando={procesandoEstado}
          onConfirmar={() => void cambiarEstado()}
          onCancelar={() => setConfirmarEstado(null)}
        />
      ) : null}
    </div>
  )
}

/** "inseminadores" es vista de veterinarios (CM-040): el formulario es el de veterinarios. */
type FamiliaConsulta = Exclude<MaestroConsultaId, "inseminadores">

function familiaParaFormulario(familia: MaestroConsultaId): FamiliaConsulta {
  return familia === "inseminadores" ? "veterinarios" : familia
}

/** CM-036: badge neutral "Inactivo"; activo se muestra con badge de éxito. */
export function BadgeEstadoMaestro({ activo }: { readonly activo: boolean }) {
  return (
    <span className="inline-flex items-center">
      {activo ? (
        <EstadoBadge variant="exito" size="sm">
          Activo
        </EstadoBadge>
      ) : (
        <EstadoBadge variant="neutral" size="sm">
          Inactivo
        </EstadoBadge>
      )}
    </span>
  )
}

/** CM-033: tabla desktop + filas mobile + paginación (CM-037/S-2). */
function TablaMaestro({
  filas,
  muestraCodigo,
  muestraDocumento,
  permisos,
  onEditar,
  onCambiarEstado,
  conPaginacion,
  pagina,
  paginasTotales,
  onPaginar,
  cargando,
}: {
  readonly filas: readonly MaestroFila[]
  readonly muestraCodigo: boolean
  readonly muestraDocumento: boolean
  readonly permisos: PermisosMaestroCrud
  readonly onEditar: (fila: MaestroFila) => void
  readonly onCambiarEstado: (fila: MaestroFila, activar: boolean) => void
  readonly conPaginacion: boolean
  readonly pagina: number
  readonly paginasTotales: number
  readonly onPaginar: (destino: number) => void
  readonly cargando: boolean
}) {
  return (
    <>
      {/* CM-033: tabla desktop */}
      <div className="hidden md:block">
        <table className="w-full text-support">
          <thead>
            <tr className="border-b text-caption text-muted-foreground">
              <th scope="col" className="py-2 pr-4 text-left font-medium">
                Nombre
              </th>
              {muestraCodigo ? (
                <th scope="col" className="py-2 pr-4 text-left font-medium">
                  Código
                </th>
              ) : null}
              {muestraDocumento ? (
                <th scope="col" className="py-2 pr-4 text-left font-medium">
                  Nº documento
                </th>
              ) : null}
              <th scope="col" className="py-2 pr-4 text-left font-medium">
                Estado
              </th>
              {(permisos.editar || permisos.inactivar) && (
                <th scope="col" className="py-2 text-right font-medium">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <FilaTablaMaestro
                key={fila.id}
                fila={fila}
                muestraCodigo={muestraCodigo}
                muestraDocumento={muestraDocumento}
                permisos={permisos}
                onEditar={onEditar}
                onCambiarEstado={onCambiarEstado}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* CM-033: filas mobile ≥ 48px */}
      <ul className="flex flex-col gap-2 md:hidden">
        {filas.map((fila) => (
          <FilaMovilMaestro
            key={fila.id}
            fila={fila}
            muestraCodigo={muestraCodigo}
            muestraDocumento={muestraDocumento}
            permisos={permisos}
            onEditar={onEditar}
            onCambiarEstado={onCambiarEstado}
          />
        ))}
      </ul>

      {conPaginacion ? (
        <PaginacionMaestro
          pagina={pagina}
          paginasTotales={paginasTotales}
          cargando={cargando}
          onCambiar={onPaginar}
        />
      ) : null}
    </>
  )
}

/** Barra de herramientas: búsqueda + toggle inactivos + nuevo (CM-033/CM-036). */
function BarraMaestro({
  familia,
  nombreLista,
  termino,
  onTermino,
  incluirInactivos,
  onToggleInactivos,
  puedeCrear,
  onCrear,
}: {
  readonly familia: MaestroConsultaId
  readonly nombreLista: string
  readonly termino: string
  readonly onTermino: (valor: string) => void
  readonly incluirInactivos: boolean
  readonly onToggleInactivos: (valor: boolean) => void
  readonly puedeCrear: boolean
  readonly onCrear: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-44 flex-1">
        <Label htmlFor={`busqueda-${familia}`} className="sr-only">
          Buscar en {nombreLista}
        </Label>
        <Input
          id={`busqueda-${familia}`}
          type="search"
          placeholder="Buscar…"
          value={termino}
          onChange={(evento) => onTermino(evento.target.value)}
        />
      </div>
      <div className="flex min-h-12 items-center gap-2">
        <SwitchMostrarInactivos
          id={`inactivos-${familia}`}
          checked={incluirInactivos}
          onChange={onToggleInactivos}
        />
      </div>
      {puedeCrear ? (
        <Button onClick={onCrear} className="min-h-12">
          <Plus aria-hidden="true" className="size-4" />
          <span>Nuevo</span>
        </Button>
      ) : null}
    </div>
  )
}

/** CM-037/S-2: paginación simple 25/página. */
function PaginacionMaestro({
  pagina,
  paginasTotales,
  cargando,
  onCambiar,
}: {
  readonly pagina: number
  readonly paginasTotales: number
  readonly cargando: boolean
  readonly onCambiar: (destino: number) => void
}) {
  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-2 pt-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onCambiar(pagina - 1)}
        disabled={pagina <= 1 || cargando}
      >
        Anterior
      </Button>
      <span className="text-caption text-muted-foreground">
        Página {pagina} de {paginasTotales}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onCambiar(pagina + 1)}
        disabled={pagina >= paginasTotales || cargando}
      >
        Siguiente
      </Button>
    </nav>
  )
}

interface FilaMaestroProps {
  readonly fila: MaestroFila
  readonly muestraCodigo: boolean
  readonly muestraDocumento: boolean
  readonly permisos: PermisosMaestroCrud
  readonly onEditar: (fila: MaestroFila) => void
  readonly onCambiarEstado: (fila: MaestroFila, activar: boolean) => void
}

/** CM-033: fila de la tabla desktop (nombre/código + estado + acciones). */
function FilaTablaMaestro({
  fila,
  muestraCodigo,
  muestraDocumento,
  permisos,
  onEditar,
  onCambiarEstado,
}: FilaMaestroProps) {
  const activo = Number(fila.activo) === 1
  return (
    <tr className="border-b last:border-b-0">
      <td className="py-2.5 pr-4 text-foreground">{fila.nombre}</td>
      {muestraCodigo ? <td className="py-2.5 pr-4">{fila.codigo ?? "—"}</td> : null}
      {muestraDocumento ? <td className="py-2.5 pr-4">{fila.numero_documento ?? "—"}</td> : null}
      <td className="py-2.5 pr-4">
        <BadgeEstadoMaestro activo={activo} />
      </td>
      {(permisos.editar || permisos.inactivar) && (
        <td className="py-2.5 text-right">
          <div className="inline-flex gap-1">
            {permisos.editar ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditar(fila)}
                aria-label={`Editar ${fila.nombre}`}
              >
                Editar
              </Button>
            ) : null}
            {permisos.inactivar ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCambiarEstado(fila, !activo)}
                aria-label={`${activo ? "Inactivar" : "Activar"} ${fila.nombre}`}
              >
                {activo ? "Inactivar" : "Activar"}
              </Button>
            ) : null}
          </div>
        </td>
      )}
    </tr>
  )
}

/** CM-033: fila mobile ≥ 48px con acciones táctiles de 48px. */
function FilaMovilMaestro({
  fila,
  muestraCodigo,
  muestraDocumento,
  permisos,
  onEditar,
  onCambiarEstado,
}: FilaMaestroProps) {
  const activo = Number(fila.activo) === 1
  return (
    <li className="flex min-h-12 items-center gap-2 rounded-card border bg-card px-3 py-2">
      <button
        type="button"
        onClick={() => onEditar(fila)}
        disabled={!permisos.editar}
        className="min-w-0 flex-1 text-left text-support text-foreground disabled:cursor-default"
      >
        <span className="block truncate">{fila.nombre}</span>
        {muestraCodigo && fila.codigo !== null ? (
          <span className="block text-caption text-muted-foreground">{String(fila.codigo)}</span>
        ) : null}
        {muestraDocumento && fila.numero_documento !== null ? (
          <span className="block text-caption text-muted-foreground">
            {String(fila.numero_documento)}
          </span>
        ) : null}
      </button>
      <BadgeEstadoMaestro activo={activo} />
      {permisos.editar ? (
        <button
          type="button"
          onClick={() => onEditar(fila)}
          aria-label={`Editar ${fila.nombre}`}
          className="grid size-12 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Pencil aria-hidden="true" className="size-4" />
        </button>
      ) : null}
      {permisos.inactivar ? (
        <button
          type="button"
          onClick={() => onCambiarEstado(fila, !activo)}
          aria-label={`${activo ? "Inactivar" : "Activar"} ${fila.nombre}`}
          className="grid size-12 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Power aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </li>
  )
}

function SwitchMostrarInactivos({
  id,
  checked,
  onChange,
}: {
  readonly id: string
  readonly checked: boolean
  readonly onChange: (valor: boolean) => void
}) {
  return (
    <span className="flex items-center gap-2">
      <SwitchMinimal id={id} checked={checked} onChange={onChange} />
      <Label htmlFor={id} className="cursor-pointer text-caption text-muted-foreground">
        Mostrar inactivos
      </Label>
    </span>
  )
}

/**
 * CM-035: Lotes · Grupos — UNA ruta con DOS tabs accesibles
 * (role tablist/tab/tabpanel). Lotes viene sembrada del loader; Grupos se
 * carga de forma diferida al visitar el tab y queda montado (preserva el
 * estado de búsqueda/página al alternar).
 */
function LotesGruposTabs({
  fincaId,
  permisos,
  datosLotes,
  onRefrescar,
  debounceBusquedaMs,
}: {
  readonly fincaId: string
  readonly permisos: PermisosMaestroCrud
  readonly datosLotes: MaestroListadoDatos
  readonly onRefrescar: () => void
  readonly debounceBusquedaMs?: number
}) {
  const [tabActiva, setTabActiva] = useState<"lotes" | "grupos">("lotes")
  const [gruposVisitado, setGruposVisitado] = useState(false)
  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Lotes y grupos" className="flex gap-4 border-b">
        {(
          [
            { id: "lotes", etiqueta: "Lotes" },
            { id: "grupos", etiqueta: "Grupos" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={tabActiva === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => {
              setTabActiva(tab.id)
              if (tab.id === "grupos") setGruposVisitado(true)
            }}
            className={cn(
              "-mb-px min-h-12 border-b-2 px-1 text-support font-medium",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tabActiva === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.etiqueta}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="panel-lotes"
        aria-labelledby="tab-lotes"
        hidden={tabActiva !== "lotes"}
      >
        <MaestroListado
          fincaId={fincaId}
          familia="lotes"
          nombreLista="lotes"
          singular="lote"
          permisos={permisos}
          datosIniciales={datosLotes}
          onRefrescar={onRefrescar}
          {...(debounceBusquedaMs !== undefined ? { debounceBusquedaMs } : {})}
        />
      </div>
      {gruposVisitado ? (
        <div
          role="tabpanel"
          id="panel-grupos"
          aria-labelledby="tab-grupos"
          hidden={tabActiva !== "grupos"}
        >
          <MaestroListado
            fincaId={fincaId}
            familia="grupos"
            nombreLista="grupos"
            singular="grupo"
            permisos={permisos}
            onRefrescar={onRefrescar}
            {...(debounceBusquedaMs !== undefined ? { debounceBusquedaMs } : {})}
          />
        </div>
      ) : null}
    </div>
  )
}

export interface MaestroCrudViewProps {
  readonly fincaId: string
  readonly slug: string
  readonly nombreMaestro: string
  readonly singular: string
  readonly permisos: PermisosMaestroCrud
  readonly resultado: ResultadoConsulta
  readonly onRefrescar: () => void
  readonly onVolver: () => void
  readonly debounceBusquedaMs?: number
}

/**
 * Pantalla completa del maestro (CM-035: lotes-grupos con tabs; el resto,
 * listado único). El header muestra back en todos los breakpoints, igual que
 * catálogo/predio/grupo, para poder volver a Configuración desde desktop.
 */
export function MaestroCrudView({
  fincaId,
  slug,
  nombreMaestro,
  singular,
  permisos,
  resultado,
  onRefrescar,
  onVolver,
  debounceBusquedaMs,
}: MaestroCrudViewProps) {
  const esLotesGrupos = slug === "lotes-grupos"

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Toaster />
      <header className="flex items-center gap-1">
        <button
          type="button"
          onClick={onVolver}
          aria-label="Volver a Configuración"
          className="-ms-2 grid place-items-center size-10 min-h-[--h-touch] rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
        <h1 className="text-[15px] font-medium text-foreground">{nombreMaestro}</h1>
      </header>

      {resultado.tipo === "error" ? (
        <EmptyState
          icon={AlertCircle}
          title="No se pudo cargar la lista"
          description="Revisa tu conexión e intenta de nuevo."
          actionLabel="Reintentar"
          onAction={onRefrescar}
        />
      ) : esLotesGrupos ? (
        // CM-035: UNA ruta, DOS tabs accesibles, cada una con su tabla y "Nuevo".
        <LotesGruposTabs
          fincaId={fincaId}
          permisos={permisos}
          datosLotes={resultado}
          onRefrescar={onRefrescar}
          {...(debounceBusquedaMs !== undefined ? { debounceBusquedaMs } : {})}
        />
      ) : (
        <MaestroListado
          fincaId={fincaId}
          familia={slugAFamilia(slug)}
          nombreLista={nombreMaestro.toLowerCase()}
          singular={singular}
          permisos={permisos}
          datosIniciales={resultado}
          onRefrescar={onRefrescar}
          {...(debounceBusquedaMs !== undefined ? { debounceBusquedaMs } : {})}
        />
      )}
    </div>
  )
}

/** Slug del CRUD → id de consulta de las server functions. */
function slugAFamilia(slug: string): MaestroConsultaId {
  switch (slug) {
    case "veterinarios":
      return "veterinarios"
    case "propietarios":
      return "propietarios"
    case "inseminadores":
      return "inseminadores"
    case "potreros":
      return "potreros"
    case "sectores":
      return "sectores"
    case "hierros":
      return "hierros"
    case "diagnosticos":
      return "diagnosticos"
    case "motivos-ventas":
      return "motivos_ventas"
    case "causas-muerte":
      return "causas_muerte"
    case "lugares-compras":
      return "lugares_compras"
    default:
      return "lotes"
  }
}
