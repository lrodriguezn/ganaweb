/**
 * @ganaweb/ui — public surface.
 *
 * The barrel is the ONLY entry point consumers should import from. Internal
 * file paths under `src/ganado/*` and `src/primitives/*` are NOT part of
 * the contract — the barrel is. Tsup builds from this file (entry in
 * `tsup.config.ts`), so dropping a component here is the only way to ship it.
 *
 * Categories:
 * - `lib`        — utilities (cn classname merger)
 * - `ganado`     — domain components (AnimalCard, SyncPill, MetricCard, …)
 * - `primitives` — vendored shadcn primitives (Button, Input, Drawer, …)
 * - `types`      — domain types + permission helpers
 *
 * Consumers that need the design tokens import the CSS side-effect:
 *   `import "@ganaweb/ui/styles/globals.css"`
 * (declared in `package.json#exports`).
 */

// Utilities
export { cn } from "./lib/utils"

// Domain components
export { AnimalCard } from "./ganado/animal-card"
export {
  AnimalDeleteDialogCopy,
  AnimalDesktopScreen,
  AnimalFichaDesktopScreen,
  AnimalFichaHeader,
  AnimalFichaMobileScreen,
  AnimalFormScreen,
  AnimalGallery,
  AnimalGenealogy,
  AnimalListMobile,
  AnimalTimeline,
} from "./ganado/animal-crud"
export type {
  AnimalCurrentLocation,
  AnimalFichaDesktopScreenProps,
  AnimalFichaMobileScreenProps,
  AnimalFormCatalogOptions,
  AnimalFormInitialValues,
  AnimalFormScreenProps,
  AnimalGalleryProps,
  AnimalGenealogyNode,
  AnimalGenealogyProps,
  AnimalImageItem,
  AnimalListItem,
  AnimalListMobileChipId,
  AnimalListMobileEstado,
  AnimalListMobileFiltrosProps,
  AnimalListMobilePropietarioOpcion,
  AnimalListMobileProps,
  AnimalListMobileScrollInfinitoProps,
  AnimalMobileIdLabel,
  AnimalMobileKeyLabel,
  AnimalMobileListItem,
  AnimalMobileMadre,
  AnimalOffspringNode,
  AnimalTimelineItem,
  AnimalTimelineProps,
  SelectOption,
} from "./ganado/animal-crud"
export { AnimalExportacionDialog } from "./ganado/animal-exportacion-dialog"
export type {
  AnimalExportacionAlcance,
  AnimalExportacionDialogProps,
  AnimalExportacionFormato,
  AnimalExportacionSeleccion,
  AnimalExportacionTransporte,
  ResultadoExportacionDialog,
} from "./ganado/animal-exportacion-dialog"
export { AnimalListadoDesktop } from "./ganado/animal-listado-desktop"
export type {
  AnimalListadoDesktopColumn,
  AnimalListadoDesktopEstado,
  AnimalListadoDesktopOrden,
  AnimalListadoDesktopPermissions,
  AnimalListadoDesktopProps,
  AnimalListadoDesktopRow,
} from "./ganado/animal-listado-desktop"
export { AppHeader } from "./ganado/app-header"
export { AparienciaCard } from "./ganado/apariencia-card"
export { AvatarMenu } from "./ganado/avatar-menu"
export { BottomNav } from "./ganado/bottom-nav"
export { CardAccion } from "./ganado/card-accion"
export { CardActividad } from "./ganado/card-actividad"
export { CardProduccion } from "./ganado/card-produccion"
export {
  CatalogoProductosSanitariosDesktop,
  CatalogoProductosSanitariosMobile,
  ConfirmacionEstadoProducto,
  SemaforoStockProducto,
} from "./ganado/catalogo-productos-sanitarios"
export type {
  CatalogoProductosSanitariosProps,
  EstadoStockProductoUI,
  FilaProductoSanitarioUI,
} from "./ganado/catalogo-productos-sanitarios"
export { FormularioProductoSanitario } from "./ganado/formulario-producto-sanitario"
export type {
  ErrorCampoProductoSanitario,
  FormularioProductoSanitarioInicial,
  FormularioProductoSanitarioProps,
} from "./ganado/formulario-producto-sanitario"
export { EmptyState } from "./ganado/empty-state"
export {
  CategoriaBadge,
  EstadoAnimalBadge,
  EstadoBadge,
  SaludBadge,
  StockBadge,
} from "./ganado/estado-badge"
export { EventDrawer } from "./ganado/event-drawer"
export {
  EventoWizard,
  type EventoWizardProps,
  type ResultadoCapturaEvento,
  type ResultadoIds,
} from "./ganado/evento-wizard"
export type {
  BuscarAnimalPorCodigo,
  CapturaEvento,
  CargaAnimalesPorOrigen,
  CatalogosParaAlcance,
  DominioEventoWizard,
  OrigenSeleccionGrupal,
  PermisosEfectivosPorDominio,
  Seleccion,
  SeleccionGrupal,
  SeleccionIndividual,
  TipoEventoMeta,
  TipoEventoWizard,
} from "./ganado/evento-wizard/types"
export { EstiloSwitcher } from "./ganado/estilo-switcher"
export type { EstiloSwitcherProps } from "./ganado/estilo-switcher"
export { Fab } from "./ganado/fab"
export { FincaList, FincaSwitcher } from "./ganado/finca-switcher"
export {
  FormularioEntradaAlmacen,
  type DatosEntradaAlmacen,
  type FormularioEntradaAlmacenProps,
  type ProductoEntradaAlmacen,
} from "./ganado/formulario-entrada-almacen"
export {
  ListadoEntradasAlmacen,
  type EntradaAlmacenFila,
  type ListadoEntradasAlmacenProps,
} from "./ganado/listado-entradas-almacen"
export {
  HistorialAplicacionesSanidad,
  type FilaHistorialSanidadVista,
  type FiltrosHistorialSanidadVista,
  type HistorialAplicacionesSanidadProps,
  type ProductoFiltroHistorial,
} from "./ganado/historial-aplicaciones-sanidad"
export {
  PanelSanidad,
  type AccesoPanelSanidadDestino,
  type AlertaStockPanelVista,
  type MetricasPanelSanidad,
  type PanelSanidadProps,
  type PeriodosRefuerzosPanelVista,
  type RefuerzoPendientePanelVista,
  type UltimaAplicacionPanelVista,
} from "./ganado/panel-sanidad"
export {
  MaestroCard,
  type MaestroCardVariante,
  MaestroFilaConsolidada,
  MaestroGrid,
  MaestrosProgreso,
} from "./ganado/maestro-card"
export { MetricCard, MetricCardSkeleton } from "./ganado/metric-card"
export { PageHeader } from "./ganado/page-header"
export type { PageHeaderProps } from "./ganado/page-header"
export { Sidebar } from "./ganado/sidebar"
export { SyncPill } from "./ganado/sync-pill"
export { ThemeToggle } from "./ganado/theme-toggle"
export { Timeline } from "./ganado/timeline"

// Domain types + permission helpers
export type {
  ActividadReciente,
  AlertaAccion,
  AnimalFichaResumen,
  AnimalResumen,
  CategoriaReproductiva,
  DatoProduccion,
  DominioEvento,
  EstadoAnimal,
  EstadoSync,
  EventoTimeline,
  FincaResumen,
  ItemNav,
  MaestroResumen,
  Permiso,
  PermisosUsuario,
  RolFinca,
  Salud,
  Sexo,
  TipoEvento,
  UsuarioResumen,
} from "./ganado/types"
export { crearPermisos, tienePermiso } from "./ganado/types"

// Event-drawer sub-API
export { FormularioVacuna } from "./ganado/event-drawer/formulario-vacuna"
export type { ProductoSanitario } from "./ganado/event-drawer/formulario-vacuna"

// Vendored shadcn primitives (re-exported so consumers can build on them
// without reaching into the internal primitives/ path).
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./primitives/alert-dialog"
export { Button, buttonVariants } from "./primitives/button"
export {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./primitives/collapsible"
export { ComboboxBuscable } from "./primitives/combobox-buscable"
export type {
  ComboboxBuscableProps,
  ComboboxOption,
} from "./primitives/combobox-buscable"
export { DatePicker } from "./primitives/date-picker"
export type { DatePickerProps } from "./primitives/date-picker"
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./primitives/dialog"
export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
} from "./primitives/drawer"
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./primitives/dropdown-menu"
export { Input } from "./primitives/input"
export { Label } from "./primitives/label"
export { PillsSegmentadas } from "./primitives/pills-segmentadas"
export type {
  PillsOption,
  PillsSegmentadasProps,
} from "./primitives/pills-segmentadas"
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./primitives/select"
export { SelectConCreacion } from "./primitives/select-con-creacion"
export type { SelectConCreacionProps } from "./primitives/select-con-creacion"
export {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  Toaster,
  toast,
  toastVariants,
  useToast,
} from "./primitives/toast"
export type { ToastActionElement, ToastProps, ToasterToast } from "./primitives/toast"
