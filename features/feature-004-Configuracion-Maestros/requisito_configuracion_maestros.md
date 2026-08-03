# GanaWeb - Requisito funcional: Configuración · Maestros (RF-CONFIG-MAESTROS v1.0)

> **v1.0 — decisiones base:** entrega exclusivamente **online** (PostgreSQL único, sin réplica local). Alcance: **hub de Maestros + CRUD completo** de los maestros por finca, catálogos globales en **solo lectura**, Inseminadores como **flag sobre Veterinarios**, card Predios resuelta como **Datos de la finca**, y **solo inactivación** (nunca borrado físico, RN-050). Rutas bajo `/fincas/$fincaId/configuracion`. RBAC: solo Administrador posee `configuracion:*`.

**Fuentes de diseño:** `docs/ganaweb-diseno.op` — página `GanaWeb` (page-1): frame `frame-20073` "11 Configuración · Desktop" (1440×900) y frame `frame-20188` "13 Configuración · Mobile" (390×844). Las demás páginas del archivo son variantes de tema (Dark, Moderna, Índigo, Cielo, Grafito) y deben respetarse vía tokens, sin estilos ad hoc.
**Fuentes funcionales:** `docs/ganaweb-design.md` v1.2 §Configuración/Maestros, `docs/arquitectura_funcional.md` §1.2/§1.3/§3 (RN-050, PE-002, PE-005), `docs/especificaciones_tecnicas.md` (stack, T-001..T-004, TS-004).
**Convención de IDs:** reglas `CM-xxx` (estables; se citan en código, issues y specs).

---

## 1. Objetivo y alcance

### 1.1 Objetivo

Entregar el módulo **Configuración** de GanaWeb: un hub de **Maestros** (datos base que alimentan los formularios de registro) con administración completa (listar, crear, editar, inactivar) de los maestros por finca, y consulta de los catálogos globales. Es el prerequisito operativo de los módulos de eventos (sanidad, servicios IA, ventas, bajas) y de la creación contextual ("+ Crear nuevo") en los formularios.

### 1.2 Alcance incluido

| # | Entrega | Detalle |
|---|---|---|
| A1 | Hub de Maestros (desktop y mobile) | Índice agrupado con cards/filas, conteos en vivo, indicador de progreso y alertas de maestros vacíos bloqueantes |
| A2 | CRUD genérico de maestros por finca | Un solo patrón para 10 maestros editables (ver §4): tabla + búsqueda + "+ Nuevo" + panel lateral (desktop) / sheet (mobile) |
| A3 | Inseminadores como subconjunto de Veterinarios | Campo `es_inseminador` en `veterinarios`; card y vista propia sobre el subconjunto |
| A4 | Datos de la finca (card Predios) | Vista/edición básica de los datos de la finca actual |
| A5 | Catálogos globales solo lectura | Razas, Tipos de explotación, Calidades: lista consultable sin escritura |
| A6 | Cableado de entradas existentes | Sidebar (`onConfigurar`), pantalla "Más" (mobile), y `SelectConCreacion` ("+ Crear nuevo" en formularios) conectados a los casos de uso reales |
| A7 | Contratos de escritura | Casos de uso crear/editar/inactivar + funciones de servidor con re-validación de permisos (PE-002) |

### 1.3 Fuera de alcance (v1)

- Edición de catálogos globales (`config_razas`, `config_tipos_explotacion`, `config_calidad_animal`, `config_colores`) — quedan sembrados y gestionados fuera de la finca (CM-053).
- `lugares_ventas` (existe en esquema, referenciado por `ventas`) y `config_colores`: candidatos para cuando se construyan los módulos Ventas / ficha de color. No se muestran en el hub.
- Parámetros de finca (`config_parametros_finca`, umbrales de negocio) y gestión de usuarios/roles: son otras secciones futuras de Configuración.
- Eliminación física de maestros (CM-060): no existe en esta versión bajo ninguna condición.
- Operaciones masivas (importar/exportar maestros), auditoría de cambios y versionado de registros.
- Módulos consumidores de eventos (Sanidad, Servicios IA, Ventas, Bajas) en sí mismos; este requisito solo garantiza que sus maestros esten administrables.

### 1.4 Definiciones

- **Maestro por finca:** tabla con `finca_id`, alcance multi-tenant por finca (p. ej. `potreros`, `veterinarios`).
- **Catálogo global:** tabla `config_*` sin `finca_id`, compartida por todas las fincas, sembrada en `packages/db/src/seed/seed.ts`.
- **Maestro requerido:** maestro vacío que bloquea o degrada un proceso operativo; el hub lo señala con alerta danger y alimenta el indicador de progreso (CM-011).
- **Inactivar:** marcar `activo = 0`; el registro desaparece de selects y listas por defecto pero permanece en históricos y reportes (RN-050).

---

## 2. RBAC y seguridad

| ID | Regla |
|---|---|
| CM-020 | El módulo `configuracion` usa las acciones del catálogo §1.2 de `arquitectura_funcional.md`: `ver`, `crear`, `editar`, `inactivar`. No se solicitan acciones nuevas (`anular`, `exportar`, `eliminar` no aplican en v1; ver regla de no-agregar permisos de `especificaciones_tecnicas.md` §10). |
| CM-021 | Según el seed de roles (§1.3), **solo Administrador** posee `configuracion:*`. Mayordomo, Veterinario y Solo lectura no ven el módulo: el item del sidebar y el botón en "Más" no se renderizan sin `configuracion:ver` (invariante TS-004(4): un usuario Solo-lectura "no ve Configuración ni botones de crear"). |
| CM-022 | PE-002: toda función de servidor de escritura re-valida el permiso en el servidor (`configuracion:crear` / `configuracion:editar` / `configuracion:inactivar`) además del guard de UI. Resultado sin permiso: `{ tipo: "permiso_denegado" }` serializable, nunca excepción cruda. |
| CM-023 | PE-005: no se puede revocar `configuracion:*` al último administrador de la finca. Este requisito no modifica roles, pero la UI de Datos de la finca (CM-050) no debe exponer gestión de membresías. |
| CM-024 | Todo acceso a datos de maestros está **scopado a la finca activa** (`fincaId` desde la URL). Leer/escribir un maestro de otra finca devuelve el mismo error que inexistente (no filtrar por permiso explícitamente para no revelar existencia). |
| CM-025 | Los catálogos globales solo lectura requieren `configuracion:ver`; sus endpoints no exponen mutaciones en v1. |
| CM-026 | Validación de entrada en capa dominio (paquete `dominio`, nombres en español — T-003): largo máximo según esquema (§5), strings recortados, sin HTML. Errores de validación con forma `{ campo, detalle }` mapeados a errores de campo en el límite de la ruta (patrón `nuevo.tsx` de animales). |

---

## 3. Hub de Maestros (índice de Configuración)

### 3.1 Rutas y entradas

| ID | Regla |
|---|---|
| CM-001 | Ruta del hub: `/fincas/$fincaId/configuracion` (scope de finca en la URL, consistente con `animales`). Maestros editables en `/fincas/$fincaId/configuracion/<maestro>` (p. ej. `/configuracion/veterinarios` dentro del scope); Lotes·Grupos en una sola ruta con tabs (CM-035); Datos de la finca en `/configuracion/predio`. |
| CM-002 | Entradas: (a) sidebar desktop — item "Configuración" al final, ya existente, hoy `logPendingNavigation`; (b) mobile — botón "Configuración" en pantalla "Más" (`_app/mas`), hoy `console.log`, gateado por `configuracion:ver`. Ambas se cablean a la ruta real. El header de la pantalla muestra "Configuración" (desktop sin back; mobile con back `‹` según frame `frame-20188`). |

### 3.2 Anatomía del índice

| ID | Regla |
|---|---|
| CM-003 | Título de sección **"Maestros"** (20/600) + subtítulo "Datos base que alimentan los formularios de registro" (12/400 muted), según frame desktop. |
| CM-004 | Agrupación fija en este orden: **PERSONAS**, **UBICACIÓN**, **CLASIFICACIÓN Y COMERCIALES** (labels de grupo 11/600 uppercase muted). Implementado por `MaestroGrid` (`GRUPO_LABEL`), sin grupos dinámicos. |
| CM-005 | Cards del índice (una por maestro) con: nombre (13/500) y conteo (11/400 muted, `num`). Desktop: grid de cards (~260–360px de ancho según frame); mobile: filas de 56px con chevron `›`. |
| CM-006 | Card/fila vacía que bloquea un proceso: alerta danger "⚠ Vacío · requerido para {proceso}" (patrón ya encapsulado en `MaestroCard`). Vacía no bloqueante: solo "Vacío". |
| CM-007 | El conteo de cada card es **en vivo** (server-side al cargar el hub): cantidad de registros `activo = 1` de la finca. Para Inseminadores: `veterinarios` con `es_inseminador = 1 AND activo = 1`. Para Predios: `1 registro` si la finca tiene datos básicos completos (nombre + ubicación), `Incompleto` en caso contrario. |
| CM-008 | Lotes · Grupos se muestra como **una sola card/fila** con conteo doble "N · M" (lotes · grupos), según diseño. |
| CM-009 | En mobile, las filas consolidadas del diseño se mantienen: "Predios · Potreros · Sectores" (conteo `1 · 8 · 4`) y "Causas de muerte · Lugares de compra" (conteo `5 · 4`). **Supuesto S-1:** cada fila consolidada abre una pantalla de sub-menú del grupo con una fila por maestro y su conteo (segundo nivel), preservando el diseño sin ocultar maestros. Pendiente de confirmación en revisión. |
| CM-010 | El frame mobile original no incluye filas para Razas / Tipos de explotación / Calidades; se resolvió que fue **corte del frame** (decisión R-6): mobile muestra los mismos maestros que desktop, con scroll. |
| CM-011 | Indicador global de progreso junto al título: badge "N de 8 requeridos completos" (`MaestrosProgreso`). Desaparece cuando los 8 están completos. |

### 3.3 Los 8 maestros requeridos

Confirmados en revisión (R-5). Un maestro está "completo" cuando tiene ≥ 1 registro activo.

| Maestro | Requerido para | Nota |
|---|---|---|
| Veterinarios | Revisiones sanitarias | `revisiones_veterinarias.veterinario_id` |
| Propietarios | Registro de animales | `animales.propietario_id` |
| Inseminadores | Servicios IA | `servicios.inseminador_id` (subconjunto de veterinarios) |
| Potreros | Ubicación / manejo | `animales.potrero_id`, históricos de ubicación |
| Hierros | Registro de animales | `animales.hierro_id` |
| Diagnósticos | Sanidad | `revisiones_veterinarias.diagnostico_id`, `palpaciones.diagnostico_id` |
| Motivos de venta | Ventas | `ventas.motivo_venta_id` |
| Causas de muerte | Bajas | `muertes.causa_muerte_id` |

| ID | Regla |
|---|---|
| CM-012 | El mapping maestro → `requeridoPara` es **configuración de la app** (constante tipada, no hardcodeado en componentes — T-001 aplica a umbrales; este mapping es dato del producto y vive en un único módulo de definición de maestros reutilizado por hub, progreso y validaciones). |
| CM-013 | Maestros no requeridos (Sectores, Lotes, Grupos, Lugares de compra, Razas, Tipos de explotación, Calidades, Datos de la finca) no descuentan del progreso; si están vacíos muestran "Vacío" neutro. |

### 3.4 Estados del hub

| ID | Regla |
|---|---|
| CM-014 | Cargando: skeleton del grid/ filas (patrón existente de la app). Error de carga: estado de error con reintento; si un conteo individual falla, la card muestra "—" y el hub sigue renderizando (degradación por card, no global). |
| CM-015 | Navegación: tap/click en card abre el CRUD del maestro (o el sub-menú de grupo en mobile CM-009). Sin `configuracion:ver` la ruta redirige según el patrón de guards del `_app` layout. |

---

## 4. Catálogo canónico de maestros

Matriz de los 15 items del hub (13 maestros + Predios→finca + card consolidada Lotes·Grupos que cubre 2 tablas).

| Card (diseño) | Grupo | Tabla(s) | Alcance | Escritura v1 | Campos del formulario (§5) |
|---|---|---|---|---|---|
| Veterinarios | Personas | `veterinarios` | finca | CRUD + inactivar | nombre*, telefono, email, direccion, numero_registro, especialidad, es_inseminador |
| Propietarios | Personas | `propietarios` | finca | CRUD + inactivar | nombre*, tipo_documento, numero_documento, telefono, email, direccion |
| Inseminadores | Personas | `veterinarios` (`es_inseminador=1`) | finca | CRUD + inactivar (subconjunto) | mismo que Veterinarios, `es_inseminador` fijo en 1 |
| Predios | Ubicación | `fincas` | finca actual | Edición básica (CM-050) | nombre*, departamento, municipio, vereda, area_hectareas, capacidad_maxima, tipo_explotacion_id |
| Potreros | Ubicación | `potreros` | finca | CRUD + inactivar | codigo*, nombre*, area_hectareas, tipo_pasto, capacidad_maxima, estado |
| Sectores | Ubicación | `sectores` | finca | CRUD + inactivar | codigo*, nombre*, area_hectareas, tipo_pasto, capacidad_maxima, estado |
| Lotes · Grupos | Ubicación | `lotes` + `grupos` | finca | CRUD + inactivar (2 tabs) | lotes: nombre*, descripcion, tipo (def. "producción") · grupos: nombre*, descripcion |
| Hierros | Clasificación | `hierros` | finca | CRUD + inactivar | nombre*, descripcion |
| Diagnósticos | Clasificación | `diagnosticos_veterinarios` | finca | CRUD + inactivar | nombre*, descripcion, categoria |
| Motivos de venta | Clasificación | `motivos_ventas` | finca | CRUD + inactivar | nombre*, descripcion |
| Causas de muerte | Clasificación | `causas_muerte` | finca | CRUD + inactivar | nombre*, descripcion |
| Lugares de compra | Clasificación | `lugares_compras` | finca | CRUD + inactivar | nombre*, tipo, ubicacion, contacto, telefono |
| Razas | Clasificación | `config_razas` | global | **Solo lectura** | (lista) nombre, descripcion, origen, tipo_produccion |
| Tipos de explotación | Clasificación | `config_tipos_explotacion` | global | **Solo lectura** | (lista) nombre, descripcion |
| Calidades | Clasificación | `config_calidad_animal` | global | **Solo lectura** | (lista) nombre, descripcion |

`*` = campo requerido. Largos máximos según esquema Drizzle (`packages/db/src/schema/maestros.ts`, `config.ts`, `fincas.ts`).

| ID | Regla |
|---|---|
| CM-030 | No se crean tablas nuevas para los maestros listados: el esquema actual cubre todos (paridad verificada con `docs/schema_v3_corregido.sql`). Única alteración de esquema: columna `es_inseminador` en `veterinarios` (CM-040). |
| CM-031 | `lotes.tipo` mantiene su default "producción"; el formulario lo expone como texto corto (v1), sin catálogo de tipos de lote. |
| CM-032 | `potreros`/`sectores` conservan la restricción existente `UNIQUE(finca_id, codigo)`; el error de duplicado se mapea a error de campo `codigo` (CM-026). |

---

## 5. CRUD genérico de maestros

Un solo patrón para los 10 maestros editables (veterinarios, propietarios, inseminadores-subconjunto, potreros, sectores, lotes, grupos, hierros, diagnósticos, motivos_ventas, causas_muerte, lugares_compras), según `ganaweb-design.md` v1.2: *"tabla con búsqueda + botón '+ Nuevo' + panel lateral de formulario (desktop) o sheet (mobile)"*.

### 5.1 Lista

| ID | Regla |
|---|---|
| CM-033 | Tabla desktop: columnas = campos principales del maestro (nombre/codigo primero) + estado + acciones. Mobile: lista de filas (patrón de listas existente; filas ≥ 48px táctiles). |
| CM-034 | Búsqueda case-insensitive sobre `nombre` (y `codigo` en potreros/sectores, y `numero_documento` en propietarios). Búsqueda en servidor para listas > 50 registros; client-side por debajo. Orden por `nombre` asc por defecto (convención de adaptadores existentes). |
| CM-035 | Lotes · Grupos: una ruta con **dos tabs** ("Lotes" | "Grupos"), cada tab con su tabla y su botón "+ Nuevo". En mobile, la card abre la misma pantalla con tabs (tabs accesibles con scroll horizontal si hace falta). |
| CM-036 | Filtro de estado: por defecto solo `activo = 1`. Toggle "Mostrar inactivos" revela inactivos con badge neutral "Inactivo" (regla de integridad visible, §5.4). |
| CM-037 | Paginación simple (25 por página) solo si el maestro lo amerita; v1 puede entregar scroll completo para conteos bajos (< 100) y paginar Diagnósticos si supera. Decisión concreta en diseño técnico. |
| CM-038 | Estado vacío de lista: copy "Aún no hay {maestro}. Crea el primero." + botón "+ Nuevo" destacado (los maestros vacíos son el caso común en fincas nuevas). |

### 5.2 Formulario

| ID | Regla |
|---|---|
| CM-039 | Desktop: **panel lateral** (drawer desde la derecha) con el formulario; mobile: **bottom sheet**. Crear y editar usan el mismo formulario; editar carga el registro y muestra título "Editar {nombre}". Cierre sin guardar con cambios → confirmación. |
| CM-040 | **Inseminadores:** el formulario es el de veterinarios con `es_inseminador` forzado a `1` (campo oculto). Desde la vista Veterinarios, `es_inseminador` es un switch editable ("También es inseminador"). Crear desde la card Inseminadores o desde Veterinarios produce el mismo registro. |
| CM-041 | Validaciones dominio (CM-026): requeridos marcados con `*`; email con formato básico si se ingresa; `area_hectareas` y `capacidad_maxima` numéricos ≥ 0 (hectáreas admite decimales); `telefono` texto libre ≤ 20. Duplicado de nombre dentro de la finca (case-insensitive, ignorando inactivos): **error de campo** "Ya existe un registro con ese nombre" — decisión R-D1: el nombre duplicado se rechaza para evitar ambigüedad en selects; los inactivos no bloquean nombres. |
| CM-042 | Guardar crea/edita vía función de servidor con re-validación (CM-022); éxito → toast de confirmación, cierre del panel, refresco de lista y del conteo del hub al volver. Resultados serializables tipo unión: `creado | actualizado | validacion | permiso_denegado | conflicto | error`. |
| CM-043 | `SelectConCreacion` ("+ Crear nuevo" en formularios de animales/eventos) queda conectado a estos mismos casos de uso de creación: crear desde el contexto usa el mismo contrato y permisos (`configuracion:crear`). Sin el permiso, el affordance no se renderiza (comportamiento ya gateado en `nuevo.tsx`). |

### 5.3 Inactivación

| ID | Regla |
|---|---|
| CM-044 | Acción "Inactivar" por registro (menú de fila / acción del panel). Confirmación explícita con copy que explique el efecto: "Dejará de aparecer en formularios y listas; se conserva en históricos." |
| CM-045 | RN-050: **nunca** borrado físico. Inactivar es la única baja. Registro inactivo puede reactivarse ("Activar") con la misma acción invertida. |
| CM-046 | La nota de integridad se muestra bajo la tabla (muted): "Los registros usados en eventos no se eliminan: se inactivan." (mandato del design system v1.2). |

### 5.4 Datos de la finca (card Predios)

| ID | Regla |
|---|---|
| CM-050 | Ruta `/fincas/$fincaId/configuracion/predio`: vista de los datos de la finca actual — `codigo` (solo lectura), `nombre`*, `departamento`, `municipio`, `vereda`, `area_hectareas`, `capacidad_maxima`, `tipo_explotacion_id` (select del catálogo global, solo lectura en su contenido). Edición con `configuracion:editar`. |
| CM-051 | No hay creación/baja de fincas desde esta vista (el ciclo de vida de fincas — registro, invitaciones, aprobación — pertenece a admin/usuarios). La card Predios del hub refleja el conteo "1 registro" / "Incompleto" según CM-007. |

### 5.5 Catálogos globales solo lectura

| ID | Regla |
|---|---|
| CM-053 | Razas, Tipos de explotación y Calidades abren una **lista solo lectura** (con búsqueda) de los registros activos del catálogo global: columnas según §4. Sin botones de escritura; nota muted: "Catálogo global gestionado por la administración de GanaWeb." |
| CM-054 | Razas muestra `origen` y `tipo_produccion` como columnas secundarias; Tipos de explotación y Calidades solo `nombre` + `descripcion`. |

---

## 6. Contratos (nivel funcional)

La implementación sigue el patrón del módulo animales: funciones de servidor (`createServerFn` + módulo `.server.ts`), puertos en `aplicacion`, adaptadores Drizzle en `db`, UI sin fetching directo.

| Operación | Entrada funcional | Salida funcional |
|---|---|---|
| `resumenMaestros(fincaId)` | fincaId | `MaestroResumen[]` (15 items con `registros` en vivo, `requeridoPara`, `ruta`) + degradación por item |
| `listarMaestro(fincaId, maestro, {busqueda?, incluirInactivos?, pagina?})` | según 5.1 | filas + total; para globales: `listarCatalogoGlobal(tabla, {busqueda?})` |
| `crearMaestro(fincaId, maestro, datos)` | datos validables §5.2 | unión `creado | validacion | permiso_denegado | conflicto | error` |
| `editarMaestro(fincaId, maestro, id, datos)` | id + datos | unión `actualizado | validacion | permiso_denegado | no_encontrado | conflicto | error` |
| `cambiarEstadoMaestro(fincaId, maestro, id, activo)` | id + 0/1 | unión `estado_actualizado | permiso_denegado | no_encontrado | error` |
| `editarFinca(fincaId, datos)` | datos CM-050 | unión `actualizado | validacion | permiso_denegado | error` |

| ID | Regla |
|---|---|
| CM-060 | Todas las operaciones re-checkean permiso y scope de finca en el servidor (CM-022, CM-024). Errores con forma estable y serializable; sin filtrar existencia entre fincas. |
| CM-061 | Los conteos del hub se resuelven en una sola consulta agregada por finca (una función, no 15 round-trips); los adaptadores de lectura existentes (`catalogo-finca`, `catalogo-animal-maestro`, `catalogo-global`) se extienden, no se duplican. |
| CM-062 | Índices: los existentes por `finca_id` bastan para los conteos; si `busqueda` en servidor exige `ILIKE`, evaluar índice en fase de diseño (no bloqueante v1 dado volumen bajo de maestros por finca). |

---

## 7. Diseño, temas y accesibilidad

| ID | Regla |
|---|---|
| CM-070 | Todo el UI con tokens del design system v1.2 (`ganaweb-design.md`): colores semánticos (`peligro`, `alerta`, `exito`), `rounded-card`, tipografías del YAML. Theming por clase `.dark` + tokens; prohibido `dark:` variants (T-004). Las variantes de tema del `.op` (Dark, Moderna, Índigo, Cielo, Grafito) deben quedar cubiertas por tokens sin trabajo extra por pantalla. |
| CM-071 | Reuso obligatorio de componentes existentes: `MaestroCard`, `MaestroGrid`, `MaestrosProgreso` (hub), primitivas `dialog/sheet`, `toast`, `input`, `combobox-buscable` (CRUD). Si el diseño exige un ajuste en estos componentes, se hace en el componente (no forks por pantalla). |
| CM-072 | Accesibilidad: targets táctiles ≥ 48px en mobile; foco visible en panel/sheet; etiquetas reales en inputs; conteos con `tabular-nums`; alertas de vacío con texto (no solo icono); tabs con semántica correcta. |
| CM-073 | Copy en es-CO, neutro/profesional; números con formato es-CO donde aplique. |

---

## 8. Criterios de aceptación

1. Administrador entra a `/fincas/$fincaId/configuracion` desde sidebar (desktop) y desde "Más" (mobile); sin `configuracion:ver` neither entrada es visible ni la ruta es accesible (CM-002, CM-021).
2. El hub muestra los 3 grupos con sus 15 cards/filas, conteos en vivo y el badge "N de 8 requeridos completos" calculado sobre los 8 de §3.3; al completarse los 8, el badge desaparece (CM-004..CM-011).
3. Veterinarios vacío que no bloquea muestra "Vacío"; Inseminadores vacío muestra "⚠ Vacío · requerido para Servicios IA"; Motivos de venta vacío muestra "⚠ Vacío · requerido para Ventas" (CM-006, §3.3).
4. Cada maestro editable abre su CRUD: buscar, ordenar por nombre, crear, editar, inactivar y reactivar funcionan; duplicado de nombre activo → error de campo; `UNIQUE(finca_id, codigo)` en potreros/sectores → error de campo `codigo` (CM-033..CM-045).
5. Inseminadores lista solo `veterinarios` con `es_inseminador=1`; crear desde ahí produce un veterinario con el flag; el switch en Veterinarios edita el flag; `servicios.inseminador_id` sigue apuntando a `veterinarios(id)` sin cambio de FK (CM-040).
6. Lotes · Grupos: una ruta, dos tabs, CRUD independiente por tab, conteo del hub "N · M" (CM-008, CM-035).
7. Datos de la finca: editar nombre/ubicación/área/capacidad/tipo de explotación persiste; `codigo` no editable; sin acciones de crear/borrar finca (CM-050, CM-051).
8. Razas, Tipos de explotación y Calidades: listas solo lectura con búsqueda y nota de catálogo global; ningún endpoint de mutación expuesto (CM-053, CM-025).
9. Ninguna operación de escritura elimina físicamente registros; inactivos ocultos de selects y listas por defecto, visibles con toggle y en históricos (CM-036, CM-045, RN-050).
10. `SelectConCreacion` en formularios de animales crea registros reales del maestro con `configuracion:crear`; sin el permiso no muestra el affordance (CM-043).
11. Usuario Solo-lectura no ve Configuración ni botones de crear (invariante TS-004(4)); funciones de servidor rechazan escrituras de roles sin permiso aunque se invoquen directamente (CM-021, CM-022).
12. Mobile: filas consolidadas del diseño presentes; todos los maestros alcanzables (incl. globales); panel de escritorio sustituido por sheet; temas light/dark correctos vía tokens (CM-009, CM-010, CM-039, CM-070).
13. Todo el código nuevo respeta la arquitectura hexagonal del repo: reglas en `dominio` (TDD, cobertura ≥ 90%), casos de uso en `aplicacion`, adaptadores en `db`, `apps/web` sin importar `dominio` (dependency-cruiser), nombres en español (T-003).

---

## 9. Dependencias y fuera de alcance por rol

**Backend/Dominio-Aplicación**
- Casos de uso crear/editar/inactivar por familia de maestro + validaciones dominio (duplicados, requeridos, numéricos).
- Extensión de puertos/adaptadores de catálogo para escritura y conteos agregados (CM-061).
- Migración Drizzle: `veterinarios.es_inseminador` (CM-040).

**Frontend**
- Rutas `/fincas/$fincaId/configuracion` (hub, `<maestro>`, `predio`) + cableado de entradas existentes (sidebar, "Más").
- Pantalla CRUD genérica (tabla + panel/sheet) y sub-menú de grupos mobile (S-1).
- Conexión real de `SelectConCreacion`.

**QA**
- Unit dominio (validaciones, reglas de duplicados/inactivación), integración de adaptadores contra Postgres efímero, rutas con Testing Library, E2E Playwright: flujo completo de un maestro + invariante Solo-lectura (criterio 11).

**Fuera de alcance (explícito)**
- Edición de catálogos globales, `lugares_ventas`, `config_colores`, parámetros de finca, gestión de usuarios/roles desde Configuración, exportar/importar maestros, borrado físico, módulos de eventos consumidores.

---

## 10. Supuestos y decisiones registradas

**Decisiones confirmadas (ronda 1, 2026-08-04):**
- R-1 Alcance: hub + CRUD completo de todos los maestros.
- R-2 Inseminadores: flag `es_inseminador` sobre `veterinarios` (sin tabla nueva, FK intacta).
- R-3 Predios: card abre Datos de la finca (edición básica; sin tabla `predios`).
- R-4 Catálogos globales: solo lectura en v1.
- R-5 Los 8 requeridos: Veterinarios, Propietarios, Inseminadores, Potreros, Hierros, Diagnósticos, Motivos de venta, Causas de muerte (§3.3).
- R-6 Mobile sin Razas/Tipos/Calidades fue corte del frame: mobile muestra todo.
- R-7 Baja: solo inactivación (RN-050), con reactivación.
- R-8 Rutas bajo `/fincas/$fincaId/configuracion`.

**Supuestos pendientes de confirmación (marcados S-):**
- S-1 Filas mobile consolidadas abren sub-menú de grupo de segundo nivel (CM-009).
- R-D1 Nombre duplicado (activo, case-insensitive, por finca) se rechaza; inactivos no reservan nombre (CM-041).
- S-2 Paginación concreta de listas (CM-037) se define en diseño técnico.
- S-3 El progreso del hub usa la lógica existente de `MaestrosProgreso`; si el cálculo sobre los 8 fijos difiere, se ajusta el componente en este feature.

---

## 11. Descomposición sugerida en issues (borrador — no es el documento de issues)

Propuesta preliminar para la posterior sesión de issues (formato épica + sub-issues como en feature-003):

1. **Épica** `[Épica] Configuración · Maestros — hub + CRUD (RF-CONFIG-MAESTROS v1.0)`.
2. Sub-issue Backend: migración `es_inseminador` + casos de uso de escritura y conteos (dominio/aplicacion/db).
3. Sub-issue Backend: contratos del hub y CRUD (funciones de servidor, permisos PE-002, scope finca).
4. Sub-issue Frontend: hub de Maestros (desktop + mobile) y cableado de entradas (sidebar, "Más").
5. Sub-issue Frontend: pantalla CRUD genérica (tabla + panel lateral/sheet, tabs Lotes·Grupos, inactivación).
6. Sub-issue Frontend: Datos de la finca + listas globales solo lectura.
7. Sub-issue QA: suite unit/integración/E2E + invariante Solo-lectura.

Orden y bloqueos se definen al crear los issues; este requisito es la fuente de verdad.
