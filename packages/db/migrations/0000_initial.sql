CREATE TABLE "almacen_entradas" (
	"id" text PRIMARY KEY NOT NULL,
	"producto_id" text NOT NULL,
	"fecha" date NOT NULL,
	"dosis" integer NOT NULL,
	"precio_por_dosis" numeric(14, 2),
	"comentario" text,
	"usuario_creado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "animales" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"nombre" varchar(100) DEFAULT '',
	"fecha_nacimiento" integer,
	"fecha_compra" integer,
	"sexo_key" integer DEFAULT 0,
	"tipo_ingreso_id" integer DEFAULT 0,
	"madre_id" text,
	"codigo_madre" text DEFAULT '',
	"ind_transferencia_embriones" integer DEFAULT 0,
	"codigo_donadora" text DEFAULT '',
	"tipo_padre_key" integer DEFAULT 0,
	"padre_id" text,
	"codigo_padre" text DEFAULT '',
	"codigo_pajuela" text DEFAULT '',
	"config_razas_id" text,
	"potrero_id" text,
	"sector_id" text,
	"lote_id" text,
	"grupo_id" text,
	"hierro_id" text,
	"propietario_id" text,
	"calidad_animal_id" text,
	"precio_compra" real DEFAULT 0,
	"peso_compra" real DEFAULT 0,
	"codigo_rfid" text DEFAULT '',
	"codigo_arete" text DEFAULT '',
	"codigo_qr" text DEFAULT '',
	"salud_animal_key" integer DEFAULT 0,
	"estado_animal_key" integer DEFAULT 0,
	"ind_descartado" integer DEFAULT 0,
	"tipo_explotacion_id" text,
	"transferencia_embrion" boolean DEFAULT false NOT NULL,
	"donadora_id" text,
	"tipo_concepcion_padre" text,
	"categoria_reproductiva" text,
	"tatuado" boolean DEFAULT false NOT NULL,
	"herrado" boolean DEFAULT false NOT NULL,
	"descornado" boolean DEFAULT false NOT NULL,
	"numero_pezones" smallint,
	"comentarios" text,
	"activo" integer DEFAULT 1 NOT NULL,
	"usuario_creado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "animales_condicion_corporal" (
	"id" text PRIMARY KEY NOT NULL,
	"animal_id" text NOT NULL,
	"condicion_id" text,
	"puntaje" numeric(3, 1) NOT NULL,
	"fecha" date NOT NULL,
	"usuario_creado_por" text
);
--> statement-breakpoint
CREATE TABLE "animales_imagenes" (
	"id" text PRIMARY KEY NOT NULL,
	"animal_id" text NOT NULL,
	"imagen_id" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "animales_ubicacion_historico" (
	"id" text PRIMARY KEY NOT NULL,
	"animal_id" text NOT NULL,
	"registro_grupal_id" text,
	"potrero_id" text,
	"sector_id" text,
	"lote_id" text,
	"grupo_id" text,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"motivo" text,
	"usuario_creado_por" text
);
--> statement-breakpoint
CREATE TABLE "aplicaciones_sanitarias" (
	"id" text PRIMARY KEY NOT NULL,
	"animal_id" text NOT NULL,
	"registro_grupal_id" text,
	"producto_id" text NOT NULL,
	"fecha" date NOT NULL,
	"dosis" numeric(10, 2) DEFAULT '1' NOT NULL,
	"precio_dosis" numeric(14, 2),
	"proxima_dosis" date,
	"comentarios" text,
	"usuario_creado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "causas_muerte" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config_calidad_animal" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config_colores" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" varchar(50) NOT NULL,
	"codigo" varchar(20),
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config_condiciones_corporales" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"valor_min" integer DEFAULT 1,
	"valor_max" integer DEFAULT 5,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config_key_values" (
	"id" text PRIMARY KEY NOT NULL,
	"opcion" varchar(50) NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text,
	"descripcion" text,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config_parametros_finca" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"codigo" varchar(50) NOT NULL,
	"valor" text,
	"descripcion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config_rangos_edades" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"rango1" integer NOT NULL,
	"rango2" integer NOT NULL,
	"sexo" integer DEFAULT 0,
	"descripcion" text,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config_razas" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"origen" varchar(100),
	"tipo_produccion" varchar(50),
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config_tipos_explotacion" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diagnosticos_veterinarios" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"categoria" varchar(50),
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fincas" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"departamento" varchar(100),
	"municipio" varchar(100),
	"vereda" varchar(100),
	"area_hectareas" real DEFAULT 0,
	"capacidad_maxima" integer DEFAULT 0,
	"tipo_explotacion_id" text,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grupos" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hierros" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imagenes" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"ruta" text NOT NULL,
	"nombre_original" varchar(255),
	"mime_type" varchar(50),
	"tamano_bytes" integer,
	"descripcion" text,
	"activo" integer DEFAULT 1 NOT NULL,
	"usuario_creado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lotes" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"tipo" varchar(50) DEFAULT 'producción',
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lugares_compras" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"tipo" varchar(50),
	"ubicacion" text,
	"contacto" text,
	"telefono" varchar(20),
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lugares_ventas" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"tipo" varchar(50),
	"ubicacion" text,
	"contacto" text,
	"telefono" varchar(20),
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "motivos_ventas" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "muertes" (
	"id" text PRIMARY KEY NOT NULL,
	"animal_id" text NOT NULL,
	"fecha" date NOT NULL,
	"causa_muerte_id" text,
	"comentarios" text,
	"usuario_creado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificaciones" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"usuario_id" text,
	"tipo" varchar(50) NOT NULL,
	"titulo" varchar(200) NOT NULL,
	"mensaje" text NOT NULL,
	"entidad_tipo" varchar(50),
	"entidad_id" text,
	"leida" integer DEFAULT 0,
	"fecha_evento" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificaciones_preferencias" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"canal_inapp" integer DEFAULT 1,
	"canal_email" integer DEFAULT 1,
	"canal_push" integer DEFAULT 0,
	"dias_anticipacion" integer DEFAULT 7,
	"activo" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificaciones_push_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"token" varchar(500) NOT NULL,
	"plataforma" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pajuelas_inventario" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"animal_pajuela_id" text NOT NULL,
	"toro_origen_id" text,
	"fecha_ingreso" date NOT NULL,
	"dosis_ingresadas" integer NOT NULL,
	"dosis_disponibles" integer NOT NULL,
	"precio_por_dosis" numeric(14, 2),
	"proveedor" text,
	"usuario_creado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "palpaciones" (
	"id" text PRIMARY KEY NOT NULL,
	"animal_id" text NOT NULL,
	"registro_grupal_id" text,
	"servicio_id" text,
	"fecha" date NOT NULL,
	"diagnostico_id" text,
	"resultado" text,
	"dias_gestacion" integer,
	"comentarios" text,
	"usuario_creado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partos" (
	"id" text PRIMARY KEY NOT NULL,
	"animal_id" text NOT NULL,
	"registro_grupal_id" text,
	"servicio_id" text,
	"fecha" date NOT NULL,
	"machos" smallint DEFAULT 0 NOT NULL,
	"hembras" smallint DEFAULT 0 NOT NULL,
	"muertos" smallint DEFAULT 0 NOT NULL,
	"tipo_parto" text DEFAULT 'normal' NOT NULL,
	"comentarios" text,
	"usuario_creado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partos_crias" (
	"id" text PRIMARY KEY NOT NULL,
	"parto_id" text NOT NULL,
	"cria_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pesos" (
	"id" text PRIMARY KEY NOT NULL,
	"animal_id" text NOT NULL,
	"registro_grupal_id" text,
	"fecha" date NOT NULL,
	"peso_kg" numeric(10, 2) NOT NULL,
	"tipo_peso" text DEFAULT 'control' NOT NULL,
	"comentarios" text,
	"usuario_creado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "potreros" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"area_hectareas" real DEFAULT 0,
	"tipo_pasto" varchar(100),
	"capacidad_maxima" integer DEFAULT 0,
	"estado" varchar(20) DEFAULT 'activo',
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "producciones_lacteas" (
	"id" text PRIMARY KEY NOT NULL,
	"animal_id" text NOT NULL,
	"registro_grupal_id" text,
	"fecha" date NOT NULL,
	"cantidad_am" numeric(10, 2) DEFAULT '0' NOT NULL,
	"cantidad_pm" numeric(10, 2) DEFAULT '0' NOT NULL,
	"potrero_id" text,
	"sector_id" text,
	"lote_id" text,
	"grupo_id" text,
	"usuario_creado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productos_sanitarios" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"codigo" text NOT NULL,
	"descripcion" text NOT NULL,
	"ml_mg_por_dosis" numeric(10, 2),
	"tipo_tratamiento" text DEFAULT 'no_reproductivo' NOT NULL,
	"precio_dosis" numeric(14, 2),
	"comentarios" text,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "propietarios" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"tipo_documento" varchar(20),
	"numero_documento" varchar(50),
	"telefono" varchar(20),
	"email" varchar(100),
	"direccion" text,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registros_grupales" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"tipo_evento" text NOT NULL,
	"descripcion" text,
	"lote_id" text,
	"potrero_id" text,
	"total_animales" integer NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"anulado_en" timestamp with time zone,
	"usuario_creado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revisiones_veterinarias" (
	"id" text PRIMARY KEY NOT NULL,
	"animal_id" text NOT NULL,
	"registro_grupal_id" text,
	"fecha" date NOT NULL,
	"diagnostico_id" text,
	"tipo_diagnostico" text DEFAULT 'vitaminas' NOT NULL,
	"celo_presentado" integer DEFAULT 0 NOT NULL,
	"comentarios" text,
	"veterinario_id" text,
	"usuario_creado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "sectores" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"area_hectareas" real DEFAULT 0,
	"tipo_pasto" varchar(100),
	"capacidad_maxima" integer DEFAULT 0,
	"estado" varchar(20) DEFAULT 'activo',
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "servicios" (
	"id" text PRIMARY KEY NOT NULL,
	"animal_id" text NOT NULL,
	"registro_grupal_id" text,
	"fecha" date NOT NULL,
	"tipo" text NOT NULL,
	"padre_id" text,
	"pajuela_id" text,
	"inseminador_id" text,
	"tipo_inseminacion" text,
	"dosis" smallint DEFAULT 1,
	"precio" numeric(14, 2),
	"efectivo" integer,
	"observaciones" text,
	"usuario_creado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"dispositivo_id" text NOT NULL,
	"tabla_destino" text NOT NULL,
	"operacion" text NOT NULL,
	"payload" jsonb NOT NULL,
	"aplicado_en" timestamp with time zone,
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
CREATE TABLE "usuarios_autenticacion_dos_factores" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"metodo" varchar(20) DEFAULT 'email' NOT NULL,
	"codigo_hash" text,
	"fecha_expiracion" timestamp with time zone,
	"intentos_fallidos" integer DEFAULT 0,
	"habilitado" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL
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
CREATE TABLE "usuarios_fincas" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"finca_id" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios_historial_contrasenas" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"contrasena_hash" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "usuarios_permisos" (
	"id" text PRIMARY KEY NOT NULL,
	"modulo" varchar(50) NOT NULL,
	"accion" varchar(50) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios_recuperacion_contrasena" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"fecha_expiracion" timestamp with time zone NOT NULL,
	"usado_en" timestamp with time zone,
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
CREATE TABLE "usuarios_roles_asignacion" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"rol_id" text NOT NULL,
	"finca_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL
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
CREATE TABLE "ventas" (
	"id" text PRIMARY KEY NOT NULL,
	"animal_id" text NOT NULL,
	"registro_grupal_id" text,
	"fecha" date NOT NULL,
	"motivo_venta_id" text,
	"lugar_venta_id" text,
	"peso_venta_kg" numeric(10, 2),
	"precio" numeric(14, 2),
	"comprador" text,
	"comentarios" text,
	"usuario_creado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "veterinarios" (
	"id" text PRIMARY KEY NOT NULL,
	"finca_id" text NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"telefono" varchar(20),
	"email" varchar(100),
	"direccion" text,
	"numero_registro" varchar(50),
	"especialidad" varchar(100),
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "almacen_entradas" ADD CONSTRAINT "almacen_entradas_producto_id_productos_sanitarios_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos_sanitarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "almacen_entradas" ADD CONSTRAINT "almacen_entradas_usuario_creado_por_usuarios_id_fk" FOREIGN KEY ("usuario_creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales" ADD CONSTRAINT "animales_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales" ADD CONSTRAINT "animales_config_razas_id_config_razas_id_fk" FOREIGN KEY ("config_razas_id") REFERENCES "public"."config_razas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales" ADD CONSTRAINT "animales_potrero_id_potreros_id_fk" FOREIGN KEY ("potrero_id") REFERENCES "public"."potreros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales" ADD CONSTRAINT "animales_sector_id_sectores_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales" ADD CONSTRAINT "animales_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales" ADD CONSTRAINT "animales_grupo_id_grupos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales" ADD CONSTRAINT "animales_hierro_id_hierros_id_fk" FOREIGN KEY ("hierro_id") REFERENCES "public"."hierros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales" ADD CONSTRAINT "animales_propietario_id_propietarios_id_fk" FOREIGN KEY ("propietario_id") REFERENCES "public"."propietarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales" ADD CONSTRAINT "animales_calidad_animal_id_config_calidad_animal_id_fk" FOREIGN KEY ("calidad_animal_id") REFERENCES "public"."config_calidad_animal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales" ADD CONSTRAINT "animales_tipo_explotacion_id_config_tipos_explotacion_id_fk" FOREIGN KEY ("tipo_explotacion_id") REFERENCES "public"."config_tipos_explotacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales" ADD CONSTRAINT "animales_usuario_creado_por_usuarios_id_fk" FOREIGN KEY ("usuario_creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales" ADD CONSTRAINT "animales_madre_id_animales_id_fk" FOREIGN KEY ("madre_id") REFERENCES "public"."animales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales" ADD CONSTRAINT "animales_padre_id_animales_id_fk" FOREIGN KEY ("padre_id") REFERENCES "public"."animales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales" ADD CONSTRAINT "animales_donadora_id_animales_id_fk" FOREIGN KEY ("donadora_id") REFERENCES "public"."animales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales_condicion_corporal" ADD CONSTRAINT "animales_condicion_corporal_animal_id_animales_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales_condicion_corporal" ADD CONSTRAINT "animales_condicion_corporal_condicion_id_config_condiciones_corporales_id_fk" FOREIGN KEY ("condicion_id") REFERENCES "public"."config_condiciones_corporales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales_condicion_corporal" ADD CONSTRAINT "animales_condicion_corporal_usuario_creado_por_usuarios_id_fk" FOREIGN KEY ("usuario_creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales_imagenes" ADD CONSTRAINT "animales_imagenes_animal_id_animales_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales_imagenes" ADD CONSTRAINT "animales_imagenes_imagen_id_imagenes_id_fk" FOREIGN KEY ("imagen_id") REFERENCES "public"."imagenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales_ubicacion_historico" ADD CONSTRAINT "animales_ubicacion_historico_animal_id_animales_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales_ubicacion_historico" ADD CONSTRAINT "animales_ubicacion_historico_registro_grupal_id_registros_grupales_id_fk" FOREIGN KEY ("registro_grupal_id") REFERENCES "public"."registros_grupales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales_ubicacion_historico" ADD CONSTRAINT "animales_ubicacion_historico_potrero_id_potreros_id_fk" FOREIGN KEY ("potrero_id") REFERENCES "public"."potreros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales_ubicacion_historico" ADD CONSTRAINT "animales_ubicacion_historico_sector_id_sectores_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales_ubicacion_historico" ADD CONSTRAINT "animales_ubicacion_historico_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales_ubicacion_historico" ADD CONSTRAINT "animales_ubicacion_historico_grupo_id_grupos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animales_ubicacion_historico" ADD CONSTRAINT "animales_ubicacion_historico_usuario_creado_por_usuarios_id_fk" FOREIGN KEY ("usuario_creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aplicaciones_sanitarias" ADD CONSTRAINT "aplicaciones_sanitarias_animal_id_animales_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aplicaciones_sanitarias" ADD CONSTRAINT "aplicaciones_sanitarias_registro_grupal_id_registros_grupales_id_fk" FOREIGN KEY ("registro_grupal_id") REFERENCES "public"."registros_grupales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aplicaciones_sanitarias" ADD CONSTRAINT "aplicaciones_sanitarias_producto_id_productos_sanitarios_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos_sanitarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aplicaciones_sanitarias" ADD CONSTRAINT "aplicaciones_sanitarias_usuario_creado_por_usuarios_id_fk" FOREIGN KEY ("usuario_creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "causas_muerte" ADD CONSTRAINT "causas_muerte_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_parametros_finca" ADD CONSTRAINT "config_parametros_finca_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnosticos_veterinarios" ADD CONSTRAINT "diagnosticos_veterinarios_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fincas" ADD CONSTRAINT "fincas_tipo_explotacion_id_config_tipos_explotacion_id_fk" FOREIGN KEY ("tipo_explotacion_id") REFERENCES "public"."config_tipos_explotacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hierros" ADD CONSTRAINT "hierros_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imagenes" ADD CONSTRAINT "imagenes_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imagenes" ADD CONSTRAINT "imagenes_usuario_creado_por_usuarios_id_fk" FOREIGN KEY ("usuario_creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lugares_compras" ADD CONSTRAINT "lugares_compras_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lugares_ventas" ADD CONSTRAINT "lugares_ventas_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "motivos_ventas" ADD CONSTRAINT "motivos_ventas_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "muertes" ADD CONSTRAINT "muertes_animal_id_animales_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "muertes" ADD CONSTRAINT "muertes_causa_muerte_id_causas_muerte_id_fk" FOREIGN KEY ("causa_muerte_id") REFERENCES "public"."causas_muerte"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "muertes" ADD CONSTRAINT "muertes_usuario_creado_por_usuarios_id_fk" FOREIGN KEY ("usuario_creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones_preferencias" ADD CONSTRAINT "notificaciones_preferencias_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones_push_tokens" ADD CONSTRAINT "notificaciones_push_tokens_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pajuelas_inventario" ADD CONSTRAINT "pajuelas_inventario_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pajuelas_inventario" ADD CONSTRAINT "pajuelas_inventario_animal_pajuela_id_animales_id_fk" FOREIGN KEY ("animal_pajuela_id") REFERENCES "public"."animales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pajuelas_inventario" ADD CONSTRAINT "pajuelas_inventario_toro_origen_id_animales_id_fk" FOREIGN KEY ("toro_origen_id") REFERENCES "public"."animales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pajuelas_inventario" ADD CONSTRAINT "pajuelas_inventario_usuario_creado_por_usuarios_id_fk" FOREIGN KEY ("usuario_creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palpaciones" ADD CONSTRAINT "palpaciones_animal_id_animales_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palpaciones" ADD CONSTRAINT "palpaciones_registro_grupal_id_registros_grupales_id_fk" FOREIGN KEY ("registro_grupal_id") REFERENCES "public"."registros_grupales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palpaciones" ADD CONSTRAINT "palpaciones_servicio_id_servicios_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palpaciones" ADD CONSTRAINT "palpaciones_diagnostico_id_diagnosticos_veterinarios_id_fk" FOREIGN KEY ("diagnostico_id") REFERENCES "public"."diagnosticos_veterinarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palpaciones" ADD CONSTRAINT "palpaciones_usuario_creado_por_usuarios_id_fk" FOREIGN KEY ("usuario_creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partos" ADD CONSTRAINT "partos_animal_id_animales_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partos" ADD CONSTRAINT "partos_registro_grupal_id_registros_grupales_id_fk" FOREIGN KEY ("registro_grupal_id") REFERENCES "public"."registros_grupales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partos" ADD CONSTRAINT "partos_servicio_id_servicios_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partos" ADD CONSTRAINT "partos_usuario_creado_por_usuarios_id_fk" FOREIGN KEY ("usuario_creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partos_crias" ADD CONSTRAINT "partos_crias_parto_id_partos_id_fk" FOREIGN KEY ("parto_id") REFERENCES "public"."partos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partos_crias" ADD CONSTRAINT "partos_crias_cria_id_animales_id_fk" FOREIGN KEY ("cria_id") REFERENCES "public"."animales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pesos" ADD CONSTRAINT "pesos_animal_id_animales_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pesos" ADD CONSTRAINT "pesos_registro_grupal_id_registros_grupales_id_fk" FOREIGN KEY ("registro_grupal_id") REFERENCES "public"."registros_grupales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pesos" ADD CONSTRAINT "pesos_usuario_creado_por_usuarios_id_fk" FOREIGN KEY ("usuario_creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "potreros" ADD CONSTRAINT "potreros_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producciones_lacteas" ADD CONSTRAINT "producciones_lacteas_animal_id_animales_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producciones_lacteas" ADD CONSTRAINT "producciones_lacteas_registro_grupal_id_registros_grupales_id_fk" FOREIGN KEY ("registro_grupal_id") REFERENCES "public"."registros_grupales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producciones_lacteas" ADD CONSTRAINT "producciones_lacteas_potrero_id_potreros_id_fk" FOREIGN KEY ("potrero_id") REFERENCES "public"."potreros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producciones_lacteas" ADD CONSTRAINT "producciones_lacteas_sector_id_sectores_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producciones_lacteas" ADD CONSTRAINT "producciones_lacteas_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producciones_lacteas" ADD CONSTRAINT "producciones_lacteas_grupo_id_grupos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producciones_lacteas" ADD CONSTRAINT "producciones_lacteas_usuario_creado_por_usuarios_id_fk" FOREIGN KEY ("usuario_creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos_sanitarios" ADD CONSTRAINT "productos_sanitarios_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propietarios" ADD CONSTRAINT "propietarios_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_grupales" ADD CONSTRAINT "registros_grupales_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_grupales" ADD CONSTRAINT "registros_grupales_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_grupales" ADD CONSTRAINT "registros_grupales_potrero_id_potreros_id_fk" FOREIGN KEY ("potrero_id") REFERENCES "public"."potreros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_grupales" ADD CONSTRAINT "registros_grupales_usuario_creado_por_usuarios_id_fk" FOREIGN KEY ("usuario_creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisiones_veterinarias" ADD CONSTRAINT "revisiones_veterinarias_animal_id_animales_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisiones_veterinarias" ADD CONSTRAINT "revisiones_veterinarias_registro_grupal_id_registros_grupales_id_fk" FOREIGN KEY ("registro_grupal_id") REFERENCES "public"."registros_grupales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisiones_veterinarias" ADD CONSTRAINT "revisiones_veterinarias_diagnostico_id_diagnosticos_veterinarios_id_fk" FOREIGN KEY ("diagnostico_id") REFERENCES "public"."diagnosticos_veterinarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisiones_veterinarias" ADD CONSTRAINT "revisiones_veterinarias_veterinario_id_veterinarios_id_fk" FOREIGN KEY ("veterinario_id") REFERENCES "public"."veterinarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisiones_veterinarias" ADD CONSTRAINT "revisiones_veterinarias_usuario_creado_por_usuarios_id_fk" FOREIGN KEY ("usuario_creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_rol_id_usuarios_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."usuarios_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_permiso_id_usuarios_permisos_id_fk" FOREIGN KEY ("permiso_id") REFERENCES "public"."usuarios_permisos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sectores" ADD CONSTRAINT "sectores_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_animal_id_animales_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_registro_grupal_id_registros_grupales_id_fk" FOREIGN KEY ("registro_grupal_id") REFERENCES "public"."registros_grupales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_padre_id_animales_id_fk" FOREIGN KEY ("padre_id") REFERENCES "public"."animales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_pajuela_id_animales_id_fk" FOREIGN KEY ("pajuela_id") REFERENCES "public"."animales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_inseminador_id_veterinarios_id_fk" FOREIGN KEY ("inseminador_id") REFERENCES "public"."veterinarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_usuario_creado_por_usuarios_id_fk" FOREIGN KEY ("usuario_creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_outbox" ADD CONSTRAINT "sync_outbox_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_autenticacion_dos_factores" ADD CONSTRAINT "usuarios_autenticacion_dos_factores_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_contrasena" ADD CONSTRAINT "usuarios_contrasena_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_fincas" ADD CONSTRAINT "usuarios_fincas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_fincas" ADD CONSTRAINT "usuarios_fincas_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_historial_contrasenas" ADD CONSTRAINT "usuarios_historial_contrasenas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_login" ADD CONSTRAINT "usuarios_login_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_recuperacion_contrasena" ADD CONSTRAINT "usuarios_recuperacion_contrasena_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_roles_asignacion" ADD CONSTRAINT "usuarios_roles_asignacion_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_roles_asignacion" ADD CONSTRAINT "usuarios_roles_asignacion_rol_id_usuarios_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."usuarios_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_roles_asignacion" ADD CONSTRAINT "usuarios_roles_asignacion_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_sesiones" ADD CONSTRAINT "usuarios_sesiones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_animal_id_animales_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_registro_grupal_id_registros_grupales_id_fk" FOREIGN KEY ("registro_grupal_id") REFERENCES "public"."registros_grupales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_motivo_venta_id_motivos_ventas_id_fk" FOREIGN KEY ("motivo_venta_id") REFERENCES "public"."motivos_ventas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_lugar_venta_id_lugares_ventas_id_fk" FOREIGN KEY ("lugar_venta_id") REFERENCES "public"."lugares_ventas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_usuario_creado_por_usuarios_id_fk" FOREIGN KEY ("usuario_creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "veterinarios" ADD CONSTRAINT "veterinarios_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_animales_finca_codigo" ON "animales" USING btree ("finca_id","codigo");--> statement-breakpoint
CREATE INDEX "idx_animales_finca_activo" ON "animales" USING btree ("finca_id","activo");--> statement-breakpoint
CREATE INDEX "idx_animales_madre" ON "animales" USING btree ("madre_id");--> statement-breakpoint
CREATE INDEX "idx_animales_padre" ON "animales" USING btree ("padre_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_animales_imagenes" ON "animales_imagenes" USING btree ("animal_id","imagen_id");--> statement-breakpoint
CREATE INDEX "idx_ubic_hist_animal" ON "animales_ubicacion_historico" USING btree ("animal_id","fecha");--> statement-breakpoint
CREATE INDEX "idx_aplicaciones_animal" ON "aplicaciones_sanitarias" USING btree ("animal_id","fecha");--> statement-breakpoint
CREATE INDEX "idx_aplicaciones_producto" ON "aplicaciones_sanitarias" USING btree ("producto_id","fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_config_key_values" ON "config_key_values" USING btree ("opcion","key");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_parametros_finca_codigo" ON "config_parametros_finca" USING btree ("finca_id","codigo");--> statement-breakpoint
CREATE INDEX "idx_notificaciones_finca_activo" ON "notificaciones" USING btree ("finca_id","activo");--> statement-breakpoint
CREATE INDEX "idx_notificaciones_finca_leida" ON "notificaciones" USING btree ("finca_id","leida");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_notificaciones_preferencias" ON "notificaciones_preferencias" USING btree ("usuario_id","tipo");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_notificaciones_push_tokens" ON "notificaciones_push_tokens" USING btree ("usuario_id","token");--> statement-breakpoint
CREATE INDEX "idx_palpaciones_animal" ON "palpaciones" USING btree ("animal_id","fecha");--> statement-breakpoint
CREATE INDEX "idx_partos_animal" ON "partos" USING btree ("animal_id","fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_partos_crias" ON "partos_crias" USING btree ("parto_id","cria_id");--> statement-breakpoint
CREATE INDEX "idx_pesos_animal" ON "pesos" USING btree ("animal_id","fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_potreros_finca_codigo" ON "potreros" USING btree ("finca_id","codigo");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_producciones_lacteas_animal_fecha" ON "producciones_lacteas" USING btree ("animal_id","fecha");--> statement-breakpoint
CREATE INDEX "idx_prod_lactea_fecha" ON "producciones_lacteas" USING btree ("fecha","potrero_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_productos_sanitarios_finca_codigo" ON "productos_sanitarios" USING btree ("finca_id","codigo");--> statement-breakpoint
CREATE INDEX "idx_reg_grupales_finca" ON "registros_grupales" USING btree ("finca_id","fecha");--> statement-breakpoint
CREATE INDEX "idx_revisiones_animal" ON "revisiones_veterinarias" USING btree ("animal_id","fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_roles_permisos" ON "roles_permisos" USING btree ("rol_id","permiso_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sectores_finca_codigo" ON "sectores" USING btree ("finca_id","codigo");--> statement-breakpoint
CREATE INDEX "idx_servicios_animal" ON "servicios" USING btree ("animal_id","fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_email_unique" ON "usuarios" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_autenticacion_dos_factores_usuario_id_unique" ON "usuarios_autenticacion_dos_factores" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_contrasena_usuario_id_unique" ON "usuarios_contrasena" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_usuarios_fincas" ON "usuarios_fincas" USING btree ("usuario_id","finca_id");--> statement-breakpoint
CREATE INDEX "idx_usuarios_login_usuario" ON "usuarios_login" USING btree ("usuario_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_usuarios_permisos" ON "usuarios_permisos" USING btree ("modulo","accion");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_recuperacion_token" ON "usuarios_recuperacion_contrasena" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_usuarios_roles" ON "usuarios_roles_asignacion" USING btree ("usuario_id","rol_id","finca_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sesiones_token" ON "usuarios_sesiones" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "idx_sesiones_usuario" ON "usuarios_sesiones" USING btree ("usuario_id","revocada_en");--> statement-breakpoint
CREATE INDEX "idx_ventas_animal" ON "ventas" USING btree ("animal_id","fecha");
