/**
 * Puerto de lectura de catálogos globales para Configuración (issue #148,
 * RF-CONFIG-MAESTROS v1.0, CM-053/CM-054).
 *
 * Listas solo lectura de los catálogos globales (sin finca) que la
 * configuración necesita mostrar: razas (con origen y tipo de producción),
 * tipos de explotación y calidades. Contrato type-only de la capa de
 * aplicación (D6); el adaptador vive en `packages/db` extendiendo la clase
 * existente de catálogos globales (CM-061).
 *
 * Nombres en español (T-003).
 */

export type CatalogoGlobalConfiguracion = "razas" | "tiposExplotacion" | "calidades"

export interface FilaCatalogoGlobalConfiguracion {
  readonly id: string
  readonly nombre: string
  readonly descripcion: string | null
  /** Solo razas (CM-054). */
  readonly origen?: string | null
  /** Solo razas (CM-054). */
  readonly tipoProduccion?: string | null
}

export interface CatalogoGlobalConfiguracionPort {
  /** CM-053: lista solo lectura de registros activo=1 con búsqueda opcional sobre nombre. */
  listarParaConfiguracion(
    catalogo: CatalogoGlobalConfiguracion,
    opciones?: { readonly busqueda?: string },
  ): Promise<readonly FilaCatalogoGlobalConfiguracion[]>
}
