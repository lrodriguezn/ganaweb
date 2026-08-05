-- Issue #219 (bug 2): el formulario captura "Lugar de compra" (origen =
-- comprado) y el contrato web declara `lugarCompraId`, pero la tabla
-- `animales` no tenía la columna: el valor nunca persistía. Se agrega la
-- columna nullable con FK al maestro `lugares_compras` (sin backfill: los
-- animales existentes quedan en NULL, nunca un valor fabricado).
--
-- Migración 0001–0007 son manuscritas; el snapshot acumulado vuelve a
-- quedar en `meta/0008_snapshot.json` para que `drizzle-kit generate`
-- diffee contra el esquema real.
ALTER TABLE "animales" ADD COLUMN "lugar_compra_id" text;
--> statement-breakpoint
ALTER TABLE "animales" ADD CONSTRAINT "animales_lugar_compra_id_lugares_compras_id_fk" FOREIGN KEY ("lugar_compra_id") REFERENCES "public"."lugares_compras"("id") ON DELETE no action ON UPDATE no action;
-- ROLLBACK (reversibilidad):
-- ALTER TABLE "animales" DROP CONSTRAINT "animales_lugar_compra_id_lugares_compras_id_fk";
-- ALTER TABLE "animales" DROP COLUMN "lugar_compra_id";
