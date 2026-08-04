"use client"

import * as PopoverPrimitive from "@radix-ui/react-popover"
import { format, parseISO, subYears } from "date-fns"
import { es } from "date-fns/locale"
import {
  AlertTriangle,
  Baby,
  Banknote,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Hand,
  Heart,
  ImagePlus,
  MapPin,
  Milk,
  PawPrint,
  Plus,
  Scale,
  Search,
  Skull,
  Stethoscope,
  Syringe,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import type * as React from "react"

import { cn } from "../lib/utils"
import { Button } from "../primitives/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../primitives/collapsible"
import { ComboboxBuscable, type ComboboxOption } from "../primitives/combobox-buscable"
import { DatePicker } from "../primitives/date-picker"
import { Input } from "../primitives/input"
import { Label } from "../primitives/label"
import { type PillsOption, PillsSegmentadas } from "../primitives/pills-segmentadas"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../primitives/select"
import { SelectConCreacion } from "../primitives/select-con-creacion"
import {
  DETAIL_FIELD_NAMES,
  SECTION_LAYOUT,
  sectionFor,
  useOnlineStatus,
} from "./animal-crud-infra"
import { BottomNav } from "./bottom-nav"
import { EmptyState } from "./empty-state"
import { CategoriaBadge, EstadoAnimalBadge, EstadoBadge, SaludBadge } from "./estado-badge"
import { MetricCard } from "./metric-card"
import { PageHeader } from "./page-header"
import type {
  AnimalFichaResumen,
  AnimalResumen,
  CategoriaReproductiva,
  DominioEvento,
  ItemNav,
  Salud,
  Sexo,
} from "./types"

export type AnimalListItem = AnimalResumen & {
  imagenPrincipalUrl?: string | null
}

/**
 * Tipo de evento del timeline. Incluye los tipos de registro (peso, vacuna,
 * …) y los tipos canónicos de la unión de tablas de eventos (pesaje,
 * condicion, vacunacion, revision, venta, muerte) mapeados por dominio en
 * el repositorio del timeline.
 */
export type AnimalTimelineTipo =
  | "peso"
  | "pesaje"
  | "vacuna"
  | "vacunacion"
  | "servicio"
  | "palpacion"
  | "parto"
  | "produccion"
  | "condicion"
  | "revision"
  | "reubicacion"
  | "venta"
  | "muerte"
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

/**
 * Issue #156 (RF-ANIM-LIST-M v1.1, LM-001): contrato presentacional de la
 * card mobile. Espejo estructural del DTO #155 (`AnimalMobileRow`): el
 * servidor ya resuelve el texto legible (CA-UI-001) y packages/ui no importa
 * web/aplicacion. Las keys estables se mapean a las uniones del dominio en la
 * propia card para que el color/género de los badges siga en estado-badge.tsx.
 */
export interface AnimalMobileKeyLabel {
  readonly key: string
  readonly label: string
}

export interface AnimalMobileIdLabel {
  readonly id: string
  readonly label: string
}

export interface AnimalMobileMadre {
  readonly codigo: string
  readonly nombre: string | null
}

export interface AnimalMobileListItem {
  readonly id: string
  readonly codigo: string
  /** `''` si el animal no tiene nombre registrado (LM-002). */
  readonly nombre: string
  readonly sexo: AnimalMobileKeyLabel
  readonly raza: AnimalMobileIdLabel | null
  /** `null` cuando el valor almacenado es `no_aplica`, nulo o desconocido. */
  readonly categoriaReproductiva: AnimalMobileKeyLabel | null
  readonly salud: AnimalMobileKeyLabel
  readonly esDeMonta: boolean
  readonly propietario: AnimalMobileIdLabel | null
  /** `null` solo si no hay `codigo_madre` ni `madre_id`. */
  readonly madre: AnimalMobileMadre | null
  /** El DTO #155 aún no viaja con imagen; sin URL se muestra el placeholder. */
  readonly imagenPrincipalUrl?: string | null
}

// Issue #156: el DTO mobile viaja con keys estables; la card las traduce a las
// uniones del dominio para reutilizar CategoriaBadge/SaludBadge (#153).
const SEXO_POR_KEY: Readonly<Record<string, Sexo>> = {
  "0": "macho",
  "1": "hembra",
  "2": "pajuela",
}

const SALUD_POR_KEY: Readonly<Record<string, Salud>> = {
  "0": "sano",
  "1": "enfermo",
}

const CATEGORIA_REPRODUCTIVA_KEYS: ReadonlySet<string> = new Set<string>([
  "vacia",
  "servida",
  "prenada",
  "parida",
  "novilla",
  "no_aplica",
])

function aCategoriaReproductiva(key: string | undefined): CategoriaReproductiva | null {
  return key !== undefined && CATEGORIA_REPRODUCTIVA_KEYS.has(key)
    ? (key as CategoriaReproductiva)
    : null
}

/**
 * Issue #157 (RF-ANIM-LIST-M v1.1 §4, LM-005/006): chips de filtro rápido del
 * listado mobile. Todas/Preñadas/Enfermas son mutuamente excluyentes (Todas =
 * sin filtro); el propietario se combina con el chip activo (AND) y viaja por
 * id hacia el endpoint #155, nunca por label (LA-001/CA-UI-001).
 */
export type AnimalListMobileChipId = "todas" | "prenadas" | "enfermas"

export interface AnimalListMobilePropietarioOpcion {
  readonly id: string
  readonly label: string
}

export interface AnimalListMobileFiltrosProps {
  readonly chipActivo: AnimalListMobileChipId
  readonly onChip: (chip: AnimalListMobileChipId) => void
  readonly propietarioOpciones: readonly AnimalListMobilePropietarioOpcion[]
  /** Id del propietario seleccionado; `null` = todos los propietarios. */
  readonly propietarioId: string | null
  readonly onPropietario: (propietarioId: string | null) => void
  readonly busqueda: string
  readonly onBuscar: (texto: string) => void
  /** LM-008: total CON filtros para el contador anunciado con aria-live. */
  readonly total: number
  readonly onQuitarFiltros: () => void
  /** Feedback mínimo mientras llega la página 1 solicitada (#158 amplía). */
  readonly cargando?: boolean
}

/**
 * Issue #158 (LM-030): estados explícitos y distinguibles del listado
 * mobile. La ruta es dueña de la máquina de estados; packages/ui solo
 * renderiza el estado discriminado y dispara callbacks. `sin_acceso` y
 * `error` cargan su propia acción de recuperación para que cada estado sea
 * autocontenido (nunca se confunden entre sí).
 */
export type AnimalListMobileEstado =
  | { readonly tipo: "cargando_inicial" }
  | { readonly tipo: "listo" }
  | { readonly tipo: "sin_acceso"; readonly onVolver: () => void }
  | { readonly tipo: "error"; readonly onReintentar: () => void }

/** Issue #158 (LM-009): orquestación del scroll infinito (dueña: la ruta). */
export interface AnimalListMobileScrollInfinitoProps {
  readonly hayMas: boolean
  readonly cargandoMas: boolean
  readonly onCargarMas: () => void
}

export interface AnimalListMobileProps {
  animales: readonly AnimalMobileListItem[]
  selectedIds?: string[]
  canCreate?: boolean
  onPressAnimal: (animal: AnimalMobileListItem) => void
  onNuevoAnimal: () => void
  bottomNavItems: ItemNav[]
  /** Issue #157: sin `filtros` el listado conserva el modo SSR inicial. */
  filtros?: AnimalListMobileFiltrosProps
  /** Issue #158 (LM-030): estado discriminado; sin él, modo SSR #156/#157. */
  estado?: AnimalListMobileEstado
  /** Issue #158 (LM-009): scroll infinito — solo relevante en estado listo. */
  scrollInfinito?: AnimalListMobileScrollInfinitoProps
  /** Issue #158 (LM-030.3): total SIN filtros — finca vacía vs sin resultados. */
  totalSinFiltro?: number
}

const CHIPS_LISTADO_MOBILE: readonly {
  id: AnimalListMobileChipId
  label: string
}[] = [
  { id: "todas", label: "Todas" },
  { id: "prenadas", label: "Preñadas" },
  { id: "enfermas", label: "Enfermas" },
]

function ChipFiltro({
  activo,
  disabled = false,
  title,
  onClick,
  children,
}: {
  activo: boolean
  disabled?: boolean
  title?: string | undefined
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      {...(title ? { title } : {})}
      aria-pressed={activo}
      data-state={activo ? "active" : "inactive"}
      onClick={onClick}
      className={cn(
        // LM-005/LM-040: objetivo táctil mínimo vía token --h-touch (≥44px).
        "min-h-[--h-touch] shrink-0 rounded-full px-4 text-support font-medium transition-colors",
        activo ? "bg-primary text-primary-foreground" : "border bg-card",
        disabled && "opacity-50",
      )}
    >
      {children}
    </button>
  )
}

function FiltrosListadoMobile({
  filtros,
}: {
  filtros: AnimalListMobileFiltrosProps
}) {
  // LM-015: la apertura del selector es estado puramente presentacional.
  const [selectorAbierto, setSelectorAbierto] = useState(false)
  const sinPropietarios = filtros.propietarioOpciones.length === 0
  const propietarioSeleccionado =
    filtros.propietarioId !== null
      ? (filtros.propietarioOpciones.find((opcion) => opcion.id === filtros.propietarioId) ?? null)
      : null

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: the quick-filter chips are a toolbar-like button group, not a form fieldset; role=group matches the WAI-ARIA APG pattern. */}
      <div role="group" aria-label="Filtros rápidos" className="flex gap-2 overflow-x-auto pb-1">
        {CHIPS_LISTADO_MOBILE.map((chip) => (
          <ChipFiltro
            key={chip.id}
            activo={filtros.chipActivo === chip.id}
            onClick={() => filtros.onChip(chip.id)}
          >
            {chip.label}
          </ChipFiltro>
        ))}
        <ChipFiltro
          activo={propietarioSeleccionado !== null}
          disabled={sinPropietarios}
          title={sinPropietarios ? "Esta finca no tiene propietarios registrados" : undefined}
          onClick={() => setSelectorAbierto(true)}
        >
          <span className="flex items-center gap-1">
            {propietarioSeleccionado?.label ?? "Propietario"}
            <ChevronDown className="size-4" aria-hidden="true" />
          </span>
        </ChipFiltro>
      </div>

      {/* LM-008: contador discreto anunciado con aria-live="polite". */}
      <p aria-live="polite" className="text-support text-muted-foreground">
        {filtros.total} {filtros.total === 1 ? "animal" : "animales"}
      </p>

      {selectorAbierto && !sinPropietarios && (
        <div className="fixed inset-0 z-30">
          <button
            type="button"
            aria-label="Cerrar selector de propietario"
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelectorAbierto(false)}
          />
          {/* biome-ignore lint/a11y/useSemanticElements: bottom-sheet overlay following the WAI-ARIA APG dialog pattern; a native <dialog> would need showModal/top-layer management the presentational component must not own. */}
          <div
            role="dialog"
            aria-label="Filtrar por propietario"
            className="absolute inset-x-0 bottom-0 max-h-[60dvh] overflow-y-auto rounded-t-card border bg-card p-4 pb-[calc(var(--h-bottomnav)+16px)]"
          >
            <p className="text-section font-semibold mb-2">Propietario</p>
            <div className="space-y-1">
              <button
                type="button"
                className="min-h-[--h-touch] w-full rounded-control px-3 text-left text-support hover:bg-muted"
                onClick={() => {
                  filtros.onPropietario(null)
                  setSelectorAbierto(false)
                }}
              >
                Todos los propietarios
              </button>
              {filtros.propietarioOpciones.map((opcion) => (
                <button
                  key={opcion.id}
                  type="button"
                  className={cn(
                    "min-h-[--h-touch] w-full rounded-control px-3 text-left text-support hover:bg-muted",
                    opcion.id === filtros.propietarioId && "bg-primary text-primary-foreground",
                  )}
                  onClick={() => {
                    filtros.onPropietario(opcion.id)
                    setSelectorAbierto(false)
                  }}
                >
                  {opcion.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const SKELETONS_CARGA_INICIAL = 3

/** Placeholder con la anatomía de la card (imagen + texto), sin librerías. */
function CardSkeletonMobile() {
  return (
    <div className="rounded-card border bg-card p-3" aria-hidden="true">
      <div className="flex gap-3">
        <div className="size-16 shrink-0 animate-pulse rounded-control bg-muted" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}

/** Issue #158 (LM-030.1): loading inicial — skeletons con anuncio polite. */
function ListadoMobileCargandoInicial() {
  return (
    // <output> implica role="status" — el anuncio es una región live polite.
    <output className="block" data-testid="listado-mobile-skeletons">
      <span className="sr-only">Cargando animales…</span>
      <div className="space-y-2">
        {Array.from({ length: SKELETONS_CARGA_INICIAL }, (_, indice) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton slots are static placeholders
          <CardSkeletonMobile key={indice} />
        ))}
      </div>
    </output>
  )
}

/**
 * Issue #158 (LM-009/LM-040): pie del scroll infinito. Un centinela
 * observado con IntersectionObserver dispara `onCargarMas` al hacerse
 * visible — solo si `hayMas` y sin carga en vuelo (leídos del ref para no
 * duplicar peticiones). "Cargando más…" se anuncia en una región live
 * persistente. Sin IntersectionObserver (SSR) la lista no auto-carga.
 */
function PieScrollInfinito({
  scrollInfinito,
}: {
  scrollInfinito: AnimalListMobileScrollInfinitoProps
}) {
  const [centinela, setCentinela] = useState<HTMLDivElement | null>(null)
  const actual = useRef(scrollInfinito)
  actual.current = scrollInfinito

  // biome-ignore lint/correctness/useExhaustiveDependencies: las props vigentes se leen del ref `actual`; los campos primitivos re-observan al cambiar.
  useEffect(() => {
    if (centinela === null) return
    if (typeof IntersectionObserver === "undefined") return
    const observador = new IntersectionObserver((entradas) => {
      const vigente = actual.current
      if (!vigente.hayMas || vigente.cargandoMas) return
      if (entradas.some((entrada) => entrada.isIntersecting)) vigente.onCargarMas()
    })
    observador.observe(centinela)
    return () => observador.disconnect()
  }, [centinela, scrollInfinito.hayMas, scrollInfinito.cargandoMas])

  return (
    <div aria-live="polite" className="py-2 text-center text-support text-muted-foreground">
      {scrollInfinito.cargandoMas ? (
        <p>Cargando más…</p>
      ) : scrollInfinito.hayMas ? (
        <div
          ref={setCentinela}
          data-testid="centinela-scroll-infinito"
          aria-hidden="true"
          className="h-px"
        />
      ) : null}
    </div>
  )
}

/**
 * Issue #158 (LM-030.3/4) + #157 (LM-008): resolución del estado vacío —
 * sin resultados con filtros, finca vacía, o genérico.
 */
function EstadoVacioListadoMobile({
  hayFiltrosActivos,
  filtros,
  canCreate,
  onNuevoAnimal,
  totalSinFiltro,
}: {
  hayFiltrosActivos: boolean
  filtros: AnimalListMobileFiltrosProps | undefined
  canCreate: boolean
  onNuevoAnimal: () => void
  totalSinFiltro: number | undefined
}) {
  if (hayFiltrosActivos && filtros) {
    return (
      <EmptyState
        icon={PawPrint}
        title="Ningún animal coincide"
        description="Ajusta o quita los filtros para ver más resultados."
        actionLabel="Quitar filtro"
        onAction={filtros.onQuitarFiltros}
      />
    )
  }
  // LM-030.3: la finca no tiene animales — dedicado, con acción de alta.
  if (totalSinFiltro === 0) {
    return (
      <EmptyState
        icon={PawPrint}
        title="Aún no hay animales en esta finca"
        description="Registra tu primer animal para empezar a llevar el control del hato."
        {...(canCreate ? { actionLabel: "Registrar animal", onAction: onNuevoAnimal } : {})}
      />
    )
  }
  return (
    <EmptyState
      icon={PawPrint}
      title="No hay animales con estos filtros"
      description="Ajusta la búsqueda o registra un nuevo animal para esta finca."
      {...(canCreate ? { actionLabel: "Registrar animal", onAction: onNuevoAnimal } : {})}
    />
  )
}

/**
 * Contenido del listado mobile: estados distinguibles (LM-030), estado vacío
 * (LM-008) o cards (LM-001) + pie de scroll infinito (LM-009).
 */
function ContenidoListadoMobile({
  animales,
  selectedIds,
  canCreate,
  onPressAnimal,
  onNuevoAnimal,
  filtros,
  hayFiltrosActivos,
  estado,
  totalSinFiltro,
  scrollInfinito,
}: {
  animales: readonly AnimalMobileListItem[]
  selectedIds: string[]
  canCreate: boolean
  onPressAnimal: (animal: AnimalMobileListItem) => void
  onNuevoAnimal: () => void
  filtros: AnimalListMobileFiltrosProps | undefined
  hayFiltrosActivos: boolean
  estado: AnimalListMobileEstado | undefined
  totalSinFiltro: number | undefined
  scrollInfinito: AnimalListMobileScrollInfinitoProps | undefined
}) {
  // Issue #158 (LM-030): los estados explícitos tienen prioridad y nunca se
  // confunden con la lista ni con los estados vacíos.
  if (estado?.tipo === "cargando_inicial") return <ListadoMobileCargandoInicial />
  if (estado?.tipo === "sin_acceso") {
    return (
      <EmptyState
        icon={PawPrint}
        title="No tienes acceso a esta finca"
        description="Tu sesión no tiene permisos sobre esta finca. Regresa a un lugar seguro."
        actionLabel="Volver"
        onAction={estado.onVolver}
      />
    )
  }
  if (estado?.tipo === "error") {
    return (
      <EmptyState
        icon={PawPrint}
        title="Error al cargar los animales"
        description="No se pudo cargar el listado. Intenta de nuevo en unos momentos."
        actionLabel="Reintentar"
        onAction={estado.onReintentar}
      />
    )
  }

  if (animales.length === 0) {
    return (
      <EstadoVacioListadoMobile
        hayFiltrosActivos={hayFiltrosActivos}
        filtros={filtros}
        canCreate={canCreate}
        onNuevoAnimal={onNuevoAnimal}
        totalSinFiltro={totalSinFiltro}
      />
    )
  }
  return (
    <>
      <div
        className={cn("space-y-2", filtros?.cargando && "opacity-60")}
        aria-label="Lista de animales"
        {...(filtros?.cargando ? { "aria-busy": true } : {})}
      >
        {animales.map((animal) => (
          <AnimalResultCard
            key={animal.id}
            animal={animal}
            selected={selectedIds.includes(animal.id)}
            onPress={() => onPressAnimal(animal)}
          />
        ))}
      </div>
      {scrollInfinito && <PieScrollInfinito scrollInfinito={scrollInfinito} />}
    </>
  )
}

export function AnimalListMobile({
  animales,
  selectedIds = [],
  canCreate = true,
  onPressAnimal,
  onNuevoAnimal,
  bottomNavItems,
  filtros,
  estado,
  scrollInfinito,
  totalSinFiltro,
}: AnimalListMobileProps) {
  // Issue #157: con filtros activos el estado vacío ofrece quitarlos (LM-008).
  const hayFiltrosActivos =
    filtros !== undefined &&
    (filtros.chipActivo !== "todas" ||
      filtros.propietarioId !== null ||
      filtros.busqueda.trim() !== "")
  // LM-030.5: el acceso denegado se renderiza sin datos ni filtros previos.
  const sinAcceso = estado?.tipo === "sin_acceso"
  return (
    <section
      data-testid="op-frame-0185"
      aria-label="03 Animales · Mobile"
      className="min-h-[100dvh] w-full bg-background pb-[calc(var(--h-bottomnav)+16px)]"
    >
      <header className="h-14 border-b bg-card px-4 flex items-center justify-between">
        <PageHeader
          titulo="Animales"
          subtitulo="Listado operativo"
          acciones={
            canCreate ? (
              // LM-040: objetivo táctil mínimo 44×44px vía token --h-touch.
              <Button
                type="button"
                size="sm"
                className="min-h-[--h-touch] min-w-[--h-touch]"
                onClick={onNuevoAnimal}
                aria-label="Nuevo animal"
              >
                <Plus className="size-4" aria-hidden="true" />
              </Button>
            ) : undefined
          }
        />
      </header>

      <div className="p-4 space-y-3">
        {/* LM-005: los chips de filtro rápido quedan por encima de la lista. */}
        {filtros && !sinAcceso && <FiltrosListadoMobile filtros={filtros} />}

        {!sinAcceso && (
          <label className="min-h-[--h-touch] rounded-control border bg-card px-3 flex items-center gap-2">
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Buscar animal</span>
            {/* LM-007/LM-014: input controlado; el debounce vive en la ruta. */}
            <input
              className="min-w-0 flex-1 bg-transparent text-support outline-none placeholder:text-muted-foreground"
              placeholder="Buscar por código, nombre o arete"
              {...(filtros
                ? {
                    value: filtros.busqueda,
                    onChange: (evento) => filtros.onBuscar(evento.target.value),
                  }
                : {})}
            />
          </label>
        )}

        <ContenidoListadoMobile
          animales={animales}
          selectedIds={selectedIds}
          canCreate={canCreate}
          onPressAnimal={onPressAnimal}
          onNuevoAnimal={onNuevoAnimal}
          filtros={filtros}
          hayFiltrosActivos={hayFiltrosActivos}
          estado={estado}
          totalSinFiltro={totalSinFiltro}
          scrollInfinito={
            estado === undefined || estado.tipo === "listo" ? scrollInfinito : undefined
          }
        />
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

/**
 * Issue #156 (LM-001): jerarquía de la card mobile — identidad, naturaleza,
 * estado (badges) y procedencia. LM-002: nombre ausente → solo codigo (sin
 * relleno de guion); madre ausente → "Madre: sin registrar"; propietario nulo
 * → la línea se omite. LM-003: la card entera es un botón navegable por
 * teclado; el chevron es decorativo. La ubicación (potrero·lote) vive en la
 * ficha, no en la card.
 */
function AnimalResultCard({
  animal,
  selected,
  onPress,
}: {
  animal: AnimalMobileListItem
  selected: boolean
  onPress: () => void
}) {
  const sexo = SEXO_POR_KEY[animal.sexo.key]
  const salud = SALUD_POR_KEY[animal.salud.key]
  const categoria = aCategoriaReproductiva(animal.categoriaReproductiva?.key)
  const naturaleza = [animal.sexo.label, animal.raza?.label].filter(Boolean).join(" · ")
  const madre = animal.madre
    ? [animal.madre.codigo, animal.madre.nombre].filter(Boolean).join(" · ")
    : null
  const label = [animal.codigo, animal.nombre].filter(Boolean).join(" ")
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
          alt={`Foto principal de ${animal.nombre || animal.codigo}`}
          className="size-12 rounded-card object-cover border"
        />
      ) : (
        <span
          className="size-12 rounded-card bg-muted border grid place-items-center"
          aria-hidden="true"
        >
          <PawPrint className="size-5 text-muted-foreground" aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="text-section block truncate">
          <span className="font-semibold">{animal.codigo}</span>
          {animal.nombre && (
            <span className="font-normal text-muted-foreground"> {animal.nombre}</span>
          )}
        </span>
        <span className="text-caption text-muted-foreground block truncate">{naturaleza}</span>
        <span className="mt-1 flex flex-wrap gap-1.5">
          {categoria !== null && categoria !== "no_aplica" ? (
            <CategoriaBadge categoria={categoria} />
          ) : animal.esDeMonta ? (
            // Issue #153: macho de monta sin categoría reproductiva aplicable.
            <EstadoBadge variant="neutral">Reproductor</EstadoBadge>
          ) : null}
          {salud !== undefined ? (
            <SaludBadge salud={salud} {...(sexo !== undefined ? { sexo } : {})} />
          ) : (
            // Key corrupta: se anuncia la etiqueta del servidor sin inventar color.
            <EstadoBadge variant="neutral">{animal.salud.label}</EstadoBadge>
          )}
        </span>
        <span className="mt-2 block space-y-0.5 border-t border-border pt-1.5 text-caption text-muted-foreground">
          {animal.propietario && (
            <span className="block truncate">Propietario: {animal.propietario.label}</span>
          )}
          <span className="block truncate">
            {madre !== null ? `Madre: ${madre}` : "Madre: sin registrar"}
          </span>
        </span>
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
  /** Proyección enriquecida (slice 2). Todos los campos pueden faltar. */
  resumen?: AnimalFichaResumen
  canEdit?: boolean
  canCreateEvents?: boolean
  onVolverAListado?: () => void
  onEdit?: () => void
  onRegistrarEvento?: () => void
}

/** Etiquetas visibles del sexo para la línea de meta de la ficha. */
const SEXO_ETIQUETA: Record<Sexo, string> = {
  macho: "Macho",
  hembra: "Hembra",
  pajuela: "Pajuela",
}

/**
 * Edad en texto a partir de meses: <12 meses en meses, después en años con
 * un decimal es-CO (50 meses → "4,2 años"). Función pura — la edad la deriva
 * el dominio (slice 2); la UI solo formatea.
 */
export function formatearEdadMeses(meses: number): string {
  if (meses < 12) return `${meses} ${meses === 1 ? "mes" : "meses"}`
  const anos = Math.round((meses / 12) * 10) / 10
  if (Number.isInteger(anos)) return `${anos} ${anos === 1 ? "año" : "años"}`
  return `${formatearNumeroEsCO(anos, 1)} años`
}

/** Edad corta para el paréntesis de Nacimiento: "4,2 a" / "8 m". */
function formatearEdadCorta(meses: number): string {
  if (meses < 12) return `${meses} m`
  const anos = Math.round((meses / 12) * 10) / 10
  return Number.isInteger(anos) ? `${anos} a` : `${formatearNumeroEsCO(anos, 1)} a`
}

function formatearNumeroEsCO(valor: number, decimalesMax: number): string {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: decimalesMax }).format(valor)
}

/**
 * Meses cortos fijos: Intl es-CO produce "28 de jun de 2026" según la
 * versión de ICU; el diseño (f-400107) usa "28 jun 2026". Formateo
 * determinístico sobre UTC (las fechas ISO son UTC, sin desplazamiento).
 */
const MESES_CORTOS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const

/** ISO date → "28 jun" (sin año) o "28 jun 2026" (con año). */
function formatFechaCorta(fecha: string, conAnio: boolean): string {
  const date = new Date(fecha)
  const base = `${date.getUTCDate()} ${MESES_CORTOS_ES[date.getUTCMonth()]}`
  return conAnio ? `${base} ${date.getUTCFullYear()}` : base
}

/** Epoch seconds (UTC) → "12 mar 2022". */
function formatFechaEpoch(epochSegundos: number): string {
  const date = new Date(epochSegundos * 1000)
  return `${date.getUTCDate()} ${MESES_CORTOS_ES[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

/**
 * Línea de meta de la ficha: raza · sexo · edad · potrero · lote · grupo.
 * Los segmentos ausentes se omiten — nunca se fabrican valores.
 */
function construirLineaMeta(animal: AnimalListItem, resumen?: AnimalFichaResumen): string {
  const segmentos = [
    resumen?.raza ?? null,
    SEXO_ETIQUETA[animal.sexo],
    resumen?.edadMeses != null ? formatearEdadMeses(resumen.edadMeses) : null,
    animal.potrero ?? null,
    animal.lote ?? null,
    resumen?.grupo ?? null,
  ].filter((segmento): segmento is string => Boolean(segmento && segmento.trim().length > 0))
  return segmentos.join(" · ")
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

/**
 * Encabezado de la ficha de escritorio (redesign-ficha-animal, frame
 * f-400107): miga de pan al listado, título {codigo} · {nombre}, badges de
 * estado reproductivo y sanitario, línea de meta y acciones Editar /
 * + Registrar evento. Tolerante a nulos: los segmentos ausentes se omiten.
 */
export function AnimalFichaHeader({
  animal,
  resumen,
  canEdit = false,
  canCreateEvents = false,
  onVolverAListado,
  onEdit,
  onRegistrarEvento,
}: AnimalFichaHeaderProps) {
  const blocked = animal.estadoActual !== "activo"
  const titulo = [animal.codigoAnimal, animal.nombreAnimal].filter(Boolean).join(" · ")
  return (
    <header className="space-y-2">
      {blocked && (
        <output className="rounded-card border bg-info-100 text-info-600 p-3 text-support">
          Animal {animal.estadoActual === "muerto" ? "muerto" : animal.estadoActual} · la historia
          se conserva y las acciones de evento están ocultas
        </output>
      )}
      <nav
        aria-label="Miga de pan"
        className="flex items-center gap-1 text-support text-muted-foreground"
      >
        <button
          type="button"
          onClick={onVolverAListado}
          className="inline-flex min-h-[--h-touch] items-center gap-0.5 rounded-control px-1 font-medium text-primary hover:underline"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Animales
        </button>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{animal.codigoAnimal}</span>
      </nav>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-title font-semibold">{titulo}</h1>
          <div className="flex flex-wrap items-center gap-1.5">
            {animal.categoriaReproductiva && animal.categoriaReproductiva !== "no_aplica" && (
              <CategoriaBadge categoria={animal.categoriaReproductiva} />
            )}
            <SaludBadge salud={animal.salud} />
          </div>
          <p className="text-support text-muted-foreground">
            {construirLineaMeta(animal, resumen)}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {canEdit && (
            <Button type="button" variant="secondary" onClick={onEdit}>
              Editar
            </Button>
          )}
          {canCreateEvents && !blocked && (
            <Button type="button" onClick={onRegistrarEvento}>
              + Registrar evento
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

/**
 * Encabezado histórico de la ficha (foto + métricas). La ficha móvil queda
 * fuera del rediseño (canvas solo escritorio), así que conserva este
 * encabezado mientras llega su propio diseño.
 */
function AnimalFichaMobileHeader({
  animal,
  metrics,
  canEdit = false,
  canCreateEvents = false,
}: {
  animal: AnimalListItem
  metrics: { label: string; value: string; context?: string }[]
  canEdit?: boolean
  canCreateEvents?: boolean
}) {
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
  mode?: "desktop" | "mobile"
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
  tipoExplotacion?: readonly SelectOption[]
  lugarCompra?: readonly SelectOptionWithCreate[]
  madre?: readonly ComboboxOption[]
  padre?: readonly ComboboxOption[]
  potrero?: readonly SelectOption[]
  sector?: readonly SelectOption[]
  lote?: readonly SelectOption[]
  grupo?: readonly SelectOption[]
  hierro?: readonly SelectOption[]
  propietario?: readonly SelectOption[]
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
  hierroId?: string
  propietarioId?: string
  lugarCompraId?: string
  madreId?: string
  padreId?: string
  precioCompra?: string
  pesoCompra?: string
  comentarios?: string
  codigoArete?: string
  codigoRfid?: string
  tipoExplotacionId?: string
  tatuado?: boolean
  herrado?: boolean
  descornado?: boolean
  esDeMonta?: boolean
  numeroPezones?: number
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
  { value: "nacido_en_finca", label: "Finca" },
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
  { label: "Nombre", name: "nombre" },
  { label: "Nº de arete", name: "codigoArete" },
  { label: "Sexo *", name: "sexoKey" },
  { label: "Raza", name: "raza" },
  { label: "Fecha de nacimiento *", name: "fechaNacimiento" },
  { label: "Color", name: "color" },
  { label: "Calidad", name: "calidad" },
  { label: "Origen *", name: "origen" },
  { label: "RFID", name: "codigoRfid" },
  { label: "Tipo de explotación", name: "tipoExplotacionId" },
  { label: "Tatuado", name: "tatuado" },
  { label: "Herrado", name: "herrado" },
  { label: "Descornado", name: "descornado" },
  { label: "Es de monta", name: "esDeMonta" },
  { label: "Nº de pezones", name: "numeroPezones" },
  { label: "Hierro", name: "hierroId" },
  { label: "Propietario", name: "propietarioId" },
]

const LOCATION_FIELDS: readonly (AnimalFormField & {
  optionsKey: keyof AnimalFormCatalogOptions
})[] = [
  { label: "Potrero", name: "potreroId", optionsKey: "potrero" },
  { label: "Sector", name: "sectorId", optionsKey: "sector" },
  { label: "Lote", name: "loteId", optionsKey: "lote" },
  { label: "Grupo", name: "grupoId", optionsKey: "grupo" },
]

/**
 * Subscribes to a CSS media query and returns whether it currently matches.
 * SSR-safe: defaults to `true` (desktop) so the server markup agrees with
 * the first client render. The existing `isHydrated` gate in
 * `AnimalFormScreen` suppresses any brief mismatch before the effect runs.
 */
function useMatchMedia(query: string): boolean {
  const [matches, setMatches] = useState(true)

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const mql = window.matchMedia(query)
    setMatches(mql.matches)
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [query])

  return matches
}

function useAnimalForm({
  mode,
  initialValues,
  catalogOptions,
  currentAnimalId,
  onOrigenChange,
  onSave,
  isSubmitting = false,
}: {
  mode?: "desktop" | "mobile" | undefined
  initialValues?: AnimalFormInitialValues | undefined
  catalogOptions?: AnimalFormCatalogOptions | undefined
  currentAnimalId?: string | undefined
  onOrigenChange?: ((origen: OrigenKey) => void) | undefined
  onSave: (formData: FormData) => void | Promise<void>
  isSubmitting?: boolean | undefined
}) {
  const mediaMatches = useMatchMedia("(min-width: 768px)")
  const mobile = mode === "mobile" || (mode === undefined && !mediaMatches)
  const initialOrigen: OrigenKey =
    initialValues?.origen === "comprado" ? "comprado" : "nacido_en_finca"
  const [origen, setOrigen] = useState<OrigenKey>(initialOrigen)
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

  // WU-5: mobile shows ALL the same fields as desktop (same JSX, cn()-driven layout).
  // No field filter — the spec requires parity (§3.5.6, issue #59).
  const fields = FORM_FIELDS
  const formId = `animal-form-${currentAnimalId ?? "new"}`
  const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return
    const form = event.currentTarget
    void onSave(new FormData(form))
  }
  const isComprado = origen === "comprado"

  return {
    mobile,
    origen,
    origenFlipCount,
    fechaNacimiento,
    fechaCompra,
    comentarios,
    isHydrated,
    useComboboxOrigen,
    handleOrigenChange,
    handleEstimar,
    fields,
    formId,
    submitForm,
    isComprado,
    setFechaNacimiento,
    setFechaCompra,
    setComentarios,
  }
}

function CompradoFields({
  fechaCompra,
  fechaNacimiento,
  setFechaCompra,
  initialValues,
  catalogOptions,
  fieldErrors,
}: {
  fechaCompra: string
  fechaNacimiento: string
  setFechaCompra: (value: string) => void
  initialValues?: AnimalFormInitialValues | undefined
  catalogOptions?: AnimalFormCatalogOptions | undefined
  fieldErrors?: Record<string, string> | undefined
}) {
  return (
    // CA-UI-022 · Comprado: Fecha compra · Precio / Peso compra · Lugar
    <>
      <FechaCompraField
        value={fechaCompra}
        minDate={fechaNacimiento ? new Date(`${fechaNacimiento}T00:00:00`) : undefined}
        onChange={setFechaCompra}
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

function FincaFields({
  initialValues,
  catalogOptions,
  currentAnimalId,
  fieldErrors,
}: {
  initialValues?: AnimalFormInitialValues | undefined
  catalogOptions?: AnimalFormCatalogOptions | undefined
  currentAnimalId?: string | undefined
  fieldErrors?: Record<string, string> | undefined
}) {
  return (
    // CA-UI-022 · Finca: Madre · Padre
    <>
      <ComboboxField
        label="Madre"
        name="madreId"
        options={catalogOptions?.madre ?? []}
        defaultValue={initialValues?.madreId}
        excludedIds={currentAnimalId ? [currentAnimalId] : []}
        fieldErrors={fieldErrors}
      />
      <ComboboxField
        label="Padre"
        name="padreId"
        options={catalogOptions?.padre ?? []}
        defaultValue={initialValues?.padreId}
        fieldErrors={fieldErrors}
      />
    </>
  )
}

function OrigenSection({
  formVariant,
  mobile,
  origen,
  isComprado,
  fechaCompra,
  fechaNacimiento,
  setFechaCompra,
  initialValues,
  catalogOptions,
  currentAnimalId,
  fieldErrors,
  ctx,
}: {
  formVariant: AnimalFormVariant
  mobile: boolean
  origen: OrigenKey
  isComprado: boolean
  fechaCompra: string
  fechaNacimiento: string
  setFechaCompra: (value: string) => void
  initialValues?: AnimalFormInitialValues | undefined
  catalogOptions?: AnimalFormCatalogOptions | undefined
  currentAnimalId?: string | undefined
  fieldErrors?: Record<string, string> | undefined
  ctx: RenderFieldContext
}) {
  return (
    <section aria-labelledby="origen-heading">
      <h2
        id="origen-heading"
        className="text-caption font-semibold uppercase tracking-wide text-muted-foreground mt-6 mb-2"
      >
        ORIGEN
      </h2>
      <div className={cn("gap-3", mobile ? "space-y-3" : "flex items-start gap-3")}>
        <div className={mobile ? "w-full" : "w-[260px] shrink-0"}>
          {renderFieldByName("origen", ctx)}
        </div>
        {formVariant !== "delete" ? (
          // CA-UI-021 · Panel contenedor — único hijo, remontado por key={origen}
          // CA-UI-023 · Altura estable: min-h-[160px] cubre el modo más alto (2 filas)
          <div
            key={origen}
            className={cn(
              "rounded-card bg-muted p-4 grid gap-3 flex-1 min-h-[160px]",
              mobile ? "grid-cols-1" : "grid-cols-[1fr_1fr]",
            )}
          >
            {isComprado ? (
              <CompradoFields
                fechaCompra={fechaCompra}
                fechaNacimiento={fechaNacimiento}
                setFechaCompra={setFechaCompra}
                initialValues={initialValues}
                catalogOptions={catalogOptions}
                fieldErrors={fieldErrors}
              />
            ) : (
              <FincaFields
                initialValues={initialValues}
                catalogOptions={catalogOptions}
                currentAnimalId={currentAnimalId}
                fieldErrors={fieldErrors}
              />
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function FormFooter({
  mobile,
  isOnline,
  isSubmitting,
  onCancel,
}: {
  mobile: boolean
  isOnline: boolean
  isSubmitting: boolean
  onCancel: () => void
}) {
  return (
    <footer
      data-sticky-save="true"
      className={cn(
        "border-t bg-card p-4 flex items-center gap-2 z-40",
        mobile
          ? "fixed inset-x-0 bottom-0 min-h-20"
          : "-mx-4 -mb-4 border-x border-b rounded-b-card justify-end",
      )}
    >
      {!isOnline && (
        <p className="mr-auto text-caption text-info-600">Se sincronizará al recuperar señal</p>
      )}
      {!mobile && (
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
      )}
      {/*
            PR 2a (CA-UI-006): "min-w-[120px]" preserves button width when
            the label flips between "Guardar" and "Guardando…".
          */}
      <Button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className={cn("min-w-[120px]", mobile && "w-full")}
      >
        {isSubmitting ? "Guardando…" : mobile ? "Guardar animal" : "Guardar"}
      </Button>
    </footer>
  )
}

function renderFieldByName(name: string, context: RenderFieldContext): React.ReactNode {
  const fieldDef =
    FORM_FIELDS.find((f) => f.name === name) ?? LOCATION_FIELDS.find((f) => f.name === name)
  if (!fieldDef) return null
  return renderAnimalFormField(fieldDef, context)
}

function UbicacionSection({
  formVariant,
  currentLocation,
  initialValues,
  fieldErrors,
  mobile,
  ctx,
}: {
  formVariant: AnimalFormVariant
  currentLocation?: AnimalCurrentLocation | undefined
  initialValues?: AnimalFormInitialValues | undefined
  fieldErrors?: Record<string, string> | undefined
  mobile: boolean
  ctx: RenderFieldContext
}) {
  // ─── UBICACIÓN collapsible state (CA-UI-019 / CA-UI-020) ───
  const ubicacionHasValues = useMemo(() => {
    if (formVariant === "edit" && currentLocation) {
      return Boolean(
        currentLocation.potrero ||
          currentLocation.sector ||
          currentLocation.lote ||
          currentLocation.grupo,
      )
    }
    if (!initialValues) return false
    return Boolean(
      initialValues.potreroId ||
        initialValues.sectorId ||
        initialValues.loteId ||
        initialValues.grupoId,
    )
  }, [formVariant, currentLocation, initialValues])

  const ubicacionSummary = useMemo(() => {
    if (formVariant === "edit" && currentLocation) {
      const parts = [
        currentLocation.potrero,
        currentLocation.sector,
        currentLocation.lote,
        currentLocation.grupo,
      ].filter(Boolean)
      return parts.length > 0 ? parts.join(" · ") : "sin asignar"
    }
    return "sin asignar"
  }, [formVariant, currentLocation])

  const ubicacionFieldErrors = useMemo(() => {
    if (!fieldErrors) return {}
    const locNames = ["potreroId", "sectorId", "loteId", "grupoId"]
    const result: Record<string, string> = {}
    for (const name of locNames) {
      if (fieldErrors[name]) result[name] = fieldErrors[name]
    }
    return result
  }, [fieldErrors])

  const [ubicacionOpen, setUbicacionOpen] = useState(
    formVariant === "edit" ? ubicacionHasValues : false,
  )

  // Force open UBICACIÓN when a location field has a validation error (CA-UI-020 → CA-UI-010)
  useEffect(() => {
    if (Object.keys(ubicacionFieldErrors).length > 0 && !ubicacionOpen) {
      setUbicacionOpen(true)
      const firstErrorName = Object.keys(ubicacionFieldErrors)[0]
      if (firstErrorName) {
        const el = document.getElementsByName(firstErrorName)[0]
        if (el) {
          el.scrollIntoView({ block: "nearest" })
        }
      }
    }
  }, [ubicacionFieldErrors, ubicacionOpen])

  return (
    <Collapsible open={ubicacionOpen} onOpenChange={setUbicacionOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full text-left text-caption font-semibold uppercase tracking-wide text-muted-foreground mt-6 mb-2 py-0 flex items-center gap-2"
        >
          <span aria-hidden="true">{ubicacionOpen ? "▾" : "▸"}</span>
          Ubicación
          <span className="text-caption text-muted-foreground font-normal normal-case">
            · {ubicacionSummary}
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent forceMount className="pt-2 data-[state=closed]:hidden">
        {formVariant === "create" ? (
          // CA-UI-019: 2 dropdowns por fila (1fr 1fr), no 4 en una fila
          <div className={cn("grid gap-3", mobile ? "grid-cols-1" : "grid-cols-[1fr_1fr]")}>
            {LOCATION_FIELDS.map((field) => renderFieldByName(field.name, ctx))}
          </div>
        ) : (
          renderCurrentLocation(currentLocation)
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

function DetallesAdicionalesSection({
  formVariant,
  initialValues,
  fieldErrors,
  mobile,
  ctx,
  comentarios,
  setComentarios,
}: {
  formVariant: AnimalFormVariant
  initialValues?: AnimalFormInitialValues | undefined
  fieldErrors?: Record<string, string> | undefined
  mobile: boolean
  ctx: RenderFieldContext
  comentarios: string
  setComentarios: React.Dispatch<React.SetStateAction<string>>
}) {
  // ─── Collapsible "Detalles adicionales" state machine ───
  const hasDetailData = useMemo(() => {
    if (formVariant !== "edit" || !initialValues) return false
    const sexoKey = initialValues.sexoKey ?? 1
    return Array.from(DETAIL_FIELD_NAMES).some((name) => {
      if (name === "esDeMonta" && sexoKey !== 0) return false
      const val = initialValues[name as keyof AnimalFormInitialValues]
      if (val === undefined || val === null || val === "" || val === false) return false
      return true
    })
  }, [formVariant, initialValues])

  const detailCount = useMemo(() => {
    if (!initialValues) return 0
    const sexoKey = initialValues.sexoKey ?? 1
    return Array.from(DETAIL_FIELD_NAMES).reduce((count, name) => {
      if (name === "esDeMonta" && sexoKey !== 0) return count
      const val = initialValues[name as keyof AnimalFormInitialValues]
      if (val === undefined || val === null || val === "" || val === false) return count
      return count + 1
    }, 0)
  }, [initialValues])

  const detailFieldErrors = useMemo(() => {
    if (!fieldErrors) return {}
    const result: Record<string, string> = {}
    for (const name of DETAIL_FIELD_NAMES) {
      if (fieldErrors[name]) result[name] = fieldErrors[name]
    }
    return result
  }, [fieldErrors])

  const [collapsibleOpen, setCollapsibleOpen] = useState(formVariant === "edit" && hasDetailData)

  // Force open when a detail field has a validation error (CA-UI-010)
  useEffect(() => {
    if (Object.keys(detailFieldErrors).length > 0 && !collapsibleOpen) {
      setCollapsibleOpen(true)
      const firstErrorName = Object.keys(detailFieldErrors)[0]
      if (firstErrorName) {
        const el = document.getElementsByName(firstErrorName)[0]
        if (el) {
          el.scrollIntoView({ block: "nearest" })
        }
      }
    }
  }, [detailFieldErrors, collapsibleOpen])

  const sexoKey = initialValues?.sexoKey ?? 1
  const showEsDeMonta = sexoKey === 0

  return (
    <Collapsible open={collapsibleOpen} onOpenChange={setCollapsibleOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full text-left text-caption font-semibold uppercase tracking-wide text-muted-foreground mt-6 mb-2 py-0 flex items-center gap-2"
        >
          <span aria-hidden="true">{collapsibleOpen ? "▾" : "▸"}</span>
          Detalles adicionales
          {detailCount > 0 && (
            <span className="text-caption text-muted-foreground font-normal normal-case">
              · {detailCount} con datos
            </span>
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent forceMount className="space-y-4 pt-2 pb-4 data-[state=closed]:hidden">
        {/* Row 1: RFID + Tipo explotación + Propietario + Hierro */}
        <div className={cn("grid gap-3", mobile ? "grid-cols-1" : "grid-cols-[1fr_1fr]")}>
          {renderFieldByName("codigoRfid", ctx)}
          {renderFieldByName("tipoExplotacionId", ctx)}
          {renderFieldByName("propietarioId", ctx)}
          {renderFieldByName("hierroId", ctx)}
        </div>

        {/* Row 2: Nº pezones */}
        <div className={cn("grid gap-3", mobile ? "grid-cols-1" : "grid-cols-[1fr_1fr]")}>
          {renderFieldByName("numeroPezones", ctx)}
        </div>

        {/* Row 3: Switches row */}
        <div className="flex flex-wrap gap-4">
          {renderFieldByName("tatuado", ctx)}
          {renderFieldByName("herrado", ctx)}
          {renderFieldByName("descornado", ctx)}
          {showEsDeMonta ? renderFieldByName("esDeMonta", ctx) : null}
        </div>

        {/* Row 4: Comentarios full-width */}
        <Field
          key="comentarios"
          label="Comentarios"
          name="comentarios"
          value={comentarios}
          onChange={setComentarios}
          fieldErrors={fieldErrors}
        />
      </CollapsibleContent>
    </Collapsible>
  )
}

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
  const {
    mobile,
    origen,
    fechaNacimiento,
    fechaCompra,
    comentarios,
    isHydrated,
    useComboboxOrigen,
    handleOrigenChange,
    handleEstimar,
    formId,
    submitForm,
    isComprado,
    setFechaNacimiento,
    setFechaCompra,
    setComentarios,
  } = useAnimalForm({
    mode,
    initialValues,
    catalogOptions,
    currentAnimalId,
    onOrigenChange,
    onSave,
    isSubmitting,
  })

  const ctx: RenderFieldContext = {
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
    mobile,
  }

  // CA-UI-005: sync hint is offline-only
  const isOnline = useOnlineStatus()

  return (
    <section
      data-testid={mobile ? "op-f-400233" : "op-f-400191"}
      aria-label={mobile ? "21 Nuevo Animal · Mobile" : "20 Nuevo Animal · Desktop"}
      className={cn("bg-background", mobile ? "w-full min-h-[100dvh]" : "min-h-[900px] p-8")}
    >
      <header
        className={cn(
          "h-14 border-b bg-card px-4 flex items-center",
          !mobile && "max-w-[720px] mx-auto rounded-t-card border w-full",
          mobile && "justify-between",
        )}
      >
        <h1 className="text-title font-semibold">Nuevo animal</h1>
        {mobile && (
          <Button type="button" variant="ghost" size="icon" aria-label="Cerrar" onClick={onCancel}>
            <X className="size-5" />
          </Button>
        )}
      </header>
      <form
        id={formId}
        onSubmit={submitForm}
        aria-busy={!isHydrated || isSubmitting}
        className={cn(
          "bg-card border-x p-4 space-y-6",
          mobile ? "pb-28" : "max-w-[720px] mx-auto border rounded-b-card w-full",
        )}
      >
        <fieldset disabled={!isHydrated || isSubmitting} className="contents">
          <input type="hidden" name="versionLeida" value="1" />

          {/* ─── IDENTIFICACIÓN ─── */}
          <section aria-labelledby="identificacion-heading">
            <h2
              id="identificacion-heading"
              className="text-caption font-semibold uppercase tracking-wide text-muted-foreground mt-6 mb-2"
            >
              IDENTIFICACIÓN
            </h2>
            <div className={cn("grid gap-3", mobile ? "grid-cols-1" : "grid-cols-[1fr_1.4fr_1fr]")}>
              {renderFieldByName("codigo", ctx)}
              {renderFieldByName("nombre", ctx)}
              {renderFieldByName("codigoArete", ctx)}
            </div>
          </section>

          {/* ─── CARACTERÍSTICAS ─── */}
          <section aria-labelledby="caracteristicas-heading">
            <h2
              id="caracteristicas-heading"
              className="text-caption font-semibold uppercase tracking-wide text-muted-foreground mt-6 mb-2"
            >
              CARACTERÍSTICAS
            </h2>
            <div className={cn("grid gap-3", mobile ? "grid-cols-1" : "grid-cols-[1fr_1fr_1.2fr]")}>
              {renderFieldByName("sexoKey", ctx)}
              {renderFieldByName("raza", ctx)}
              {renderFieldByName("fechaNacimiento", ctx)}
            </div>
            <div className={cn("grid gap-3 mt-3", mobile ? "grid-cols-1" : "grid-cols-[1fr_1fr]")}>
              {renderFieldByName("color", ctx)}
              {renderFieldByName("calidad", ctx)}
            </div>
          </section>

          {/* ─── ORIGEN ─── */}
          <OrigenSection
            formVariant={formVariant}
            mobile={mobile}
            origen={origen}
            isComprado={isComprado}
            fechaCompra={fechaCompra}
            fechaNacimiento={fechaNacimiento}
            setFechaCompra={setFechaCompra}
            initialValues={initialValues}
            catalogOptions={catalogOptions}
            currentAnimalId={currentAnimalId}
            fieldErrors={fieldErrors}
            ctx={ctx}
          />

          {/* ─── UBICACIÓN (Collapsible, CA-UI-019/020) ─── */}
          <UbicacionSection
            formVariant={formVariant}
            currentLocation={currentLocation}
            initialValues={initialValues}
            fieldErrors={fieldErrors}
            mobile={mobile}
            ctx={ctx}
          />

          {mobile && (
            <p className="rounded-card bg-info-100 text-info-600 p-3 text-support">
              ¿No encuentras la raza? Créala sin salir del formulario.
            </p>
          )}

          {/* ─── DETALLES ADICIONALES (Collapsible) ─── */}
          <DetallesAdicionalesSection
            formVariant={formVariant}
            initialValues={initialValues}
            fieldErrors={fieldErrors}
            mobile={mobile}
            ctx={ctx}
            comentarios={comentarios}
            setComentarios={setComentarios}
          />

          <FormFooter
            mobile={mobile}
            isOnline={isOnline}
            isSubmitting={isSubmitting}
            onCancel={onCancel}
          />
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
  mobile: boolean
}

type FieldRenderer = (field: AnimalFormField, ctx: RenderFieldContext) => React.ReactNode

function renderSexoField(field: AnimalFormField, ctx: RenderFieldContext) {
  const { initialValues, catalogOptions, fieldErrors } = ctx
  const sexo = catalogOptions?.sexo ?? []

  // CA-UI-025: Sexo uses dropdown on BOTH desktop and mobile.
  return (
    <CatalogSelectField
      key={field.name}
      label={field.label}
      name={field.name}
      defaultValue={
        sexo.some((option) => option.value === "1")
          ? String(initialValues?.sexoKey ?? 1)
          : undefined
      }
      options={sexo}
      disabledWhenEmpty
      fieldErrors={fieldErrors}
    />
  )
}

function renderOrigenField(field: AnimalFormField, ctx: RenderFieldContext) {
  const {
    initialValues,
    catalogOptions,
    handleOrigenChange,
    useComboboxOrigen,
    origen,
    fieldErrors,
  } = ctx
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

function renderFechaNacimientoField(field: AnimalFormField, ctx: RenderFieldContext) {
  const { fechaNacimiento, setFechaNacimiento, handleEstimar, fieldErrors } = ctx
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

function renderCatalogWithCreateField(field: AnimalFormField, ctx: RenderFieldContext) {
  const { initialValues, catalogOptions, fieldErrors } = ctx
  const name = field.name as "raza" | "color" | "calidad"
  return (
    <SelectConCreacionField
      key={name}
      label={field.label}
      name={name}
      options={(catalogOptions?.[name] as readonly SelectOption[] | undefined) ?? []}
      canCreate={
        name === "calidad"
          ? false
          : (catalogOptions?.canCreateCatalog?.[name as "raza" | "color"] ?? false)
      }
      defaultValue={
        (initialValues as Record<string, string | undefined> | undefined)?.[`${name}Id`] ??
        undefined
      }
      fieldErrors={fieldErrors}
    />
  )
}

function renderLugarCompraField(field: AnimalFormField, ctx: RenderFieldContext) {
  const { initialValues, catalogOptions, fieldErrors } = ctx
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

function renderLocationField(field: AnimalFormField, ctx: RenderFieldContext) {
  const { initialValues, catalogOptions, fieldErrors } = ctx
  const locationField = LOCATION_FIELDS.find((location) => location.name === field.name)
  if (!locationField) return null
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

function renderHierroField(field: AnimalFormField, ctx: RenderFieldContext) {
  const { initialValues, catalogOptions, fieldErrors } = ctx
  return (
    <CatalogSelectField
      key={field.name}
      label={field.label}
      name={field.name}
      defaultValue={initialValues?.hierroId}
      options={(catalogOptions?.hierro ?? []) as readonly SelectOption[]}
      fieldErrors={fieldErrors}
    />
  )
}

function renderTipoExplotacionField(field: AnimalFormField, ctx: RenderFieldContext) {
  const { initialValues, catalogOptions, fieldErrors } = ctx
  return (
    <CatalogSelectField
      key={field.name}
      label={field.label}
      name={field.name}
      defaultValue={initialValues?.tipoExplotacionId}
      options={(catalogOptions?.tipoExplotacion ?? []) as readonly SelectOption[]}
      fieldErrors={fieldErrors}
    />
  )
}

function renderPropietarioField(field: AnimalFormField, ctx: RenderFieldContext) {
  const { initialValues, catalogOptions, fieldErrors } = ctx
  return (
    <CatalogSelectField
      key={field.name}
      label={field.label}
      name={field.name}
      defaultValue={initialValues?.propietarioId}
      options={(catalogOptions?.propietario ?? []) as readonly SelectOption[]}
      fieldErrors={fieldErrors}
    />
  )
}

function renderBooleanField(field: AnimalFormField, ctx: RenderFieldContext) {
  const { initialValues, fieldErrors } = ctx
  const defaultValue = initialValues?.[field.name as keyof AnimalFormInitialValues]
  const checked = defaultValue === true || defaultValue === "true"
  const id = field.label.toLowerCase().replace(/[^a-z0-9]+/gi, "-")
  const errorId = `${id}-error`
  const errorMessage = fieldErrors?.[field.name]

  return (
    <div className="space-y-1.5" key={field.name}>
      <Label htmlFor={id}>{field.label}</Label>
      <div className="flex items-center gap-2 min-h-[--h-touch]">
        <input type="hidden" name={field.name} value={checked ? "true" : "false"} />
        <button
          type="button"
          id={id}
          role="switch"
          aria-checked={checked}
          onClick={(e) => {
            const hidden = (e.currentTarget.parentElement as HTMLElement).querySelector(
              "input[type=hidden]",
            ) as HTMLInputElement
            const next = hidden.value !== "true"
            hidden.value = String(next)
            ;(e.currentTarget as HTMLElement).setAttribute("aria-checked", String(next))
            e.currentTarget.classList.toggle("bg-primary", next)
            e.currentTarget.classList.toggle("bg-input", !next)
          }}
          className={`h-6 w-11 rounded-full border-2 border-transparent transition-colors ${
            checked ? "bg-primary" : "bg-input"
          }`}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-background shadow-sm transition-transform ${
              checked ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
      {errorMessage ? (
        <p id={errorId} role="alert" className="text-caption text-danger-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

function renderNumericFormField(field: AnimalFormField, ctx: RenderFieldContext) {
  const { initialValues, fieldErrors } = ctx
  const defaultValue =
    initialValues?.[field.name as keyof AnimalFormInitialValues]?.toString() ?? ""
  return (
    <NumericField
      key={field.name}
      label={field.label}
      name={field.name}
      defaultValue={defaultValue}
      fieldErrors={fieldErrors}
    />
  )
}

const FIELD_RENDERERS: Record<string, FieldRenderer> = {
  sexoKey: renderSexoField,
  origen: renderOrigenField,
  fechaNacimiento: renderFechaNacimientoField,
  raza: renderCatalogWithCreateField,
  color: renderCatalogWithCreateField,
  calidad: renderCatalogWithCreateField,
  lugarCompra: renderLugarCompraField,
  potreroId: renderLocationField,
  sectorId: renderLocationField,
  loteId: renderLocationField,
  grupoId: renderLocationField,
  hierroId: renderHierroField,
  propietarioId: renderPropietarioField,
  tipoExplotacionId: renderTipoExplotacionField,
  tatuado: renderBooleanField,
  herrado: renderBooleanField,
  descornado: renderBooleanField,
  esDeMonta: renderBooleanField,
  numeroPezones: renderNumericFormField,
}

function renderAnimalFormField(field: AnimalFormField, ctx: RenderFieldContext) {
  const renderer = FIELD_RENDERERS[field.name]
  if (renderer) return renderer(field, ctx)
  return <Field key={field.name} {...field} fieldErrors={ctx.fieldErrors} />
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
        <Label htmlFor={id} className="text-support font-normal text-muted-foreground">
          {label.replace(/\s\*$/, "")}
          {label.endsWith(" *") && <span className="text-danger"> *</span>}
        </Label>
        <Input
          id={id}
          name={name}
          required={required}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 min-h-[--h-touch]"
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
      <Label htmlFor={id} className="text-support font-normal text-muted-foreground">
        {label.replace(/\s\*$/, "")}
        {label.endsWith(" *") && <span className="text-danger"> *</span>}
      </Label>
      <Input
        id={id}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="h-10 min-h-[--h-touch]"
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
  required = false,
  fieldErrors,
}: {
  label: string
  name: string
  defaultValue?: string | undefined
  options: readonly SelectOption[]
  disabledWhenEmpty?: boolean
  required?: boolean
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
    : hasDefaultLabel || !defaultValue
      ? options
      : [{ value: defaultValue, label }, ...options]
  const selectProps = unavailable
    ? {}
    : defaultValue === undefined
      ? { name }
      : { name, defaultValue }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      <Select {...selectProps}>
        <SelectTrigger
          id={id}
          disabled={unavailable}
          className="min-h-[--h-touch]"
          aria-required={required ? "true" : undefined}
          {...triggerProps}
        >
          {unavailable ? label : <SelectValue placeholder={label} />}
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
    <div className="space-y-1.5">
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
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <DatePicker
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        maxDate={new Date()}
        footerChildren={<EstimarPorEdadInline onApply={onEstimar} />}
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
 * Inline "Estimar por edad" link rendered inside the DatePicker popover
 * footer (CA-UI-013). Shows a text link that toggles to an age input +
 * Aplicar button. Applying sets the estimated date via onApply.
 */
function EstimarPorEdadInline({ onApply }: { onApply: (iso: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [age, setAge] = useState("3")

  if (!editing) {
    return (
      <button
        type="button"
        className="text-caption text-primary underline-offset-2 hover:underline"
        onClick={() => setEditing(true)}
      >
        ¿No sabes la fecha? Estimar por edad
      </button>
    )
  }

  const handleApply = () => {
    const years = Number.parseInt(age, 10)
    if (Number.isFinite(years) && years >= 0) {
      const estimated = new Date()
      estimated.setFullYear(estimated.getFullYear() - years)
      onApply(format(estimated, "yyyy-MM-dd"))
    }
    setEditing(false)
  }

  return (
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
        <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleApply}>
          Aplicar
        </Button>
      </div>
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
 * PR 2a — SelectConCreacion wrapper.
 *
 * The v1.3 catalog selectors (`raza`, `color`, `calidad`, `lugarCompra`)
 * all share the same shape: Label + SelectConCreacion trigger + alert.
 * `canCreate` is gated on `canCreateCatalog` from the form props.
 *
 * BUG-001 fix: the field is now controlled via internal state. The previous
 * uncontrolled pattern had a no-op onChange, which meant the hidden native
 * input (rendered by SelectConCreacion) never updated after selection. With
 * controlled state, onSelect writes to `selectedValue`, and both the trigger
 * label and the hidden input reflect the chosen option.
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
  const [selectedValue, setSelectedValue] = useState<string | null>(defaultValue ?? null)
  const placeholder = label
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <SelectConCreacion
        id={id}
        name={name}
        options={options}
        value={selectedValue}
        onChange={(next) => setSelectedValue(next)}
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
  const [value, setValue] = useState<string | null>(defaultValue ?? null)
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <ComboboxBuscable
        id={id}
        name={name}
        options={options}
        value={value}
        onChange={(next) => setValue(next)}
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
 * Formats the raw digits+comma input into es-CO display format
 * (`.` thousand separator, `,` decimal separator). Returns the
 * formatted string and the cursor adjustment delta needed to keep
 * the caret in the same logical position.
 *
 * Examples:
 *   "1500"     → "1.500"
 *   "1500,75"  → "1.500,75"
 *   "1000000"  → "1.000.000"
 */
function formatEsCONumeric(raw: string): string {
  // 1. Strip everything except digits and comma; keep only the first comma
  const cleaned = raw.replace(/[^\d,]/g, "")
  const commaIdx = cleaned.indexOf(",")
  const integer = commaIdx === -1 ? cleaned : cleaned.slice(0, commaIdx)
  const decimal =
    commaIdx === -1
      ? ""
      : cleaned
          .slice(commaIdx + 1)
          .replace(/,/g, "")
          .slice(0, 2)

  // 2. Format integer part with dots as thousand separators
  const formattedInt = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".")

  // 3. Reconstruct
  if (commaIdx === -1) return formattedInt || ""
  return `${formattedInt},${decimal}`
}

/**
 * PR 2a — Numeric input wrapper.
 *
 * `precio_compra` / `peso_compra` are numeric inputs in the form that
 * accept es-CO formatting (`.` thousand separator, `,` decimal separator).
 *
 * The input uses `inputMode="decimal"` to show the numeric keypad on mobile
 * and strips any character that is not a digit or comma via a client-side
 * `onInput` filter. Thousand separators are automatically inserted as the
 * user types with cursor-position preservation. Server-side `parseEsCONumber`
 * normalises the submitted value into a JavaScript `number`.
 *
 * `type="text"` is deliberate — `<input type="number">` does not accept
 * comma as a decimal separator in any browser, which breaks es-CO entry.
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
  const id = label.toLowerCase().replace(/[^a-z0-9]+/gi, "-")
  const errorId = `${id}-error`
  const errorMessage = fieldErrors?.[name]
  const inputProps = errorMessage
    ? { "aria-invalid": "true" as const, "aria-describedby": errorId }
    : {}

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        pattern="[0-9.,-]*"
        title={label === "Precio" ? "Ej: 1.500,75" : "Ej: 450,30"}
        defaultValue={defaultValue}
        className="min-h-[--h-touch] num"
        onInput={(event) => {
          const input = event.currentTarget as HTMLInputElement
          const before = input.value
          const cursorBefore = input.selectionStart ?? before.length

          // Format the value with thousand separators
          const formatted = formatEsCONumeric(before)

          // Calculate the new cursor position:
          // we format only the prefix up to the old cursor and measure its
          // length to determine where the caret should land.
          const formattedPrefix = formatEsCONumeric(before.slice(0, cursorBefore))
          const cursorAfter = formattedPrefix.length

          input.value = formatted

          // Restore cursor, clamped to the new value length
          const safeCursor = Math.min(cursorAfter, formatted.length)
          input.setSelectionRange(safeCursor, safeCursor)
        }}
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

export interface AnimalDesktopScreenProps {
  animales: AnimalListItem[]
  selectedIds?: string[]
  canCreate?: boolean
  onNuevoAnimal: () => void
  onPressAnimal?: (animal: AnimalListItem) => void
}

export function AnimalDesktopScreen({
  animales,
  selectedIds = [],
  canCreate = true,
  onNuevoAnimal,
  onPressAnimal,
}: AnimalDesktopScreenProps) {
  return (
    <section
      data-testid="op-f-300165"
      aria-label="18 Animales · Desktop"
      className="min-h-[900px] bg-background p-6 space-y-4"
    >
      <PageHeader
        titulo="Animales"
        subtitulo="Administra el hato activo de la finca"
        acciones={
          canCreate ? (
            <Button type="button" onClick={onNuevoAnimal}>
              Nuevo animal
            </Button>
          ) : undefined
        }
      />
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
              <tr
                key={animal.id}
                className={cn(
                  "h-11 border-t",
                  onPressAnimal && "cursor-pointer hover:bg-muted/50 transition-colors",
                )}
                tabIndex={onPressAnimal ? 0 : undefined}
                role={onPressAnimal ? "button" : undefined}
                aria-label={
                  onPressAnimal
                    ? [animal.codigoAnimal, animal.nombreAnimal].filter(Boolean).join(" ")
                    : undefined
                }
                onClick={() => onPressAnimal?.(animal)}
                onKeyDown={(e) => {
                  if (onPressAnimal && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault()
                    onPressAnimal(animal)
                  }
                }}
              >
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

function DatosAnimal({ animal }: { animal: AnimalListItem }) {
  return (
    <div className="space-y-1 text-support">
      <p>
        <span className="font-medium">Código:</span> {animal.codigoAnimal}
      </p>
      {animal.nombreAnimal && (
        <p>
          <span className="font-medium">Nombre:</span> {animal.nombreAnimal}
        </p>
      )}
      {animal.codigoRfid && (
        <p>
          <span className="font-medium">RFID:</span> {animal.codigoRfid}
        </p>
      )}
      {animal.tipoExplotacionId && (
        <p>
          <span className="font-medium">Tipo explotación:</span> {animal.tipoExplotacionId}
        </p>
      )}
      {animal.numeroPezones != null && (
        <p>
          <span className="font-medium">Nº pezones:</span> {animal.numeroPezones}
        </p>
      )}
      {animal.hierroId && (
        <p>
          <span className="font-medium">Hierro:</span> {animal.hierroId}
        </p>
      )}
      {animal.propietarioId && (
        <p>
          <span className="font-medium">Propietario:</span> {animal.propietarioId}
        </p>
      )}
      {animal.calidadAnimalId && (
        <p>
          <span className="font-medium">Calidad:</span> {animal.calidadAnimalId}
        </p>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
        <span className="text-caption text-muted-foreground">
          Tatuado: {animal.tatuado ? "✅" : "—"}
        </span>
        <span className="text-caption text-muted-foreground">
          Herrado: {animal.herrado ? "✅" : "—"}
        </span>
        <span className="text-caption text-muted-foreground">
          Descornado: {animal.descornado ? "✅" : "—"}
        </span>
        <span className="text-caption text-muted-foreground">
          Monta: {animal.esDeMonta ? "✅" : "—"}
        </span>
      </div>
    </div>
  )
}

export interface AnimalFichaDesktopScreenProps {
  animal: AnimalListItem
  timeline: AnimalTimelineItem[]
  /** Proyección enriquecida (slice 2). Todos los campos pueden faltar. */
  resumen?: AnimalFichaResumen
  /** Cursor de la siguiente página del timeline; sin cursor no hay control. */
  nextCursor?: string
  /** Eventos de la siguiente página, cuando el modelo de lectura lo provee. */
  eventosPendientes?: number
  canEdit?: boolean
  canCreateEvents?: boolean
  onVolverAListado?: () => void
  onEdit?: () => void
  onRegistrarEvento?: () => void
  onLoadMore?: () => void
}

/* ---------------- Ficha desktop: cards + timeline con tabs ---------------- */

function FichaCard({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section aria-label={titulo} className="rounded-card border bg-card p-4 space-y-2">
      <h2 className="text-section font-semibold">{titulo}</h2>
      <dl className="space-y-1.5">{children}</dl>
    </section>
  )
}

/** Fila etiqueta/valor con placeholder "—" cuando el dato falta. */
function FilaDato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-caption text-muted-foreground shrink-0">{etiqueta}</dt>
      <dd className="text-support font-medium text-end">{valor}</dd>
    </div>
  )
}

const PLACEHOLDER = "—"

function valorNacimiento(animal: AnimalListItem, resumen?: AnimalFichaResumen): string {
  if (animal.fechaNacimiento == null) return PLACEHOLDER
  const fecha = formatFechaEpoch(animal.fechaNacimiento)
  if (resumen?.edadMeses != null) return `${fecha} (${formatearEdadCorta(resumen.edadMeses)})`
  return fecha
}

function valorUltimoServicio(resumen?: AnimalFichaResumen): string {
  const servicio = resumen?.reproduccion?.ultimoServicio
  if (!servicio) return PLACEHOLDER
  const fecha = formatFechaCorta(servicio.fecha, false)
  return servicio.detalle ? `${fecha} · ${servicio.detalle}` : fecha
}

function valorUltimaPalpacion(resumen?: AnimalFichaResumen): string {
  const palpacion = resumen?.reproduccion?.ultimaPalpacion
  if (!palpacion) return PLACEHOLDER
  const fecha = formatFechaCorta(palpacion.fecha, false)
  return palpacion.resultado ? `${fecha} · ${palpacion.resultado}` : fecha
}

function valorPartos(resumen?: AnimalFichaResumen): string {
  const partos = resumen?.reproduccion?.partos
  if (!partos) return PLACEHOLDER
  if (!partos.ultimaFecha) return `${partos.total}`
  return `${partos.total} · último ${formatFechaCorta(partos.ultimaFecha, true)}`
}

function valorCondicionCorporal(resumen?: AnimalFichaResumen): string {
  const condicion = resumen?.condicionCorporal
  if (!condicion || condicion.valor == null) return PLACEHOLDER
  const base = `${formatearNumeroEsCO(condicion.valor, 1)} / 5`
  return condicion.etiqueta ? `${base} · ${condicion.etiqueta}` : base
}

/** Ícono del timeline por tipo de evento (dominio ya colorea el fondo). */
function iconoParaTipo(tipo: AnimalTimelineTipo): LucideIcon {
  switch (tipo) {
    case "peso":
    case "pesaje":
      return Scale
    case "vacuna":
    case "vacunacion":
      return Syringe
    case "servicio":
      return Heart
    case "palpacion":
      return Hand
    case "parto":
      return Baby
    case "produccion":
      return Milk
    case "condicion":
      return Gauge
    case "revision":
      return Stethoscope
    case "reubicacion":
      return MapPin
    case "venta":
      return Banknote
    case "muerte":
      return Skull
    case "foto":
      return Camera
    default:
      return PawPrint
  }
}

interface TabTimeline {
  key: string
  etiqueta: string
  /** undefined = Resumen (todos los dominios). */
  dominio?: DominioEvento
  mensajeVacio: string
}

const TAB_RESUMEN: TabTimeline = {
  key: "resumen",
  etiqueta: "Resumen",
  mensajeVacio: "Sin eventos registrados.",
}

const TABS_TIMELINE: readonly TabTimeline[] = [
  TAB_RESUMEN,
  {
    key: "eventos",
    etiqueta: "Eventos",
    dominio: "manejo",
    mensajeVacio: "Sin eventos de manejo.",
  },
  {
    key: "reproduccion",
    etiqueta: "Reproducción",
    dominio: "reproduccion",
    mensajeVacio: "Sin eventos de reproducción.",
  },
  {
    key: "produccion",
    etiqueta: "Producción",
    dominio: "produccion",
    mensajeVacio: "Sin eventos de producción.",
  },
  {
    key: "sanidad",
    etiqueta: "Sanidad",
    dominio: "sanidad",
    mensajeVacio: "Sin eventos de sanidad.",
  },
]

function FilaTimeline({ evento }: { evento: AnimalTimelineItem }) {
  const Icono = iconoParaTipo(evento.tipo)
  return (
    <li className="flex items-start gap-3 py-3">
      <span
        aria-hidden="true"
        className={cn(
          "size-7 rounded-full grid place-items-center shrink-0",
          domainStyle(evento.dominio),
        )}
      >
        <Icono className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-support font-medium">{evento.titulo}</p>
        {evento.detalle && <p className="text-caption text-muted-foreground">{evento.detalle}</p>}
        {evento.estadoLocal === "pendiente" && (
          <EstadoBadge variant="info" withDot className="mt-1">
            Guardado local · se sincronizará al recuperar señal
          </EstadoBadge>
        )}
      </div>
      <time dateTime={evento.fecha} className="text-caption text-muted-foreground shrink-0">
        {formatFechaCorta(evento.fecha, true)}
      </time>
    </li>
  )
}

function TimelineFicha({
  eventos,
  nextCursor,
  eventosPendientes,
  onLoadMore,
}: {
  eventos: AnimalTimelineItem[]
  nextCursor?: string
  eventosPendientes?: number
  onLoadMore?: () => void
}) {
  const [tabActiva, setTabActiva] = useState(TAB_RESUMEN.key)
  const tab = TABS_TIMELINE.find((candidate) => candidate.key === tabActiva) ?? TAB_RESUMEN
  const ordenados = [...eventos].sort((a, b) => b.fecha.localeCompare(a.fecha))
  const visibles = tab.dominio
    ? ordenados.filter((evento) => evento.dominio === tab.dominio)
    : ordenados

  return (
    <section aria-label="Timeline" className="rounded-card border bg-card p-4 space-y-3">
      <div role="tablist" aria-label="Filtrar eventos por dominio" className="flex flex-wrap gap-2">
        {TABS_TIMELINE.map((candidate) => (
          <button
            key={candidate.key}
            type="button"
            role="tab"
            aria-selected={tabActiva === candidate.key}
            onClick={() => setTabActiva(candidate.key)}
            className={cn(
              "min-h-[--h-touch] rounded-full border px-4 text-support font-medium",
              tabActiva === candidate.key
                ? "border-transparent bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted/50",
            )}
          >
            {candidate.etiqueta}
          </button>
        ))}
      </div>
      {visibles.length > 0 ? (
        <ol className="divide-y divide-border">
          {visibles.map((evento) => (
            <FilaTimeline key={evento.id} evento={evento} />
          ))}
        </ol>
      ) : (
        <p className="py-4 text-center text-support text-muted-foreground">{tab.mensajeVacio}</p>
      )}
      {nextCursor && (
        <div className="flex justify-center pt-1">
          <Button type="button" variant="secondary" onClick={onLoadMore}>
            {eventosPendientes != null ? `Ver ${eventosPendientes} eventos más` : "Ver más eventos"}
            <ChevronDown className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </section>
  )
}

/** Columna izquierda de la ficha: cards DATOS / REPRODUCCIÓN / PESO Y CONDICIÓN. */
function CardsResumenFicha({
  animal,
  resumen,
}: {
  animal: AnimalListItem
  resumen?: AnimalFichaResumen
}) {
  const reproduccion = resumen?.reproduccion
  const ultimoPeso = resumen?.ultimoPeso
  const metaPeso = ultimoPeso
    ? `${formatFechaCorta(ultimoPeso.fecha, false)}${
        ultimoPeso.gdpKgDia != null
          ? ` · GDP ${formatearNumeroEsCO(ultimoPeso.gdpKgDia, 2)} kg/día`
          : ""
      }`
    : PLACEHOLDER

  return (
    <div className="space-y-4">
      <FichaCard titulo="DATOS">
        <FilaDato etiqueta="Nacimiento" valor={valorNacimiento(animal, resumen)} />
        <FilaDato etiqueta="Raza" valor={resumen?.raza ?? PLACEHOLDER} />
        <FilaDato etiqueta="Color" valor={resumen?.color ?? PLACEHOLDER} />
        <FilaDato etiqueta="Hierro" valor={animal.hierroId ?? PLACEHOLDER} />
        <FilaDato etiqueta="Propietario" valor={animal.propietarioId ?? PLACEHOLDER} />
        <FilaDato etiqueta="RFID" valor={animal.codigoRfid ?? PLACEHOLDER} />
      </FichaCard>
      <FichaCard titulo="REPRODUCCIÓN">
        <FilaDato etiqueta="Últ. servicio" valor={valorUltimoServicio(resumen)} />
        <FilaDato etiqueta="Palpación" valor={valorUltimaPalpacion(resumen)} />
        <FilaDato
          etiqueta="Gestación"
          valor={
            reproduccion?.gestacionDias != null ? `${reproduccion.gestacionDias} días` : PLACEHOLDER
          }
        />
        <FilaDato etiqueta="Partos" valor={valorPartos(resumen)} />
        <FilaDato
          etiqueta="IEP"
          valor={reproduccion?.iepDias != null ? `${reproduccion.iepDias} días` : PLACEHOLDER}
        />
        <FilaDato
          etiqueta="Días abiertos"
          valor={reproduccion?.diasAbiertos != null ? `${reproduccion.diasAbiertos}` : PLACEHOLDER}
        />
      </FichaCard>
      <FichaCard titulo="PESO Y CONDICIÓN">
        <div>
          <FilaDato
            etiqueta="Último peso"
            valor={
              ultimoPeso ? `${formatearNumeroEsCO(ultimoPeso.pesoKg, 1)} kg` : `${PLACEHOLDER} kg`
            }
          />
          <dd className="text-caption text-muted-foreground text-end">{metaPeso}</dd>
        </div>
        <FilaDato etiqueta="Condición" valor={valorCondicionCorporal(resumen)} />
      </FichaCard>
    </div>
  )
}

/**
 * Ficha del animal en escritorio (redesign-ficha-animal, frame f-400107):
 * encabezado con miga de pan, tres cards de resumen (DATOS, REPRODUCCIÓN,
 * PESO Y CONDICIÓN) y card de timeline con tabs por dominio. Tolerante a
 * nulos: cada campo ausente conserva etiqueta/unidad con placeholder.
 */
export function AnimalFichaDesktopScreen({
  animal,
  timeline,
  resumen,
  nextCursor,
  eventosPendientes,
  canEdit = true,
  canCreateEvents = true,
  onVolverAListado,
  onEdit,
  onRegistrarEvento,
  onLoadMore,
}: AnimalFichaDesktopScreenProps) {
  return (
    <section
      data-testid="op-f-400107"
      aria-label="19 Ficha Animal · Desktop"
      className="min-h-[900px] bg-background p-6 space-y-4"
    >
      <AnimalFichaHeader
        animal={animal}
        {...(resumen ? { resumen } : {})}
        canEdit={canEdit}
        canCreateEvents={canCreateEvents}
        {...(onVolverAListado ? { onVolverAListado } : {})}
        {...(onEdit ? { onEdit } : {})}
        {...(onRegistrarEvento ? { onRegistrarEvento } : {})}
      />
      <div className="grid grid-cols-[minmax(300px,340px)_1fr] items-start gap-4">
        <CardsResumenFicha animal={animal} {...(resumen ? { resumen } : {})} />
        <TimelineFicha
          eventos={timeline}
          {...(nextCursor ? { nextCursor } : {})}
          {...(eventosPendientes != null ? { eventosPendientes } : {})}
          {...(onLoadMore ? { onLoadMore } : {})}
        />
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
      className="min-h-[100dvh] w-full bg-background pb-[calc(var(--h-bottomnav)+16px)]"
    >
      <header className="h-14 border-b bg-card px-4 flex items-center">
        <div>
          <p className="text-title font-semibold">Ficha animal</p>
          <p className="text-caption text-muted-foreground">Detalle operativo</p>
        </div>
      </header>
      <main className="p-4 space-y-4">
        <AnimalFichaMobileHeader animal={animal} metrics={metrics} canEdit />
        <div role="tablist" aria-label="Secciones de ficha" className="flex gap-2 overflow-x-auto">
          {[
            { label: "Timeline", selected: true },
            { label: "Datos", selected: false },
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
        <InfoCard title="Datos">
          <DatosAnimal animal={animal} />
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
