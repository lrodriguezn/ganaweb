/**
 * GanaWeb — Seed v3 (alineado a schema_v3_corregido.sql)
 *
 * Dos niveles:
 *   SISTEMA (siempre): roles semilla, matriz de permisos (arquitectura
 *     funcional §1.2/1.3), catálogos config_* globales.
 *   DEMO (solo con SEED_DEMO=true): fincas, usuarios de prueba, maestros
 *     por finca, potreros/lotes, productos sanitarios, parámetros.
 *
 * Convenciones:
 *   - IDs TEXT determinísticos ("rol-admin", "raza-brahman"): idempotentes,
 *     legibles en FKs y estables entre entornos. Los datos de usuario final
 *     usan UUID en runtime; los seeds no.
 *   - Idempotencia por onConflictDoNothing + IDs fijos.
 *   - Referencias de reglas: PE-xxx / RN-xxx = arquitectura_funcional.md
 *
 * NOTA: requiere regenerar src/schema (Drizzle) desde schema_v3_corregido.sql
 * (tablas usuariosFincas, fincas, campos emailVerificado, codigoHash, fincaId
 * en usuariosRolesAsignacion, etc.)
 */
import { createClient } from './src/client'
import {
  // config globales
  configRangosEdades, configKeyValues, configRazas,
  configCondicionesCorporales, configTiposExplotacion,
  configCalidadAnimal, configColores, configParametrosFinca,
  // auth / RBAC
  usuarios, usuariosContrasena, usuariosRoles, usuariosPermisos,
  rolesPermisos, usuariosRolesAsignacion, usuariosFincas,
  usuariosAutenticacionDosFactores,
  // tenant
  fincas, potreros, lotes, grupos,
  // maestros por finca
  veterinarios, propietarios, hierros, diagnosticosVeterinarios,
  motivosVentas, causasMuerte, lugaresCompras, lugaresVentas,
  productosSanitarios, almacenEntradas,
} from './src/schema'
import bcrypt from 'bcrypt'

const DEMO = process.env.SEED_DEMO === 'true'
const now = () => new Date()

// =====================================================================
// NIVEL 1 — SISTEMA (siempre se ejecuta)
// =====================================================================

async function seedSistema(db: ReturnType<typeof createClient>) {
  // --- Roles semilla (§1.3) — el nombre SE MUESTRA en el badge del
  // FincaSwitcher: usar nombres de display, no constantes en mayúsculas ---
  await db.insert(usuariosRoles).values([
    { id: 'rol-admin',       nombre: 'Administrador', descripcion: 'Acceso total a la finca', esSistema: 1, activo: 1 },
    { id: 'rol-mayordomo',   nombre: 'Mayordomo',     descripcion: 'Operación diaria de campo', esSistema: 1, activo: 1 },
    { id: 'rol-veterinario', nombre: 'Veterinario',   descripcion: 'Sanidad y reproducción', esSistema: 1, activo: 1 },
    { id: 'rol-lectura',     nombre: 'Solo lectura',  descripcion: 'Consulta sin edición', esSistema: 1, activo: 1 },
  ]).onConflictDoNothing()

  // --- Catálogo de permisos (§1.2): modulo × accion.
  // CONTRATO con el frontend: tienePermiso(permisos, modulo, accion) ---
  const MODULOS: Record<string, string[]> = {
    animales:               ['ver', 'crear', 'editar', 'inactivar'],
    eventos_reproductivos:  ['ver', 'crear', 'editar', 'anular'],
    eventos_productivos:    ['ver', 'crear', 'editar', 'anular'],
    sanidad:                ['ver', 'crear', 'editar', 'anular'],
    movimientos:            ['ver', 'crear', 'anular'],
    reportes:               ['ver', 'exportar'],
    configuracion:          ['ver', 'crear', 'editar', 'inactivar'],
    fincas:                 ['crear', 'editar', 'invitar'],
    usuarios:               ['ver', 'administrar'],
  }
  const permisoId = (m: string, a: string) => `perm-${m}-${a}`
  const todosPermisos: { id: string; modulo: string; accion: string; nombre: string }[] = []
  for (const [modulo, acciones] of Object.entries(MODULOS)) {
    for (const accion of acciones) {
      todosPermisos.push({
        id: permisoId(modulo, accion),
        modulo,
        accion,
        nombre: `${accion} ${modulo.replace(/_/g, ' ')}`,
      })
    }
  }
  await db.insert(usuariosPermisos)
    .values(todosPermisos.map((p) => ({ ...p, activo: 1 })))
    .onConflictDoNothing()

  // --- Matriz rol → permisos (§1.3) ---
  const MATRIZ: Record<string, string[]> = {
    // Administrador: TODO
    'rol-admin': todosPermisos.map((p) => p.id),
    // Mayordomo: opera el día a día; no configura, no anula movimientos
    'rol-mayordomo': [
      ...['ver', 'crear', 'editar'].map((a) => permisoId('animales', a)),
      ...['ver', 'crear'].map((a) => permisoId('eventos_reproductivos', a)),
      ...['ver', 'crear', 'editar', 'anular'].map((a) => permisoId('eventos_productivos', a)),
      ...['ver', 'crear'].map((a) => permisoId('sanidad', a)),
      ...['ver', 'crear'].map((a) => permisoId('movimientos', a)),
      permisoId('reportes', 'ver'),
    ],
    // Veterinario: reproducción y sanidad completas, lectura del resto
    'rol-veterinario': [
      permisoId('animales', 'ver'),
      ...['ver', 'crear', 'editar', 'anular'].map((a) => permisoId('eventos_reproductivos', a)),
      ...['ver'].map((a) => permisoId('eventos_productivos', a)),
      ...['ver', 'crear', 'editar', 'anular'].map((a) => permisoId('sanidad', a)),
      permisoId('reportes', 'ver'),
    ],
    // Solo lectura: todos los "ver"
    'rol-lectura': todosPermisos.filter((p) => p.accion === 'ver').map((p) => p.id),
  }
  const filasRolPermiso = Object.entries(MATRIZ).flatMap(([rolId, permisos]) =>
    permisos.map((pid) => ({ id: `rp-${rolId}-${pid}`, rolId, permisoId: pid, activo: 1 })),
  )
  await db.insert(rolesPermisos).values(filasRolPermiso).onConflictDoNothing()

  // --- Rangos de edades (nomenclatura ganadera colombiana, se conserva) ---
  await db.insert(configRangosEdades).values([
    { id: 'edad-ternero',   rango1: 1,    rango2: 240,   nombre: 'Ternero',          sexo: 0 },
    { id: 'edad-nov-dest',  rango1: 241,  rango2: 365,   nombre: 'Novillo destete',  sexo: 0 },
    { id: 'edad-nov-lev',   rango1: 366,  rango2: 720,   nombre: 'Novillo levante',  sexo: 0 },
    { id: 'edad-nov-ceba',  rango1: 721,  rango2: 1080,  nombre: 'Novillo ceba',     sexo: 0 },
    { id: 'edad-toro',      rango1: 1081, rango2: 99999, nombre: 'Toro',             sexo: 0 },
    { id: 'edad-ternera',   rango1: 1,    rango2: 240,   nombre: 'Ternera',          sexo: 1 },
    { id: 'edad-nova-dest', rango1: 241,  rango2: 365,   nombre: 'Novilla destete',  sexo: 1 },
    { id: 'edad-nova-lev',  rango1: 366,  rango2: 720,   nombre: 'Novilla levante',  sexo: 1 },
    { id: 'edad-nova-vien', rango1: 721,  rango2: 1080,  nombre: 'Novilla vientre',  sexo: 1 },
    { id: 'edad-vaca',      rango1: 1081, rango2: 99999, nombre: 'Vaca',             sexo: 1 },
  ]).onConflictDoNothing()

  // --- Key/values: SOLO para los campos *_key que siguen siendo integer.
  // tipo_parto y tipo_inseminacion salieron de aquí: en v3 son CHECK de
  // texto en sus tablas ('normal'/'distocia'/'aborto'; 'convencional'/
  // 'sexada') — mantenerlos duplicaría la fuente de verdad ---
  await db.insert(configKeyValues).values([
    { id: 'kv-sexo-0', opcion: 'sexo', key: 'Macho',   value: '0' },
    { id: 'kv-sexo-1', opcion: 'sexo', key: 'Hembra',  value: '1' },
    { id: 'kv-sexo-2', opcion: 'sexo', key: 'Pajuela', value: '2' },
    { id: 'kv-est-0',  opcion: 'estado_animal', key: 'En finca', value: '0' },
    { id: 'kv-est-1',  opcion: 'estado_animal', key: 'Vendido',  value: '1' },
    { id: 'kv-est-2',  opcion: 'estado_animal', key: 'Muerto',   value: '2' },
    { id: 'kv-ing-0',  opcion: 'tipo_ingreso', key: 'Nacido en finca', value: '0' },
    { id: 'kv-ing-1',  opcion: 'tipo_ingreso', key: 'Comprado',        value: '1' },
    { id: 'kv-pad-0',  opcion: 'tipo_padre', key: 'Monta natural', value: '0' },
    { id: 'kv-pad-1',  opcion: 'tipo_padre', key: 'Inseminación',  value: '1' },
    { id: 'kv-sal-0',  opcion: 'salud_animal', key: 'Sano',    value: '0' },
    { id: 'kv-sal-1',  opcion: 'salud_animal', key: 'Enfermo', value: '1' },
  ]).onConflictDoNothing()

  // --- Razas (contenido colombiano del seed original, conservado) ---
  const razas = [
    ['brahman', 'Brahman', 'Cebú Brahman'], ['holstein', 'Holstein', 'Holstein Friesian'],
    ['angus', 'Angus', 'Aberdeen Angus'], ['brangus', 'Brangus', 'Brahman × Angus'],
    ['gyr', 'Gyr', 'Gir Lechero'], ['normando', 'Normando', 'Normando'],
    ['simmental', 'Simmental', 'Simmental'], ['criollo', 'Criollo', 'Criollo colombiano'],
    ['romosinuano', 'Romosinuano', 'Romosinuano'], ['bon', 'Blanco Orejinegro', 'BON'],
    ['cruce', 'Cruce', 'Cruzamiento comercial'],
  ] as const
  await db.insert(configRazas).values(
    razas.map(([k, nombre, descripcion]) => ({ id: `raza-${k}`, nombre, descripcion, activo: 1 })),
  ).onConflictDoNothing()

  // --- Condición corporal 1-5 (conservado) ---
  await db.insert(configCondicionesCorporales).values([
    { id: 'cc-1', nombre: 'Muy delgado', valorMin: 1, valorMax: 1, descripcion: 'Costillas visibles, espinazo prominente', activo: 1 },
    { id: 'cc-2', nombre: 'Delgado',     valorMin: 2, valorMax: 2, descripcion: 'Costillas palpables', activo: 1 },
    { id: 'cc-3', nombre: 'Ideal',       valorMin: 3, valorMax: 3, descripcion: 'Costillas cubiertas, buena condición', activo: 1 },
    { id: 'cc-4', nombre: 'Gordo',       valorMin: 4, valorMax: 4, descripcion: 'Costillas no palpables, grasa visible', activo: 1 },
    { id: 'cc-5', nombre: 'Muy gordo',   valorMin: 5, valorMax: 5, descripcion: 'Exceso de grasa, pliegues', activo: 1 },
  ]).onConflictDoNothing()

  // --- Tipos de explotación / calidad / colores (conservados) ---
  await db.insert(configTiposExplotacion).values([
    { id: 'exp-cria',    nombre: 'Cría',            descripcion: 'Producción de terneros', activo: 1 },
    { id: 'exp-leche',   nombre: 'Lechería',        descripcion: 'Producción de leche', activo: 1 },
    { id: 'exp-doble',   nombre: 'Doble propósito', descripcion: 'Carne y leche', activo: 1 },
    { id: 'exp-engorde', nombre: 'Engorde',         descripcion: 'Ceba de ganado', activo: 1 },
  ]).onConflictDoNothing()

  await db.insert(configCalidadAnimal).values([
    { id: 'cal-excelente', nombre: 'Excelente', descripcion: 'Alta calidad genética', activo: 1 },
    { id: 'cal-bueno',     nombre: 'Bueno',     descripcion: 'Buena calidad', activo: 1 },
    { id: 'cal-regular',   nombre: 'Regular',   descripcion: 'Calidad promedio', activo: 1 },
    { id: 'cal-descarte',  nombre: 'Descarte',  descripcion: 'Candidato a descarte', activo: 1 },
  ]).onConflictDoNothing()

  await db.insert(configColores).values([
    { id: 'col-negro',   nombre: 'Negro',   codigo: '#000000', activo: 1 },
    { id: 'col-blanco',  nombre: 'Blanco',  codigo: '#FFFFFF', activo: 1 },
    { id: 'col-rojo',    nombre: 'Rojo',    codigo: '#8B0000', activo: 1 },
    { id: 'col-cafe',    nombre: 'Café',    codigo: '#8B4513', activo: 1 },
    { id: 'col-canela',  nombre: 'Canela',  codigo: '#D2691E', activo: 1 },
    { id: 'col-bayo',    nombre: 'Bayo',    codigo: '#F4A460', activo: 1 },
    { id: 'col-overo',   nombre: 'Overo',   codigo: '#DEB887', activo: 1 },
    { id: 'col-pintado', nombre: 'Pintado', codigo: '#A9A9A9', activo: 1 },
  ]).onConflictDoNothing()
}

// =====================================================================
// NIVEL 2 — DEMO (solo con SEED_DEMO=true)
// =====================================================================

async function seedDemo(db: ReturnType<typeof createClient>) {
  // --- Fincas (un solo bloque — el seed anterior insertaba id:1 dos veces
  // y el segundo se perdía en silencio por onConflictDoNothing) ---
  await db.insert(fincas).values([
    {
      id: 'finca-esperanza', codigo: 'GAN001', nombre: 'La Esperanza',
      departamento: 'Antioquia', municipio: 'Medellín', vereda: 'La Verde',
      areaHectareas: 50, capacidadMaxima: 200,
      tipoExplotacionId: 'exp-doble', activo: 1,
    },
    {
      id: 'finca-roble', codigo: 'GAN002', nombre: 'Hacienda El Roble',
      departamento: 'Córdoba', municipio: 'Montería', vereda: 'El Roble',
      areaHectareas: 100, capacidadMaxima: 400,
      tipoExplotacionId: 'exp-cria', activo: 1,
    },
  ]).onConflictDoNothing()

  // --- Parámetros por finca (arquitectura funcional §7 — OBLIGATORIOS,
  // ningún umbral de negocio se hardcodea) ---
  const PARAMETROS: [string, string, string][] = [
    ['edad_minima_servicio_meses', '18',        'RN-010: edad mínima para servicio'],
    ['peso_minimo_servicio_kg',    '280',       'RN-010: peso mínimo para servicio'],
    ['dias_puerperio',             '45',        'TR: PARIDA→VACIA'],
    ['dias_max_lactancia',         '305',       'RN-021: lactancia vigente'],
    ['stock_minimo_dosis',         '20',        'KPI-10: umbral de stock bajo'],
    ['peso_nacimiento_default_kg', '32',        'KPI-07: peso al nacer estimado'],
    ['rol_invitacion_default',     'rol-mayordomo', 'PE-007: rol al registrarse con código'],
  ]
  await db.insert(configParametrosFinca).values(
    ['finca-esperanza', 'finca-roble'].flatMap((fincaId) =>
      PARAMETROS.map(([codigo, valor, descripcion]) => ({
        id: `param-${fincaId}-${codigo}`, fincaId, codigo, valor, descripcion, activo: 1,
      })),
    ),
  ).onConflictDoNothing()

  // --- Usuarios (email_verificado=1: son cuentas semilla) ---
  const [adminHash, mayordomoHash, testHash] = await Promise.all([
    bcrypt.hash('Admin123!', 12),
    bcrypt.hash('Campo123!', 12),
    bcrypt.hash('test123456', 12),
  ])
  await db.insert(usuarios).values([
    { id: 'user-admin',     nombre: 'Yuli Administradora', email: 'admin@ganaweb.demo',   emailVerificado: 1, activo: 1 },
    { id: 'user-mayordomo', nombre: 'Pedro Mayordomo',     email: 'pedro@ganaweb.demo',   emailVerificado: 1, activo: 1 },
    { id: 'user-2fa',       nombre: 'Usuario 2FA Test',    email: 'test2fa@ganaweb.demo', emailVerificado: 1, activo: 1 },
  ]).onConflictDoNothing()
  await db.insert(usuariosContrasena).values([
    { id: 'pwd-admin',     usuarioId: 'user-admin',     contrasenaHash: adminHash, activo: 1 },
    { id: 'pwd-mayordomo', usuarioId: 'user-mayordomo', contrasenaHash: mayordomoHash, activo: 1 },
    { id: 'pwd-2fa',       usuarioId: 'user-2fa',       contrasenaHash: testHash, activo: 1 },
  ]).onConflictDoNothing()

  // --- Acceso a fincas + ROL POR FINCA (v3): la demo muestra la feature
  // del FincaSwitcher — Administradora en una finca, Solo lectura en otra ---
  await db.insert(usuariosFincas).values([
    { id: 'uf-admin-esp',  usuarioId: 'user-admin',     fincaId: 'finca-esperanza', activo: 1 },
    { id: 'uf-admin-rob',  usuarioId: 'user-admin',     fincaId: 'finca-roble',     activo: 1 },
    { id: 'uf-mayor-esp',  usuarioId: 'user-mayordomo', fincaId: 'finca-esperanza', activo: 1 },
    { id: 'uf-2fa-esp',    usuarioId: 'user-2fa',       fincaId: 'finca-esperanza', activo: 1 },
  ]).onConflictDoNothing()
  await db.insert(usuariosRolesAsignacion).values([
    { id: 'ura-admin-esp', usuarioId: 'user-admin',     rolId: 'rol-admin',     fincaId: 'finca-esperanza', activo: 1 },
    { id: 'ura-admin-rob', usuarioId: 'user-admin',     rolId: 'rol-lectura',   fincaId: 'finca-roble',     activo: 1 },
    { id: 'ura-mayor-esp', usuarioId: 'user-mayordomo', rolId: 'rol-mayordomo', fincaId: 'finca-esperanza', activo: 1 },
    { id: 'ura-2fa-esp',   usuarioId: 'user-2fa',       rolId: 'rol-mayordomo', fincaId: 'finca-esperanza', activo: 1 },
  ]).onConflictDoNothing()

  // --- 2FA de prueba (v3.1: campo codigo_hash; el código '123456') ---
  await db.insert(usuariosAutenticacionDosFactores).values({
    id: '2fa-user-test', usuarioId: 'user-2fa', metodo: 'email',
    codigoHash: '$2b$10$XnGkbZi2XItTP.7S6h4oNu2PE0zfJxPAZJnc3wcGw8sWqUE/xj/nC',
    fechaExpiracion: new Date(Date.now() + 10 * 60 * 1000),
    intentosFallidos: 0, habilitado: 1, activo: 1,
  }).onConflictDoNothing()

  // --- Ubicación demo: potreros / lotes / grupos (La Esperanza) ---
  await db.insert(potreros).values([
    { id: 'pot-esp-1', fincaId: 'finca-esperanza', codigo: 'POT-1', nombre: 'Potrero La Loma',   areaHectareas: 12, tipoPasto: 'Brachiaria', capacidadMaxima: 40, estado: 'activo', activo: 1 },
    { id: 'pot-esp-3', fincaId: 'finca-esperanza', codigo: 'POT-3', nombre: 'Potrero El Bajo',   areaHectareas: 15, tipoPasto: 'Estrella',   capacidadMaxima: 50, estado: 'activo', activo: 1 },
    { id: 'pot-esp-5', fincaId: 'finca-esperanza', codigo: 'POT-5', nombre: 'Potrero La Ceiba',  areaHectareas: 10, tipoPasto: 'Kikuyo',     capacidadMaxima: 35, estado: 'activo', activo: 1 },
  ]).onConflictDoNothing()
  await db.insert(lotes).values([
    { id: 'lote-esp-2', fincaId: 'finca-esperanza', nombre: 'Lote 2 - Ceba',    tipo: 'producción', activo: 1 },
    { id: 'lote-esp-4', fincaId: 'finca-esperanza', nombre: 'Lote 4 - Levante', tipo: 'producción', activo: 1 },
  ]).onConflictDoNothing()
  await db.insert(grupos).values([
    { id: 'grupo-esp-ordeno', fincaId: 'finca-esperanza', nombre: 'Grupo de ordeño', activo: 1 },
  ]).onConflictDoNothing()

  // --- Maestros por finca ---
  await db.insert(veterinarios).values([
    { id: 'vet-esp-1', fincaId: 'finca-esperanza', nombre: 'Dr. Carlos Rodríguez Pérez', telefono: '3101234567', email: 'c.rodriguez@vetcol.demo', numeroRegistro: 'RV-001', especialidad: 'Medicina Interna Bovina', activo: 1 },
    { id: 'vet-esp-2', fincaId: 'finca-esperanza', nombre: 'Dra. Ana María Gómez',       telefono: '3152345678', email: 'a.gomez@vetcol.demo',     numeroRegistro: 'RV-002', especialidad: 'Reproducción Animal', activo: 1 },
  ]).onConflictDoNothing()
  await db.insert(propietarios).values([
    { id: 'prop-esp-1', fincaId: 'finca-esperanza', nombre: 'Hernando Martínez Suárez',    tipoDocumento: 'CC', numeroDocumento: '17234567', telefono: '3105678901', activo: 1 },
    { id: 'prop-esp-2', fincaId: 'finca-esperanza', nombre: 'María Elena Castillo Rojas',  tipoDocumento: 'CC', numeroDocumento: '52345678', telefono: '3116789012', activo: 1 },
  ]).onConflictDoNothing()
  await db.insert(hierros).values([
    { id: 'hie-esp-1', fincaId: 'finca-esperanza', nombre: 'Hierro La Esperanza', descripcion: 'Marca oficial de la finca', activo: 1 },
  ]).onConflictDoNothing()

  // --- Diagnósticos: patologías reales por finca (v3 exige finca_id).
  // "Positiva/Negativa" YA NO van aquí: eso es palpaciones.resultado ---
  const diagnosticos = [
    ['mastitis',    'Mastitis',              'Infección de la glándula mamaria', 'Sanidad'],
    ['anaplasma',   'Anaplasmosis',          'Hemoparásito transmitido por garrapata', 'Sanidad'],
    ['ret-plac',    'Retención placentaria', 'No expulsión de placenta post-parto', 'Reproductivo'],
    ['metritis',    'Metritis',              'Infección uterina post-parto', 'Reproductivo'],
    ['cojera',      'Cojera',                'Problemas podales', 'Sanidad'],
    ['quiste-ov',   'Quiste ovárico',        'Alteración reproductiva funcional', 'Reproductivo'],
  ] as const
  await db.insert(diagnosticosVeterinarios).values(
    diagnosticos.map(([k, nombre, descripcion, categoria]) => ({
      id: `diag-esp-${k}`, fincaId: 'finca-esperanza', nombre, descripcion, categoria, activo: 1,
    })),
  ).onConflictDoNothing()

  // --- Maestros comerciales (en el seed anterior se importaban y NUNCA
  // se insertaban) ---
  await db.insert(motivosVentas).values([
    { id: 'mv-esp-descarte', fincaId: 'finca-esperanza', nombre: 'Descarte productivo', descripcion: 'Baja producción o edad', activo: 1 },
    { id: 'mv-esp-ceba',     fincaId: 'finca-esperanza', nombre: 'Fin de ceba',         descripcion: 'Peso de sacrificio alcanzado', activo: 1 },
    { id: 'mv-esp-liquidez', fincaId: 'finca-esperanza', nombre: 'Necesidad de liquidez', activo: 1 },
  ]).onConflictDoNothing()
  await db.insert(causasMuerte).values([
    { id: 'cm-esp-enfermedad', fincaId: 'finca-esperanza', nombre: 'Enfermedad',        activo: 1 },
    { id: 'cm-esp-accidente',  fincaId: 'finca-esperanza', nombre: 'Accidente',         activo: 1 },
    { id: 'cm-esp-ofidico',    fincaId: 'finca-esperanza', nombre: 'Accidente ofídico', activo: 1 },
    { id: 'cm-esp-parto',      fincaId: 'finca-esperanza', nombre: 'Complicación de parto', activo: 1 },
  ]).onConflictDoNothing()
  await db.insert(lugaresCompras).values([
    { id: 'lc-esp-feria',   fincaId: 'finca-esperanza', nombre: 'Feria de Medellín',  tipo: 'feria',   activo: 1 },
    { id: 'lc-esp-directa', fincaId: 'finca-esperanza', nombre: 'Compra directa finca', tipo: 'directa', activo: 1 },
  ]).onConflictDoNothing()
  await db.insert(lugaresVentas).values([
    { id: 'lv-esp-subasta', fincaId: 'finca-esperanza', nombre: 'Subasta ganadera',   tipo: 'subasta', activo: 1 },
    { id: 'lv-esp-friogan', fincaId: 'finca-esperanza', nombre: 'Planta de beneficio', tipo: 'planta',  activo: 1 },
  ]).onConflictDoNothing()

  // --- Productos sanitarios + stock inicial (habilitan las pantallas de
  // Sanidad: catálogo, almacén, refuerzos) ---
  await db.insert(productosSanitarios).values([
    { id: 'prod-esp-aftosa', fincaId: 'finca-esperanza', codigo: 'VAC-AFTOSA', descripcion: 'Vacuna fiebre aftosa', mlMgPorDosis: 2, tipoTratamiento: 'vacuna', precioDosis: 3500, activo: true },
    { id: 'prod-esp-brucela', fincaId: 'finca-esperanza', codigo: 'VAC-BRUCELA', descripcion: 'Vacuna brucelosis (Cepa 19)', mlMgPorDosis: 2, tipoTratamiento: 'vacuna', precioDosis: 4200, activo: true },
    { id: 'prod-esp-iverm', fincaId: 'finca-esperanza', codigo: 'IVERMECTINA', descripcion: 'Ivermectina 1%', mlMgPorDosis: 1, tipoTratamiento: 'no_reproductivo', precioDosis: 1800, activo: true },
  ]).onConflictDoNothing()
  await db.insert(almacenEntradas).values([
    { id: 'ent-esp-aftosa-1', productoId: 'prod-esp-aftosa', fecha: '2026-06-01', dosis: 150, precioPorDosis: 3500, usuarioCreadoPor: 'user-admin' },
    { id: 'ent-esp-iverm-1',  productoId: 'prod-esp-iverm',  fecha: '2026-06-15', dosis: 50,  precioPorDosis: 1800, usuarioCreadoPor: 'user-admin' },
  ]).onConflictDoNothing()
}

// =====================================================================

async function seed() {
  const db = createClient()
  console.log('Seeding GanaWeb v3 — nivel SISTEMA…')
  await seedSistema(db)
  if (DEMO) {
    console.log('SEED_DEMO=true — nivel DEMO…')
    await seedDemo(db)
  }
  console.log('Seed completado.')
  console.log(DEMO
    ? 'Demo: admin@ganaweb.demo / Admin123! (Administradora en La Esperanza, Solo lectura en El Roble)'
    : 'Solo datos de sistema. Para datos de demostración: SEED_DEMO=true')
}

seed().catch((e) => { console.error(e); process.exit(1) })
