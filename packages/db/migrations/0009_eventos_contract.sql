ALTER TABLE "animales_condicion_corporal" ADD COLUMN "registro_grupal_id" text;--> statement-breakpoint
ALTER TABLE "animales_condicion_corporal" ADD COLUMN "anulado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "animales_condicion_corporal" ADD COLUMN "anulado_por" text;--> statement-breakpoint
ALTER TABLE "animales_condicion_corporal" ADD COLUMN "motivo_anulacion" text;--> statement-breakpoint
ALTER TABLE "animales_condicion_corporal" ADD COLUMN "corrige_a_id" text;--> statement-breakpoint
ALTER TABLE "animales_ubicacion_historico" ADD COLUMN "anulado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "animales_ubicacion_historico" ADD COLUMN "anulado_por" text;--> statement-breakpoint
ALTER TABLE "animales_ubicacion_historico" ADD COLUMN "motivo_anulacion" text;--> statement-breakpoint
ALTER TABLE "animales_ubicacion_historico" ADD COLUMN "corrige_a_id" text;--> statement-breakpoint
ALTER TABLE "aplicaciones_sanitarias" ADD COLUMN "anulado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "aplicaciones_sanitarias" ADD COLUMN "anulado_por" text;--> statement-breakpoint
ALTER TABLE "aplicaciones_sanitarias" ADD COLUMN "motivo_anulacion" text;--> statement-breakpoint
ALTER TABLE "aplicaciones_sanitarias" ADD COLUMN "corrige_a_id" text;--> statement-breakpoint
ALTER TABLE "muertes" ADD COLUMN "registro_grupal_id" text;--> statement-breakpoint
ALTER TABLE "muertes" ADD COLUMN "anulado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "muertes" ADD COLUMN "anulado_por" text;--> statement-breakpoint
ALTER TABLE "muertes" ADD COLUMN "motivo_anulacion" text;--> statement-breakpoint
ALTER TABLE "muertes" ADD COLUMN "corrige_a_id" text;--> statement-breakpoint
ALTER TABLE "palpaciones" ADD COLUMN "anulado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "palpaciones" ADD COLUMN "anulado_por" text;--> statement-breakpoint
ALTER TABLE "palpaciones" ADD COLUMN "motivo_anulacion" text;--> statement-breakpoint
ALTER TABLE "palpaciones" ADD COLUMN "corrige_a_id" text;--> statement-breakpoint
ALTER TABLE "partos" ADD COLUMN "anulado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "partos" ADD COLUMN "anulado_por" text;--> statement-breakpoint
ALTER TABLE "partos" ADD COLUMN "motivo_anulacion" text;--> statement-breakpoint
ALTER TABLE "partos" ADD COLUMN "corrige_a_id" text;--> statement-breakpoint
ALTER TABLE "pesos" ADD COLUMN "anulado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pesos" ADD COLUMN "anulado_por" text;--> statement-breakpoint
ALTER TABLE "pesos" ADD COLUMN "motivo_anulacion" text;--> statement-breakpoint
ALTER TABLE "pesos" ADD COLUMN "corrige_a_id" text;--> statement-breakpoint
ALTER TABLE "producciones_lacteas" ADD COLUMN "anulado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "producciones_lacteas" ADD COLUMN "anulado_por" text;--> statement-breakpoint
ALTER TABLE "producciones_lacteas" ADD COLUMN "motivo_anulacion" text;--> statement-breakpoint
ALTER TABLE "producciones_lacteas" ADD COLUMN "corrige_a_id" text;--> statement-breakpoint
ALTER TABLE "registros_grupales" ADD COLUMN "origen_seleccion" text;--> statement-breakpoint
ALTER TABLE "registros_grupales" ADD COLUMN "grupo_id" text;--> statement-breakpoint
ALTER TABLE "registros_grupales" ADD COLUMN "anulado_por" text;--> statement-breakpoint
ALTER TABLE "registros_grupales" ADD COLUMN "motivo_anulacion" text;--> statement-breakpoint
ALTER TABLE "registros_grupales" ADD COLUMN "corrige_a_id" text;--> statement-breakpoint
UPDATE "registros_grupales"
SET "origen_seleccion" = CASE
  WHEN "lote_id" IS NOT NULL AND "potrero_id" IS NULL THEN 'lote'
  WHEN "potrero_id" IS NOT NULL AND "lote_id" IS NULL THEN 'potrero'
  ELSE 'manual'
END;--> statement-breakpoint
ALTER TABLE "registros_grupales" ALTER COLUMN "origen_seleccion" SET DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE "registros_grupales" ALTER COLUMN "origen_seleccion" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "revisiones_veterinarias" ADD COLUMN "anulado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "revisiones_veterinarias" ADD COLUMN "anulado_por" text;--> statement-breakpoint
ALTER TABLE "revisiones_veterinarias" ADD COLUMN "motivo_anulacion" text;--> statement-breakpoint
ALTER TABLE "revisiones_veterinarias" ADD COLUMN "corrige_a_id" text;--> statement-breakpoint
ALTER TABLE "servicios" ADD COLUMN "anulado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "servicios" ADD COLUMN "anulado_por" text;--> statement-breakpoint
ALTER TABLE "servicios" ADD COLUMN "motivo_anulacion" text;--> statement-breakpoint
ALTER TABLE "servicios" ADD COLUMN "corrige_a_id" text;--> statement-breakpoint
ALTER TABLE "ventas" ADD COLUMN "anulado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ventas" ADD COLUMN "anulado_por" text;--> statement-breakpoint
ALTER TABLE "ventas" ADD COLUMN "motivo_anulacion" text;--> statement-breakpoint
ALTER TABLE "ventas" ADD COLUMN "corrige_a_id" text;--> statement-breakpoint
ALTER TABLE "animales_condicion_corporal" ADD CONSTRAINT "animales_condicion_corporal_registro_grupal_id_registros_grupales_id_fk" FOREIGN KEY ("registro_grupal_id") REFERENCES "public"."registros_grupales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales_condicion_corporal" ADD CONSTRAINT "animales_condicion_corporal_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales_condicion_corporal" ADD CONSTRAINT "animales_condicion_corporal_corrige_a_id_animales_condicion_corporal_id_fk" FOREIGN KEY ("corrige_a_id") REFERENCES "public"."animales_condicion_corporal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales_ubicacion_historico" ADD CONSTRAINT "animales_ubicacion_historico_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales_ubicacion_historico" ADD CONSTRAINT "animales_ubicacion_historico_corrige_a_id_animales_ubicacion_historico_id_fk" FOREIGN KEY ("corrige_a_id") REFERENCES "public"."animales_ubicacion_historico"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aplicaciones_sanitarias" ADD CONSTRAINT "aplicaciones_sanitarias_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aplicaciones_sanitarias" ADD CONSTRAINT "aplicaciones_sanitarias_corrige_a_id_aplicaciones_sanitarias_id_fk" FOREIGN KEY ("corrige_a_id") REFERENCES "public"."aplicaciones_sanitarias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "muertes" ADD CONSTRAINT "muertes_registro_grupal_id_registros_grupales_id_fk" FOREIGN KEY ("registro_grupal_id") REFERENCES "public"."registros_grupales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "muertes" ADD CONSTRAINT "muertes_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "muertes" ADD CONSTRAINT "muertes_corrige_a_id_muertes_id_fk" FOREIGN KEY ("corrige_a_id") REFERENCES "public"."muertes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palpaciones" ADD CONSTRAINT "palpaciones_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palpaciones" ADD CONSTRAINT "palpaciones_corrige_a_id_palpaciones_id_fk" FOREIGN KEY ("corrige_a_id") REFERENCES "public"."palpaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partos" ADD CONSTRAINT "partos_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partos" ADD CONSTRAINT "partos_corrige_a_id_partos_id_fk" FOREIGN KEY ("corrige_a_id") REFERENCES "public"."partos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pesos" ADD CONSTRAINT "pesos_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pesos" ADD CONSTRAINT "pesos_corrige_a_id_pesos_id_fk" FOREIGN KEY ("corrige_a_id") REFERENCES "public"."pesos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producciones_lacteas" ADD CONSTRAINT "producciones_lacteas_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producciones_lacteas" ADD CONSTRAINT "producciones_lacteas_corrige_a_id_producciones_lacteas_id_fk" FOREIGN KEY ("corrige_a_id") REFERENCES "public"."producciones_lacteas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_grupales" ADD CONSTRAINT "registros_grupales_grupo_id_grupos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_grupales" ADD CONSTRAINT "registros_grupales_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_grupales" ADD CONSTRAINT "registros_grupales_corrige_a_id_registros_grupales_id_fk" FOREIGN KEY ("corrige_a_id") REFERENCES "public"."registros_grupales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisiones_veterinarias" ADD CONSTRAINT "revisiones_veterinarias_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisiones_veterinarias" ADD CONSTRAINT "revisiones_veterinarias_corrige_a_id_revisiones_veterinarias_id_fk" FOREIGN KEY ("corrige_a_id") REFERENCES "public"."revisiones_veterinarias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_corrige_a_id_servicios_id_fk" FOREIGN KEY ("corrige_a_id") REFERENCES "public"."servicios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_corrige_a_id_ventas_id_fk" FOREIGN KEY ("corrige_a_id") REFERENCES "public"."ventas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_condicion_corporal_registro_grupal" ON "animales_condicion_corporal" USING btree ("registro_grupal_id");--> statement-breakpoint
CREATE INDEX "idx_condicion_corporal_corrige_a" ON "animales_condicion_corporal" USING btree ("corrige_a_id");--> statement-breakpoint
CREATE INDEX "idx_ubic_hist_corrige_a" ON "animales_ubicacion_historico" USING btree ("corrige_a_id");--> statement-breakpoint
CREATE INDEX "idx_aplicaciones_corrige_a" ON "aplicaciones_sanitarias" USING btree ("corrige_a_id");--> statement-breakpoint
CREATE INDEX "idx_muertes_registro_grupal" ON "muertes" USING btree ("registro_grupal_id");--> statement-breakpoint
CREATE INDEX "idx_muertes_corrige_a" ON "muertes" USING btree ("corrige_a_id");--> statement-breakpoint
CREATE INDEX "idx_palpaciones_corrige_a" ON "palpaciones" USING btree ("corrige_a_id");--> statement-breakpoint
CREATE INDEX "idx_partos_corrige_a" ON "partos" USING btree ("corrige_a_id");--> statement-breakpoint
CREATE INDEX "idx_pesos_corrige_a" ON "pesos" USING btree ("corrige_a_id");--> statement-breakpoint
CREATE INDEX "idx_prod_lactea_corrige_a" ON "producciones_lacteas" USING btree ("corrige_a_id");--> statement-breakpoint
CREATE INDEX "idx_reg_grupales_grupo" ON "registros_grupales" USING btree ("grupo_id");--> statement-breakpoint
CREATE INDEX "idx_reg_grupales_corrige_a" ON "registros_grupales" USING btree ("corrige_a_id");--> statement-breakpoint
CREATE INDEX "idx_revisiones_corrige_a" ON "revisiones_veterinarias" USING btree ("corrige_a_id");--> statement-breakpoint
CREATE INDEX "idx_servicios_corrige_a" ON "servicios" USING btree ("corrige_a_id");--> statement-breakpoint
CREATE INDEX "idx_ventas_corrige_a" ON "ventas" USING btree ("corrige_a_id");--> statement-breakpoint
ALTER TABLE "animales_condicion_corporal" ADD CONSTRAINT "ck_condicion_corporal_auditoria" CHECK ((("animales_condicion_corporal"."anulado_en" IS NULL AND "animales_condicion_corporal"."anulado_por" IS NULL AND "animales_condicion_corporal"."motivo_anulacion" IS NULL) OR ("animales_condicion_corporal"."anulado_en" IS NOT NULL AND "animales_condicion_corporal"."anulado_por" IS NOT NULL AND "animales_condicion_corporal"."motivo_anulacion" IS NOT NULL AND length(trim("animales_condicion_corporal"."motivo_anulacion")) > 0)));--> statement-breakpoint
ALTER TABLE "animales_condicion_corporal" ADD CONSTRAINT "ck_condicion_corporal_hijo_grupal" CHECK ("animales_condicion_corporal"."registro_grupal_id" IS NULL OR ("animales_condicion_corporal"."anulado_en" IS NULL AND "animales_condicion_corporal"."anulado_por" IS NULL AND "animales_condicion_corporal"."motivo_anulacion" IS NULL AND "animales_condicion_corporal"."corrige_a_id" IS NULL));--> statement-breakpoint
ALTER TABLE "animales_ubicacion_historico" ADD CONSTRAINT "ck_ubic_hist_auditoria" CHECK ((("animales_ubicacion_historico"."anulado_en" IS NULL AND "animales_ubicacion_historico"."anulado_por" IS NULL AND "animales_ubicacion_historico"."motivo_anulacion" IS NULL) OR ("animales_ubicacion_historico"."anulado_en" IS NOT NULL AND "animales_ubicacion_historico"."anulado_por" IS NOT NULL AND "animales_ubicacion_historico"."motivo_anulacion" IS NOT NULL AND length(trim("animales_ubicacion_historico"."motivo_anulacion")) > 0)));--> statement-breakpoint
ALTER TABLE "animales_ubicacion_historico" ADD CONSTRAINT "ck_ubic_hist_hijo_grupal" CHECK ("animales_ubicacion_historico"."registro_grupal_id" IS NULL OR ("animales_ubicacion_historico"."anulado_en" IS NULL AND "animales_ubicacion_historico"."anulado_por" IS NULL AND "animales_ubicacion_historico"."motivo_anulacion" IS NULL AND "animales_ubicacion_historico"."corrige_a_id" IS NULL));--> statement-breakpoint
ALTER TABLE "aplicaciones_sanitarias" ADD CONSTRAINT "ck_aplicaciones_auditoria" CHECK ((("aplicaciones_sanitarias"."anulado_en" IS NULL AND "aplicaciones_sanitarias"."anulado_por" IS NULL AND "aplicaciones_sanitarias"."motivo_anulacion" IS NULL) OR ("aplicaciones_sanitarias"."anulado_en" IS NOT NULL AND "aplicaciones_sanitarias"."anulado_por" IS NOT NULL AND "aplicaciones_sanitarias"."motivo_anulacion" IS NOT NULL AND length(trim("aplicaciones_sanitarias"."motivo_anulacion")) > 0)));--> statement-breakpoint
ALTER TABLE "aplicaciones_sanitarias" ADD CONSTRAINT "ck_aplicaciones_hijo_grupal" CHECK ("aplicaciones_sanitarias"."registro_grupal_id" IS NULL OR ("aplicaciones_sanitarias"."anulado_en" IS NULL AND "aplicaciones_sanitarias"."anulado_por" IS NULL AND "aplicaciones_sanitarias"."motivo_anulacion" IS NULL AND "aplicaciones_sanitarias"."corrige_a_id" IS NULL));--> statement-breakpoint
ALTER TABLE "muertes" ADD CONSTRAINT "ck_muertes_auditoria" CHECK ((("muertes"."anulado_en" IS NULL AND "muertes"."anulado_por" IS NULL AND "muertes"."motivo_anulacion" IS NULL) OR ("muertes"."anulado_en" IS NOT NULL AND "muertes"."anulado_por" IS NOT NULL AND "muertes"."motivo_anulacion" IS NOT NULL AND length(trim("muertes"."motivo_anulacion")) > 0)));--> statement-breakpoint
ALTER TABLE "muertes" ADD CONSTRAINT "ck_muertes_hijo_grupal" CHECK ("muertes"."registro_grupal_id" IS NULL OR ("muertes"."anulado_en" IS NULL AND "muertes"."anulado_por" IS NULL AND "muertes"."motivo_anulacion" IS NULL AND "muertes"."corrige_a_id" IS NULL));--> statement-breakpoint
ALTER TABLE "palpaciones" ADD CONSTRAINT "ck_palpaciones_auditoria" CHECK ((("palpaciones"."anulado_en" IS NULL AND "palpaciones"."anulado_por" IS NULL AND "palpaciones"."motivo_anulacion" IS NULL) OR ("palpaciones"."anulado_en" IS NOT NULL AND "palpaciones"."anulado_por" IS NOT NULL AND "palpaciones"."motivo_anulacion" IS NOT NULL AND length(trim("palpaciones"."motivo_anulacion")) > 0)));--> statement-breakpoint
ALTER TABLE "palpaciones" ADD CONSTRAINT "ck_palpaciones_hijo_grupal" CHECK ("palpaciones"."registro_grupal_id" IS NULL OR ("palpaciones"."anulado_en" IS NULL AND "palpaciones"."anulado_por" IS NULL AND "palpaciones"."motivo_anulacion" IS NULL AND "palpaciones"."corrige_a_id" IS NULL));--> statement-breakpoint
ALTER TABLE "partos" ADD CONSTRAINT "ck_partos_auditoria" CHECK ((("partos"."anulado_en" IS NULL AND "partos"."anulado_por" IS NULL AND "partos"."motivo_anulacion" IS NULL) OR ("partos"."anulado_en" IS NOT NULL AND "partos"."anulado_por" IS NOT NULL AND "partos"."motivo_anulacion" IS NOT NULL AND length(trim("partos"."motivo_anulacion")) > 0)));--> statement-breakpoint
ALTER TABLE "partos" ADD CONSTRAINT "ck_partos_hijo_grupal" CHECK ("partos"."registro_grupal_id" IS NULL OR ("partos"."anulado_en" IS NULL AND "partos"."anulado_por" IS NULL AND "partos"."motivo_anulacion" IS NULL AND "partos"."corrige_a_id" IS NULL));--> statement-breakpoint
ALTER TABLE "pesos" ADD CONSTRAINT "ck_pesos_auditoria" CHECK ((("pesos"."anulado_en" IS NULL AND "pesos"."anulado_por" IS NULL AND "pesos"."motivo_anulacion" IS NULL) OR ("pesos"."anulado_en" IS NOT NULL AND "pesos"."anulado_por" IS NOT NULL AND "pesos"."motivo_anulacion" IS NOT NULL AND length(trim("pesos"."motivo_anulacion")) > 0)));--> statement-breakpoint
ALTER TABLE "pesos" ADD CONSTRAINT "ck_pesos_hijo_grupal" CHECK ("pesos"."registro_grupal_id" IS NULL OR ("pesos"."anulado_en" IS NULL AND "pesos"."anulado_por" IS NULL AND "pesos"."motivo_anulacion" IS NULL AND "pesos"."corrige_a_id" IS NULL));--> statement-breakpoint
ALTER TABLE "producciones_lacteas" ADD CONSTRAINT "ck_prod_lactea_auditoria" CHECK ((("producciones_lacteas"."anulado_en" IS NULL AND "producciones_lacteas"."anulado_por" IS NULL AND "producciones_lacteas"."motivo_anulacion" IS NULL) OR ("producciones_lacteas"."anulado_en" IS NOT NULL AND "producciones_lacteas"."anulado_por" IS NOT NULL AND "producciones_lacteas"."motivo_anulacion" IS NOT NULL AND length(trim("producciones_lacteas"."motivo_anulacion")) > 0)));--> statement-breakpoint
ALTER TABLE "producciones_lacteas" ADD CONSTRAINT "ck_prod_lactea_hijo_grupal" CHECK ("producciones_lacteas"."registro_grupal_id" IS NULL OR ("producciones_lacteas"."anulado_en" IS NULL AND "producciones_lacteas"."anulado_por" IS NULL AND "producciones_lacteas"."motivo_anulacion" IS NULL AND "producciones_lacteas"."corrige_a_id" IS NULL));--> statement-breakpoint
ALTER TABLE "registros_grupales" ADD CONSTRAINT "ck_registros_grupales_auditoria" CHECK ((("registros_grupales"."anulado_en" IS NULL AND "registros_grupales"."anulado_por" IS NULL AND "registros_grupales"."motivo_anulacion" IS NULL) OR ("registros_grupales"."anulado_en" IS NOT NULL AND "registros_grupales"."anulado_por" IS NOT NULL AND "registros_grupales"."motivo_anulacion" IS NOT NULL AND length(trim("registros_grupales"."motivo_anulacion")) > 0)));--> statement-breakpoint
ALTER TABLE "registros_grupales" ADD CONSTRAINT "ck_registros_grupales_origen_criterio" CHECK (("registros_grupales"."origen_seleccion" = 'manual' AND "registros_grupales"."lote_id" IS NULL AND "registros_grupales"."potrero_id" IS NULL AND "registros_grupales"."grupo_id" IS NULL) OR ("registros_grupales"."origen_seleccion" = 'lote' AND "registros_grupales"."lote_id" IS NOT NULL AND "registros_grupales"."potrero_id" IS NULL AND "registros_grupales"."grupo_id" IS NULL) OR ("registros_grupales"."origen_seleccion" = 'potrero' AND "registros_grupales"."lote_id" IS NULL AND "registros_grupales"."potrero_id" IS NOT NULL AND "registros_grupales"."grupo_id" IS NULL) OR ("registros_grupales"."origen_seleccion" = 'grupo' AND "registros_grupales"."lote_id" IS NULL AND "registros_grupales"."potrero_id" IS NULL AND "registros_grupales"."grupo_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "revisiones_veterinarias" ADD CONSTRAINT "ck_revisiones_auditoria" CHECK ((("revisiones_veterinarias"."anulado_en" IS NULL AND "revisiones_veterinarias"."anulado_por" IS NULL AND "revisiones_veterinarias"."motivo_anulacion" IS NULL) OR ("revisiones_veterinarias"."anulado_en" IS NOT NULL AND "revisiones_veterinarias"."anulado_por" IS NOT NULL AND "revisiones_veterinarias"."motivo_anulacion" IS NOT NULL AND length(trim("revisiones_veterinarias"."motivo_anulacion")) > 0)));--> statement-breakpoint
ALTER TABLE "revisiones_veterinarias" ADD CONSTRAINT "ck_revisiones_hijo_grupal" CHECK ("revisiones_veterinarias"."registro_grupal_id" IS NULL OR ("revisiones_veterinarias"."anulado_en" IS NULL AND "revisiones_veterinarias"."anulado_por" IS NULL AND "revisiones_veterinarias"."motivo_anulacion" IS NULL AND "revisiones_veterinarias"."corrige_a_id" IS NULL));--> statement-breakpoint
ALTER TABLE "servicios" ADD CONSTRAINT "ck_servicios_auditoria" CHECK ((("servicios"."anulado_en" IS NULL AND "servicios"."anulado_por" IS NULL AND "servicios"."motivo_anulacion" IS NULL) OR ("servicios"."anulado_en" IS NOT NULL AND "servicios"."anulado_por" IS NOT NULL AND "servicios"."motivo_anulacion" IS NOT NULL AND length(trim("servicios"."motivo_anulacion")) > 0)));--> statement-breakpoint
ALTER TABLE "servicios" ADD CONSTRAINT "ck_servicios_hijo_grupal" CHECK ("servicios"."registro_grupal_id" IS NULL OR ("servicios"."anulado_en" IS NULL AND "servicios"."anulado_por" IS NULL AND "servicios"."motivo_anulacion" IS NULL AND "servicios"."corrige_a_id" IS NULL));--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ck_ventas_auditoria" CHECK ((("ventas"."anulado_en" IS NULL AND "ventas"."anulado_por" IS NULL AND "ventas"."motivo_anulacion" IS NULL) OR ("ventas"."anulado_en" IS NOT NULL AND "ventas"."anulado_por" IS NOT NULL AND "ventas"."motivo_anulacion" IS NOT NULL AND length(trim("ventas"."motivo_anulacion")) > 0)));--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ck_ventas_hijo_grupal" CHECK ("ventas"."registro_grupal_id" IS NULL OR ("ventas"."anulado_en" IS NULL AND "ventas"."anulado_por" IS NULL AND "ventas"."motivo_anulacion" IS NULL AND "ventas"."corrige_a_id" IS NULL));

-- ROLLBACK ORDER (the repository uses forward migrations, not down files):
-- 1. Drop CHECK constraints in reverse declaration order, from
--    ck_ventas_hijo_grupal through ck_condicion_corporal_auditoria.
-- 2. Drop indexes in reverse declaration order, from idx_ventas_corrige_a
--    through idx_condicion_corporal_registro_grupal.
-- 3. Drop FK constraints in reverse declaration order, from
--    ventas_corrige_a_id_ventas_id_fk through
--    animales_condicion_corporal_registro_grupal_id_registros_grupales_id_fk.
--    PostgreSQL truncates identifiers over 63 bytes; use pg_constraint names
--    when rolling back an already-applied database.
-- 4. Drop corrige_a_id, motivo_anulacion, anulado_por and anulado_en from
--    specialized event tables; registros_grupales already owned anulado_en.
-- 5. Drop muertes.registro_grupal_id,
--    animales_condicion_corporal.registro_grupal_id, then
--    registros_grupales.grupo_id and registros_grupales.origen_seleccion.
