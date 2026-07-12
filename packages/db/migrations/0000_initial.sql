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
CREATE TABLE "usuarios" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"email" varchar(100) NOT NULL,
	"email_verificado" integer DEFAULT 0 NOT NULL,
	"intentos_fallidos" integer DEFAULT 0 NOT NULL,
	"bloqueado_hasta" timestamp with time zone,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios_contrasena" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"contrasena_hash" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios_login" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"exitoso" integer DEFAULT 0,
	"ip" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios_sesiones" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"dispositivo_id" varchar(100),
	"ip" varchar(45),
	"user_agent" text,
	"fecha_expiracion" timestamp with time zone NOT NULL,
	"revocada_en" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" varchar(50) NOT NULL,
	"descripcion" text,
	"es_sistema" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios_permisos" (
	"id" text PRIMARY KEY NOT NULL,
	"modulo" varchar(50) NOT NULL,
	"accion" varchar(50) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles_permisos" (
	"id" text PRIMARY KEY NOT NULL,
	"rol_id" text NOT NULL,
	"permiso_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios_fincas" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"finca_id" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios_roles_asignacion" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"rol_id" text NOT NULL,
	"finca_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "animales" ADD CONSTRAINT "animales_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_contrasena" ADD CONSTRAINT "usuarios_contrasena_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_login" ADD CONSTRAINT "usuarios_login_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_sesiones" ADD CONSTRAINT "usuarios_sesiones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_rol_id_usuarios_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."usuarios_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_permiso_id_usuarios_permisos_id_fk" FOREIGN KEY ("permiso_id") REFERENCES "public"."usuarios_permisos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_fincas" ADD CONSTRAINT "usuarios_fincas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_fincas" ADD CONSTRAINT "usuarios_fincas_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_roles_asignacion" ADD CONSTRAINT "usuarios_roles_asignacion_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_roles_asignacion" ADD CONSTRAINT "usuarios_roles_asignacion_rol_id_usuarios_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."usuarios_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_roles_asignacion" ADD CONSTRAINT "usuarios_roles_asignacion_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_animales_finca_codigo" ON "animales" USING btree ("finca_id","codigo");
--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_email_unique" ON "usuarios" USING btree ("email");
--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_contrasena_usuario_id_unique" ON "usuarios_contrasena" USING btree ("usuario_id");
--> statement-breakpoint
CREATE INDEX "idx_usuarios_login_usuario" ON "usuarios_login" USING btree ("usuario_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sesiones_token" ON "usuarios_sesiones" USING btree ("refresh_token_hash");
--> statement-breakpoint
CREATE INDEX "idx_sesiones_usuario" ON "usuarios_sesiones" USING btree ("usuario_id","revocada_en");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_usuarios_permisos" ON "usuarios_permisos" USING btree ("modulo","accion");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_roles_permisos" ON "roles_permisos" USING btree ("rol_id","permiso_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_usuarios_fincas" ON "usuarios_fincas" USING btree ("usuario_id","finca_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_usuarios_roles" ON "usuarios_roles_asignacion" USING btree ("usuario_id","rol_id","finca_id");
