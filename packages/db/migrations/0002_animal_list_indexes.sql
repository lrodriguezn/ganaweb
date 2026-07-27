CREATE INDEX "idx_animales_finca_activo_codigo" ON "animales" USING btree ("finca_id", "activo", "codigo");
--> statement-breakpoint
CREATE INDEX "idx_pesos_animal_fecha_id" ON "pesos" USING btree ("animal_id", "fecha" DESC, "id" DESC);
