/**
 * Formulario genérico de maestros (issue #150, RF-CONFIG-MAESTROS v1.0).
 *
 * CM-039: crear y editar usan el MISMO formulario; editar carga el registro
 * y titula "Editar {nombre}". Panel lateral derecho en desktop y bottom
 * sheet en mobile. Decisión documentada: la primitiva `Drawer` (vaul) sólo
 * soporta sheet inferior, así que el panel desktop reutiliza la primitiva
 * `Dialog` (Radix) re-estilada como panel lateral con tokens — ambas con el
 * mismo contenido y el mismo flujo. El corte responsive usa `matchMedia`
 * con default desktop (SSR-safe), mismo patrón que `AnimalFormScreen`.
 *
 * CM-026: la UI envía los datos CRUDOS; el servidor valida. El formulario
 * no duplica validaciones de dominio: sólo marca requeridos (`*`, CM-070)
 * y mapea los errores `{campo, detalle}` que devuelven las server functions
 * (CM-041).
 *
 * CM-040: en la vista "inseminadores" `es_inseminador` va oculto forzado a
 * 1; en "veterinarios" es un switch editable ("También es inseminador").
 *
 * Cierre con cambios sin guardar → AlertDialog de confirmación (CM-039).
 */

import {
  ESPECIFICACIONES_MAESTROS,
  type EspecificacionCampoMaestro,
  type FamiliaMaestro,
} from "@ganaweb/aplicacion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  Input,
  Label,
  cn,
} from "@ganaweb/ui"
import { useEffect, useMemo, useState } from "react"

/** Etiquetas es-CO de los campos de las familias (fallback: nombre legible). */
const ETIQUETAS_CAMPOS: Readonly<Record<string, string>> = {
  nombre: "Nombre",
  codigo: "Código",
  descripcion: "Descripción",
  telefono: "Teléfono",
  email: "Correo electrónico",
  direccion: "Dirección",
  numero_registro: "Nº de registro profesional",
  especialidad: "Especialidad",
  tipo_documento: "Tipo de documento",
  numero_documento: "Nº de documento",
  area_hectareas: "Área (hectáreas)",
  tipo_pasto: "Tipo de pasto",
  capacidad_maxima: "Capacidad máxima (animales)",
  estado: "Estado",
  tipo: "Tipo",
  categoria: "Categoría",
  ubicacion: "Ubicación",
  contacto: "Contacto",
}

export function etiquetaCampo(campo: string): string {
  return ETIQUETAS_CAMPOS[campo] ?? campo.replaceAll("_", " ")
}

/**
 * Switch minimalista con tokens (no existe primitiva Switch en
 * `packages/ui`; patrón de botón con `aria-pressed`/`role="switch"` como
 * `ThemeToggle`). Lo usan "También es inseminador" (CM-040) y "Mostrar
 * inactivos" (CM-036).
 */
export function SwitchMinimal({
  id,
  checked,
  onChange,
  disabled = false,
  etiqueta,
}: {
  readonly id?: string
  readonly checked: boolean
  readonly onChange: (checked: boolean) => void
  readonly disabled?: boolean
  readonly etiqueta?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      {...(etiqueta ? { "aria-label": etiqueta } : {})}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-primary bg-primary" : "border-input bg-muted",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "block size-5 rounded-full bg-card shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-0.5",
        )}
      />
    </button>
  )
}

/** Corte responsive del panel (CM-039): desktop ≥ 768px. Default desktop (SSR-safe). */
export function useEsMovil(): boolean {
  const [esDesktop, setEsDesktop] = useState(true)
  useEffect(() => {
    const consulta = window.matchMedia("(min-width: 768px)")
    setEsDesktop(consulta.matches)
    const escuchar = (evento: MediaQueryListEvent) => setEsDesktop(evento.matches)
    consulta.addEventListener("change", escuchar)
    return () => consulta.removeEventListener("change", escuchar)
  }, [])
  return !esDesktop
}

export type ValoresFormMaestro = Readonly<Record<string, string | number | null>>

/** Campo individual del formulario data-driven (CM-026/CM-070: label real + requerido). */
function CampoFormMaestro({
  campo,
  spec,
  valor,
  error,
  onChange,
}: {
  readonly campo: string
  readonly spec: EspecificacionCampoMaestro
  readonly valor: string
  readonly error: string | undefined
  readonly onChange: (valor: string) => void
}) {
  const id = `maestro-campo-${campo}`
  const esNumerico = spec.tipo === "numero" || spec.tipo === "entero"
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {etiquetaCampo(campo)}
        {spec.requerido ? <span aria-hidden="true"> *</span> : null}
      </Label>
      <Input
        id={id}
        name={campo}
        type={spec.tipo === "email" ? "email" : "text"}
        inputMode={esNumerico ? (spec.tipo === "entero" ? "numeric" : "decimal") : undefined}
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        {...(spec.max !== undefined ? { maxLength: spec.max } : {})}
        {...(error ? { "aria-invalid": "true" as const, "aria-describedby": `${id}-error` } : {})}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-caption text-danger-600">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function textoInicial(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return ""
  return String(valor)
}

export interface MaestroFormPanelProps {
  /** CM-039: editar titula "Editar {nombre}"; crear "Nuevo {singular}". */
  readonly titulo: string
  readonly familia: FamiliaMaestro
  /** Vista que abre el panel: decide el tratamiento de es_inseminador (CM-040). */
  readonly vista: "veterinarios" | "inseminadores" | FamiliaMaestro
  readonly valoresIniciales?: ValoresFormMaestro
  readonly errores: Readonly<Record<string, string>>
  readonly guardando: boolean
  readonly onGuardar: (datos: Record<string, string | number | null>) => void
  readonly onCerrar: () => void
}

/**
 * Panel crear/editar. Se monta SOLO abierto (el padre decide); el estado
 * del formulario arranca de `valoresIniciales` en el montaje.
 */
export function MaestroFormPanel({
  titulo,
  familia,
  vista,
  valoresIniciales,
  errores,
  guardando,
  onGuardar,
  onCerrar,
}: MaestroFormPanelProps) {
  const especificacion = ESPECIFICACIONES_MAESTROS[familia]
  const campos = useMemo(() => Object.keys(especificacion), [especificacion])
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {}
    for (const campo of campos) inicial[campo] = textoInicial(valoresIniciales?.[campo])
    return inicial
  })
  const esVistaInseminadores = vista === "inseminadores"
  const muestraSwitchInseminador = familia === "veterinarios" && vista === "veterinarios"
  const [esInseminador, setEsInseminador] = useState(
    () => Number(valoresIniciales?.es_inseminador ?? 0) === 1,
  )
  const [confirmarCierre, setConfirmarCierre] = useState(false)

  const inicial = useMemo(() => {
    const snapshot: Record<string, string> = {}
    for (const campo of campos) snapshot[campo] = textoInicial(valoresIniciales?.[campo])
    return snapshot
  }, [campos, valoresIniciales])
  const inseminadorInicial = Number(valoresIniciales?.es_inseminador ?? 0) === 1

  const sucio = useMemo(() => {
    if (campos.some((campo) => valores[campo] !== inicial[campo])) return true
    if (muestraSwitchInseminador && esInseminador !== inseminadorInicial) return true
    return false
  }, [campos, valores, inicial, muestraSwitchInseminador, esInseminador, inseminadorInicial])

  const intentarCerrar = () => {
    if (guardando) return
    if (sucio) {
      setConfirmarCierre(true)
      return
    }
    onCerrar()
  }

  const guardar = () => {
    const datos: Record<string, string | number | null> = {}
    for (const campo of campos) {
      const bruto = valores[campo] ?? ""
      datos[campo] = bruto.trim().length === 0 ? null : bruto
    }
    if (esVistaInseminadores) datos.es_inseminador = 1
    if (muestraSwitchInseminador) datos.es_inseminador = esInseminador ? 1 : 0
    onGuardar(datos)
  }

  const formulario = (
    <form
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        guardar()
      }}
    >
      {campos.map((campo) => {
        const campoSpec = especificacion[campo]
        if (!campoSpec) return null
        return (
          <CampoFormMaestro
            key={campo}
            campo={campo}
            spec={campoSpec}
            valor={valores[campo] ?? ""}
            error={errores[campo]}
            onChange={(valor) => setValores((previos) => ({ ...previos, [campo]: valor }))}
          />
        )
      })}

      {muestraSwitchInseminador ? (
        <div className="flex min-h-12 items-center justify-between gap-3">
          <Label htmlFor="maestro-campo-es_inseminador">También es inseminador</Label>
          <SwitchMinimal
            id="maestro-campo-es_inseminador"
            checked={esInseminador}
            onChange={setEsInseminador}
          />
        </div>
      ) : null}

      {esVistaInseminadores ? (
        // CM-040: campo oculto — desde Inseminadores el flag siempre es 1.
        <input type="hidden" name="es_inseminador" value="1" />
      ) : null}

      <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={intentarCerrar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  )

  const confirmacionCierre = (
    <AlertDialog open={confirmarCierre} onOpenChange={setConfirmarCierre}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cerrar sin guardar?</AlertDialogTitle>
          <AlertDialogDescription>
            Los cambios que hiciste no se han guardado y se perderán.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Seguir editando</AlertDialogCancel>
          <AlertDialogAction onClick={onCerrar}>Cerrar sin guardar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  const movil = useEsMovil()

  if (movil) {
    return (
      <Drawer open onOpenChange={(abierto) => !abierto && intentarCerrar()}>
        <DrawerContent aria-describedby={undefined}>
          <DrawerHeader>
            <DrawerTitle>{titulo}</DrawerTitle>
          </DrawerHeader>
          {formulario}
        </DrawerContent>
        {confirmacionCierre}
      </Drawer>
    )
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && intentarCerrar()}>
      <DialogContent
        aria-describedby={undefined}
        className="inset-x-auto inset-y-0 left-auto right-0 top-0 h-full max-h-none w-full max-w-md translate-x-0 translate-y-0 rounded-none border-y-0 border-r-0 sm:rounded-none"
      >
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        {formulario}
      </DialogContent>
      {confirmacionCierre}
    </Dialog>
  )
}
