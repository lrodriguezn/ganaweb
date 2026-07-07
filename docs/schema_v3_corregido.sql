-- =============================================================================
-- GanaWeb - Estructura de Base de Datos
-- Consolidado de migraciones 0000, 0001, 0002 + correcciones v3
-- v3: sintaxis SQLite válida (CURRENT_TIMESTAMP), FKs de tipos consistentes,
--     rol por finca, referencias finca->finca, tablas de eventos faltantes
--     (palpaciones, pesos, produccion lactea, ventas, muertes, historicos)
-- v3.1 (endurecimiento auth): refresh tokens y códigos 2FA HASHEADOS,
--     sesiones separadas de la auditoría de login, recuperación de
--     contraseña, verificación de email, lockout por intentos, únicos en
--     usuarios_fincas y usuarios_permisos. Hash recomendado: argon2id
--     para contraseñas; SHA-256 para tokens de sesión/recuperación.
-- Base de datos: SQLite
-- =============================================================================

-- =============================================================================
-- USUARIOS
-- =============================================================================

CREATE TABLE `usuarios` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`nombre` text(100) NOT NULL,
	`email` text(100) NOT NULL,
	`email_verificado` integer DEFAULT 0 NOT NULL,      -- v3.1
	`intentos_fallidos` integer DEFAULT 0 NOT NULL,     -- v3.1: lockout de login
	`bloqueado_hasta` TIMESTAMPTZ,                      -- v3.1
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX `usuarios_email_unique` ON `usuarios` (`email`);

CREATE TABLE `usuarios_contrasena` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`usuario_id` TEXT NOT NULL,
	`contrasena_hash` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `usuarios_contrasena_usuario_id_unique` ON `usuarios_contrasena` (`usuario_id`);

CREATE TABLE `usuarios_historial_contrasenas` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`usuario_id` TEXT NOT NULL,
	`contrasena_hash` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);

-- v3.1: SOLO auditoría de intentos (append-only). Las sesiones/refresh
-- tokens viven en usuarios_sesiones, con el token HASHEADO.
CREATE TABLE `usuarios_login` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`usuario_id` TEXT NOT NULL,
	`exitoso` integer DEFAULT 0,
	`ip` text(45),
	`user_agent` text,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE INDEX idx_usuarios_login_usuario ON usuarios_login (usuario_id, created_at DESC);

-- v3.1: sesiones con refresh token HASHEADO (nunca en claro) y revocación
CREATE TABLE `usuarios_sesiones` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`usuario_id` TEXT NOT NULL,
	`refresh_token_hash` text NOT NULL,
	`dispositivo_id` text(100),
	`ip` text(45),
	`user_agent` text,
	`fecha_expiracion` TIMESTAMPTZ NOT NULL,
	`revocada_en` TIMESTAMPTZ,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`)
);
CREATE UNIQUE INDEX uq_sesiones_token ON usuarios_sesiones (refresh_token_hash);
CREATE INDEX idx_sesiones_usuario ON usuarios_sesiones (usuario_id, revocada_en);

-- v3.1: recuperación de contraseña (soporta "¿Olvidaste tu contraseña?")
CREATE TABLE `usuarios_recuperacion_contrasena` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`usuario_id` TEXT NOT NULL,
	`token_hash` text NOT NULL,
	`fecha_expiracion` TIMESTAMPTZ NOT NULL,
	`usado_en` TIMESTAMPTZ,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`)
);
CREATE UNIQUE INDEX uq_recuperacion_token ON usuarios_recuperacion_contrasena (token_hash);

CREATE TABLE `usuarios_autenticacion_dos_factores` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`usuario_id` TEXT NOT NULL,
	`metodo` text(20) DEFAULT 'email' NOT NULL,
	`codigo_hash` text,                                 -- v3.1: hash, no el código
	`fecha_expiracion` integer,
	`intentos_fallidos` integer DEFAULT 0,
	`habilitado` integer DEFAULT 0,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`activo` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `usuarios_autenticacion_dos_factores_usuario_id_unique` ON `usuarios_autenticacion_dos_factores` (`usuario_id`);

CREATE TABLE `usuarios_roles` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`nombre` text(50) NOT NULL,
	`descripcion` text,
	`es_sistema` integer DEFAULT 0,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`activo` integer DEFAULT 1 NOT NULL
);

CREATE TABLE `usuarios_permisos` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`modulo` text(50) NOT NULL,
	`accion` text(50) NOT NULL,
	`nombre` text(100) NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`activo` integer DEFAULT 1 NOT NULL
);

CREATE TABLE `roles_permisos` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`rol_id` TEXT NOT NULL,
	`permiso_id` TEXT NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`activo` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`rol_id`) REFERENCES `usuarios_roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`permiso_id`) REFERENCES `usuarios_permisos`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `uq_usuarios_permisos` ON `usuarios_permisos` (`modulo`,`accion`);
CREATE UNIQUE INDEX `uq_roles_permisos` ON `roles_permisos` (`rol_id`,`permiso_id`);

CREATE TABLE `usuarios_fincas` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`usuario_id` TEXT NOT NULL,
	`finca_id` TEXT NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`finca_id`) REFERENCES `fincas`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX uq_usuarios_fincas ON usuarios_fincas (usuario_id, finca_id);

CREATE TABLE `usuarios_roles_asignacion` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`usuario_id` TEXT NOT NULL,
	`rol_id` TEXT NOT NULL,
	`finca_id` TEXT REFERENCES fincas(id),  -- v3: rol por finca (NULL = rol global de sistema)
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`activo` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rol_id`) REFERENCES `usuarios_roles`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `uq_usuarios_roles` ON `usuarios_roles_asignacion` (`usuario_id`,`rol_id`,`finca_id`);

-- =============================================================================
-- fincas
-- =============================================================================

CREATE TABLE `fincas` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`codigo` text(20) NOT NULL,
	`nombre` text(100) NOT NULL,
	`departamento` text(100),
	`municipio` text(100),
	`vereda` text(100),
	`area_hectareas` real DEFAULT 0,
	`capacidad_maxima` integer DEFAULT 0,
	`tipo_explotacion_id` TEXT REFERENCES config_tipos_explotacion(id),
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `potreros` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`finca_id` TEXT NOT NULL,
	`codigo` text(20) NOT NULL,
	`nombre` text(100) NOT NULL,
	`area_hectareas` real DEFAULT 0,
	`tipo_pasto` text(100),
	`capacidad_maxima` integer DEFAULT 0,
	`estado` text(20) DEFAULT 'activo',
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`finca_id`) REFERENCES `fincas`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `uq_potreros_finca_codigo` ON `potreros` (`finca_id`,`codigo`);

CREATE TABLE `sectores` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`finca_id` TEXT NOT NULL,
	`codigo` text(20) NOT NULL,
	`nombre` text(100) NOT NULL,
	`area_hectareas` real DEFAULT 0,
	`tipo_pasto` text(100),
	`capacidad_maxima` integer DEFAULT 0,
	`estado` text(20) DEFAULT 'activo',
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`finca_id`) REFERENCES `fincas`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `uq_sectores_finca_codigo` ON `sectores` (`finca_id`,`codigo`);

CREATE TABLE `lotes` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`finca_id` TEXT NOT NULL,
	`nombre` text(100) NOT NULL,
	`descripcion` text,
	`tipo` text(50) DEFAULT 'producción',
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`finca_id`) REFERENCES `fincas`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `grupos` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`finca_id` TEXT NOT NULL,
	`nombre` text(100) NOT NULL,
	`descripcion` text,
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`finca_id`) REFERENCES `fincas`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `config_parametros_finca` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`finca_id` TEXT NOT NULL,
	`codigo` text(50) NOT NULL,
	`valor` text,
	`descripcion` text,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`activo` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`finca_id`) REFERENCES `fincas`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `uq_parametros_finca_codigo` ON `config_parametros_finca` (`finca_id`,`codigo`);

-- =============================================================================
-- ANIMALES
-- =============================================================================

CREATE TABLE `animales` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`finca_id` TEXT NOT NULL,
	`codigo` text(20) NOT NULL,
	`nombre` text(100) DEFAULT '',
	`fecha_nacimiento` integer,
	`fecha_compra` integer,
	`sexo_key` integer DEFAULT 0,
	`tipo_ingreso_id` integer DEFAULT 0,
	`madre_id` TEXT REFERENCES animales(id),
	`codigo_madre` text DEFAULT '',
	`ind_transferencia_embriones` integer DEFAULT 0,
	`codigo_donadora` text DEFAULT '',
	`tipo_padre_key` integer DEFAULT 0,
	`padre_id` TEXT REFERENCES animales(id),
	`codigo_padre` text DEFAULT '',
	`codigo_pajuela` text DEFAULT '',
	`config_razas_id` TEXT REFERENCES config_razas(id),
	`potrero_id` TEXT REFERENCES potreros(id),
	`sector_id` TEXT REFERENCES sectores(id),
	`lote_id` TEXT REFERENCES lotes(id),
	`grupo_id` TEXT REFERENCES grupos(id),
	`hierro_id` TEXT REFERENCES hierros(id),
	`propietario_id` TEXT REFERENCES propietarios(id),
	`calidad_animal_id` TEXT REFERENCES config_calidad_animal(id),
	`precio_compra` real DEFAULT 0,
	`peso_compra` real DEFAULT 0,
	`codigo_rfid` text DEFAULT '',
	`codigo_arete` text DEFAULT '',
	`codigo_qr` text DEFAULT '',
	`salud_animal_key` integer DEFAULT 0,
	`estado_animal_key` integer DEFAULT 0,
	`ind_descartado` integer DEFAULT 0,
	`tipo_explotacion_id` TEXT REFERENCES config_tipos_explotacion(id),
    `transferencia_embrion`   BOOLEAN NOT NULL DEFAULT FALSE,
    `donadora_id`             TEXT REFERENCES animales(id),
    `tipo_concepcion_padre`   TEXT CHECK (tipo_concepcion_padre IN ('monta','inseminacion')),
	
    -- [v2] Categoría reproductiva ("Vacia" en la cabecera de la ficha):
    -- derivada de eventos (último parto/palpación/servicio) pero cacheada
    -- para performance de listados. Actualizar por trigger o job.
    categoria_reproductiva  TEXT CHECK (categoria_reproductiva IN
                                ('vacia','servida','prenada','parida','novilla','no_aplica')),
    `tatuado` BOOLEAN NOT NULL DEFAULT FALSE,
	`herrado` BOOLEAN NOT NULL DEFAULT FALSE,
    `descornado` BOOLEAN NOT NULL DEFAULT FALSE,
    `numero_pezones` SMALLINT,
    `comentarios`    TEXT,
	`activo` integer DEFAULT 1 NOT NULL,
	`usuario_creado_por` TEXT REFERENCES usuarios(id),
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`version` integer DEFAULT 1 NOT NULL
);
CREATE INDEX `idx_animales_finca_activo` ON `animales` (`finca_id`,`activo`);
CREATE UNIQUE INDEX `uq_animales_finca_codigo` ON `animales` (`finca_id`,`codigo`);
CREATE INDEX idx_animales_madre ON animales (madre_id);
CREATE INDEX idx_animales_padre ON animales (padre_id);

CREATE TABLE `imagenes` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`finca_id` TEXT NOT NULL,
	`ruta` text NOT NULL,
	`nombre_original` text(255),
	`mime_type` text(50),
	`tamano_bytes` integer,
	`descripcion` text,
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `animales_imagenes` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`animal_id` TEXT NOT NULL,
	`imagen_id` TEXT NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`animal_id`) REFERENCES `animales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`imagen_id`) REFERENCES `imagenes`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `uq_animales_imagenes` ON `animales_imagenes` (`animal_id`,`imagen_id`);

-- [v2] Pajuelas como inventario de semen: GANAWEB las trata como "animal"
-- con sexo=pajuela, pero necesitan control de dosis disponibles y costo.
CREATE TABLE pajuelas_inventario (
    `id`              TEXT PRIMARY KEY,
    `finca_id`       TEXT NOT NULL REFERENCES fincas(id),
    `animal_pajuela_id` TEXT NOT NULL REFERENCES animales(id),  -- el registro sexo='pajuela'
    `toro_origen_id`  TEXT REFERENCES animales(id),             -- toro del cual proviene el semen
    `fecha_ingreso`   DATE NOT NULL,
    `dosis_ingresadas` INTEGER NOT NULL,
    `dosis_disponibles` INTEGER NOT NULL,
    `precio_por_dosis` NUMERIC(14,2),
    `proveedor`       TEXT,
    `usuario_creado_por` TEXT REFERENCES usuarios(id),
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- =============================================================================
-- MAESTROS
-- =============================================================================

CREATE TABLE `veterinarios` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`finca_id` TEXT NOT NULL,
	`nombre` text(100) NOT NULL,
	`telefono` text(20),
	`email` text(100),
	`direccion` text,
	`numero_registro` text(50),
	`especialidad` text(100),
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`finca_id`) REFERENCES `fincas`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `propietarios` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`finca_id` TEXT NOT NULL,
	`nombre` text(100) NOT NULL,
	`tipo_documento` text(20),
	`numero_documento` text(50),
	`telefono` text(20),
	`email` text(100),
	`direccion` text,
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`finca_id`) REFERENCES `fincas`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `hierros` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`finca_id` TEXT NOT NULL,
	`nombre` text(100) NOT NULL,
	`descripcion` text,
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`finca_id`) REFERENCES `fincas`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `diagnosticos_veterinarios` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`finca_id` TEXT NOT NULL,
	`nombre` text(100) NOT NULL,
	`descripcion` text,
	`categoria` text(50),
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`finca_id`) REFERENCES `fincas`(`id`) ON UPDATE no action ON DELETE no action	
);

CREATE TABLE `motivos_ventas` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`finca_id` TEXT NOT NULL,
	`nombre` text(100) NOT NULL,
	`descripcion` text,
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`finca_id`) REFERENCES `fincas`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `causas_muerte` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`finca_id` TEXT NOT NULL,
	`nombre` text(100) NOT NULL,
	`descripcion` text,
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`finca_id`) REFERENCES `fincas`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `lugares_compras` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`finca_id` TEXT NOT NULL,
	`nombre` text(100) NOT NULL,
	`tipo` text(50),
	`ubicacion` text,
	`contacto` text,
	`telefono` text(20),
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`finca_id`) REFERENCES `fincas`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `lugares_ventas` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`finca_id` TEXT NOT NULL,
	`nombre` text(100) NOT NULL,
	`tipo` text(50),
	`ubicacion` text,
	`contacto` text,
	`telefono` text(20),
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`finca_id`) REFERENCES `fincas`(`id`) ON UPDATE no action ON DELETE no action
);

-- =============================================================================
-- SERVICIOS
-- =============================================================================

-- ---------------------------------------------------------------------
-- 3. [v2] REGISTROS GRUPALES (requisito: 1 animal o varios)
-- ---------------------------------------------------------------------
-- Cabecera de toda operación masiva. Cada tabla de eventos lleva un
-- registro_grupal_id opcional: NULL = registro individual; con valor =
-- fila creada como parte de una operación grupal (vacunación de lote,
-- pesaje masivo, importación de Excel, etc.). Permite auditar, listar
-- y anular la operación completa como unidad.
CREATE TABLE registros_grupales (
    `id`              TEXT PRIMARY KEY,
    `finca_id`        TEXT NOT NULL REFERENCES fincas(id),
    `tipo_evento`     TEXT NOT NULL CHECK (tipo_evento IN
                        ('servicio','palpacion','parto','produccion','peso',
                         'tratamiento','revision','reubicacion','importacion_excel')),
    `descripcion`     TEXT,                    -- ej: "Vacunación aftosa Lote 4"
    `lote_id`         TEXT REFERENCES lotes(id),      -- criterio de selección usado
    `potrero_id`      TEXT REFERENCES potreros(id),
    `total_animales`  INTEGER NOT NULL,
    `fecha`           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `anulado_en`      TIMESTAMPTZ,             -- anular cabecera anula las filas hijas
    `usuario_creado_por`  TEXT REFERENCES usuarios(id),
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_reg_grupales_finca ON registros_grupales (finca_id, fecha DESC);

-- ---------------------------------------------------------------------
-- 4. EVENTOS REPRODUCTIVOS
-- ---------------------------------------------------------------------
-- [v2] Servicios ampliado: pajuela, inseminador, dosis, precio, efectivo
CREATE TABLE servicios (
    `id`              TEXT PRIMARY KEY,
    `animal_id`       TEXT NOT NULL REFERENCES animales(id),   -- hembra servida
    `registro_grupal_id` TEXT REFERENCES registros_grupales(id),
    `fecha`           DATE NOT NULL,
    `tipo`            TEXT NOT NULL CHECK (tipo IN ('monta','inseminacion','transferencia_embrion')),
    `padre_id`        TEXT REFERENCES animales(id),            -- toro (monta)
    `pajuela_id`      TEXT REFERENCES animales(id),            -- pajuela (IA), sexo='pajuela'
    `inseminador_id`  TEXT REFERENCES veterinarios(id),
    `tipo_inseminacion`      TEXT
                        CHECK (tipo_inseminacion IN ('convencional','sexada')),
    `dosis`           SMALLINT DEFAULT 1,                       -- nro de pajuelas usadas
    `precio`          NUMERIC(14,2),                            -- costo del servicio
    `efectivo`        BOOLEAN,                                  -- NULL=pendiente; se actualiza con la palpación
    `observaciones`   TEXT,
    `usuario_creado_por`  TEXT REFERENCES usuarios(id),
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_servicios_animal ON servicios (animal_id, fecha DESC);

-- [v2] Partos rediseñado: conteos (soporta partos múltiples y abortos)
-- + tabla puente hacia las crías creadas como animales
CREATE TABLE partos (
    `id`              TEXT PRIMARY KEY,
    `animal_id`       TEXT NOT NULL REFERENCES animales(id),   -- madre
    `registro_grupal_id` TEXT REFERENCES registros_grupales(id),
    `servicio_id`     TEXT REFERENCES servicios(id),           -- servicio que originó la gestación
    `fecha`           DATE NOT NULL,
    `machos`          SMALLINT NOT NULL DEFAULT 0,
    `hembras`         SMALLINT NOT NULL DEFAULT 0,
    `muertos`         SMALLINT NOT NULL DEFAULT 0,             -- muertos / aborto
    `tipo_parto`      TEXT NOT NULL DEFAULT 'normal'
                        CHECK (tipo_parto IN ('normal','distocia','cesarea','aborto','premature')),
    `comentarios`     TEXT,
    `usuario_creado_por`  TEXT REFERENCES usuarios(id),
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_partos_animal ON partos (animal_id, fecha DESC);

CREATE TABLE partos_crias (               -- [v2] N crías por parto
    `id`        TEXT PRIMARY KEY,
    `parto_id`  TEXT NOT NULL REFERENCES partos(id),
    `cria_id`   TEXT NOT NULL REFERENCES animales(id),
    UNIQUE (parto_id, cria_id)
);

-- ---------------------------------------------------------------------
-- 6. [v2] MÓDULO SANITARIO CON INVENTARIO
-- ---------------------------------------------------------------------
-- Catálogo de productos (pantalla "Ficha Tratamientos/Vacunas")
CREATE TABLE productos_sanitarios (
    `id`                TEXT PRIMARY KEY,
    `finca_id`        TEXT NOT NULL REFERENCES fincas(id),
    `codigo`            TEXT NOT NULL,
    `descripcion`      TEXT NOT NULL,
    `ml_mg_por_dosis`   NUMERIC(10,2),
    `tipo_tratamiento`  TEXT NOT NULL DEFAULT 'no_reproductivo'
                          CHECK (tipo_tratamiento IN ('reproductivo','no_reproductivo','vacuna')),
    `precio_dosis`      NUMERIC(14,2),          -- precio de referencia actual
    `comentarios`       TEXT,
    `activo`            BOOLEAN NOT NULL DEFAULT TRUE,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (finca_id, codigo)
);

-- Entradas de almacén (pantalla "Ingreso Tratamientos/Vacunas Almacén")
CREATE TABLE almacen_entradas (
    `id`              TEXT PRIMARY KEY,
    `producto_id`     TEXT NOT NULL REFERENCES productos_sanitarios(id),
    `fecha`           DATE NOT NULL,
    `dosis`           INTEGER NOT NULL,          -- cantidad de dosis ingresadas
    `precio_por_dosis` NUMERIC(14,2),
    `comentario`      TEXT,
    `usuario_creado_por`  TEXT REFERENCES usuarios(id),
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Aplicaciones al animal (pantalla "Vacunas/Tratamientos")
-- El inventario disponible = SUM(entradas.dosis) - SUM(aplicaciones.dosis)
-- por producto; materialízalo en una vista o campo cache si el volumen crece.
CREATE TABLE aplicaciones_sanitarias (
    `id`              TEXT PRIMARY KEY,
    `animal_id`       TEXT NOT NULL REFERENCES animales(id),
    `registro_grupal_id` TEXT REFERENCES registros_grupales(id),
    `producto_id`     TEXT NOT NULL REFERENCES productos_sanitarios(id),
    `fecha`           DATE NOT NULL,
    `dosis`           NUMERIC(10,2) NOT NULL DEFAULT 1,
    `precio_dosis`    NUMERIC(14,2),             -- snapshot del precio al aplicar (costeo)
    `proxima_dosis`   DATE,                       -- refuerzos / calendarios de vacunación
    `comentarios`     TEXT,
    `usuario_creado_por`  TEXT REFERENCES usuarios(id),
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_aplicaciones_animal ON aplicaciones_sanitarias (animal_id, fecha DESC);
CREATE INDEX idx_aplicaciones_producto ON aplicaciones_sanitarias (producto_id, fecha DESC);

-- Vista de inventario disponible por producto
CREATE VIEW inventario_sanitario AS
SELECT p.id AS producto_id, p.finca_id, p.codigo, p.descripcion,
       COALESCE(e.total_entradas, 0) - COALESCE(a.total_aplicado, 0) AS dosis_disponibles
FROM productos_sanitarios p
LEFT JOIN (SELECT producto_id, SUM(dosis) total_entradas
           FROM almacen_entradas GROUP BY producto_id) e ON e.producto_id = p.id
LEFT JOIN (SELECT producto_id, SUM(dosis) total_aplicado
           FROM aplicaciones_sanitarias GROUP BY producto_id) a ON a.producto_id = p.id;

-- [v2] Revisiones veterinarias: diagnóstico FK + celo presentado
CREATE TABLE revisiones_veterinarias (
    `id`              TEXT PRIMARY KEY,
    `animal_id`       TEXT NOT NULL REFERENCES animales(id),
    `registro_grupal_id` TEXT REFERENCES registros_grupales(id),
    `fecha`           DATE NOT NULL,
    `diagnostico_id`  TEXT REFERENCES diagnosticos_veterinarios(id),
    `tipo_diagnostico`  TEXT NOT NULL DEFAULT 'vitaminas'
                          CHECK (tipo_diagnostico IN ('vitaminas','desparasitación','tratamiento')),
    `celo_presentado` BOOLEAN NOT NULL DEFAULT FALSE,
    `comentarios`     TEXT,
    `veterinario_id`  TEXT REFERENCES veterinarios(id),
    `usuario_creado_por`  TEXT REFERENCES usuarios(id),
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_revisiones_animal ON revisiones_veterinarias (animal_id, fecha DESC);

-- =============================================================================
-- CONFIGURACION
-- =============================================================================

CREATE TABLE `config_razas` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`nombre` text(100) NOT NULL,
	`descripcion` text,
	`origen` text(100),
	`tipo_produccion` text(50),
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `config_condiciones_corporales` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`nombre` text(100) NOT NULL,
	`descripcion` text,
	`valor_min` integer DEFAULT 1,
	`valor_max` integer DEFAULT 5,
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `config_tipos_explotacion` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`nombre` text(100) NOT NULL,
	`descripcion` text,
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `config_calidad_animal` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`nombre` text(100) NOT NULL,
	`descripcion` text,
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `config_colores` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`nombre` text(50) NOT NULL,
	`codigo` text(20),
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `config_rangos_edades` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`nombre` text(100) NOT NULL,
	`rango1` integer NOT NULL,
	`rango2` integer NOT NULL,
	`sexo` integer DEFAULT 0,
	`descripcion` text,
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `config_key_values` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`opcion` text(50) NOT NULL,
	`key` text(100) NOT NULL,
	`value` text,
	`descripcion` text,
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX `uq_config_key_values` ON `config_key_values` (`opcion`,`key`);

-- ---------------------------------------------------------------------
-- 9. SINCRONIZACIÓN OFFLINE
-- ---------------------------------------------------------------------
CREATE TABLE sync_outbox (
    `id`              TEXT PRIMARY KEY,
    `finca_id`        TEXT NOT NULL REFERENCES fincas(id),
    `dispositivo_id`  TEXT NOT NULL,
    `tabla_destino`   TEXT NOT NULL,
    `operacion`       TEXT NOT NULL CHECK (operacion IN ('insert','update','delete')),
    `payload`         JSONB NOT NULL,
    `aplicado_en`     TIMESTAMPTZ,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- NOTIFICACIONES
-- =============================================================================

CREATE TABLE `notificaciones` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`finca_id` TEXT NOT NULL,
	`usuario_id` TEXT REFERENCES usuarios(id),
	`tipo` text(50) NOT NULL,
	`titulo` text(200) NOT NULL,
	`mensaje` text NOT NULL,
	`entidad_tipo` text(50),
	`entidad_id` integer,
	`leida` integer DEFAULT 0,
	`fecha_evento` integer,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`activo` integer DEFAULT 1 NOT NULL
);
CREATE INDEX `idx_notificaciones_finca_activo` ON `notificaciones` (`finca_id`,`activo`);
CREATE INDEX `idx_notificaciones_finca_leida` ON `notificaciones` (`finca_id`,`leida`);

CREATE TABLE `notificaciones_preferencias` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`usuario_id` TEXT NOT NULL,
	`tipo` text(50) NOT NULL,
	`canal_inapp` integer DEFAULT 1,
	`canal_email` integer DEFAULT 1,
	`canal_push` integer DEFAULT 0,
	`dias_anticipacion` integer DEFAULT 7,
	`activo` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `uq_notificaciones_preferencias` ON `notificaciones_preferencias` (`usuario_id`,`tipo`);

CREATE TABLE `notificaciones_push_tokens` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`usuario_id` TEXT NOT NULL,
	`token` text(500) NOT NULL,
	`plataforma` text(20) NOT NULL,
	`created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`activo` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `uq_notificaciones_push_tokens` ON `notificaciones_push_tokens` (`usuario_id`,`token`);


-- =============================================================================
-- v3: EVENTOS FALTANTES (existían en el esquema v2 / los exigen las pantallas)
-- =============================================================================

CREATE TABLE palpaciones (
    `id`              TEXT PRIMARY KEY,
    `animal_id`       TEXT NOT NULL REFERENCES animales(id),
    `registro_grupal_id` TEXT REFERENCES registros_grupales(id),
    `servicio_id`     TEXT REFERENCES servicios(id),
    `fecha`           DATE NOT NULL,
    `diagnostico_id`  TEXT REFERENCES diagnosticos_veterinarios(id),
    `resultado`       TEXT CHECK (resultado IN ('prenada','vacia','dudoso')),
    `dias_gestacion`  INTEGER,
    `comentarios`     TEXT,
    `usuario_creado_por` TEXT REFERENCES usuarios(id),
    `created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_palpaciones_animal ON palpaciones (animal_id, fecha DESC);

CREATE TABLE pesos (
    `id`              TEXT PRIMARY KEY,
    `animal_id`       TEXT NOT NULL REFERENCES animales(id),
    `registro_grupal_id` TEXT REFERENCES registros_grupales(id),
    `fecha`           DATE NOT NULL,
    `peso_kg`         NUMERIC(10,2) NOT NULL,
    `tipo_peso`       TEXT NOT NULL DEFAULT 'control'
                        CHECK (tipo_peso IN ('nacimiento','destete','control','compra','venta')),
    `comentarios`     TEXT,
    `usuario_creado_por` TEXT REFERENCES usuarios(id),
    `created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_pesos_animal ON pesos (animal_id, fecha DESC);

CREATE TABLE producciones_lacteas (
    `id`              TEXT PRIMARY KEY,
    `animal_id`       TEXT NOT NULL REFERENCES animales(id),
    `registro_grupal_id` TEXT REFERENCES registros_grupales(id),
    `fecha`           DATE NOT NULL,
    `cantidad_am`     NUMERIC(10,2) NOT NULL DEFAULT 0,
    `cantidad_pm`     NUMERIC(10,2) NOT NULL DEFAULT 0,
    -- snapshot de ubicación al momento del ordeño (el animal se mueve)
    `potrero_id`      TEXT REFERENCES potreros(id),
    `sector_id`       TEXT REFERENCES sectores(id),
    `lote_id`         TEXT REFERENCES lotes(id),
    `grupo_id`        TEXT REFERENCES grupos(id),
    `usuario_creado_por` TEXT REFERENCES usuarios(id),
    `created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (animal_id, fecha)
);
CREATE INDEX idx_prod_lactea_fecha ON producciones_lacteas (fecha, potrero_id);

-- Ventas y muertes: los maestros motivos_ventas / causas_muerte /
-- lugares_ventas existían sin tabla de evento que los usara.
CREATE TABLE ventas (
    `id`              TEXT PRIMARY KEY,
    `animal_id`       TEXT NOT NULL REFERENCES animales(id),
    `registro_grupal_id` TEXT REFERENCES registros_grupales(id),
    `fecha`           DATE NOT NULL,
    `motivo_venta_id` TEXT REFERENCES motivos_ventas(id),
    `lugar_venta_id`  TEXT REFERENCES lugares_ventas(id),
    `peso_venta_kg`   NUMERIC(10,2),
    `precio`          NUMERIC(14,2),
    `comprador`       TEXT,
    `comentarios`     TEXT,
    `usuario_creado_por` TEXT REFERENCES usuarios(id),
    `created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ventas_animal ON ventas (animal_id, fecha DESC);

CREATE TABLE muertes (
    `id`              TEXT PRIMARY KEY,
    `animal_id`       TEXT NOT NULL REFERENCES animales(id),
    `fecha`           DATE NOT NULL,
    `causa_muerte_id` TEXT REFERENCES causas_muerte(id),
    `comentarios`     TEXT,
    `usuario_creado_por` TEXT REFERENCES usuarios(id),
    `created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Históricos de estado (v2): reubicaciones y condición corporal
CREATE TABLE animales_ubicacion_historico (
    `id`           TEXT PRIMARY KEY,
    `animal_id`    TEXT NOT NULL REFERENCES animales(id),
    `registro_grupal_id` TEXT REFERENCES registros_grupales(id),
    `potrero_id`   TEXT REFERENCES potreros(id),
    `sector_id`    TEXT REFERENCES sectores(id),
    `lote_id`      TEXT REFERENCES lotes(id),
    `grupo_id`     TEXT REFERENCES grupos(id),
    `fecha`        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `motivo`       TEXT,
    `usuario_creado_por` TEXT REFERENCES usuarios(id)
);
CREATE INDEX idx_ubic_hist_animal ON animales_ubicacion_historico (animal_id, fecha DESC);

CREATE TABLE animales_condicion_corporal (
    `id`           TEXT PRIMARY KEY,
    `animal_id`    TEXT NOT NULL REFERENCES animales(id),
    `condicion_id` TEXT REFERENCES config_condiciones_corporales(id),
    `puntaje`      NUMERIC(3,1) NOT NULL,
    `fecha`        DATE NOT NULL,
    `usuario_creado_por` TEXT REFERENCES usuarios(id)
);
