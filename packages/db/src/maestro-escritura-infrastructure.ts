/**
 * Adaptador Drizzle de escritura de Configuración · Maestros (issue #147,
 * RF-CONFIG-MAESTROS v1.0).
 *
 * Una sola clase implementa `MaestroEscrituraPort` (11 familias) y
 * `FincaEscrituraPort` (CM-050): comparten el mismo cliente, la misma
 * semántica de campos presentes (lo ausente no se toca) y la misma
 * traducción de errores (CM-032). Separarlas en dos clases duplicaría el
 * mapeo data-driven sin beneficio.
 *
 * Diseño data-driven: `FAMILIAS` declara la tabla y el mapeo de claves
 * snake_case de `DatosMaestroNormalizados` a columnas Drizzle de cada
 * familia; un motor genérico lo interpreta. Añadir una familia o un campo
 * es añadir datos al registro, no escribir otro método.
 *
 * Reglas implementadas:
 * - CM-032: UNIQUE(finca_id, codigo) de potreros/sectores →
 *   `{ tipo: "conflicto", campo: "codigo" }`, identificada por
 *   `err.cause.constraint_name` (drizzle-orm envuelve el PostgresError;
 *   postgres.js v3.x usa `constraint_name`).
 * - CM-040: `es_inseminador` solo existe en el mapeo de "veterinarios";
 *   para cualquier otra familia se ignora como clave desconocida.
 * - RN-050: nunca borrado físico — no existe método delete; la única baja
 *   es `cambiarEstado` (activo 0/1).
 * - CM-024: `obtenerPorId` NO filtra por finca (el scope lo aplica el caso
 *   de uso); `editar`/`cambiarEstado` filtran por id AND finca_id (doble
 *   chequeo de scope en el adaptador).
 * - Errores genéricos: cualquier fallo no UNIQUE devuelve un mensaje fijo,
 *   sin filtrar detalles internos de la base.
 */

import type {
  DatosMaestroNormalizados,
  FamiliaMaestro,
  FincaEscrituraPort,
  MaestroEscrituraPort,
  RegistroMaestroScope,
} from "@ganaweb/aplicacion"
import { Column, and, eq, is } from "drizzle-orm"
import type { AnyPgColumn, PgInsertValue, PgTable, PgUpdateSetSource } from "drizzle-orm/pg-core"
import type { DbClient } from "./client.js"
import {
  causasMuerte,
  diagnosticosVeterinarios,
  fincas,
  grupos,
  hierros,
  lotes,
  lugaresCompras,
  motivosVentas,
  potreros,
  propietarios,
  sectores,
  veterinarios,
} from "./schema/index.js"

/** Columna de texto NOT NULL (id, finca_id, nombre). */
type ColumnaTextoNotNull = AnyPgColumn<{ data: string; notNull: true }>
/** Columna entera NOT NULL (activo). */
type ColumnaEnteraNotNull = AnyPgColumn<{ data: number; notNull: true }>

export interface ConfigFamiliaMaestro {
  readonly tabla: PgTable
  readonly id: ColumnaTextoNotNull
  readonly fincaId: ColumnaTextoNotNull
  readonly nombre: ColumnaTextoNotNull
  readonly activo: ColumnaEnteraNotNull
  /** Clave snake_case de `DatosMaestroNormalizados` → columna Drizzle. */
  readonly columnas: Readonly<Record<string, AnyPgColumn>>
}

/**
 * Registro data-driven de las 11 familias (CM-040: `es_inseminador` solo en
 * veterinarios). Las claves desconocidas para una familia se ignoran.
 *
 * Exportado para que el adaptador de listado (CM-061: extender, no
 * duplicar) reutilice las mismas tablas y el mismo mapeo de columnas.
 */
export const FAMILIAS: Readonly<Record<FamiliaMaestro, ConfigFamiliaMaestro>> = {
  veterinarios: {
    tabla: veterinarios,
    id: veterinarios.id,
    fincaId: veterinarios.fincaId,
    nombre: veterinarios.nombre,
    activo: veterinarios.activo,
    columnas: {
      nombre: veterinarios.nombre,
      telefono: veterinarios.telefono,
      email: veterinarios.email,
      direccion: veterinarios.direccion,
      numero_registro: veterinarios.numeroRegistro,
      especialidad: veterinarios.especialidad,
      es_inseminador: veterinarios.esInseminador,
    },
  },
  propietarios: {
    tabla: propietarios,
    id: propietarios.id,
    fincaId: propietarios.fincaId,
    nombre: propietarios.nombre,
    activo: propietarios.activo,
    columnas: {
      nombre: propietarios.nombre,
      tipo_documento: propietarios.tipoDocumento,
      numero_documento: propietarios.numeroDocumento,
      telefono: propietarios.telefono,
      email: propietarios.email,
      direccion: propietarios.direccion,
    },
  },
  potreros: {
    tabla: potreros,
    id: potreros.id,
    fincaId: potreros.fincaId,
    nombre: potreros.nombre,
    activo: potreros.activo,
    columnas: {
      codigo: potreros.codigo,
      nombre: potreros.nombre,
      area_hectareas: potreros.areaHectareas,
      tipo_pasto: potreros.tipoPasto,
      capacidad_maxima: potreros.capacidadMaxima,
      estado: potreros.estado,
    },
  },
  sectores: {
    tabla: sectores,
    id: sectores.id,
    fincaId: sectores.fincaId,
    nombre: sectores.nombre,
    activo: sectores.activo,
    columnas: {
      codigo: sectores.codigo,
      nombre: sectores.nombre,
      area_hectareas: sectores.areaHectareas,
      tipo_pasto: sectores.tipoPasto,
      capacidad_maxima: sectores.capacidadMaxima,
      estado: sectores.estado,
    },
  },
  lotes: {
    tabla: lotes,
    id: lotes.id,
    fincaId: lotes.fincaId,
    nombre: lotes.nombre,
    activo: lotes.activo,
    columnas: {
      nombre: lotes.nombre,
      descripcion: lotes.descripcion,
      tipo: lotes.tipo,
    },
  },
  grupos: {
    tabla: grupos,
    id: grupos.id,
    fincaId: grupos.fincaId,
    nombre: grupos.nombre,
    activo: grupos.activo,
    columnas: {
      nombre: grupos.nombre,
      descripcion: grupos.descripcion,
    },
  },
  hierros: {
    tabla: hierros,
    id: hierros.id,
    fincaId: hierros.fincaId,
    nombre: hierros.nombre,
    activo: hierros.activo,
    columnas: {
      nombre: hierros.nombre,
      descripcion: hierros.descripcion,
    },
  },
  diagnosticos: {
    tabla: diagnosticosVeterinarios,
    id: diagnosticosVeterinarios.id,
    fincaId: diagnosticosVeterinarios.fincaId,
    nombre: diagnosticosVeterinarios.nombre,
    activo: diagnosticosVeterinarios.activo,
    columnas: {
      nombre: diagnosticosVeterinarios.nombre,
      descripcion: diagnosticosVeterinarios.descripcion,
      categoria: diagnosticosVeterinarios.categoria,
    },
  },
  motivos_ventas: {
    tabla: motivosVentas,
    id: motivosVentas.id,
    fincaId: motivosVentas.fincaId,
    nombre: motivosVentas.nombre,
    activo: motivosVentas.activo,
    columnas: {
      nombre: motivosVentas.nombre,
      descripcion: motivosVentas.descripcion,
    },
  },
  causas_muerte: {
    tabla: causasMuerte,
    id: causasMuerte.id,
    fincaId: causasMuerte.fincaId,
    nombre: causasMuerte.nombre,
    activo: causasMuerte.activo,
    columnas: {
      nombre: causasMuerte.nombre,
      descripcion: causasMuerte.descripcion,
    },
  },
  lugares_compras: {
    tabla: lugaresCompras,
    id: lugaresCompras.id,
    fincaId: lugaresCompras.fincaId,
    nombre: lugaresCompras.nombre,
    activo: lugaresCompras.activo,
    columnas: {
      nombre: lugaresCompras.nombre,
      tipo: lugaresCompras.tipo,
      ubicacion: lugaresCompras.ubicacion,
      contacto: lugaresCompras.contacto,
      telefono: lugaresCompras.telefono,
    },
  },
}

/** Datos básicos editables de la finca (CM-050) → columnas de `fincas`. */
const COLUMNAS_FINCA: Readonly<Record<string, AnyPgColumn>> = {
  nombre: fincas.nombre,
  departamento: fincas.departamento,
  municipio: fincas.municipio,
  vereda: fincas.vereda,
  area_hectareas: fincas.areaHectareas,
  capacidad_maxima: fincas.capacidadMaxima,
  tipo_explotacion_id: fincas.tipoExplotacionId,
}

/** Nombre de propiedad TS por columna (`.values()`/`.set()` usan el nombre TS, no el de la columna SQL). */
function construirNombresTs(tablas: readonly PgTable[]): Map<AnyPgColumn, string> {
  const mapa = new Map<AnyPgColumn, string>()
  for (const tabla of tablas) {
    for (const [nombreTs, valor] of Object.entries(tabla)) {
      if (is(valor, Column)) mapa.set(valor as AnyPgColumn, nombreTs)
    }
  }
  return mapa
}

const NOMBRES_TS = construirNombresTs([
  ...Object.values(FAMILIAS).map((config) => config.tabla),
  fincas,
])

/** CM-032: restricciones UNIQUE de código por finca (potreros y sectores). */
const RESTRICCIONES_CODIGO_FINCA = new Set(["uq_potreros_finca_codigo", "uq_sectores_finca_codigo"])

function esConflictoCodigoFinca(error: unknown): boolean {
  const causa = (error as { cause?: { constraint_name?: string } }).cause
  return (
    causa?.constraint_name !== undefined && RESTRICCIONES_CODIGO_FINCA.has(causa.constraint_name)
  )
}

/**
 * Mapea las claves presentes en `datos` a nombres de propiedad TS de las
 * columnas de la tabla. Claves fuera del mapeo se ignoran (nunca error).
 */
function mapearDatos(
  columnas: Readonly<Record<string, AnyPgColumn>>,
  datos: DatosMaestroNormalizados,
): Record<string, unknown> {
  const valores: Record<string, unknown> = {}
  for (const [clave, valor] of Object.entries(datos)) {
    const columna = columnas[clave]
    if (columna === undefined) continue
    const nombreTs = NOMBRES_TS.get(columna)
    if (nombreTs === undefined) continue
    valores[nombreTs] = valor
  }
  return valores
}

/**
 * Adaptador de escritura de maestros y de la finca. Ver el header del
 * archivo para las reglas (CM-024, CM-032, CM-040, CM-050, RN-050).
 */
export class DrizzleMaestroEscrituraAdapter implements MaestroEscrituraPort, FincaEscrituraPort {
  constructor(private readonly db: DbClient) {}

  async obtenerPorId(familia: FamiliaMaestro, id: string): Promise<RegistroMaestroScope | null> {
    const config = FAMILIAS[familia]
    const filas = await this.db
      .select({ id: config.id, fincaId: config.fincaId })
      .from(config.tabla)
      .where(eq(config.id, id))
      .limit(1)
    const fila = filas[0]
    return fila ? { id: fila.id, fincaId: fila.fincaId } : null
  }

  async listarNombresActivos(
    familia: FamiliaMaestro,
    fincaId: string,
  ): Promise<ReadonlyArray<{ readonly id: string; readonly nombre: string }>> {
    const config = FAMILIAS[familia]
    const filas = await this.db
      .select({ id: config.id, nombre: config.nombre })
      .from(config.tabla)
      .where(and(eq(config.fincaId, fincaId), eq(config.activo, 1)))
      .orderBy(config.nombre)
    return filas.map((fila) => ({ id: fila.id, nombre: fila.nombre }))
  }

  async crear(
    familia: FamiliaMaestro,
    fincaId: string,
    datos: DatosMaestroNormalizados,
  ): Promise<
    | { readonly tipo: "creado"; readonly id: string }
    | { readonly tipo: "conflicto"; readonly campo: string }
    | { readonly tipo: "error"; readonly detalle: string }
  > {
    const config = FAMILIAS[familia]
    const id = crypto.randomUUID()
    const fila: Record<string, unknown> = {
      ...mapearDatos(config.columnas, datos),
      [NOMBRES_TS.get(config.id) ?? "id"]: id,
      [NOMBRES_TS.get(config.fincaId) ?? "fincaId"]: fincaId,
    }
    try {
      await this.db.insert(config.tabla).values(fila as PgInsertValue<PgTable>)
      return { tipo: "creado", id }
    } catch (error) {
      if (esConflictoCodigoFinca(error)) return { tipo: "conflicto", campo: "codigo" }
      return { tipo: "error", detalle: "No se pudo crear el registro." }
    }
  }

  async editar(
    familia: FamiliaMaestro,
    fincaId: string,
    id: string,
    datos: DatosMaestroNormalizados,
  ): Promise<
    | { readonly tipo: "actualizado" }
    | { readonly tipo: "no_encontrado" }
    | { readonly tipo: "conflicto"; readonly campo: string }
    | { readonly tipo: "error"; readonly detalle: string }
  > {
    const config = FAMILIAS[familia]
    const valores: Record<string, unknown> = {
      ...mapearDatos(config.columnas, datos),
      updatedAt: new Date(),
    }
    try {
      const resultado = await this.db
        .update(config.tabla)
        .set(valores as PgUpdateSetSource<PgTable>)
        .where(and(eq(config.id, id), eq(config.fincaId, fincaId)))
      return resultado.count === 0 ? { tipo: "no_encontrado" } : { tipo: "actualizado" }
    } catch (error) {
      if (esConflictoCodigoFinca(error)) return { tipo: "conflicto", campo: "codigo" }
      return { tipo: "error", detalle: "No se pudo actualizar el registro." }
    }
  }

  async cambiarEstado(
    familia: FamiliaMaestro,
    fincaId: string,
    id: string,
    activo: 0 | 1,
  ): Promise<
    | { readonly tipo: "estado_actualizado" }
    | { readonly tipo: "no_encontrado" }
    | { readonly tipo: "error"; readonly detalle: string }
  > {
    const config = FAMILIAS[familia]
    const valores: Record<string, unknown> = { activo, updatedAt: new Date() }
    try {
      const resultado = await this.db
        .update(config.tabla)
        .set(valores as PgUpdateSetSource<PgTable>)
        .where(and(eq(config.id, id), eq(config.fincaId, fincaId)))
      return resultado.count === 0 ? { tipo: "no_encontrado" } : { tipo: "estado_actualizado" }
    } catch {
      return { tipo: "error", detalle: "No se pudo actualizar el estado." }
    }
  }

  async actualizarDatosBasicos(
    fincaId: string,
    datos: DatosMaestroNormalizados,
  ): Promise<
    | { readonly tipo: "actualizado" }
    | { readonly tipo: "no_encontrado" }
    | { readonly tipo: "error"; readonly detalle: string }
  > {
    const valores: Record<string, unknown> = {
      ...mapearDatos(COLUMNAS_FINCA, datos),
      updatedAt: new Date(),
    }
    try {
      const resultado = await this.db
        .update(fincas)
        .set(valores as typeof fincas.$inferInsert)
        .where(eq(fincas.id, fincaId))
      return resultado.count === 0 ? { tipo: "no_encontrado" } : { tipo: "actualizado" }
    } catch {
      return { tipo: "error", detalle: "No se pudo actualizar la finca." }
    }
  }
}
