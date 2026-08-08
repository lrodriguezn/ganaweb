/**
 * Server functions re-exportadas para el módulo de sanidad (Issue #213,
 * RF-SANIDAD v0.2 §5, U4).
 *
 * Módulo público bundleable: la ruta `sanidad.tsx` importa desde acá y
 * NUNCA desde los `.server.ts` (lección PR #238/#247: import-protection
 * gate en `pnpm turbo build`). Cada re-export mantiene la misma
 * referencia que el módulo original — sin lógica nueva, sin
 * `.server.ts` propio.
 */

export {
  listarCatalogoSanidadFn,
  type ListarCatalogoSanidadInput,
  type ListarCatalogoSanidadServerResult,
  type SanidadCatalogoPermiso,
  type SanidadDenial,
} from "./sanidad-catalogo-actions.js"

export {
  listarEntradasAlmacenFn,
  registrarEntradaAlmacenFn,
  type ListarEntradasAlmacenServerResult,
  type RegistrarEntradaAlmacenServerResult,
  type RegistrarEntradaAlmacenWebInput,
  type SanidadAlmacenDenial,
  type SanidadAlmacenPermiso,
} from "./sanidad-almacen.js"

export {
  listarHistorialPanelSanidadFn,
  listarProximasPanelSanidadFn,
  listarStockPanelSanidadFn,
  listarUltimasPanelSanidadFn,
  obtenerMetricasPanelSanidadFn,
  type HistorialPanelInput,
  type HistorialPanelServerResult,
  type MetricasPanelServerResult,
  type ProximasPanelServerResult,
  type StockPanelServerResult,
  type UltimasPanelServerResult,
  type SanidadPanelDenial,
  type SanidadPanelPermiso,
} from "./sanidad-panel.js"

export {
  listarAnimalesSanidadFn,
  registrarAplicacionFn,
  type ListarAnimalesSanidadServerResult,
  type RegistrarAplicacionServerResult,
  type RegistrarAplicacionWebInput,
  type SanidadRegistroDenial,
  type SanidadRegistroPermiso,
} from "./sanidad-registro.js"
