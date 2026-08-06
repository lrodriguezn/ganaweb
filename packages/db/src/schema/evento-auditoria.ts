import { sql } from "drizzle-orm"
import { text, timestamp } from "drizzle-orm/pg-core"
import { usuarios } from "./auth.js"

export function columnasAuditoriaEvento() {
  // The same tables store individual and grouped rows. Individual rows use
  // these columns; grouped children remain null and derive annulment from
  // registros_grupales, as required by EV-AUD-002.
  return {
    anuladoEn: timestamp("anulado_en", { withTimezone: true }),
    anuladoPor: text("anulado_por").references(() => usuarios.id),
    motivoAnulacion: text("motivo_anulacion"),
  }
}

export function auditoriaEventoCoherente(columnas: {
  anuladoEn: unknown
  anuladoPor: unknown
  motivoAnulacion: unknown
}) {
  return sql`((${columnas.anuladoEn} IS NULL AND ${columnas.anuladoPor} IS NULL AND ${columnas.motivoAnulacion} IS NULL) OR (${columnas.anuladoEn} IS NOT NULL AND ${columnas.anuladoPor} IS NOT NULL AND ${columnas.motivoAnulacion} IS NOT NULL AND length(trim(${columnas.motivoAnulacion})) > 0))`
}

export function hijoGrupalSinAuditoriaIndividual(columnas: {
  registroGrupalId: unknown
  anuladoEn: unknown
  anuladoPor: unknown
  motivoAnulacion: unknown
  corrigeAId: unknown
}) {
  return sql`${columnas.registroGrupalId} IS NULL OR (${columnas.anuladoEn} IS NULL AND ${columnas.anuladoPor} IS NULL AND ${columnas.motivoAnulacion} IS NULL AND ${columnas.corrigeAId} IS NULL)`
}
