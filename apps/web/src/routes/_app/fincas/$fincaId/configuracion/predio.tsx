/**
 * Predio — datos básicos de la finca (issue #151, RF-CONFIG-MAESTROS v1.0,
 * CM-050/CM-051).
 *
 * Ruta `/fincas/$fincaId/configuracion/predio` (hija del hub
 * `configuracion.tsx`, que renderiza `<Outlet/>`). Muestra el formulario
 * con los datos actuales de la finca: `codigo` SOLO lectura, `nombre`
 * obligatorio, departamento/municipio/vereda, área, capacidad máxima y el
 * tipo de explotación (select del catálogo global, solo lectura en su
 * contenido — CM-025: la UI no ofrece escritura sobre catálogos globales).
 *
 * RBAC: el padre ya exige `configuracion:ver`; el `beforeLoad` propio
 * repite el gate para que la ruta sea autocontenida (y testeable de forma
 * aislada). Sin `configuracion:editar` el formulario se renderiza en modo
 * solo lectura: inputs deshabilitados y SIN botón de guardar (CM-050).
 *
 * Loader: `obtenerDatosFincaAction` + tipos de explotación vía
 * `listarCatalogoGlobalAction` en paralelo, ambos con `.catch` fail-closed
 * (fallo RPC → `{tipo:"error"}`; fallo del catálogo → select sin opciones).
 *
 * CM-051: NO hay creación ni baja de fincas desde esta vista — solo
 * edición de los datos del registro único.
 *
 * La validación de dominio (CM-050, `validarDatosFinca`) corre en el
 * servidor dentro del caso de uso `editarFinca`; la UI envía los datos
 * crudos y mapea los errores `{campo, detalle}` a errores de campo.
 */

import type { DatosBasicosFinca, FilaCatalogoGlobalConfiguracion } from "@ganaweb/aplicacion"
import {
  Button,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@ganaweb/ui"
import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router"
import { AlertCircle, ChevronLeft } from "lucide-react"
import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import {
  puedeEditarConfiguracion,
  puedeVerConfiguracion,
} from "../../../../../configuracion/permisos-configuracion.js"
import {
  type EditarFincaServerResult,
  editarFincaAction,
  listarCatalogoGlobalAction,
  obtenerDatosFincaAction,
} from "../../../../../server/configuracion-actions.js"

export type ConfiguracionPredioLoaderResult =
  | {
      readonly tipo: "ok"
      readonly datos: DatosBasicosFinca
      readonly tiposExplotacion: readonly FilaCatalogoGlobalConfiguracion[]
      readonly puedeEditar: boolean
    }
  | { readonly tipo: "no_encontrado" }
  | { readonly tipo: "error" }

export const Route = createFileRoute("/_app/fincas/$fincaId/configuracion/predio")({
  beforeLoad: ({ context }) => {
    if (!puedeVerConfiguracion(context.sesion.permisos)) throw redirect({ to: "/" })
  },
  loader: async ({ params, context }) => {
    const [finca, tipos] = await Promise.all([
      obtenerDatosFincaAction({ data: { fincaId: params.fincaId } }).catch(() => null),
      listarCatalogoGlobalAction({ data: { catalogo: "tiposExplotacion" } }).catch(() => null),
    ])
    if (finca === null) return { tipo: "error" } as const
    if (finca.tipo === "no_autenticado") throw redirect({ to: "/login" })
    if (finca.tipo === "finca_no_autorizada" || finca.tipo === "permiso_denegado") {
      throw redirect({ to: "/" })
    }
    if (finca.tipo === "no_encontrado") return { tipo: "no_encontrado" } as const
    if (finca.tipo === "error") return { tipo: "error" } as const
    return {
      tipo: "ok",
      datos: finca.datos,
      // Fail-closed: sin catálogo el select se queda sin opciones (CM-014).
      tiposExplotacion: tipos !== null && tipos.tipo === "lista" ? tipos.filas : [],
      puedeEditar: puedeEditarConfiguracion(context.sesion.permisos),
    } as const
  },
  pendingComponent: ConfiguracionPredioSkeleton,
  component: ConfiguracionPredio,
})

function ConfiguracionPredio() {
  const resultado = Route.useLoaderData()
  const params = Route.useParams()
  const navigate = useNavigate()
  const router = useRouter()
  return (
    <ConfiguracionPredioView
      key={params.fincaId}
      fincaId={params.fincaId}
      resultado={resultado}
      onNavegar={(ruta) => void navigate({ to: ruta })}
      onReintentar={() => void router.invalidate()}
      onGuardar={(datos) => editarFincaAction({ data: { fincaId: params.fincaId, datos } })}
      onGuardado={() => void router.invalidate()}
    />
  )
}

/** Valor centinela del Select para "sin tipo de explotación" (null). */
const VALOR_SIN_TIPO = "__sin_tipo__"

interface FormPredioState {
  readonly nombre: string
  readonly departamento: string
  readonly municipio: string
  readonly vereda: string
  readonly areaHectareas: string
  readonly capacidadMaxima: string
  readonly tipoExplotacionId: string | null
}

function estadoInicial(datos: DatosBasicosFinca): FormPredioState {
  return {
    nombre: datos.nombre,
    departamento: datos.departamento ?? "",
    municipio: datos.municipio ?? "",
    vereda: datos.vereda ?? "",
    areaHectareas: datos.areaHectareas === null ? "" : String(datos.areaHectareas),
    capacidadMaxima: datos.capacidadMaxima === null ? "" : String(datos.capacidadMaxima),
    tipoExplotacionId: datos.tipoExplotacionId,
  }
}

/** Datos crudos para el servidor (CM-050): blank → null, números coercidos. */
function construirDatos(form: FormPredioState): Readonly<Record<string, string | number | null>> {
  const area = form.areaHectareas.trim()
  const capacidad = form.capacidadMaxima.trim()
  return {
    nombre: form.nombre,
    departamento: form.departamento,
    municipio: form.municipio,
    vereda: form.vereda,
    area_hectareas: area === "" ? null : Number(area),
    capacidad_maxima: capacidad === "" ? null : Number(capacidad),
    tipo_explotacion_id: form.tipoExplotacionId,
  }
}

export interface ConfiguracionPredioViewProps {
  readonly fincaId: string
  readonly resultado: ConfiguracionPredioLoaderResult
  readonly onNavegar: (ruta: string) => void
  readonly onReintentar: () => void
  readonly onGuardar: (
    datos: Readonly<Record<string, string | number | null>>,
  ) => Promise<EditarFincaServerResult>
  /** Se invoca tras guardar con éxito (típicamente `router.invalidate()`). */
  readonly onGuardado: () => void
}

export function ConfiguracionPredioView({
  fincaId,
  resultado,
  onNavegar,
  onReintentar,
  onGuardar,
  onGuardado,
}: ConfiguracionPredioViewProps) {
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
        <h1 className="text-[15px] font-medium text-foreground">Datos de la finca</h1>
      </header>

      {resultado.tipo === "error" ? (
        <EmptyState
          icon={AlertCircle}
          title="No se pudieron cargar los datos de la finca"
          description="Revisa tu conexión e intenta de nuevo."
          actionLabel="Reintentar"
          onAction={onReintentar}
        />
      ) : resultado.tipo === "no_encontrado" ? (
        <EmptyState
          icon={AlertCircle}
          title="No se encontró la finca"
          description="La finca no existe o ya no está disponible."
          actionLabel="Volver a Configuración"
          onAction={() => onNavegar(`/fincas/${fincaId}/configuracion`)}
        />
      ) : (
        <FormularioPredio
          datos={resultado.datos}
          tiposExplotacion={resultado.tiposExplotacion}
          puedeEditar={resultado.puedeEditar}
          onGuardar={onGuardar}
          onGuardado={onGuardado}
        />
      )}
    </div>
  )
}

interface FormularioPredioProps {
  readonly datos: DatosBasicosFinca
  readonly tiposExplotacion: readonly FilaCatalogoGlobalConfiguracion[]
  readonly puedeEditar: boolean
  readonly onGuardar: ConfiguracionPredioViewProps["onGuardar"]
  readonly onGuardado: () => void
}

function FormularioPredio({
  datos,
  tiposExplotacion,
  puedeEditar,
  onGuardar,
  onGuardado,
}: FormularioPredioProps) {
  const [form, setForm] = useState<FormPredioState>(() => estadoInicial(datos))
  const [errores, setErrores] = useState<Readonly<Record<string, string>>>({})
  const [guardando, setGuardando] = useState(false)

  const opcionesTipo = useMemo(() => {
    const opciones = tiposExplotacion.map((fila) => ({ id: fila.id, nombre: fila.nombre }))
    const actual = datos.tipoExplotacionId
    // Fail-closed: si el catálogo no cargó, el valor actual se muestra con
    // etiqueta genérica en vez de perderse.
    if (actual !== null && !opciones.some((opcion) => opcion.id === actual)) {
      opciones.push({ id: actual, nombre: "Tipo de explotación actual" })
    }
    return opciones
  }, [tiposExplotacion, datos.tipoExplotacionId])

  const actualizar = (cambio: Partial<FormPredioState>) =>
    setForm((prev) => ({ ...prev, ...cambio }))

  async function manejarEnvio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!puedeEditar || guardando) return
    setGuardando(true)
    let resultado: EditarFincaServerResult
    try {
      resultado = await onGuardar(construirDatos(form))
    } catch {
      setGuardando(false)
      toast({ title: "No se pudieron guardar los cambios.", variant: "destructive" })
      return
    }
    setGuardando(false)
    switch (resultado.tipo) {
      case "actualizado":
        setErrores({})
        toast({ title: "Finca actualizada" })
        onGuardado()
        return
      case "validacion": {
        const porCampo: Record<string, string> = {}
        for (const error of resultado.errores) {
          porCampo[error.campo] = porCampo[error.campo] ?? error.detalle
        }
        setErrores(porCampo)
        return
      }
      case "no_encontrado":
        toast({ title: "No se encontró la finca.", variant: "destructive" })
        return
      case "error":
        toast({ title: "No se pudieron guardar los cambios.", variant: "destructive" })
        return
      default:
        // Denials: el gate ya corrió en beforeLoad/loader; fail-closed.
        toast({ title: "No tienes permiso para editar la finca.", variant: "destructive" })
    }
  }

  const errorTipo = errores.tipo_explotacion_id

  return (
    <form onSubmit={manejarEnvio} aria-label="Datos de la finca" className="max-w-2xl space-y-4">
      {!puedeEditar ? (
        <p className="text-caption text-muted-foreground">
          No tienes permiso para editar los datos de la finca.
        </p>
      ) : null}

      {/* CM-050: codigo SOLO lectura. */}
      <div className="space-y-1.5">
        <Label htmlFor="predio-codigo" className="text-support font-normal text-muted-foreground">
          Código
        </Label>
        <Input
          id="predio-codigo"
          value={datos.codigo}
          readOnly
          aria-readonly="true"
          aria-describedby="predio-codigo-ayuda"
          className="h-10 min-h-[--h-touch] bg-muted/40 text-muted-foreground"
        />
        <p id="predio-codigo-ayuda" className="text-caption text-muted-foreground">
          El código de la finca no se edita.
        </p>
      </div>

      <CampoTexto
        id="predio-nombre"
        label="Nombre"
        requerido
        value={form.nombre}
        onChange={(valor) => actualizar({ nombre: valor })}
        error={errores.nombre}
        disabled={!puedeEditar}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CampoTexto
          id="predio-departamento"
          label="Departamento"
          value={form.departamento}
          onChange={(valor) => actualizar({ departamento: valor })}
          error={errores.departamento}
          disabled={!puedeEditar}
        />
        <CampoTexto
          id="predio-municipio"
          label="Municipio"
          value={form.municipio}
          onChange={(valor) => actualizar({ municipio: valor })}
          error={errores.municipio}
          disabled={!puedeEditar}
        />
      </div>
      <CampoTexto
        id="predio-vereda"
        label="Vereda"
        value={form.vereda}
        onChange={(valor) => actualizar({ vereda: valor })}
        error={errores.vereda}
        disabled={!puedeEditar}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CampoTexto
          id="predio-area"
          label="Área (ha)"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={form.areaHectareas}
          onChange={(valor) => actualizar({ areaHectareas: valor })}
          error={errores.area_hectareas}
          disabled={!puedeEditar}
        />
        <CampoTexto
          id="predio-capacidad"
          label="Capacidad máxima"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          value={form.capacidadMaxima}
          onChange={(valor) => actualizar({ capacidadMaxima: valor })}
          error={errores.capacidad_maxima}
          disabled={!puedeEditar}
        />
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="predio-tipo-explotacion"
          className="text-support font-normal text-muted-foreground"
        >
          Tipo de explotación
        </Label>
        <Select
          value={form.tipoExplotacionId ?? VALOR_SIN_TIPO}
          onValueChange={(valor) =>
            actualizar({ tipoExplotacionId: valor === VALOR_SIN_TIPO ? null : valor })
          }
          disabled={!puedeEditar}
        >
          <SelectTrigger
            id="predio-tipo-explotacion"
            className="min-h-[--h-touch]"
            {...(errorTipo
              ? { "aria-invalid": "true" as const, "aria-describedby": "predio-tipo-error" }
              : {})}
          >
            <SelectValue placeholder="Selecciona el tipo de explotación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={VALOR_SIN_TIPO}>Sin tipo de explotación</SelectItem>
            {opcionesTipo.map((opcion) => (
              <SelectItem key={opcion.id} value={opcion.id}>
                {opcion.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errorTipo ? (
          <p id="predio-tipo-error" role="alert" className="text-caption text-danger-600">
            {errorTipo}
          </p>
        ) : null}
      </div>

      {puedeEditar ? (
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={guardando} className="min-h-[--h-touch]">
            {guardando ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      ) : null}
    </form>
  )
}

interface CampoTextoProps {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly onChange: (valor: string) => void
  readonly error?: string | undefined
  readonly disabled?: boolean
  readonly requerido?: boolean
  readonly type?: string
  readonly inputMode?: "decimal" | "numeric" | "text"
  readonly min?: string
  readonly step?: string
}

function CampoTexto({
  id,
  label,
  value,
  onChange,
  error,
  disabled = false,
  requerido = false,
  type = "text",
  inputMode,
  min,
  step,
}: CampoTextoProps) {
  const errorId = `${id}-error`
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-support font-normal text-muted-foreground">
        {label}
        {requerido ? <span aria-hidden="true"> *</span> : null}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-10 min-h-[--h-touch]"
        {...(inputMode ? { inputMode } : {})}
        {...(min !== undefined ? { min } : {})}
        {...(step !== undefined ? { step } : {})}
        {...(error ? { "aria-invalid": "true" as const, "aria-describedby": errorId } : {})}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-caption text-danger-600">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** Skeleton mientras corre el loader (CM-014, patrón del hub). */
const CLAVES_SKELETON_PREDIO = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"] as const

function ConfiguracionPredioSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-4" aria-busy="true">
      <div className="h-5 w-48 rounded bg-muted animate-pulse" />
      <div className="max-w-2xl space-y-4">
        {CLAVES_SKELETON_PREDIO.map((clave) => (
          <div key={clave} className="h-10 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  )
}
