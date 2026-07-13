ALTER TABLE "animales_imagenes" ADD COLUMN "es_principal" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_animales_imagenes_principal_activa" ON "animales_imagenes" USING btree ("animal_id") WHERE "activo" = 1 AND "es_principal" = 1;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auditoria_eliminaciones" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"entidad" text DEFAULT 'animal' NOT NULL,
	"entidad_codigo" text NOT NULL,
	"entidad_resumen" text,
	"usuario_id" text NOT NULL,
	"dispositivo_id" text,
	"via" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_tombstones" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"tabla_destino" text NOT NULL,
	"entidad_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_cola_binaria" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"entidad" text NOT NULL,
	"entidad_id" text NOT NULL,
	"blob_id" text NOT NULL,
	"mime_type" text NOT NULL,
	"bytes" integer NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"intentos" integer DEFAULT 0 NOT NULL,
	"ultimo_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auditoria_eliminaciones" ADD CONSTRAINT "auditoria_eliminaciones_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "auditoria_eliminaciones" ADD CONSTRAINT "auditoria_eliminaciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sync_tombstones" ADD CONSTRAINT "sync_tombstones_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sync_cola_binaria" ADD CONSTRAINT "sync_cola_binaria_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;
