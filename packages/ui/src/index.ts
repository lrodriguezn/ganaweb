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
export { EmptyState } from "./ganado/empty-state"
export {
  CategoriaBadge,
  EstadoAnimalBadge,
  EstadoBadge,
  SaludBadge,
  StockBadge,
} from "./ganado/estado-badge"
export { EventDrawer } from "./ganado/event-drawer"
export { FincaList, FincaSwitcher } from "./ganado/finca-switcher"
export { MaestroCard, MaestroGrid, MaestrosProgreso } from "./ganado/maestro-card"
export { MetricCard, MetricCardSkeleton } from "./ganado/metric-card"
export { SyncPill } from "./ganado/sync-pill"
export { ThemeToggle } from "./ganado/theme-toggle"
export { Timeline } from "./ganado/timeline"

// Domain types + permission helpers
export type {
  AnimalResumen,
  CategoriaReproductiva,
  DominioEvento,
  EstadoAnimal,
  EstadoSync,
  EventoTimeline,
  FincaResumen,
  MaestroResumen,
  Permiso,
  PermisosUsuario,
  RolFinca,
  Salud,
  Sexo,
  TipoEvento,
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
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./primitives/alert-dialog"
export { Button, buttonVariants } from "./primitives/button"
export {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./primitives/collapsible"
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./primitives/dropdown-menu"
export { Input } from "./primitives/input"
export { Label } from "./primitives/label"
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./primitives/select"
