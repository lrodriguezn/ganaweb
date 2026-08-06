import type { AnyPgColumn } from "drizzle-orm/pg-core"
import {
  check,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { animales } from "./animales.js"
import { usuarios } from "./auth.js"
import {
  auditoriaEventoCoherente,
  columnasAuditoriaEvento,
  hijoGrupalSinAuditoriaIndividual,
} from "./evento-auditoria.js"
import { causasMuerte, lugaresVentas, motivosVentas } from "./maestros.js"
import { registrosGrupales } from "./registros-grupales.js"

export const muertes = pgTable(
  "muertes",
  {
    id: text("id").primaryKey(),
    animalId: text("animal_id")
      .notNull()
      .references(() => animales.id),
    registroGrupalId: text("registro_grupal_id").references(() => registrosGrupales.id),
    fecha: date("fecha").notNull(),
    causaMuerteId: text("causa_muerte_id").references(() => causasMuerte.id),
    comentarios: text("comentarios"),
    usuarioCreadoPor: text("usuario_creado_por").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    ...columnasAuditoriaEvento(),
    corrigeAId: text("corrige_a_id").references((): AnyPgColumn => muertes.id),
  },
  (t) => [
    index("idx_muertes_registro_grupal").on(t.registroGrupalId),
    index("idx_muertes_corrige_a").on(t.corrigeAId),
    check("ck_muertes_auditoria", auditoriaEventoCoherente(t)),
    check("ck_muertes_hijo_grupal", hijoGrupalSinAuditoriaIndividual(t)),
  ],
)

export const ventas = pgTable(
  "ventas",
  {
    id: text("id").primaryKey(),
    animalId: text("animal_id")
      .notNull()
      .references(() => animales.id),
    registroGrupalId: text("registro_grupal_id").references(() => registrosGrupales.id),
    fecha: date("fecha").notNull(),
    motivoVentaId: text("motivo_venta_id").references(() => motivosVentas.id),
    lugarVentaId: text("lugar_venta_id").references(() => lugaresVentas.id),
    pesoVentaKg: numeric("peso_venta_kg", { precision: 10, scale: 2 }),
    precio: numeric("precio", { precision: 14, scale: 2 }),
    comprador: text("comprador"),
    comentarios: text("comentarios"),
    usuarioCreadoPor: text("usuario_creado_por").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    ...columnasAuditoriaEvento(),
    corrigeAId: text("corrige_a_id").references((): AnyPgColumn => ventas.id),
  },
  (t) => [
    index("idx_ventas_animal").on(t.animalId, t.fecha),
    index("idx_ventas_corrige_a").on(t.corrigeAId),
    check("ck_ventas_auditoria", auditoriaEventoCoherente(t)),
    check("ck_ventas_hijo_grupal", hijoGrupalSinAuditoriaIndividual(t)),
  ],
)
