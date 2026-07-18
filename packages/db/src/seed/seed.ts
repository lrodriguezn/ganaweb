/**
 * GanaWeb — Seed unificado (SQL directo)
 *
 * Unifica los antiguos seed-v3.ts y seed-v3-full.ts.
 * Las 2 fincas base (finca-esperanza, finca-roble) y sus parámetros
 * se crean SIEMPRE en seedSistema(). Los datos demo (usuarios, potreros,
 * etc.) solo se crean con SEED_DEMO=true.
 *
 * Idempotente: todos los INSERT usan ON CONFLICT DO NOTHING.
 *
 * Uso:
 *   DATABASE_URL=postgresql://... pnpm --filter @ganaweb/db seed
 *   SEED_DEMO=true pnpm --filter @ganaweb/db seed    (con datos demo)
 */
import "dotenv/config"
import postgres from "postgres"

// Argon2id hashes pre-generados (la app usa argon2id via auth-deps.server.ts)
// Si cambias las contraseñas, regenerar con: tsx --import argon2/argon2.cjs -e "..."
const HASH_ADMIN =
  "$argon2id$v=19$m=65536,t=3,p=4$HSoVPNg1NssYFciCaPQAFg$zSI02hnj77+Mwaxfc+DNSX5JFN6G+Gr0L+3yIFY0SJY"
const HASH_MAYORDOMO =
  "$argon2id$v=19$m=65536,t=3,p=4$OmLrMwlx1Mlreja/oT16CA$p8npKdACvDT0Z5TXXXLjG4bhtWY4nFmIJFlX0VfURes"
const HASH_TEST =
  "$argon2id$v=19$m=65536,t=3,p=4$VQSQcgmcbaFwlPB9c1HrYA$RXsbuhKsqFr8JBO6jnNB4EueQSbwF61d8RoNd8eYQ3Y"

const DEMO = process.env.SEED_DEMO === "true"

function log(message: string) {
  process.stdout.write(`${message}\n`)
}

function logError(error: unknown) {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error)
  process.stderr.write(`${message}\n`)
}

async function seed() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL no está configurada")
  }

  const sql = postgres(url, { max: 10 })

  log("🌱 Seeding GanaWeb v3 — nivel SISTEMA...")
  await seedSistema(sql)

  if (DEMO) {
    log("📦 SEED_DEMO=true — nivel DEMO...")
    await seedDemo(sql)
  }

  log("✅ Seed completado.")
  log("  • 2 fincas base creadas (La Esperanza / Hacienda El Roble)")
  if (DEMO) {
    log(
      "  • admin@ganaweb.demo / Admin123! (Administradora en La Esperanza, Solo lectura en El Roble)",
    )
    log("  • pedro@ganaweb.demo / Admin123! (Mayordomo en La Esperanza)")
  } else {
    log("  • Solo datos de sistema + fincas base. Para datos demo: SEED_DEMO=true")
  }

  await sql.end()
}

// =====================================================================
// NIVEL 1 — SISTEMA
// =====================================================================

async function seedSistema(sql: ReturnType<typeof postgres>) {
  // Roles semilla
  await sql`
    INSERT INTO usuarios_roles (id, nombre, descripcion, es_sistema, activo) VALUES
      ('rol-admin',       'Administrador', 'Acceso total a la finca', 1, 1),
      ('rol-mayordomo',   'Mayordomo',     'Operación diaria de campo', 1, 1),
      ('rol-veterinario', 'Veterinario',   'Sanidad y reproducción', 1, 1),
      ('rol-lectura',     'Solo lectura',  'Consulta sin edición', 1, 1)
    ON CONFLICT (id) DO NOTHING
  `

  // Catálogo de permisos
  const MODULOS: Record<string, string[]> = {
    // eliminar = borrado físico; solo el Administrador lo recibe en la matriz
    animales: ["ver", "crear", "editar", "inactivar", "eliminar"],
    eventos_reproductivos: ["ver", "crear", "editar", "anular"],
    eventos_productivos: ["ver", "crear", "editar", "anular"],
    sanidad: ["ver", "crear", "editar", "anular"],
    movimientos: ["ver", "crear", "anular"],
    reportes: ["ver", "exportar"],
    configuracion: ["ver", "crear", "editar", "inactivar"],
    fincas: ["crear", "editar", "invitar"],
    usuarios: ["ver", "administrar"],
  }

  const permisoId = (m: string, a: string) => `perm-${m}-${a}`
  const todosPermisos: { id: string; modulo: string; accion: string; nombre: string }[] = []

  for (const [modulo, acciones] of Object.entries(MODULOS)) {
    for (const accion of acciones) {
      todosPermisos.push({
        id: permisoId(modulo, accion),
        modulo,
        accion,
        nombre: `${accion} ${modulo.replace(/_/g, " ")}`,
      })
    }
  }

  for (const p of todosPermisos) {
    await sql`
      INSERT INTO usuarios_permisos (id, modulo, accion, nombre, activo)
      VALUES (${p.id}, ${p.modulo}, ${p.accion}, ${p.nombre}, 1)
      ON CONFLICT (id) DO NOTHING
    `
  }

  // Matriz rol → permisos
  const MATRIZ: Record<string, string[]> = {
    // Administrador: todos los permisos, incluido animales:eliminar.
    "rol-admin": todosPermisos.map((p) => p.id),
    "rol-mayordomo": [
      // No recibe animales:eliminar; conserva ver, crear y editar.
      ...["ver", "crear", "editar"].map((a) => permisoId("animales", a)),
      ...["ver", "crear"].map((a) => permisoId("eventos_reproductivos", a)),
      ...["ver", "crear", "editar", "anular"].map((a) => permisoId("eventos_productivos", a)),
      ...["ver", "crear"].map((a) => permisoId("sanidad", a)),
      ...["ver", "crear"].map((a) => permisoId("movimientos", a)),
      permisoId("reportes", "ver"),
    ],
    "rol-veterinario": [
      permisoId("animales", "ver"),
      ...["ver", "crear", "editar", "anular"].map((a) => permisoId("eventos_reproductivos", a)),
      ...["ver"].map((a) => permisoId("eventos_productivos", a)),
      ...["ver", "crear", "editar", "anular"].map((a) => permisoId("sanidad", a)),
      permisoId("reportes", "ver"),
    ],
    "rol-lectura": todosPermisos.filter((p) => p.accion === "ver").map((p) => p.id),
  }

  for (const [rolId, permisos] of Object.entries(MATRIZ)) {
    for (const pid of permisos) {
      await sql`
        INSERT INTO roles_permisos (id, rol_id, permiso_id, activo)
        VALUES (${`rp-${rolId}-${pid}`}, ${rolId}, ${pid}, 1)
        ON CONFLICT (id) DO NOTHING
      `
    }
  }

  // Rangos de edades
  await sql`
    INSERT INTO config_rangos_edades (id, nombre, rango1, rango2, sexo, activo) VALUES
      ('edad-ternero',   'Ternero',          1,    240,   0, 1),
      ('edad-nov-dest',  'Novillo destete',  241,  365,   0, 1),
      ('edad-nov-lev',   'Novillo levante',  366,  720,   0, 1),
      ('edad-nov-ceba',  'Novillo ceba',     721,  1080,  0, 1),
      ('edad-toro',      'Toro',             1081, 99999, 0, 1),
      ('edad-ternera',   'Ternera',          1,    240,   1, 1),
      ('edad-nova-dest', 'Novilla destete',  241,  365,   1, 1),
      ('edad-nova-lev',  'Novilla levante',  366,  720,   1, 1),
      ('edad-nova-vien', 'Novilla vientre',  721,  1080,  1, 1),
      ('edad-vaca',      'Vaca',             1081, 99999, 1, 1)
    ON CONFLICT (id) DO NOTHING
  `

  // Key/values
  const KV = [
    ["kv-sexo-0", "sexo", "Macho", "0"],
    ["kv-sexo-1", "sexo", "Hembra", "1"],
    ["kv-sexo-2", "sexo", "Pajuela", "2"],
    ["kv-est-0", "estado_animal", "En finca", "0"],
    ["kv-est-1", "estado_animal", "Vendido", "1"],
    ["kv-est-2", "estado_animal", "Muerto", "2"],
    ["kv-ing-0", "tipo_ingreso", "Nacido en finca", "0"],
    ["kv-ing-1", "tipo_ingreso", "Comprado", "1"],
    ["kv-pad-0", "tipo_padre", "Monta natural", "0"],
    ["kv-pad-1", "tipo_padre", "Inseminación", "1"],
    ["kv-sal-0", "salud_animal", "Sano", "0"],
    ["kv-sal-1", "salud_animal", "Enfermo", "1"],
  ] as const

  for (const [id, opcion, key, value] of KV) {
    await sql`
      INSERT INTO config_key_values (id, opcion, key, value, activo)
      VALUES (${id}, ${opcion}, ${key}, ${value}, 1)
      ON CONFLICT (id) DO NOTHING
    `
  }

  // Razas
  const razas: [string, string, string][] = [
    ["raza-brahman", "Brahman", "Cebú Brahman"],
    ["raza-holstein", "Holstein", "Holstein Friesian"],
    ["raza-angus", "Angus", "Aberdeen Angus"],
    ["raza-brangus", "Brangus", "Brahman × Angus"],
    ["raza-gyr", "Gyr", "Gir Lechero"],
    ["raza-normando", "Normando", "Normando"],
    ["raza-simmental", "Simmental", "Simmental"],
    ["raza-criollo", "Criollo", "Criollo colombiano"],
    ["raza-romosinuano", "Romosinuano", "Romosinuano"],
    ["raza-bon", "Blanco Orejinegro", "BON"],
    ["raza-cruce", "Cruce", "Cruzamiento comercial"],
  ]

  for (const [id, nombre, descripcion] of razas) {
    await sql`
      INSERT INTO config_razas (id, nombre, descripcion, activo)
      VALUES (${id}, ${nombre}, ${descripcion}, 1)
      ON CONFLICT (id) DO NOTHING
    `
  }

  // Condición corporal
  await sql`
    INSERT INTO config_condiciones_corporales (id, nombre, valor_min, valor_max, descripcion, activo) VALUES
      ('cc-1', 'Muy delgado', 1, 1, 'Costillas visibles, espinazo prominente', 1),
      ('cc-2', 'Delgado',     2, 2, 'Costillas palpables', 1),
      ('cc-3', 'Ideal',       3, 3, 'Costillas cubiertas, buena condición', 1),
      ('cc-4', 'Gordo',       4, 4, 'Costillas no palpables, grasa visible', 1),
      ('cc-5', 'Muy gordo',   5, 5, 'Exceso de grasa, pliegues', 1)
    ON CONFLICT (id) DO NOTHING
  `

  // Tipos de explotación
  await sql`
    INSERT INTO config_tipos_explotacion (id, nombre, descripcion, activo) VALUES
      ('exp-cria',    'Cría',            'Producción de terneros', 1),
      ('exp-leche',   'Lechería',        'Producción de leche', 1),
      ('exp-doble',   'Doble propósito', 'Carne y leche', 1),
      ('exp-engorde', 'Engorde',         'Ceba de ganado', 1)
    ON CONFLICT (id) DO NOTHING
  `

  // Calidad animal
  await sql`
    INSERT INTO config_calidad_animal (id, nombre, descripcion, activo) VALUES
      ('cal-excelente', 'Excelente', 'Alta calidad genética', 1),
      ('cal-bueno',     'Bueno',     'Buena calidad', 1),
      ('cal-regular',   'Regular',   'Calidad promedio', 1),
      ('cal-descarte',  'Descarte',  'Candidato a descarte', 1)
    ON CONFLICT (id) DO NOTHING
  `

  // Colores
  await sql`
    INSERT INTO config_colores (id, nombre, codigo, activo) VALUES
      ('col-negro',   'Negro',   '#000000', 1),
      ('col-blanco',  'Blanco',  '#FFFFFF', 1),
      ('col-rojo',    'Rojo',    '#8B0000', 1),
      ('col-cafe',    'Café',    '#8B4513', 1),
      ('col-canela',  'Canela',  '#D2691E', 1),
      ('col-bayo',    'Bayo',    '#F4A460', 1),
      ('col-overo',   'Overo',   '#DEB887', 1),
      ('col-pintado', 'Pintado', '#A9A9A9', 1)
    ON CONFLICT (id) DO NOTHING
  `

  // Parámetros por finca
  const PARAMETROS: [string, string, string][] = [
    ["edad_minima_servicio_meses", "18", "RN-010: edad mínima para servicio"],
    ["peso_minimo_servicio_kg", "280", "RN-010: peso mínimo para servicio"],
    ["dias_puerperio", "45", "TR: PARIDA→VACIA"],
    ["dias_max_lactancia", "305", "RN-021: lactancia vigente"],
    ["stock_minimo_dosis", "20", "KPI-10: umbral de stock bajo"],
    ["peso_nacimiento_default_kg", "32", "KPI-07: peso al nacer estimado"],
    ["rol_invitacion_default", "rol-mayordomo", "PE-007: rol al registrarse con código"],
  ]
}

// =====================================================================
// NIVEL 2 — DEMO
// =====================================================================

async function seedDemo(sql: ReturnType<typeof postgres>) {

  // Fincas base — siempre se crean
  await sql`
    INSERT INTO fincas (id, codigo, nombre, departamento, municipio, vereda, area_hectareas, capacidad_maxima, tipo_explotacion_id, activo) VALUES
      ('finca-esperanza', 'GAN001', 'La Esperanza', 'Antioquia', 'Medellín', 'La Verde', 50, 200, 'exp-doble', 1),
      ('finca-roble',     'GAN002', 'Hacienda El Roble', 'Córdoba', 'Montería', 'El Roble', 100, 400, 'exp-cria', 1)
    ON CONFLICT (id) DO NOTHING
  `

  for (const fincaId of ["finca-esperanza", "finca-roble"]) {
    for (const [codigo, valor, descripcion] of PARAMETROS) {
      await sql`
        INSERT INTO config_parametros_finca (id, finca_id, codigo, valor, descripcion, activo)
        VALUES (${`param-${fincaId}-${codigo}`}, ${fincaId}, ${codigo}, ${valor}, ${descripcion}, 1)
        ON CONFLICT (id) DO NOTHING
      `
    }
  }
  
  // Usuarios
  await sql`
    INSERT INTO usuarios (id, nombre, email, email_verificado, activo) VALUES
      ('user-admin',     'Yuli Administradora', 'admin@ganaweb.demo',   1, 1),
      ('user-mayordomo', 'Pedro Mayordomo',     'pedro@ganaweb.demo',   1, 1),
      ('user-2fa',       'Usuario 2FA Test',    'test2fa@ganaweb.demo', 1, 1)
    ON CONFLICT (id) DO NOTHING
  `

  await sql`
    INSERT INTO usuarios_contrasena (id, usuario_id, contrasena_hash, activo) VALUES
      ('pwd-admin',     'user-admin',     ${HASH_ADMIN}, 1),
      ('pwd-mayordomo', 'user-mayordomo', ${HASH_MAYORDOMO}, 1),
      ('pwd-2fa',       'user-2fa',       ${HASH_TEST}, 1)
    ON CONFLICT (id) DO UPDATE SET contrasena_hash = EXCLUDED.contrasena_hash, activo = EXCLUDED.activo
  `

  // Acceso a fincas + rol por finca
  await sql`
    INSERT INTO usuarios_fincas (id, usuario_id, finca_id, activo) VALUES
      ('uf-admin-esp',  'user-admin',     'finca-esperanza', 1),
      ('uf-admin-rob',  'user-admin',     'finca-roble',     1),
      ('uf-mayor-esp',  'user-mayordomo', 'finca-esperanza', 1),
      ('uf-2fa-esp',    'user-2fa',       'finca-esperanza', 1)
    ON CONFLICT (id) DO NOTHING
  `

  await sql`
    INSERT INTO usuarios_roles_asignacion (id, usuario_id, rol_id, finca_id, activo) VALUES
      ('ura-admin-esp', 'user-admin',     'rol-admin',     'finca-esperanza', 1),
      ('ura-admin-rob', 'user-admin',     'rol-lectura',   'finca-roble',     1),
      ('ura-mayor-esp', 'user-mayordomo', 'rol-mayordomo', 'finca-esperanza', 1),
      ('ura-2fa-esp',   'user-2fa',       'rol-mayordomo', 'finca-esperanza', 1)
    ON CONFLICT (id) DO NOTHING
  `

  // 2FA de prueba (fecha_expiracion es integer = epoch ms)
  const expiryEpoch = Date.now() + 10 * 60 * 1000
  await sql`
    INSERT INTO usuarios_autenticacion_dos_factores (id, usuario_id, metodo, codigo_hash, fecha_expiracion, intentos_fallidos, habilitado, activo) VALUES
      ('2fa-user-test', 'user-2fa', 'email', '$2b$10$XnGkbZi2XItTP.7S6h4oNu2PE0zfJxPAZJnc3wcGw8sWqUE/xj/nC', ${expiryEpoch}, 0, 1, 1)
    ON CONFLICT (id) DO NOTHING
  `

  // Potreros
  await sql`
    INSERT INTO potreros (id, finca_id, codigo, nombre, area_hectareas, tipo_pasto, capacidad_maxima, estado, activo) VALUES
      ('pot-esp-1', 'finca-esperanza', 'POT-1', 'Potrero La Loma',  12, 'Brachiaria', 40, 'activo', 1),
      ('pot-esp-3', 'finca-esperanza', 'POT-3', 'Potrero El Bajo',  15, 'Estrella',   50, 'activo', 1),
      ('pot-esp-5', 'finca-esperanza', 'POT-5', 'Potrero La Ceiba', 10, 'Kikuyo',     35, 'activo', 1)
    ON CONFLICT (id) DO NOTHING
  `

  // Lotes
  await sql`
    INSERT INTO lotes (id, finca_id, nombre, tipo, activo) VALUES
      ('lote-esp-2', 'finca-esperanza', 'Lote 2 - Ceba',    'producción', 1),
      ('lote-esp-4', 'finca-esperanza', 'Lote 4 - Levante', 'producción', 1)
    ON CONFLICT (id) DO NOTHING
  `

  // Grupos
  await sql`
    INSERT INTO grupos (id, finca_id, nombre, activo) VALUES
      ('grupo-esp-ordeno', 'finca-esperanza', 'Grupo de ordeño', 1)
    ON CONFLICT (id) DO NOTHING
  `

  // Veterinarios
  await sql`
    INSERT INTO veterinarios (id, finca_id, nombre, telefono, email, numero_registro, especialidad, activo) VALUES
      ('vet-esp-1', 'finca-esperanza', 'Dr. Carlos Rodríguez Pérez', '3101234567', 'c.rodriguez@vetcol.demo', 'RV-001', 'Medicina Interna Bovina', 1),
      ('vet-esp-2', 'finca-esperanza', 'Dra. Ana María Gómez',       '3152345678', 'a.gomez@vetcol.demo',     'RV-002', 'Reproducción Animal', 1)
    ON CONFLICT (id) DO NOTHING
  `

  // Propietarios
  await sql`
    INSERT INTO propietarios (id, finca_id, nombre, tipo_documento, numero_documento, telefono, activo) VALUES
      ('prop-esp-1', 'finca-esperanza', 'Luis Gustavo Rodriguez',   'CC', '17234567', '3105678901', 1),
      ('prop-esp-2', 'finca-esperanza', 'Victor Rodriguez', 'CC', '52345678', '3116789012', 1)
    ON CONFLICT (id) DO NOTHING
  `

  // Hierros
  await sql`
    INSERT INTO hierros (id, finca_id, nombre, descripcion, activo) VALUES
      ('hie-esp-1', 'finca-esperanza', 'Hierro La Esperanza', 'Marca oficial de la finca', 1)
    ON CONFLICT (id) DO NOTHING
  `

  // Diagnósticos
  const diagnosticos: [string, string, string, string][] = [
    ["diag-esp-mastitis", "Mastitis", "Infección de la glándula mamaria", "Sanidad"],
    ["diag-esp-anaplasma", "Anaplasmosis", "Hemoparásito transmitido por garrapata", "Sanidad"],
    [
      "diag-esp-ret-plac",
      "Retención placentaria",
      "No expulsión de placenta post-parto",
      "Reproductivo",
    ],
    ["diag-esp-metritis", "Metritis", "Infección uterina post-parto", "Reproductivo"],
    ["diag-esp-cojera", "Cojera", "Problemas podales", "Sanidad"],
    ["diag-esp-quiste-ov", "Quiste ovárico", "Alteración reproductiva funcional", "Reproductivo"],
  ]

  for (const [id, nombre, descripcion, categoria] of diagnosticos) {
    await sql`
      INSERT INTO diagnosticos_veterinarios (id, finca_id, nombre, descripcion, categoria, activo)
      VALUES (${id}, 'finca-esperanza', ${nombre}, ${descripcion}, ${categoria}, 1)
      ON CONFLICT (id) DO NOTHING
    `
  }

  // Motivos de venta
  await sql`
    INSERT INTO motivos_ventas (id, finca_id, nombre, descripcion, activo) VALUES
      ('mv-esp-descarte', 'finca-esperanza', 'Descarte productivo', 'Baja producción o edad', 1),
      ('mv-esp-ceba',     'finca-esperanza', 'Fin de ceba',         'Peso de sacrificio alcanzado', 1),
      ('mv-esp-liquidez', 'finca-esperanza', 'Necesidad de liquidez', NULL, 1)
    ON CONFLICT (id) DO NOTHING
  `

  // Causas de muerte
  await sql`
    INSERT INTO causas_muerte (id, finca_id, nombre, activo) VALUES
      ('cm-esp-enfermedad', 'finca-esperanza', 'Enfermedad',        1),
      ('cm-esp-accidente',  'finca-esperanza', 'Accidente',         1),
      ('cm-esp-ofidico',    'finca-esperanza', 'Accidente ofídico', 1),
      ('cm-esp-parto',      'finca-esperanza', 'Complicación de parto', 1)
    ON CONFLICT (id) DO NOTHING
  `

  // Lugares de compra
  await sql`
    INSERT INTO lugares_compras (id, finca_id, nombre, tipo, activo) VALUES
      ('lc-esp-feria',   'finca-esperanza', 'Feria de Medellín',  'feria',   1),
      ('lc-esp-directa', 'finca-esperanza', 'Compra directa finca', 'directa', 1)
    ON CONFLICT (id) DO NOTHING
  `

  // Lugares de venta
  await sql`
    INSERT INTO lugares_ventas (id, finca_id, nombre, tipo, activo) VALUES
      ('lv-esp-subasta', 'finca-esperanza', 'Subasta ganadera',   'subasta', 1),
      ('lv-esp-friogan', 'finca-esperanza', 'Planta de beneficio', 'planta',  1)
    ON CONFLICT (id) DO NOTHING
  `

  // Productos sanitarios
  await sql`
    INSERT INTO productos_sanitarios (id, finca_id, codigo, descripcion, ml_mg_por_dosis, tipo_tratamiento, precio_dosis, activo) VALUES
      ('prod-esp-aftosa',  'finca-esperanza', 'VAC-AFTOSA',   'Vacuna fiebre aftosa',      2, 'vacuna',          3500, 1),
      ('prod-esp-brucela', 'finca-esperanza', 'VAC-BRUCELA',  'Vacuna brucelosis (Cepa 19)', 2, 'vacuna',          4200, 1),
      ('prod-esp-iverm',   'finca-esperanza', 'IVERMECTINA',  'Ivermectina 1%',             1, 'no_reproductivo', 1800, 1)
    ON CONFLICT (id) DO NOTHING
  `

  // Entradas de almacén
  await sql`
    INSERT INTO almacen_entradas (id, producto_id, fecha, dosis, precio_por_dosis, usuario_creado_por) VALUES
      ('ent-esp-aftosa-1', 'prod-esp-aftosa', '2026-06-01', 150, 3500, 'user-admin'),
      ('ent-esp-iverm-1',  'prod-esp-iverm',  '2026-06-15', 50,  1800, 'user-admin')
    ON CONFLICT (id) DO NOTHING
  `

  // ---------------------------------------------------------------
  // SECTORES (ambas fincas) — el esquema los exige para animales.sector_id
  // Jerarquía: Finca → Potrero → Sector (el sector solo cuelga de finca_id)
  // ---------------------------------------------------------------
  await sql`
    INSERT INTO sectores (id, finca_id, codigo, nombre, area_hectareas, tipo_pasto, capacidad_maxima, estado, activo) VALUES
      ('sec-esp-a', 'finca-esperanza', 'SEC-A', 'Sector Norte',    6, 'Brachiaria', 20, 'activo', 1),
      ('sec-esp-b', 'finca-esperanza', 'SEC-B', 'Sector Sur',      5, 'Estrella',   18, 'activo', 1),
      ('sec-esp-c', 'finca-esperanza', 'SEC-C', 'Sector Quebrada', 4, 'Kikuyo',     14, 'activo', 1),
      ('sec-rob-a', 'finca-roble',     'SEC-A', 'Sector Alto',     9, 'Angleton',   30, 'activo', 1),
      ('sec-rob-b', 'finca-roble',     'SEC-B', 'Sector Bajo',     8, 'Guinea',     26, 'activo', 1)
    ON CONFLICT (id) DO NOTHING
  `

  // ---------------------------------------------------------------
  // MAESTROS DE EL ROBLE (la finca existía sin maestros propios)
  // ---------------------------------------------------------------
  await sql`
    INSERT INTO potreros (id, finca_id, codigo, nombre, area_hectareas, tipo_pasto, capacidad_maxima, estado, activo) VALUES
      ('pot-rob-1', 'finca-roble', 'POT-1', 'Potrero La Palma',   20, 'Angleton', 60, 'activo', 1),
      ('pot-rob-2', 'finca-roble', 'POT-2', 'Potrero El Mango',   18, 'Guinea',   55, 'activo', 1),
      ('pot-rob-3', 'finca-roble', 'POT-3', 'Potrero La Represa', 22, 'Brachiaria', 65, 'activo', 1)
    ON CONFLICT (id) DO NOTHING
  `
  await sql`
    INSERT INTO lotes (id, finca_id, nombre, tipo, activo) VALUES
      ('lote-rob-1', 'finca-roble', 'Lote 1 - Cría',    'producción', 1),
      ('lote-rob-2', 'finca-roble', 'Lote 2 - Levante', 'producción', 1)
    ON CONFLICT (id) DO NOTHING
  `
  await sql`
    INSERT INTO grupos (id, finca_id, nombre, activo) VALUES
      ('grupo-rob-vientres', 'finca-roble', 'Grupo de vientres', 1)
    ON CONFLICT (id) DO NOTHING
  `
  await sql`
    INSERT INTO hierros (id, finca_id, nombre, descripcion, activo) VALUES
      ('hie-rob-1', 'finca-roble', 'Hierro El Roble', 'Marca oficial de la finca', 1)
    ON CONFLICT (id) DO NOTHING
  `
  await sql`
    INSERT INTO propietarios (id, finca_id, nombre, tipo_documento, numero_documento, telefono, activo) VALUES
      ('prop-rob-1', 'finca-roble', 'Inversiones El Roble S.A.S.', 'NIT', '900456789', '3204567890', 1)
    ON CONFLICT (id) DO NOTHING
  `
  await sql`
    INSERT INTO veterinarios (id, finca_id, nombre, telefono, email, numero_registro, especialidad, activo) VALUES
      ('vet-rob-1', 'finca-roble', 'Dr. Julián Vergara', '3157654321', 'j.vergara@vetcol.demo', 'RV-010', 'Reproducción Animal', 1)
    ON CONFLICT (id) DO NOTHING
  `

  // ---------------------------------------------------------------
  // ANIMALES DEMO — 20 cabezas: 13 en La Esperanza (MT-120..MT-132) y
  // 7 en El Roble (MT-133..MT-139). Códigos consecutivos desde MT-120.
  // Distribución por sexo: 5 machos (sexo_key=0) y 15 hembras (sexo_key=1).
  //
  // Los *_key toman el `value` de config_key_values (la columna es integer
  // y el catálogo guarda el número como texto):
  //   sexo_key         → kv-sexo-0 Macho=0 · kv-sexo-1 Hembra=1
  //   tipo_ingreso_id  → kv-ing-0 Nacido en finca=0 · kv-ing-1 Comprado=1
  //   estado_animal_key→ kv-est-0 En finca=0 (todos; las salidas son eventos)
  //   salud_animal_key → kv-sal-0 Sano=0 · kv-sal-1 Enfermo=1
  //   tipo_padre_key   → kv-pad-0 Monta natural=0 · kv-pad-1 Inseminación=1
  // es_de_monta (integer 0/1): marca los toros aptos para monta natural.
  //   Lo exige RN-011 — un servicio tipo 'monta' debe validar que el
  //   padre_id apunte a un macho con es_de_monta=1. Aquí: MT-130 (Trueno,
  //   La Esperanza) y MT-138 (Capitán, El Roble). Hembras y novillos=0.
  //
  // Todas las FKs apuntan a maestros creados arriba, por finca:
  //   raza→config_razas · color→config_colores · calidad→config_calidad_animal
  //   potrero/sector/lote/grupo/hierro/propietario → maestros de SU finca
  // fecha_nacimiento/fecha_compra son INTEGER (epoch en segundos, UTC).
  // MT-132 es hijo de MT-120 y MT-139 de MT-133 (madre_id + codigo_madre).
  // ---------------------------------------------------------------
  await sql`
    INSERT INTO animales (
      id, finca_id, codigo, nombre, fecha_nacimiento, fecha_compra,
      sexo_key, tipo_ingreso_key, tipo_padre_key, madre_id, codigo_madre,
      raza_id, color_id, potrero_id, sector_id, lote_id, grupo_id,
      hierro_id, propietario_id, calidad_animal_id, tipo_explotacion_id,
      precio_compra, peso_compra, codigo_rfid, codigo_arete,
      salud_animal_key, estado_animal_key, ind_descartado, es_de_monta,
      categoria_reproductiva, tatuado, herrado, descornado,
      numero_pezones, comentarios, activo, usuario_creado_por
    ) VALUES
    ('animal-mt-120', 'finca-esperanza', 'MT-120', 'Lucero', 1615507200, NULL, 1, 0, 0, NULL, '', 'raza-brahman', 'col-canela', 'pot-esp-3', 'sec-esp-a', 'lote-esp-4', 'grupo-esp-ordeno', 'hie-esp-1', 'prop-esp-1', 'cal-excelente', 'exp-doble', 0, 0, '982000100120', 'A-120', 0, 0, 0, 0, 'prenada', false, true, false, 4, 'Vientre de primera.', 1, 'user-admin'),
    ('animal-mt-121', 'finca-esperanza', 'MT-121', 'Estrella', 1654387200, NULL, 1, 0, 0, NULL, '', 'raza-gyr', 'col-blanco', 'pot-esp-3', 'sec-esp-a', 'lote-esp-4', 'grupo-esp-ordeno', 'hie-esp-1', 'prop-esp-1', 'cal-bueno', 'exp-doble', 0, 0, '982000100121', 'A-121', 0, 0, 0, 0, 'vacia', false, true, false, 4, 'Buena productora de leche.', 1, 'user-admin'),
    ('animal-mt-122', 'finca-esperanza', 'MT-122', 'Canela', 1600387200, NULL, 1, 0, 0, NULL, '', 'raza-brangus', 'col-canela', 'pot-esp-5', 'sec-esp-b', 'lote-esp-4', 'grupo-esp-ordeno', 'hie-esp-1', 'prop-esp-1', 'cal-bueno', 'exp-doble', 0, 0, '982000100122', 'A-122', 0, 0, 0, 0, 'parida', false, true, false, 4, 'Parto reciente; en lactancia.', 1, 'user-admin'),
    ('animal-mt-123', 'finca-esperanza', 'MT-123', 'Mora', 1638230400, NULL, 1, 0, 0, NULL, '', 'raza-holstein', 'col-negro', 'pot-esp-3', 'sec-esp-a', 'lote-esp-4', 'grupo-esp-ordeno', 'hie-esp-1', 'prop-esp-1', 'cal-excelente', 'exp-doble', 0, 0, '982000100123', 'A-123', 0, 0, 0, 0, 'servida', false, true, true, 4, 'Servida por IA.', 1, 'user-admin'),
    ('animal-mt-124', 'finca-esperanza', 'MT-124', 'Paloma', 1644796800, 1755648000, 1, 1, 0, NULL, '', 'raza-normando', 'col-rojo', 'pot-esp-1', 'sec-esp-c', 'lote-esp-2', NULL, 'hie-esp-1', 'prop-esp-1', 'cal-regular', 'exp-doble', 2850000, 395, '982000100124', 'A-124', 1, 0, 0, 0, 'vacia', false, true, false, 4, 'Comprada en feria; en tratamiento por mastitis.', 1, 'user-admin'),
    ('animal-mt-125', 'finca-esperanza', 'MT-125', '', 1720396800, NULL, 1, 0, 0, NULL, '', 'raza-brahman', 'col-bayo', 'pot-esp-1', 'sec-esp-c', 'lote-esp-2', NULL, 'hie-esp-1', 'prop-esp-1', 'cal-bueno', 'exp-doble', 0, 0, '982000100125', 'A-125', 0, 0, 0, 0, 'novilla', false, false, false, 4, 'Novilla de levante.', 1, 'user-admin'),
    ('animal-mt-126', 'finca-esperanza', 'MT-126', 'Luna', 1697932800, NULL, 1, 0, 0, NULL, '', 'raza-bon', 'col-pintado', 'pot-esp-1', 'sec-esp-c', 'lote-esp-2', NULL, 'hie-esp-1', 'prop-esp-1', 'cal-excelente', 'exp-doble', 0, 0, '982000100126', 'A-126', 0, 0, 0, 0, 'novilla', false, true, false, 4, 'Línea criolla BON.', 1, 'user-admin'),
    ('animal-mt-127', 'finca-esperanza', 'MT-127', 'Perla', 1585872000, 1673740800, 1, 1, 0, NULL, '', 'raza-simmental', 'col-overo', 'pot-esp-5', 'sec-esp-b', 'lote-esp-4', 'grupo-esp-ordeno', 'hie-esp-1', 'prop-esp-1', 'cal-bueno', 'exp-doble', 3200000, 430, '982000100127', 'A-127', 0, 0, 0, 0, 'prenada', false, true, false, 4, 'Comprada preñada.', 1, 'user-admin'),
    ('animal-mt-128', 'finca-esperanza', 'MT-128', 'Rosa', 1566864000, NULL, 1, 0, 0, NULL, '', 'raza-criollo', 'col-cafe', 'pot-esp-5', 'sec-esp-b', 'lote-esp-4', 'grupo-esp-ordeno', 'hie-esp-1', 'prop-esp-1', 'cal-regular', 'exp-doble', 0, 0, '982000100128', 'A-128', 0, 0, 0, 0, 'parida', true, true, false, 4, 'Vaca multípara; candidata a descarte por edad.', 1, 'user-admin'),
    ('animal-mt-129', 'finca-esperanza', 'MT-129', 'Nube', 1684454400, NULL, 1, 0, 0, NULL, '', 'raza-angus', 'col-negro', 'pot-esp-1', 'sec-esp-a', 'lote-esp-2', NULL, 'hie-esp-1', 'prop-esp-1', 'cal-excelente', 'exp-doble', 0, 0, '982000100129', 'A-129', 0, 0, 0, 0, 'novilla', false, false, true, 4, 'Novilla Angus de reemplazo.', 1, 'user-admin'),
    ('animal-mt-130', 'finca-esperanza', 'MT-130', 'Trueno', 1556841600, 1649548800, 0, 1, 0, NULL, '', 'raza-brahman', 'col-blanco', 'pot-esp-5', 'sec-esp-b', NULL, NULL, 'hie-esp-1', 'prop-esp-1', 'cal-excelente', 'exp-doble', 8500000, 520, '982000100130', 'A-130', 0, 0, 0, 1, 'no_aplica', false, true, false, NULL, 'Toro reproductor de monta natural.', 1, 'user-admin'),
    ('animal-mt-131', 'finca-esperanza', 'MT-131', '', 1705276800, NULL, 0, 0, 0, NULL, '', 'raza-cruce', 'col-cafe', 'pot-esp-1', 'sec-esp-c', 'lote-esp-2', NULL, 'hie-esp-1', 'prop-esp-1', 'cal-bueno', 'exp-doble', 0, 0, '982000100131', 'A-131', 0, 0, 0, 0, 'no_aplica', false, false, true, NULL, 'Novillo de ceba.', 1, 'user-admin'),
    ('animal-mt-132', 'finca-esperanza', 'MT-132', '', 1743552000, NULL, 0, 0, 0, 'animal-mt-120', 'MT-120', 'raza-romosinuano', 'col-rojo', 'pot-esp-5', 'sec-esp-b', NULL, NULL, 'hie-esp-1', 'prop-esp-1', 'cal-regular', 'exp-doble', 0, 0, '982000100132', 'A-132', 0, 0, 0, 0, 'no_aplica', false, false, false, NULL, 'Ternero hijo de MT-120.', 1, 'user-admin'),
    ('animal-mt-133', 'finca-roble', 'MT-133', 'Aurora', 1626220800, NULL, 1, 0, 0, NULL, '', 'raza-brahman', 'col-bayo', 'pot-rob-1', 'sec-rob-a', 'lote-rob-1', 'grupo-rob-vientres', 'hie-rob-1', 'prop-rob-1', 'cal-excelente', 'exp-cria', 0, 0, '982000100133', 'A-133', 0, 0, 0, 0, 'prenada', false, true, false, 4, 'Vientre de cría.', 1, 'user-admin'),
    ('animal-mt-134', 'finca-roble', 'MT-134', 'Sombra', 1662681600, NULL, 1, 0, 0, NULL, '', 'raza-brangus', 'col-negro', 'pot-rob-2', 'sec-rob-b', 'lote-rob-1', 'grupo-rob-vientres', 'hie-rob-1', 'prop-rob-1', 'cal-bueno', 'exp-cria', 0, 0, '982000100134', 'A-134', 0, 0, 0, 0, 'vacia', false, true, false, 4, NULL, 1, 'user-admin'),
    ('animal-mt-135', 'finca-roble', 'MT-135', '', 1711324800, NULL, 1, 0, 0, NULL, '', 'raza-gyr', 'col-blanco', 'pot-rob-3', 'sec-rob-a', 'lote-rob-2', NULL, 'hie-rob-1', 'prop-rob-1', 'cal-bueno', 'exp-cria', 0, 0, '982000100135', 'A-135', 0, 0, 0, 0, 'novilla', false, false, false, 4, 'Novilla de levante.', 1, 'user-admin'),
    ('animal-mt-136', 'finca-roble', 'MT-136', 'Manchada', 1606780800, 1717545600, 1, 1, 0, NULL, '', 'raza-criollo', 'col-pintado', 'pot-rob-1', 'sec-rob-a', 'lote-rob-1', 'grupo-rob-vientres', 'hie-rob-1', 'prop-rob-1', 'cal-regular', 'exp-cria', 2600000, 380, '982000100136', 'A-136', 1, 0, 0, 0, 'parida', false, true, false, 4, 'Comprada; cojera en tratamiento.', 1, 'user-admin'),
    ('animal-mt-137', 'finca-roble', 'MT-137', 'Vainilla', 1676592000, NULL, 1, 0, 0, NULL, '', 'raza-simmental', 'col-canela', 'pot-rob-2', 'sec-rob-b', 'lote-rob-1', 'grupo-rob-vientres', 'hie-rob-1', 'prop-rob-1', 'cal-excelente', 'exp-cria', 0, 0, '982000100137', 'A-137', 0, 0, 0, 0, 'servida', false, true, true, 4, NULL, 1, 'user-admin'),
    ('animal-mt-138', 'finca-roble', 'MT-138', 'Capitán', 1542672000, 1615161600, 0, 1, 0, NULL, '', 'raza-brangus', 'col-cafe', 'pot-rob-1', 'sec-rob-a', NULL, NULL, 'hie-rob-1', 'prop-rob-1', 'cal-excelente', 'exp-cria', 9200000, 610, '982000100138', 'A-138', 0, 0, 0, 1, 'no_aplica', false, true, false, NULL, 'Toro reproductor principal de El Roble.', 1, 'user-admin'),
    ('animal-mt-139', 'finca-roble', 'MT-139', '', 1738195200, NULL, 0, 0, 0, 'animal-mt-133', 'MT-133', 'raza-romosinuano', 'col-rojo', 'pot-rob-3', 'sec-rob-b', 'lote-rob-2', NULL, 'hie-rob-1', 'prop-rob-1', 'cal-bueno', 'exp-cria', 0, 0, '982000100139', 'A-139', 0, 0, 0, 0, 'no_aplica', false, false, false, NULL, 'Ternero hijo de MT-133.', 1, 'user-admin')
    ON CONFLICT (id) DO NOTHING
  `
}

// =====================================================================

seed().catch((error) => {
  logError(error)
  process.exit(1)
})
