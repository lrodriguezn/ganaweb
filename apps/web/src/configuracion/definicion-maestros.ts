/**
 * Definición única del hub Configuración · Maestros (issue #148,
 * RF-CONFIG-MAESTROS v1.0, CM-012).
 *
 * Módulo isomorfo: sin imports de servidor ni de dominio — lo consumen el
 * hub, las rutas del CRUD (issue #149) y las server functions (issue #148).
 * Los 15 items del requisito §4 en orden, con los nombres exactos para
 * mostrar, el grupo de la sección del hub, el slug de la ruta y las reglas
 * de dependencia (R-5 → `requeridoPara`, CM-011/§3.3) y de solo lectura
 * (CM-025/CM-053).
 */

export type MaestroHubId =
  | "veterinarios"
  | "propietarios"
  | "inseminadores"
  | "predio"
  | "potreros"
  | "sectores"
  | "lotesGrupos"
  | "hierros"
  | "diagnosticos"
  | "motivosVentas"
  | "causasMuerte"
  | "lugaresCompras"
  | "razas"
  | "tiposExplotacion"
  | "calidades"

export type MaestroHubGrupo = "personas" | "ubicacion" | "clasificacion"

export interface DefinicionMaestroHub {
  readonly id: MaestroHubId
  readonly nombre: string
  readonly grupo: MaestroHubGrupo
  /** R-5 (CM-011/§3.3): proceso que depende de este maestro. */
  readonly requeridoPara?: string
  readonly slug: string
  /** CM-025/CM-053: catálogos globales sin escritura desde la finca. */
  readonly soloLectura: boolean
}

export const MAESTROS_HUB: readonly DefinicionMaestroHub[] = [
  {
    id: "veterinarios",
    nombre: "Veterinarios",
    grupo: "personas",
    requeridoPara: "Revisiones sanitarias",
    slug: "veterinarios",
    soloLectura: false,
  },
  {
    id: "propietarios",
    nombre: "Propietarios",
    grupo: "personas",
    requeridoPara: "Registro de animales",
    slug: "propietarios",
    soloLectura: false,
  },
  {
    id: "inseminadores",
    nombre: "Inseminadores",
    grupo: "personas",
    requeridoPara: "Servicios IA",
    slug: "inseminadores",
    soloLectura: false,
  },
  {
    id: "predio",
    nombre: "Predios",
    grupo: "ubicacion",
    slug: "predio",
    soloLectura: false,
  },
  {
    id: "potreros",
    nombre: "Potreros",
    grupo: "ubicacion",
    requeridoPara: "Ubicación / manejo",
    slug: "potreros",
    soloLectura: false,
  },
  {
    id: "sectores",
    nombre: "Sectores",
    grupo: "ubicacion",
    slug: "sectores",
    soloLectura: false,
  },
  {
    id: "lotesGrupos",
    nombre: "Lotes · Grupos",
    grupo: "ubicacion",
    slug: "lotes-grupos",
    soloLectura: false,
  },
  {
    id: "hierros",
    nombre: "Hierros",
    grupo: "clasificacion",
    requeridoPara: "Registro de animales",
    slug: "hierros",
    soloLectura: false,
  },
  {
    id: "diagnosticos",
    nombre: "Diagnósticos",
    grupo: "clasificacion",
    requeridoPara: "Sanidad",
    slug: "diagnosticos",
    soloLectura: false,
  },
  {
    id: "motivosVentas",
    nombre: "Motivos de venta",
    grupo: "clasificacion",
    requeridoPara: "Ventas",
    slug: "motivos-ventas",
    soloLectura: false,
  },
  {
    id: "causasMuerte",
    nombre: "Causas de muerte",
    grupo: "clasificacion",
    requeridoPara: "Bajas",
    slug: "causas-muerte",
    soloLectura: false,
  },
  {
    id: "lugaresCompras",
    nombre: "Lugares de compra",
    grupo: "clasificacion",
    slug: "lugares-compras",
    soloLectura: false,
  },
  {
    id: "razas",
    nombre: "Razas",
    grupo: "clasificacion",
    slug: "razas",
    soloLectura: true,
  },
  {
    id: "tiposExplotacion",
    nombre: "Tipos de explotación",
    grupo: "clasificacion",
    slug: "tipos-explotacion",
    soloLectura: true,
  },
  {
    id: "calidades",
    nombre: "Calidades",
    grupo: "clasificacion",
    slug: "calidades",
    soloLectura: true,
  },
]

/** CM-001: ruta del CRUD de un maestro, scoped a la finca activa. */
export function rutaConfiguracionMaestro(fincaId: string, id: MaestroHubId): string {
  const definicion = MAESTROS_HUB.find((item) => item.id === id)
  return `/fincas/${fincaId}/configuracion/${definicion?.slug ?? id}`
}

/**
 * S-1 (issue #149, CM-009): filas consolidadas mobile. El diseño
 * (frame-20188) agrupa maestros en UNA fila de 56px con conteo compuesto
 * ("1 · 8 · 4"); cada fila abre la pantalla de sub-menú del grupo
 * (`rutaConfiguracionGrupo`) con una fila por maestro y su conteo,
 * preservando el diseño sin ocultar maestros.
 */
export interface FilaConsolidadaMovil {
  readonly id: string
  readonly label: string
  readonly miembros: readonly MaestroHubId[]
}

export const FILAS_CONSOLIDADAS_MOVIL: readonly FilaConsolidadaMovil[] = [
  {
    id: "ubicacion",
    label: "Predios · Potreros · Sectores",
    miembros: ["predio", "potreros", "sectores"],
  },
  {
    id: "clasificacion-comercial",
    label: "Causas de muerte · Lugares de compra",
    miembros: ["causasMuerte", "lugaresCompras"],
  },
]

export function filaConsolidadaPorId(id: string): FilaConsolidadaMovil | undefined {
  return FILAS_CONSOLIDADAS_MOVIL.find((fila) => fila.id === id)
}

/** S-1 (issue #149): ruta del sub-menú mobile de un grupo consolidado. */
export function rutaConfiguracionGrupo(fincaId: string, grupoId: string): string {
  return `/fincas/${fincaId}/configuracion/grupo/${grupoId}`
}
