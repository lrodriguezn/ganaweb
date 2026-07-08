CREATE TABLE "animales" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"nombre" varchar(100) DEFAULT '',
	"sexo" text NOT NULL,
	"estado_animal" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fincas" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "animales" ADD CONSTRAINT "animales_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_animales_finca_codigo" ON "animales" USING btree ("finca_id","codigo");
