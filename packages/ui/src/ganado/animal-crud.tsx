"use client"

import * as PopoverPrimitive from "@radix-ui/react-popover"
import { format, parseISO, subYears } from "date-fns"
import { es } from "date-fns/locale"
import {
  AlertTriangle,
  Baby,
  Calculator,
  Camera,
  ChevronRight,
  ImagePlus,
  PawPrint,
  Plus,
  Search,
  X,
} from "lucide-react"
import { useEffect, useId, useState } from "react"
import type * as React from "react"

import { cn } from "../lib/utils"
import { Button } from "../primitives/button"
import { ComboboxBuscable, type ComboboxOption } from "../primitives/combobox-buscable"
import { DatePicker } from "../primitives/date-picker"
import { Input } from "../primitives/input"
import { Label } from "../primitives/label"
import { type PillsOption, PillsSegmentadas } from "../primitives/pills-segmentadas"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../primitives/select"
import { SelectConCreacion } from "../primitives/select-con-creacion"
import { BottomNav } from "./bottom-nav"
import { EmptyState } from "./empty-state"
import { CategoriaBadge, EstadoAnimalBadge, EstadoBadge, SaludBadge } from "./estado-badge"
import { MetricCard } from "./metric-card"
import type { AnimalResumen, DominioEvento, ItemNav } from "./types"

export type AnimalListItem = AnimalResumen & {
  imagenPrincipalUrl?: string | null
}

export type AnimalTimelineTipo =
  | "peso"
  | "vacuna"
  | "servicio"
  | "palpacion"
  | "parto"
  | "produccion"
  | "reubicacion"
  | "foto"

export interface AnimalTimelineItem {
  id: string
  dominio: DominioEvento
  tipo: AnimalTimelineTipo
  fecha: string
  titulo: string
  detalle?: string
  estadoLocal?: "pendiente" | "sincronizado"
}

export interface AnimalListMobileProps {
  animales: AnimalListItem[]
  selectedIds?: string[]
  canCreate?: boolean
  onPressAnimal: (animal: AnimalListItem) => void
  onNuevoAnimal: () => void
  bottomNavItems: ItemNav[]
}

export function AnimalListMobile({
  animales,
  selectedIds = [],
  canCreate = true,
  onPressAnimal,
  onNuevoAnimal,
  bottomNavItems,
}: AnimalListMobileProps) {
  return (
    <section
      data-testid="op-frame-0185"
      aria-label="03 Animales · Mobile"
      className="min-h-[844px] w-full max-w-[390px] bg-background pb-[calc(var(--h-bottomnav)+16px)]"
    >
      <header className="h-14 border-b bg-card px-4 flex items-center justify-between">
        <div>
          <p className="text-title font-semibold">Animales</p>
          <p className="text-caption text-muted-foreground">Listado operativo</p>
        </div>
        {canCreate && (
          <Button type="button" size="sm" onClick={onNuevoAnimal} aria-label="Nuevo animal">
            <Plus className="size-4" aria-hidden="true" />
          </Button>
        )}
      </header>

      <div className="p-4 space-y-3">
        <label className="min-h-[--h-touch] rounded-control border bg-card px-3 flex items-center gap-2">
          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Buscar animal</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-support outline-none placeholder:text-muted-foreground"
            placeholder="Buscar por código, nombre o arete"
          />
        </label>

        {animales.length === 0 ? (
          <EmptyState
            icon={PawPrint}
            title="No hay animales con estos filtros"
            description="Ajusta la búsqueda o registra un nuevo animal para esta finca."
            {...(canCreate ? { actionLabel: "Registrar animal", onAction: onNuevoAnimal } : {})}
          />
        ) : (
          <div className="space-y-2" aria-label="Lista de animales">
            {animales.map((animal) => (
              <AnimalResultCard
                key={animal.id}
                animal={animal}
                selected={selectedIds.includes(animal.id)}
                onPress={() => onPressAnimal(animal)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed inset-x-4 bottom-[calc(var(--h-bottomnav)+12px)] z-20 rounded-card border bg-card px-4 py-3">
          <p className="text-support font-medium">{selectedIds.length} seleccionado</p>
        </div>
      )}

      <BottomNav
        items={bottomNavItems}
        activoId="animales"
        onNavigate={() => {}}
        onFab={canCreate ? onNuevoAnimal : () => {}}
      />
    </section>
  )
}

function AnimalResultCard({
  animal,
  selected,
  onPress,
}: {
  animal: AnimalListItem
  selected: boolean
  onPress: () => void
}) {
  const ubicacion = [animal.potrero, animal.lote].filter(Boolean).join(" · ")
  const label = [animal.codigoAnimal, animal.nombreAnimal].filter(Boolean).join(" ")
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onPress}
      className={cn(
        "w-full min-h-[72px] rounded-card border bg-card p-3 text-left flex items-center gap-3",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected && "border-primary bg-seleccion",
      )}
    >
      {animal.imagenPrincipalUrl ? (
        <img
          src={animal.imagenPrincipalUrl}
          alt={`Foto principal de ${animal.nombreAnimal ?? animal.codigoAnimal}`}
          className="size-12 rounded-card object-cover border"
        />
      ) : (
        <span
          className="size-12 rounded-card bg-muted border grid place-items-center"
          aria-hidden="true"
        >
          <PawPrint className="size-5 text-muted-foreground" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="text-section block truncate">
          <span className="font-semibold">{animal.codigoAnimal}</span>
          {animal.nombreAnimal && (
            <span className="font-normal text-muted-foreground"> {animal.nombreAnimal}</span>
          )}
        </span>
        <span className="mt-1 flex flex-wrap gap-1.5">
          {animal.categoriaReproductiva && animal.categoriaReproductiva !== "no_aplica" && (
            <CategoriaBadge categoria={animal.categoriaReproductiva} />
          )}
          <SaludBadge salud={animal.salud} />
        </span>
        {ubicacion && (
          <span className="mt-1 text-caption text-muted-foreground block">{ubicacion}</span>
        )}
      </span>
      <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
    </button>
  )
}

export interface AnimalTimelineProps {
  eventos: AnimalTimelineItem[]
  className?: string
}

export function AnimalTimeline({ eventos, className }: AnimalTimelineProps) {
  const sorted = [...eventos].sort((a, b) => b.fecha.localeCompare(a.fecha))
  const groups = sorted.reduce<Record<string, AnimalTimelineItem[]>>((acc, evento) => {
    const year = new Date(evento.fecha).getFullYear().toString()
    acc[year] ??= []
    acc[year].push(evento)
    return acc
  }, {})

  return (
    <div className={cn("space-y-4", className)}>
      {Object.entries(groups)
        .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
        .map(([year, items]) => (
          <section key={year} aria-label={`Eventos ${year}`}>
            <h3 className="text-caption font-semibold text-muted-foreground mb-3">{year}</h3>
            <ol className="relative ms-3.5 border-s-2 border-border">
              {items.map((evento) => (
                <li key={evento.id} className="relative ps-8 pb-5 last:pb-0">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -start-[15px] top-0 size-7 rounded-full grid place-items-center ring-4 ring-background",
                      domainStyle(evento.dominio),
                    )}
                  >
                    {evento.tipo === "foto" ? (
                      <Camera className="size-3.5" />
                    ) : (
                      <Baby className="size-3.5" />
                    )}
                  </span>
                  <time
                    dateTime={evento.fecha}
                    className="text-caption text-muted-foreground block"
                  >
                    {formatDate(evento.fecha)}
                  </time>
                  <p className="text-support font-medium">{evento.titulo}</p>
                  {evento.detalle && (
                    <p className="text-support text-muted-foreground">{evento.detalle}</p>
                  )}
                  {evento.estadoLocal === "pendiente" && (
                    <EstadoBadge variant="info" withDot className="mt-1">
                      Guardado local · se sincronizará al recuperar señal
                    </EstadoBadge>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))}
    </div>
  )
}

function domainStyle(domain: DominioEvento): string {
  const styles: Record<DominioEvento, string> = {
    reproduccion: "bg-dom-repro-bg text-dom-repro",
    sanidad: "bg-dom-sanidad-bg text-dom-sanidad",
    produccion: "bg-dom-produccion-bg text-dom-produccion",
    manejo: "bg-dom-manejo-bg text-dom-manejo",
  }
  return styles[domain]
}

function formatDate(fecha: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(fecha))
}

export interface AnimalFichaHeaderProps {
  animal: AnimalListItem
  metrics: { label: string; value: string; context?: string }[]
  canEdit?: boolean
  canCreateEvents?: boolean
}

export interface AnimalGenealogyNode {
  codigoAnimal: string
  nombreAnimal?: string | null
}

export interface AnimalOffspringNode extends AnimalGenealogyNode {
  relation: string
}

export interface AnimalGenealogyProps {
  parents: {
    mother?: AnimalGenealogyNode | null
    father?: AnimalGenealogyNode | null
    donor?: AnimalGenealogyNode | null
  }
  offspring?: AnimalOffspringNode[]
  className?: string
}

export function AnimalFichaHeader({
  animal,
  metrics,
  canEdit = false,
  canCreateEvents = false,
}: AnimalFichaHeaderProps) {
  const blocked = animal.estadoActual !== "activo"
  return (
    <header className="space-y-3">
      {blocked && (
        <output className="rounded-card border bg-info-100 text-info-600 p-3 text-support">
          Animal {animal.estadoActual === "muerto" ? "muerto" : animal.estadoActual} · la historia
          se conserva y las acciones de evento están ocultas
        </output>
      )}
      <div className="rounded-card border bg-card p-4 flex items-start gap-3">
        {animal.imagenPrincipalUrl ? (
          <img
            src={animal.imagenPrincipalUrl}
            alt={`Foto principal de ${animal.nombreAnimal ?? animal.codigoAnimal}`}
            className="size-16 rounded-card object-cover border"
          />
        ) : (
          <span
            className="size-16 rounded-card bg-muted border grid place-items-center"
            aria-hidden="true"
          >
            <PawPrint className="size-6 text-muted-foreground" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-title font-semibold">{animal.codigoAnimal}</p>
          {animal.nombreAnimal && (
            <p className="text-support text-muted-foreground">{animal.nombreAnimal}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <EstadoAnimalBadge estado={animal.estadoActual} />
            {animal.categoriaReproductiva && (
              <CategoriaBadge categoria={animal.categoriaReproductiva} />
            )}
            <SaludBadge salud={animal.salud} />
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && <Button variant="secondary">Editar</Button>}
          {canCreateEvents && !blocked && <Button>Registrar evento</Button>}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            {...(metric.context ? { context: metric.context } : {})}
          />
        ))}
      </div>
    </header>
  )
}

export function AnimalGenealogy({ parents, offspring = [], className }: AnimalGenealogyProps) {
  const parentRows = [
    { label: "Madre", value: parents.mother },
    { label: "Padre", value: parents.father },
    { label: "Donadora", value: parents.donor },
  ].filter((row) => row.value)

  return (
    <section
      aria-label="Genealogía"
      className={cn("rounded-card border bg-card p-4 space-y-3", className)}
    >
      <div>
        <h2 className="text-section font-semibold">Genealogía</h2>
        <p className="text-caption text-muted-foreground">Relaciones familiares registradas</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {parentRows.length > 0 ? (
          parentRows.map((row) => (
            <div key={row.label} className="rounded-control border bg-background p-3">
              <p className="text-caption text-muted-foreground">{row.label}</p>
              <p className="text-support font-medium">{formatGenealogyNode(row.value)}</p>
            </div>
          ))
        ) : (
          <p className="text-support text-muted-foreground">Sin padres registrados.</p>
        )}
      </div>
      <div className="space-y-2">
        <h3 className="text-caption font-semibold text-muted-foreground">Crías</h3>
        {offspring.length > 0 ? (
          <ul className="space-y-1.5">
            {offspring.map((child) => (
              <li key={`${child.relation}-${child.codigoAnimal}`} className="text-support">
                {child.relation} · {formatGenealogyNode(child)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-support text-muted-foreground">Sin crías registradas.</p>
        )}
      </div>
    </section>
  )
}

function formatGenealogyNode(node?: AnimalGenealogyNode | null): string {
  if (!node) return "Sin registrar"
  return [node.codigoAnimal, node.nombreAnimal].filter(Boolean).join(" · ")
}

export interface AnimalImageItem {
  id: string
  src: string
  alt: string
  principal?: boolean
  pendingUpload?: boolean
}

export interface AnimalGalleryProps {
  images: AnimalImageItem[]
  onAddImage: () => void
  onMarkPrincipal?: (image: AnimalImageItem) => void
  onUnlink?: (image: AnimalImageItem) => void
}

export function AnimalGallery({
  images,
  onAddImage,
  onMarkPrincipal,
  onUnlink,
}: AnimalGalleryProps) {
  const atLimit = images.length >= 5
  return (
    <section aria-label="Galería de fotos" className="rounded-card border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-section font-semibold">Fotos</h2>
          <p className="text-caption text-muted-foreground">{images.length} de 5 fotos activas</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={onAddImage}
          disabled={atLimit}
          aria-label={atLimit ? "Límite de 5 fotos alcanzado" : "Agregar foto"}
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          {atLimit ? "Límite alcanzado" : "Agregar foto"}
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {images.map((image) => (
          <figure key={image.id} className="rounded-card border p-2 space-y-2">
            <img
              src={image.src}
              alt={image.alt}
              className="aspect-square w-full rounded-control object-cover"
            />
            <figcaption className="flex flex-wrap gap-1">
              {image.principal && <EstadoBadge variant="exito">Principal</EstadoBadge>}
              {image.pendingUpload && <EstadoBadge variant="info">Pendiente de subir</EstadoBadge>}
            </figcaption>
            {(onMarkPrincipal || onUnlink) && (
              <div className="flex gap-1">
                {onMarkPrincipal && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    aria-label={`Marcar ${image.alt} como principal`}
                    onClick={() => onMarkPrincipal(image)}
                  >
                    Marcar
                  </Button>
                )}
                {onUnlink && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onUnlink(image)}
                  >
                    Quitar
                  </Button>
                )}
              </div>
            )}
          </figure>
        ))}
      </div>
    </section>
  )
}

export interface AnimalFormScreenProps {
  mode: "desktop" | "mobile"
  formVariant?: AnimalFormVariant
  onSave: (formData: FormData) => void | Promise<void>
  onCancel: () => void
  initialValues?: AnimalFormInitialValues
  catalogOptions?: AnimalFormCatalogOptions
  currentLocation?: AnimalCurrentLocation
  fieldErrors?: Record<string, string>
  /**
   * PR 2a (CA-UI-006): while the create/edit action is in flight the submit
   * button must display "Guardando…" and be disabled. Width must be preserved
   * to avoid layout shift between the two labels.
   */
  isSubmitting?: boolean
  /**
   * PR 2a (CA-UI-007): fired when the user toggles the origen pill. The form
   * already discards the abandoned block's typed values via `key={origen}`,
   * but the route can react to mount/unmount here.
   */
  onOrigenChange?: (origen: OrigenKey) => void
  /**
   * PR 2a (CA-CRE-003): the animal being edited. Passed to the madre / padre
   * Comboboxes as `excludedIds` so the animal cannot be set as its own parent.
   */
  currentAnimalId?: string
}

export type AnimalFormVariant = "create" | "edit" | "delete"
export type SexoKey = 0 | 1 | 2
export type OrigenKey = "nacido_en_finca" | "comprado"

export interface SelectOption {
  value: string
  label: string
}

/**
 * Catalog option shape for selectors that may carry extra metadata (e.g. a
 * hex swatch for `color`). The form-level `SelectOptionWithCreate` widens
 * the base `SelectOption` so the type stays compatible with the v1.3
 * `SelectConCreacion` primitive that accepts plain `SelectOption[]`.
 */
export interface SelectOptionWithCreate extends SelectOption {
  readonly meta?: { readonly hex?: string }
}

export interface CanCreateCatalog {
  readonly raza?: boolean
  readonly color?: boolean
  readonly lugarCompra?: boolean
  readonly calidad?: boolean
}

export interface AnimalFormCatalogOptions {
  sexo?: readonly SelectOption[]
  origen?: readonly SelectOption[]
  raza?: readonly SelectOptionWithCreate[]
  color?: readonly SelectOptionWithCreate[]
  calidad?: readonly SelectOption[]
  lugarCompra?: readonly SelectOptionWithCreate[]
  madre?: readonly ComboboxOption[]
  padre?: readonly ComboboxOption[]
  potrero?: readonly SelectOption[]
  sector?: readonly SelectOption[]
  lote?: readonly SelectOption[]
  grupo?: readonly SelectOption[]
  canCreateCatalog?: CanCreateCatalog
}

export interface AnimalFormInitialValues {
  sexoKey?: SexoKey
  origen?: string
  fechaNacimiento?: string
  fechaCompra?: string
  razaId?: string
  colorId?: string
  calidadId?: string
  lugarCompraId?: string
  madreId?: string
  padreId?: string
  precioCompra?: string
  pesoCompra?: string
  comentarios?: string
  potreroId?: string
  sectorId?: string
  loteId?: string
  grupoId?: string
}

export interface AnimalCurrentLocation {
  potrero?: string
  sector?: string
  lote?: string
  grupo?: string
}

type AnimalFormField = {
  label: string
  name: string
  required?: boolean
  defaultValue?: string
}


const ORIGEN_OPTIONS: readonly { value: OrigenKey; label: string }[] = [
  { value: "nacido_en_finca", label: "Nacido en finca" },
  { value: "comprado", label: "Comprado" },
]

/**
 * FORM_FIELDS is the static, mode-independent field list. PR 2a moved
 * `madre` and `padre` out of this list — they live in the conditional
 * parents block (rendered when `origen === "nacido_en_finca"`). The
 * purchase block (rendered when `origen === "comprado"`) is also
 * outside this list; both blocks are wired in `AnimalFormScreen`.
 */
const FORM_FIELDS: readonly AnimalFormField[] = [
  { label: "Código *", name: "codigo", required: true },
  { label: "Nombre", name: "nombre", required: true },
  { label: "Nº de arete", name: "arete" },
  { label: "Sexo", name: "sexoKey" },
  { label: "Raza", name: "raza" },
  { label: "Fecha de nacimiento", name: "fechaNacimiento" },
  { label: "Color", name: "color" },
  { label: "Calidad", name: "calidad" },
  { label: "Origen", name: "origen" },
]

const LOCATION_FIELDS: readonly (AnimalFormField & {
  optionsKey: keyof AnimalFormCatalogOptions
})[] = [
  { label: "Potrero", name: "potreroId", optionsKey: "potrero" },
  { label: "Sector", name: "sectorId", optionsKey: "sector" },
  { label: "Lote", name: "loteId", optionsKey: "lote" },
  { label: "Grupo", name: "grupoId", optionsKey: "grupo" },
]

export function AnimalFormScreen({
  mode,
  formVariant = "create",
  onSave,
  onCancel,
  initialValues,
  catalogOptions,
  currentLocation,
  fieldErrors,
  isSubmitting = false,
  onOrigenChange,
  currentAnimalId,
}: AnimalFormScreenProps) {
  const mobile = mode === "mobile"
  // PR 2a: the form is fully controlled for the v1.3 fields that drive
  // conditional rendering (`origen`) or require post-action state changes
  // (the `Estimar por edad` shortcut must append `[fecha estimada]` to
  // `comentarios`). All other fields stay uncontrolled — they read from
  // the hidden native inputs the primitives already serialise.
  const initialOrigen: OrigenKey =
    initialValues?.origen === "comprado" ? "comprado" : "nacido_en_finca"
  const [origen, setOrigen] = useState<OrigenKey>(initialOrigen)
  // PR 2a (CA-UI-007): a flip counter ensures the conditional block's
  // `key` changes on every flip, so React re-mounts the block and the
  // abandoned uncontrolled inputs revert to their `defaultValue`.
  const [origenFlipCount, setOrigenFlipCount] = useState(0)
  const [fechaNacimiento, setFechaNacimiento] = useState<string>(
    initialValues?.fechaNacimiento ?? "",
  )
  const [fechaCompra, setFechaCompra] = useState<string>(initialValues?.fechaCompra ?? "")
  const [comentarios, setComentarios] = useState<string>(initialValues?.comentarios ?? "")
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Bifurcation: if the caller provided a custom `catalogOptions.origen`
  // (e.g. a non-spec list like the PR 3 fixture shipped), render the
  // origen as a labeled combobox for backwards compat. Otherwise render
  // it as the v1.3 `PillsSegmentadas` (radiogroup, 2 options).
  const useComboboxOrigen = catalogOptions?.origen !== undefined

  const handleOrigenChange = (next: string) => {
    if (next !== "nacido_en_finca" && next !== "comprado") return
    setOrigen(next)
    setOrigenFlipCount((n) => n + 1)
    onOrigenChange?.(next)
  }

  const handleEstimar = (iso: string) => {
    setFechaNacimiento(iso)
    setComentarios((prev) => (prev ? `${prev} [fecha estimada]` : "[fecha estimada]"))
  }

  const fields = mobile
    ? FORM_FIELDS.filter((field) =>
        [
          "Código *",
          "Nombre",
          "Sexo",
          "Raza",
          "Fecha de nacimiento",
          "Origen",
          "Potrero",
          "Sector",
          "Lote",
          "Grupo",
        ].includes(field.label),
      )
    : FORM_FIELDS
  const formId = `animal-form-${mode}`
  const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return
    const form = event.currentTarget
    void onSave(new FormData(form))
  }
  const isComprado = origen === "comprado"
  return (
    <section
      data-testid={mobile ? "op-f-400233" : "op-f-400191"}
      aria-label={mobile ? "21 Nuevo Animal · Mobile" : "20 Nuevo Animal · Desktop"}
      className={cn("bg-background", mobile ? "max-w-[390px] min-h-[844px]" : "min-h-[900px] p-8")}
    >
      <header
        className={cn(
          "h-14 border-b bg-card px-4 flex items-center",
          !mobile && "max-w-3xl mx-auto rounded-t-card border w-full",
        )}
      >
        <h1 className="text-title font-semibold">Nuevo animal</h1>
      </header>
      <form
        id={formId}
        onSubmit={submitForm}
        aria-busy={!isHydrated || isSubmitting}
        className={cn(
          "bg-card border-x p-4 grid gap-4",
          mobile ? "pb-28" : "max-w-3xl mx-auto grid-cols-2 border rounded-b-card w-full",
        )}
      >
        <fieldset disabled={!isHydrated || isSubmitting} className="contents">
        <input type="hidden" name="versionLeida" value="1" />
        {fields.map((field) =>
          renderAnimalFormField(field, {
            initialValues,
            catalogOptions,
            fieldErrors,
            origen,
            fechaNacimiento,
            comentarios,
            handleOrigenChange,
            handleEstimar,
            useComboboxOrigen,
            currentAnimalId,
            setFechaNacimiento,
            setComentarios,
          }),
        )}
        {/*
          PR 2a (CA-UI-007 + CA-CRE-002): the conditional block is keyed
          on `origen` so flipping the pill unmounts the abandoned block.
          Typed values in the abandoned block are discarded (their
          hidden inputs disappear from the DOM and therefore from
          FormData). Wrapping each branch in a `<div key={origen}>`
          ensures both directions of the flip remount.
        */}
        {formVariant !== "delete" ? (
          <div data-conditional={origen} className="col-span-full grid gap-4">
            {isComprado ? (
              <PurchaseBlock
                key={`purchase-${origen}-${origenFlipCount}`}
                initialValues={initialValues}
                catalogOptions={catalogOptions}
                fieldErrors={fieldErrors}
                fechaCompra={fechaCompra}
                fechaNacimiento={fechaNacimiento}
                onFechaCompraChange={setFechaCompra}
              />
            ) : (
              <ParentsBlock
                key={`parents-${origen}-${origenFlipCount}`}
                initialValues={initialValues}
                catalogOptions={catalogOptions}
                fieldErrors={fieldErrors}
                currentAnimalId={currentAnimalId}
                showPadre={!mobile}
              />
            )}
          </div>
        ) : null}
        {/*
          Comentarios lives outside the conditional block so it stays
          visible in both modes. The Estimar por edad shortcut appends
          the `[fecha estimada]` tag here.
        */}
        <div className="col-span-full">
          <Field
            key="comentarios"
            label="Comentarios"
            name="comentarios"
            value={comentarios}
            onChange={setComentarios}
            fieldErrors={fieldErrors}
          />
        </div>
        {formVariant === "create"
          ? LOCATION_FIELDS.map((field) =>
              renderAnimalFormField(field, {
                initialValues,
                catalogOptions,
                fieldErrors,
                origen,
                fechaNacimiento,
                comentarios,
                handleOrigenChange,
                handleEstimar,
                useComboboxOrigen,
                currentAnimalId,
                setFechaNacimiento,
                setComentarios,
              }),
            )
          : renderCurrentLocation(currentLocation)}
        {mobile && (
          <p className="rounded-card bg-info-100 text-info-600 p-3 text-support">
            ¿No encuentras la raza? Créala sin salir del formulario.
          </p>
        )}
        <footer
          data-sticky-save="true"
          className={cn(
            "border-t bg-card p-4 flex items-center gap-2 z-40",
            mobile
              ? "fixed inset-x-0 bottom-0 min-h-20"
              : "col-span-full -mx-4 -mb-4 border-x border-b rounded-b-card justify-end",
          )}
        >
          <p className="mr-auto text-caption text-info-600">Se sincronizará al recuperar señal</p>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          {/*
            PR 2a (CA-UI-006): "min-w-[120px]" preserves button width when
            the label flips between "Guardar" and "Guardando…".
          */}
          <Button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? "Guardando…" : "Guardar"}
          </Button>
        </footer>
        </fieldset>
      </form>
    </section>
  )
}

interface RenderFieldContext {
  initialValues?: AnimalFormInitialValues | undefined
  catalogOptions?: AnimalFormCatalogOptions | undefined
  fieldErrors?: Record<string, string> | undefined
  origen: OrigenKey
  fechaNacimiento: string
  comentarios: string
  handleOrigenChange: (next: string) => void
  handleEstimar: (iso: string) => void
  useComboboxOrigen: boolean
  currentAnimalId?: string | undefined
  setFechaNacimiento: (value: string) => void
  setComentarios: React.Dispatch<React.SetStateAction<string>>
}

function renderAnimalFormField(field: AnimalFormField, ctx: RenderFieldContext) {
  const {
    initialValues,
    catalogOptions,
    fieldErrors,
    origen,
    fechaNacimiento,
    handleOrigenChange,
    handleEstimar,
    useComboboxOrigen,
    setFechaNacimiento,
  } = ctx

  if (field.name === "sexoKey") {
    const sexo = catalogOptions?.sexo ?? []
    return (
      <CatalogSelectField
        key={field.name}
        label={field.label}
        name={field.name}
        defaultValue={sexo.some((option) => option.value === "1") ? String(initialValues?.sexoKey ?? 1) : undefined}
        options={sexo}
        disabledWhenEmpty
        fieldErrors={fieldErrors}
      />
    )
  }

  if (field.name === "origen") {
    if (useComboboxOrigen) {
      return (
        <CatalogSelectField
          key={field.name}
          label={field.label}
          name={field.name}
          defaultValue={initialValues?.origen}
          options={catalogOptions?.origen ?? []}
          fieldErrors={fieldErrors}
        />
      )
    }
    return (
      <OrigenField
        key={field.name}
        label={field.label}
        value={origen}
        onChange={handleOrigenChange}
        fieldErrors={fieldErrors}
      />
    )
  }

  if (field.name === "fechaNacimiento") {
    return (
      <FechaNacimientoField
        key={field.name}
        label={field.label}
        name={field.name}
        value={fechaNacimiento}
        onChange={setFechaNacimiento}
        onEstimar={handleEstimar}
        fieldErrors={fieldErrors}
      />
    )
  }

  if (field.name === "raza" || field.name === "color" || field.name === "calidad") {
    return (
      <SelectConCreacionField
        key={field.name}
        label={field.label}
        name={field.name}
        options={
          (catalogOptions?.[field.name as "raza" | "color" | "calidad"] as
            | readonly SelectOption[]
            | undefined) ?? []
        }
        canCreate={
          field.name === "calidad"
            ? false
            : (catalogOptions?.canCreateCatalog?.[field.name as "raza" | "color"] ?? false)
        }
        defaultValue={
          (initialValues as Record<string, string | undefined> | undefined)?.[`${field.name}Id`] ??
          undefined
        }
        fieldErrors={fieldErrors}
      />
    )
  }

  if (field.name === "lugarCompra") {
    return (
      <SelectConCreacionField
        key={field.name}
        label={field.label}
        name={field.name}
        options={catalogOptions?.lugarCompra ?? []}
        canCreate={catalogOptions?.canCreateCatalog?.lugarCompra ?? false}
        defaultValue={initialValues?.lugarCompraId}
        fieldErrors={fieldErrors}
      />
    )
  }

  const locationField = LOCATION_FIELDS.find((location) => location.name === field.name)
  if (locationField) {
    return (
      <CatalogSelectField
        key={field.name}
        label={field.label}
        name={field.name}
        defaultValue={initialValues?.[field.name as keyof AnimalFormInitialValues]?.toString()}
        options={(catalogOptions?.[locationField.optionsKey] ?? []) as readonly SelectOption[]}
        fieldErrors={fieldErrors}
      />
    )
  }

  return <Field key={field.name} {...field} fieldErrors={fieldErrors} />
}

/**
 * Purchase block — rendered when `origen === "comprado"`.
 *
 * CA-UI-007: when the user flips origen back to "nacido_en_finca", this
 * entire block unmounts (the parent `<div key={origen}>` re-mounts) and
 * every typed value is discarded.
 */
function PurchaseBlock({
  initialValues,
  catalogOptions,
  fieldErrors,
  fechaCompra,
  fechaNacimiento,
  onFechaCompraChange,
}: {
  initialValues?: AnimalFormInitialValues | undefined
  catalogOptions?: AnimalFormCatalogOptions | undefined
  fieldErrors?: Record<string, string> | undefined
  fechaCompra: string
  fechaNacimiento: string
  onFechaCompraChange: (value: string) => void
}) {
  return (
    <>
      <FechaCompraField
        value={fechaCompra}
        minDate={fechaNacimiento ? new Date(`${fechaNacimiento}T00:00:00`) : undefined}
        onChange={onFechaCompraChange}
        fieldErrors={fieldErrors}
      />
      <NumericField
        label="Precio"
        name="precioCompra"
        defaultValue={initialValues?.precioCompra}
        fieldErrors={fieldErrors}
      />
      <NumericField
        label="Peso compra"
        name="pesoCompra"
        defaultValue={initialValues?.pesoCompra}
        fieldErrors={fieldErrors}
      />
      <SelectConCreacionField
        label="Lugar de compra"
        name="lugarCompra"
        options={catalogOptions?.lugarCompra ?? []}
        canCreate={catalogOptions?.canCreateCatalog?.lugarCompra ?? false}
        defaultValue={initialValues?.lugarCompraId}
        fieldErrors={fieldErrors}
      />
    </>
  )
}

/**
 * Parents block — rendered when `origen === "nacido_en_finca"`.
 *
 * CA-CRE-003: `excludedIds` filters the current animal out so it cannot
 * be set as its own parent. The mobile form omits `padre` per the
 * existing PR 3 mobile filter.
 */
function ParentsBlock({
  initialValues,
  catalogOptions,
  fieldErrors,
  currentAnimalId,
  showPadre,
}: {
  initialValues?: AnimalFormInitialValues | undefined
  catalogOptions?: AnimalFormCatalogOptions | undefined
  fieldErrors?: Record<string, string> | undefined
  currentAnimalId?: string | undefined
  showPadre: boolean
}) {
  return (
    <>
      <ComboboxField
        label="Madre"
        name="madreId"
        options={catalogOptions?.madre ?? []}
        defaultValue={initialValues?.madreId}
        excludedIds={currentAnimalId ? [currentAnimalId] : []}
        fieldErrors={fieldErrors}
      />
      {showPadre ? (
        <ComboboxField
          label="Padre"
          name="padreId"
          options={catalogOptions?.padre ?? []}
          defaultValue={initialValues?.padreId}
          fieldErrors={fieldErrors}
        />
      ) : null}
    </>
  )
}

function renderCurrentLocation(currentLocation?: AnimalCurrentLocation) {
  const locationRows = [
    { label: "Potrero", value: currentLocation?.potrero },
    { label: "Sector", value: currentLocation?.sector },
    { label: "Lote", value: currentLocation?.lote },
    { label: "Grupo", value: currentLocation?.grupo },
  ]

  return (
    <section
      aria-label="Ubicación actual"
      className="col-span-full rounded-card border p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-section font-semibold">Ubicación actual</h2>
        <Button type="button" variant="secondary">
          Mover animal
        </Button>
      </div>
      <dl className="grid gap-2 md:grid-cols-4">
        {locationRows.map((row) => (
          <div key={row.label}>
            <dt className="text-caption text-muted-foreground">{row.label}</dt>
            <dd className="text-support font-medium">{row.value ?? "No disponible"}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Field({
  label,
  name,
  required = false,
  defaultValue,
  value,
  onChange,
  fieldErrors,
}: {
  label: string
  name: string
  required?: boolean
  defaultValue?: string
  /**
   * PR 2a: when supplied, the field renders as a controlled input. The
   * `Estimar por edad` shortcut writes to `comentarios` and the spec
   * requires the appended `[fecha estimada]` tag to round-trip through
   * the form state, so comentarios is the first controlled field.
   */
  value?: string
  onChange?: (next: string) => void
  fieldErrors?: Record<string, string> | undefined
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/gi, "-")
  const errorId = `${id}-error`
  const errorMessage = fieldErrors?.[name]
  const inputProps = errorMessage
    ? { "aria-invalid": "true" as const, "aria-describedby": errorId }
    : {}
  if (onChange) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          name={name}
          required={required}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-[--h-touch]"
          {...inputProps}
        />
        {errorMessage ? (
          <p id={errorId} role="alert" className="text-caption text-danger-600">
            {errorMessage}
          </p>
        ) : null}
      </div>
    )
  }
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="min-h-[--h-touch]"
        {...inputProps}
      />
      {errorMessage ? (
        <p id={errorId} role="alert" className="text-caption text-danger-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

function CatalogSelectField({
  label,
  name,
  defaultValue,
  options,
  disabledWhenEmpty = false,
  fieldErrors,
}: {
  label: string
  name: string
  defaultValue?: string | undefined
  options: readonly SelectOption[]
  disabledWhenEmpty?: boolean
  fieldErrors?: Record<string, string> | undefined
}) {
  const id = `${label.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-${useId()}`
  const errorId = `${id}-error`
  const errorMessage = fieldErrors?.[name]
  const triggerProps = errorMessage
    ? { "aria-invalid": "true" as const, "aria-describedby": errorId }
    : {}
  const hasDefaultLabel = defaultValue
    ? options.some((option) => option.value === defaultValue)
    : false
  const unavailable = disabledWhenEmpty && options.length === 0
  const renderedOptions = unavailable
    ? []
    :
    hasDefaultLabel || !defaultValue
      ? options
      : [{ value: defaultValue, label: "No disponible" }, ...options]
  const selectProps = unavailable ? {} : defaultValue === undefined ? { name } : { name, defaultValue }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select {...selectProps}>
        <SelectTrigger id={id} disabled={unavailable} className="min-h-[--h-touch]" {...triggerProps}>
          {unavailable ? "No disponible" : <SelectValue placeholder="No disponible" />}
        </SelectTrigger>
        <SelectContent>
          {renderedOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errorMessage ? (
        <p id={errorId} role="alert" className="text-caption text-danger-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

/**
 * PR 2a — Origen field.
 *
 * The spec mandates the v1.3 control is a 2-option radio pill, but the
 * existing PR 3 catalog fixtures still ship a custom `origen` list. To
 * keep both contracts valid we bifurcate on whether the caller provided
 * a non-`undefined` `catalogOptions.origen`:
 *
 * - Provided (even empty) → labeled combobox via `CatalogSelectField`
 *   (preserves the existing PR 3 / CA-UI-001/003 catalog behaviour).
 * - Undefined → `PillsSegmentadas` (the v1.3 segmented control).
 */
function OrigenField({
  label,
  value,
  onChange,
  fieldErrors,
}: {
  label: string
  value: OrigenKey
  onChange: (next: string) => void
  fieldErrors?: Record<string, string> | undefined
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/gi, "-")
  const errorId = `${id}-error`
  const errorMessage = fieldErrors?.origen
  return (
    <div className="space-y-1.5 col-span-full">
      <Label htmlFor={id}>{label}</Label>
      <PillsSegmentadas
        id={id}
        name="origen"
        value={value}
        onChange={onChange}
        options={ORIGEN_OPTIONS as unknown as readonly [PillsOption, PillsOption]}
        label={label}
        {...(errorMessage ? { "aria-invalid": "true" as const, "aria-describedby": errorId } : {})}
      />
      {errorMessage ? (
        <p id={errorId} role="alert" className="text-caption text-danger-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

/**
 * PR 2a — Fecha de nacimiento field.
 *
 * DatePicker for the ISO value + an inline "Estimar por edad" button
 * that opens a tiny popover with a years input and an Aplicar action.
 * Applying sets the ISO date on the parent and appends the
 * `[fecha estimada]` tag to `comentarios` via `onEstimar`.
 *
 * The trigger button's text is the es-CO formatted date (or the
 * `dd/mm/aaaa` placeholder). The hidden native `<input type="date">`
 * mirrors the ISO value so FormData serialises the raw ISO.
 */
function FechaNacimientoField({
  label,
  name,
  value,
  onChange,
  onEstimar,
  fieldErrors,
}: {
  label: string
  name: string
  value: string
  onChange: (next: string) => void
  onEstimar: (iso: string) => void
  fieldErrors?: Record<string, string> | undefined
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/gi, "-")
  const errorId = `${id}-error`
  const errorMessage = fieldErrors?.[name]
  return (
    <div className="space-y-1.5 col-span-full">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-wrap items-start gap-2">
        <DatePicker
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          maxDate={new Date()}
          className="flex-1 min-w-[200px]"
          {...(errorMessage
            ? { "aria-invalid": "true" as const, "aria-describedby": errorId }
            : {})}
        />
        <EstimarPorEdad onApply={onEstimar} />
      </div>
      {errorMessage ? (
        <p id={errorId} role="alert" className="text-caption text-danger-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

/**
 * PR 2a — Fecha de compra field.
 *
 * Same DatePicker contract as `FechaNacimientoField` but without the
 * "Estimar por edad" shortcut (compra date is a known user input, not
 * an estimated one). Renders a `Label` and the DatePicker trigger.
 */
function FechaCompraField({
  value,
  minDate,
  onChange,
  fieldErrors,
}: {
  value: string
  minDate?: Date | undefined
  onChange: (value: string) => void
  fieldErrors?: Record<string, string> | undefined
}) {
  const label = "Fecha de compra"
  const name = "fechaCompra"
  const id = label.toLowerCase().replace(/[^a-z0-9]+/gi, "-")
  const errorId = `${id}-error`
  const errorMessage = fieldErrors?.[name]
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <DatePicker
        id={id}
        name={name}
        value={value}
        minDate={minDate}
        onChange={onChange}
        maxDate={new Date()}
        {...(errorMessage ? { "aria-invalid": "true" as const, "aria-describedby": errorId } : {})}
      />
      {errorMessage ? (
        <p id={errorId} role="alert" className="text-caption text-danger-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

/**
 * PR 2a — "Estimar por edad" popover.
 *
 * CA-CRE-004: this is NOT a primitive (see design.md Open Q5). It
 * layers a Radix Popover on top of the existing DatePicker and uses
 * the parent's `onEstimar` callback to write the ISO date and the
 * `[fecha estimada]` tag back into form state.
 */
function EstimarPorEdad({ onApply }: { onApply: (iso: string) => void }) {
  const [open, setOpen] = useState(false)
  const [age, setAge] = useState("3")
  const handleApply = () => {
    const years = Number.parseInt(age, 10)
    if (Number.isFinite(years) && years >= 0) {
      const estimated = new Date()
      estimated.setFullYear(estimated.getFullYear() - years)
      onApply(format(estimated, "yyyy-MM-dd"))
    }
    setOpen(false)
  }
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button type="button" variant="secondary" className="min-h-[--h-touch] shrink-0">
          <Calculator className="size-4" aria-hidden="true" />
          Estimar por edad
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={6}
          className="z-50 w-64 rounded-control border bg-popover p-3 text-popover-foreground shadow-md"
        >
          <div className="space-y-2">
            <Label htmlFor="estimar-edad-input">Años</Label>
            <Input
              id="estimar-edad-input"
              type="number"
              inputMode="numeric"
              min={0}
              max={30}
              value={age}
              onChange={(event) => setAge(event.target.value)}
              className="min-h-[--h-touch]"
            />
            <p className="text-caption text-muted-foreground">
              Se calculará la fecha de nacimiento restando los años a hoy.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleApply}>
                Aplicar
              </Button>
            </div>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

/**
 * PR 2a — SelectConCreacion wrapper.
 *
 * The v1.3 catalog selectors (`raza`, `color`, `calidad`, `lugarCompra`)
 * all share the same shape: Label + SelectConCreacion trigger + alert.
 * `canCreate` is gated on `canCreateCatalog` from the form props.
 */
function SelectConCreacionField({
  label,
  name,
  options,
  canCreate,
  defaultValue,
  fieldErrors,
}: {
  label: string
  name: string
  options: readonly SelectOption[]
  canCreate: boolean
  defaultValue?: string | undefined
  fieldErrors?: Record<string, string> | undefined
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/gi, "-")
  const errorId = `${id}-error`
  const errorMessage = fieldErrors?.[name]
  // The `SelectConCreacion` primitive uses `aria-label` for the trigger
  // name; mirroring that to the Label text keeps
  // `getByRole("combobox", { name: label })` and `getByLabelText`
  // consistent for the form's consumer tests.
  const placeholder = label
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <SelectConCreacion
        id={id}
        name={name}
        options={options}
        value={defaultValue ?? null}
        onChange={() => {
          // uncontrolled — the hidden native input mirrors the chosen id
        }}
        canCreate={canCreate}
        placeholder={placeholder}
        {...(errorMessage ? { "aria-invalid": "true" as const, "aria-describedby": errorId } : {})}
      />
      {errorMessage ? (
        <p id={errorId} role="alert" className="text-caption text-danger-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

/**
 * PR 2a — ComboboxBuscable wrapper.
 *
 * Madre / Padre are searchable selectors (CA-CRE-003) that emit the
 * option `id` and render rows as `código · nombre`. `excludedIds` is
 * forwarded so the current animal cannot be its own parent.
 */
function ComboboxField({
  label,
  name,
  options,
  defaultValue,
  excludedIds,
  fieldErrors,
}: {
  label: string
  name: string
  options: readonly ComboboxOption[]
  defaultValue?: string | undefined
  excludedIds?: readonly string[]
  fieldErrors?: Record<string, string> | undefined
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/gi, "-")
  const errorId = `${id}-error`
  const errorMessage = fieldErrors?.[name]
  const placeholder = label
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <ComboboxBuscable
        id={id}
        name={name}
        options={options}
        value={defaultValue ?? null}
        onChange={() => {
          // uncontrolled — the hidden native input mirrors the chosen id
        }}
        placeholder={placeholder}
        {...(excludedIds !== undefined ? { excludedIds } : {})}
        {...(errorMessage ? { "aria-invalid": "true" as const, "aria-describedby": errorId } : {})}
      />
      {errorMessage ? (
        <p id={errorId} role="alert" className="text-caption text-danger-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

/**
 * PR 2a — Numeric input wrapper.
 *
 * `precio_compra` / `peso_compra` are free-text numeric inputs in the
 * form (es-CO formatting is normalised in PR 2b's mapper). The label +
 * `aria-invalid` wiring matches the other field wrappers.
 */
function NumericField({
  label,
  name,
  defaultValue,
  fieldErrors,
}: {
  label: string
  name: string
  defaultValue?: string | undefined
  fieldErrors?: Record<string, string> | undefined
}) {
  return (
    <Field
      key={name}
      label={label}
      name={name}
      fieldErrors={fieldErrors}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
    />
  )
}

export interface AnimalDesktopScreenProps {
  animales: AnimalListItem[]
  selectedIds?: string[]
  canCreate?: boolean
  onNuevoAnimal: () => void
}

export function AnimalDesktopScreen({
  animales,
  selectedIds = [],
  canCreate = true,
  onNuevoAnimal,
}: AnimalDesktopScreenProps) {
  return (
    <section
      data-testid="op-f-300165"
      aria-label="18 Animales · Desktop"
      className="min-h-[900px] bg-background p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-title font-semibold">Animales</p>
          <p className="text-support text-muted-foreground">
            Administra el hato activo de la finca
          </p>
        </div>
        {canCreate && (
          <Button type="button" onClick={onNuevoAnimal}>
            Nuevo animal
          </Button>
        )}
      </div>
      <div className="rounded-card border bg-card p-3 flex items-center gap-2">
        <Input aria-label="Buscar animales" placeholder="Buscar por código, nombre, arete o RFID" />
        <Button type="button" variant="secondary">
          Filtrar
        </Button>
      </div>
      <div className="rounded-card border bg-card overflow-hidden">
        <table className="w-full" aria-label="Animales">
          <thead className="bg-muted text-caption text-muted-foreground">
            <tr>
              <th className="h-11 px-3 text-left">Código</th>
              <th className="h-11 px-3 text-left">Nombre</th>
              <th className="h-11 px-3 text-left">Estado</th>
              <th className="h-11 px-3 text-left">Ubicación</th>
            </tr>
          </thead>
          <tbody>
            {animales.map((animal) => (
              <tr key={animal.id} className="h-11 border-t">
                <td className="px-3 font-semibold">{animal.codigoAnimal}</td>
                <td className="px-3">{animal.nombreAnimal}</td>
                <td className="px-3">
                  <EstadoAnimalBadge estado={animal.estadoActual} />
                </td>
                <td className="px-3 text-muted-foreground">
                  {[animal.potrero, animal.lote].filter(Boolean).join(" · ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedIds.length > 0 && (
        <output className="rounded-card border bg-card px-4 py-3">
          {selectedIds.length} seleccionado
        </output>
      )}
    </section>
  )
}

export interface AnimalFichaDesktopScreenProps {
  animal: AnimalListItem
  timeline: AnimalTimelineItem[]
  genealogy?: AnimalGenealogyProps
}

export function AnimalFichaDesktopScreen({
  animal,
  timeline,
  genealogy,
}: AnimalFichaDesktopScreenProps) {
  return (
    <section
      data-testid="op-f-400107"
      aria-label="19 Ficha Animal · Desktop"
      className="min-h-[900px] bg-background p-6 space-y-4"
    >
      <AnimalFichaHeader
        animal={animal}
        metrics={[
          { label: "Edad", value: "—" },
          { label: "Último peso", value: "—" },
        ]}
        canEdit
        canCreateEvents
      />
      <div className="grid grid-cols-[1fr_1.2fr] gap-4">
        <InfoCard title="Datos">Código {animal.codigoAnimal}</InfoCard>
        {genealogy ? (
          <AnimalGenealogy {...genealogy} />
        ) : (
          <InfoCard title="Genealogía">Sin genealogía registrada.</InfoCard>
        )}
        <InfoCard title="Timeline">
          {timeline.length > 0 ? (
            <AnimalTimeline eventos={timeline} />
          ) : (
            <p className="text-support text-muted-foreground">Sin eventos registrados.</p>
          )}
        </InfoCard>
        <InfoCard title="Reproducción">Sin datos reproductivos pendientes.</InfoCard>
        <InfoCard title="Peso">Sin peso reciente.</InfoCard>
      </div>
    </section>
  )
}

export interface AnimalFichaMobileScreenProps {
  animal: AnimalListItem
  timeline: AnimalTimelineItem[]
  bottomNavItems: ItemNav[]
  onRegistrarEvento: () => void
  metrics?: { label: string; value: string; context?: string }[]
  genealogy?: AnimalGenealogyProps
}

export function AnimalFichaMobileScreen({
  animal,
  timeline,
  bottomNavItems,
  onRegistrarEvento,
  metrics = [
    { label: "Edad", value: "—" },
    { label: "Último peso", value: "—" },
  ],
  genealogy,
}: AnimalFichaMobileScreenProps) {
  return (
    <section
      data-testid="op-frame-0232"
      aria-label="04 Ficha Animal · Mobile"
      className="min-h-[844px] w-full max-w-[390px] bg-background pb-[calc(var(--h-bottomnav)+16px)]"
    >
      <header className="h-14 border-b bg-card px-4 flex items-center">
        <div>
          <p className="text-title font-semibold">Ficha animal</p>
          <p className="text-caption text-muted-foreground">Detalle operativo</p>
        </div>
      </header>
      <main className="p-4 space-y-4">
        <AnimalFichaHeader animal={animal} metrics={metrics} canEdit />
        <div role="tablist" aria-label="Secciones de ficha" className="flex gap-2 overflow-x-auto">
          {[
            { label: "Timeline", selected: true },
            { label: "Fotos", selected: false },
            { label: "Genealogía", selected: false },
          ].map((tab) => (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={tab.selected}
              className="min-h-[--h-touch] rounded-full border bg-card px-4 text-support font-medium"
            >
              {tab.label}
            </button>
          ))}
        </div>
        <InfoCard title="Timeline">
          {timeline.length > 0 ? (
            <AnimalTimeline eventos={timeline} />
          ) : (
            <p className="text-support text-muted-foreground">Sin eventos registrados.</p>
          )}
        </InfoCard>
        {genealogy && <AnimalGenealogy {...genealogy} />}
      </main>
      <BottomNav
        items={bottomNavItems}
        activoId="animales"
        onNavigate={() => {}}
        onFab={onRegistrarEvento}
      />
    </section>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="rounded-card border bg-card p-4 space-y-2">
      <h2 className="text-section font-semibold">{title}</h2>
      <div className="text-support text-muted-foreground">{children}</div>
    </section>
  )
}

export function AnimalDeleteDialogCopy({ events }: { events: number }) {
  if (events > 0) {
    return (
      <p className="text-support">
        MT-122 tiene {events} eventos registrados y no puede eliminarse. Puedes marcarlo como
        inactivo: se oculta de la operación y conserva su historia.
      </p>
    )
  }
  return (
    <p className="text-support flex gap-2">
      <AlertTriangle className="size-4 text-peligro-600" aria-hidden="true" />
      Se eliminará definitivamente MT-122. Esta acción no se puede deshacer.
    </p>
  )
}
