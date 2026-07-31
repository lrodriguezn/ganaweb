CREATE TABLE "animal_listado_preferencias" (
  "id" text PRIMARY KEY,
  "usuario_id" text NOT NULL REFERENCES "usuarios"("id"),
  "finca_id" text NOT NULL REFERENCES "fincas"("id"),
  "columnas" text[] NOT NULL DEFAULT '{}',
  "page_size" smallint NOT NULL DEFAULT 25,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_animal_listado_preferencias_usuario_finca" ON "animal_listado_preferencias" ("usuario_id", "finca_id");
