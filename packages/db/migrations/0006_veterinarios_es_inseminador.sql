-- RF-CONFIG-MAESTROS v1.0 (CM-040, R-2): Inseminadores es un subconjunto de
-- Veterinarios. `es_inseminador` sigue la misma convención que `activo`
-- (integer 0/1, NOT NULL con default). Sin backfill: las filas existentes
-- quedan en 0. `servicios.inseminador_id` sigue referenciando
-- `veterinarios(id)` sin cambio de FK.
ALTER TABLE "veterinarios" ADD COLUMN "es_inseminador" integer NOT NULL DEFAULT 0;
-- ROLLBACK (reversibilidad):
-- ALTER TABLE "veterinarios" DROP COLUMN "es_inseminador";
