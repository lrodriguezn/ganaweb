DROP INDEX "idx_animales_finca_activo_codigo";
--> statement-breakpoint
CREATE INDEX "idx_animales_finca_activo_codigo" ON "animales" USING btree ("finca_id", "activo", "codigo") INCLUDE ("id");
