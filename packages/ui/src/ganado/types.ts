import type { LucideIcon } from "lucide-react"

/**
 * Tipos del dominio ganadero compartidos por los componentes de ganado/.
 * v1.1 — agrega: multi-finca (FincaResumen, RolFinca) y maestros.
 * v1.2 — agrega: shell (ItemNav) y dashboard (AlertaAccion, DatoProduccion,
 *        ActividadReciente) para el slice Dashboard / Inicio.
 * Alineados con el esquema de base de datos (v2 + usuarios_fincas).
 */

export type CategoriaReproductiva =
  | "vacia"
  | "servida"
  | "prenada"
  | "parida"
  | "novilla"
  | "no_aplica"

export type Salud = "sano" | "enfermo"
export type EstadoAnimal = "activo" | "vendido" | "muerto"
export type Sexo = "macho" | "hembra" | "pajuela"

export type DominioEvento = "reproduccion" | "sanidad" | "produccion" | "manejo"

export type TipoEvento =
  | "peso"
  | "vacuna"
  | "servicio"
  | "palpacion"
  | "parto"
  | "produccion"
  | "reubicacion"

export interface AnimalResumen {
  id: string
  codigoAnimal: string
  nombreAnimal?: string | null
  sexo: Sexo
  categoriaReproductiva?: CategoriaReproductiva | null
  salud: Salud
  estadoActual: EstadoAnimal
  potrero?: string | null
  lote?: string | null
}

export interface EventoTimeline {
  id: string
  dominio: DominioEvento
  tipo: TipoEvento
  fecha: string // ISO date
  titulo: string
  detalle?: string
}

export type EstadoSync = "sincronizado" | "pendiente" | "offline"

/* ---------------- Multi-finca (v1.1) ---------------- */

/**
 * Rol del usuario EN UNA FINCA. v1.2.1: los roles son DINÁMICOS —
 * viven en la tabla usuarios_roles (RBAC configurable del esquema v3),
 * no en un enum del código. El valor es el nombre del rol listo para
 * mostrar (ej. "Administrador", "Operario de ordeño").
 */
export type RolFinca = string

export interface FincaResumen {
  id: string
  nombre: string
  rol: RolFinca
  /** Destacar el badge del rol (típicamente roles administrativos) */
  esAdmin?: boolean
  /** Estado de sincronización de ESTA finca en el dispositivo */
  sync: EstadoSync
  /** Registros en cola local pendientes de subir (si sync === "pendiente") */
  pendientes?: number
  /** ¿Existe réplica del dispositivo? Sin ella, la finca no es usable offline */
  tieneDatosLocales: boolean
}

/* ---------------- Maestros / Configuración (v1.1) ---------------- */

export interface MaestroResumen {
  id: string
  nombre: string // "Veterinarios", "Hierros", "Motivos de venta"
  grupo: "personas" | "ubicacion" | "clasificacion"
  registros: number
  /** Si está vacío Y algún proceso lo requiere: texto de la dependencia */
  requeridoPara?: string // ej: "Servicios IA"
  ruta: string // ruta del CRUD, ej: "/configuracion/veterinarios"
}

/* ---------------- Permisos RBAC (v1.2.1) ---------------- */

/**
 * Permiso granular del esquema v3 (usuarios_permisos: modulo + accion).
 * La UI se protege por PERMISO, no por nombre de rol — los roles son
 * configurables por el cliente y sus nombres no son contrato.
 */
export interface Permiso {
  modulo: string // ej: "configuracion", "animales", "reportes"
  accion: string // ej: "ver", "crear", "editar", "eliminar"
}

/** Conjunto de permisos efectivos del usuario en la finca activa,
 *  serializados como "modulo:accion" para consulta O(1). */
export type PermisosUsuario = ReadonlySet<string>

export function tienePermiso(permisos: PermisosUsuario, modulo: string, accion: string): boolean {
  return permisos.has(`${modulo}:${accion}`)
}

/** Construye el set desde las filas de roles_permisos de la finca activa. */
export function crearPermisos(lista: Permiso[]): PermisosUsuario {
  return new Set(lista.map((p) => `${p.modulo}:${p.accion}`))
}

/* ---------------- Shell + Dashboard (v1.2 — Dashboard / Inicio) ---------------- */

/**
 * Item de navegación usado por `Sidebar` y `BottomNav`.
 * El icono es `LucideIcon` (componente) para evitar reventar la prop con
 * un ReactNode opaco: el shell necesita pintar el icono a tamaño fijo y
 * controlar su color por estado (activo/inactivo).
 */
export interface ItemNav {
  id: string
  label: string
  icon: LucideIcon
  href: string
}

/**
 * Alerta mostrada en `CardAccion`. `severidad` decide el color del dot:
 * "alerta" → amber, "peligro" → rojo. `href` es opcional: la card puede
 * mostrar la fila como link directo a la vista filtrada o como un item
 * puramente informativo (con chevron pero sin onPress aún cableado).
 */
export interface AlertaAccion {
  id: string
  texto: string
  severidad: "alerta" | "peligro"
  href?: string
}

/**
 * Dato diario de producción lechera para `CardProduccion`.
 * `dia` es la etiqueta corta ya formateada (ej. "Lun", "Mar", …).
 * `valor` en litros; el componente calcula la altura de la barra como
 * `(valor / max) * 100%` sobre el array completo.
 */
export interface DatoProduccion {
  dia: string
  valor: number
}

/**
 * Entrada del feed "Actividad reciente" en `CardActividad`.
 * `tiempo` ya viene formateado del backend (ej. "Hace 2 h", "Ayer").
 */
export interface ActividadReciente {
  id: string
  descripcion: string
  tiempo: string
}
