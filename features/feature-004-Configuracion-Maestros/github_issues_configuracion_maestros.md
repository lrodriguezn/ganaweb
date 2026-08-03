# Issues de GitHub - Configuración · Maestros (RF-CONFIG-MAESTROS v1.0)

> Creados en GitHub el 2026-08-04 (#146–#152) con autorización del mantenedor. Fuente de verdad: `requisito_configuracion_maestros.md` v1.0. Las reglas `CM-xxx` citadas viven en ese documento.

## Épica — [#146](https://github.com/lrodriguezn/ganaweb/issues/146)

**Título:** `[Épica] Configuración · Maestros - hub + CRUD online (RF-CONFIG-MAESTROS v1.0)`

**Dueño:** Product/Tech Lead

**Labels:** `epic`, `feature`, `módulo:configuracion`

```markdown
## Objetivo
Entregar el módulo Configuración: hub de Maestros (desktop y mobile) con
conteos en vivo, progreso "N de 8 requeridos" y alertas de vacíos
bloqueantes, más el CRUD genérico (listar/crear/editar/inactivar) de los
maestros por finca, Datos de la finca y catálogos globales solo lectura.
Online-first (PostgreSQL único), RBAC configuracion:* solo Administrador,
baja exclusivamente por inactivación (RN-050).

## Sub-issues y orden
- [ ] 1. #147 Migración es_inseminador, casos de uso de escritura y conteos - bloquea 2
- [ ] 2. #148 Funciones de servidor del hub y CRUD con RBAC - depende de 1; bloquea 3, 4 y 5
- [ ] 3. #149 Hub de Maestros desktop/mobile + entradas - depende de 2
- [ ] 4. #150 Pantalla CRUD genérica (panel/sheet, tabs, inactivación) - depende de 2
- [ ] 5. #151 Datos de la finca + catálogos globales solo lectura - depende de 2
- [ ] 6. #152 Suite de pruebas e invariantes RBAC - depende de 1 a 5

## Cierre
- [ ] Se cumplen los 13 criterios de aceptación de RF-CONFIG-MAESTROS v1.0.
- [ ] Supuestos S-1 (sub-menú mobile), S-2 (paginación) y S-3
      (MaestrosProgreso) confirmados y documentados en los PRs.
- [ ] Invariante TS-004(4) verificada: Solo-lectura no ve Configuración ni
      botones de crear.
```

## Sub-issue 1 - [#147](https://github.com/lrodriguezn/ganaweb/issues/147) Migración, casos de uso de escritura y conteos

**Título:** `Configuración maestros: migración es_inseminador, casos de uso de escritura y conteos`

**Dueño:** Backend/Dominio-Aplicación; Backend/Database para la migración

**Labels:** `feature`, `backend`, `database`, `módulo:configuracion`

```markdown
## Alcance
Implementar §4, §5.2, §5.3 y §6 del requisito (CM-026, CM-030, CM-032,
CM-040, CM-041, CM-045, CM-061). Este issue bloquea el resto. No incluye
funciones de servidor ni UI.

## Tareas Backend/Database
- [ ] Migración Drizzle: veterinarios.es_inseminador (misma convención que
      activo), default 0, reversible; sin backfill de datos.
- [ ] Verificar que no se requieren índices nuevos para conteos por finca_id
      (CM-062); documentar la decisión en el PR.

## Tareas Backend/Dominio-Aplicación
- [ ] Validaciones dominio (TDD, paquetes/dominio): requeridos y largos según
      matriz §4, email básico, numéricos >= 0 (hectáreas con decimales),
      telefono <= 20, strings recortados.
- [ ] Regla de nombre duplicado por finca: case-insensitive, solo activos
      reservan el nombre (R-D1 / CM-041); resultado de dominio tipado.
- [ ] Puertos y casos de uso de escritura: crearMaestro, editarMaestro y
      cambiarEstadoMaestro para las familias por finca (veterinarios,
      propietarios, potreros, sectores, lotes, grupos, hierros, diagnosticos,
      motivos_ventas, causas_muerte, lugares_compras) + editarFinca (datos
      básicos CM-050).
- [ ] Inseminadores como subconjunto: crear desde Inseminadores fuerza
      es_inseminador=1; listar/contar filtran por el flag (CM-040).
- [ ] Conteos agregados: un solo query por finca devuelve conteos activo=1 de
      todos los maestros + completitud de datos de la finca (CM-007, CM-061).
- [ ] Adaptadores Drizzle de escritura reutilizando la infraestructura de
      catálogos existente (sin duplicar adaptadores, CM-061); mapeo del
      UNIQUE(finca_id, codigo) de potreros/sectores a conflicto de campo
      codigo (CM-032).
- [ ] Resultados tipo unión serializables: creado | actualizado | validacion
      | conflicto | no_encontrado | error (CM-042).

## Criterios
- [ ] Suite unitaria de validaciones por familia (requeridos, largos, email,
      numéricos, duplicados) verde; cobertura dominio >= 90 %.
- [ ] Migración aplica y revierte; veterinarios existentes quedan con
      es_inseminador=0 y servicios.inseminador_id sin cambio de FK.
- [ ] Inactivar/reactivar actualiza activo 0/1 sin borrado físico en ninguna
      operación (RN-050).
- [ ] Los conteos devuelven valores por maestro en una única consulta
      agregada; Inseminadores cuenta solo el subconjunto con flag.
- [ ] Casos de uso rechazan fincaId distinto al del registro (scope).
```

## Sub-issue 2 - [#148](https://github.com/lrodriguezn/ganaweb/issues/148) Funciones de servidor del hub y CRUD con RBAC

**Título:** `Configuración maestros: funciones de servidor del hub y CRUD con RBAC`

**Dueño:** Backend/API

**Labels:** `feature`, `backend`, `seguridad`, `módulo:configuracion`

```markdown
## Alcance
Implementar §2, §3.4 y §6 del requisito (CM-020..CM-026, CM-060..CM-062)
sobre los casos de uso del sub-issue 1. Patrón createServerFn + módulo
.server.ts de animal-actions. Bloquea los tres issues de frontend.

## Tareas Backend/API
- [ ] resumenMaestros(fincaId): MaestroResumen[] con los 15 items, conteos en
      vivo, requeridoPara y ruta scoping /fincas/$fincaId/configuracion/...
      (CM-001, CM-007, CM-012).
- [ ] Módulo único de definición de maestros: mapping maestro -> grupo,
      requeridoPara y tabla (CM-012), reutilizado por hub y validaciones.
- [ ] Degradación por item: fallo de un conteo no tumba el hub (CM-014).
- [ ] listarMaestro (busqueda, incluirInactivos, paginación) y
      listarCatalogoGlobal (solo lectura) (CM-034, CM-053).
- [ ] crearMaestro, editarMaestro, cambiarEstadoMaestro, editarFinca con
      re-validación de permiso en servidor (PE-002): configuracion:crear /
      editar / inactivar (CM-022).
- [ ] Scope de finca en servidor: acceso a maestro de otra finca responde
      como inexistente, sin revelar existencia (CM-024).
- [ ] Sin superficie de mutación para config_razas, config_tipos_explotacion
      y config_calidad_animal (CM-025).

## Criterios
- [ ] Invocación directa de cualquier función de escritura con rol sin
      permiso devuelve permiso_denegado (sin excepción cruda).
- [ ] resumenMaestros devuelve 15 items; un conteo fallado degrada solo su
      card.
- [ ] Request con fincaId ajeno no filtra datos de otra finca.
- [ ] No existe endpoint ni función de creación/edición/borrado de catálogos
      globales.
- [ ] Contratos cubiertos por tests de funciones de servidor (uniones
      serializables).
```

## Sub-issue 3 - [#149](https://github.com/lrodriguezn/ganaweb/issues/149) Hub de Maestros desktop/mobile + entradas

**Título:** `Configuración maestros: hub de Maestros desktop y mobile con entradas cableadas`

**Dueño:** Frontend

**Labels:** `feature`, `frontend`, `a11y`, `módulo:configuracion`

```markdown
## Alcance
Implementar §3 y §7 del requisito (CM-001..CM-015, CM-070..CM-073). Frames
de referencia: docs/ganaweb-diseno.op page-1 frame-20073 (desktop) y
frame-20188 (mobile).

## Tareas Frontend
- [ ] Ruta /fincas/$fincaId/configuracion con loader sobre resumenMaestros;
      guard coherente con el layout _app.
- [ ] Reutilizar MaestroGrid/MaestroCard/MaestrosProgreso; actualizar
      MaestroResumen.ruta a rutas con scope de finca (CM-071, sin forks).
- [ ] Desktop: título "Maestros" + subtítulo + badge de progreso + grid por
      grupos PERSONAS / UBICACIÓN / CLASIFICACIÓN Y COMERCIALES (CM-003..
      CM-005).
- [ ] Mobile: filas 56px con chevron; filas consolidadas "Predios · Potreros
      · Sectores" y "Causas de muerte · Lugares de compra" abren sub-menú de
      grupo (S-1, CM-009); todos los maestros alcanzables incl. globales
      (CM-010).
- [ ] Cablear entradas existentes: sidebar onConfigurar y botón Configuración
      de _app/mas, gateados por configuracion:ver (CM-002).
- [ ] Estados: skeleton de carga, error con reintento, degradación por card
      con "—" (CM-014).
- [ ] Header según diseño: "Configuración" sin back en desktop; con back en
      mobile.

## Tareas QA
- [ ] Verificar targets >= 48px, foco visible, labels y semántica del grid.
- [ ] Verificar light/dark vía tokens (.dark), sin dark: variants (T-004).

## Criterios
- [ ] Administrador entra al hub desde sidebar (desktop) y desde "Más"
      (mobile); sin configuracion:ver no hay entradas ni acceso a la ruta.
- [ ] Badge "N de 8 requeridos completos" correcto según §3.3; desaparece al
      completar los 8 (CM-011).
- [ ] Maestro vacío bloqueante muestra "Vacío · requerido para {proceso}" en
      danger; vacío no bloqueante muestra "Vacío" neutro (CM-006).
- [ ] Lotes · Grupos muestra conteo "N · M" (CM-008).
- [ ] Temas light/dark correctos vía tokens en desktop y mobile.
```

## Sub-issue 4 - [#150](https://github.com/lrodriguezn/ganaweb/issues/150) Pantalla CRUD genérica

**Título:** `Configuración maestros: CRUD genérico con panel lateral/sheet, tabs e inactivación`

**Dueño:** Frontend

**Labels:** `feature`, `frontend`, `a11y`, `módulo:configuracion`

```markdown
## Alcance
Implementar §4, §5.1, §5.2, §5.3 y §7 del requisito (CM-033..CM-046,
CM-070..CM-073) para los 10 maestros editables, sobre los contratos del
sub-issue 2. Patrón del design system v1.2: tabla + búsqueda + "+ Nuevo" +
panel lateral (desktop) / sheet (mobile).

## Tareas Frontend
- [ ] Ruta /fincas/$fincaId/configuracion/$maestro para cada maestro editable
      + vista Inseminadores (subconjunto es_inseminador=1).
- [ ] Tabla desktop y filas mobile; búsqueda sobre nombre (+ codigo en
      potreros/sectores, + numero_documento en propietarios); orden nombre
      asc por defecto (CM-033, CM-034).
- [ ] Toggle "Mostrar inactivos" con badge neutral "Inactivo" (CM-036).
- [ ] Panel lateral (desktop) / bottom sheet (mobile) para crear y editar con
      los campos de la matriz §4; errores de campo desde resultados del
      dominio; cierre con cambios sin guardar pide confirmación (CM-039,
      CM-041, CM-042).
- [ ] Duplicado de nombre activo -> error de campo; UNIQUE(finca_id, codigo)
      -> error de campo codigo (CM-041, CM-032).
- [ ] Inseminadores: formulario de veterinarios con flag forzado a 1; switch
      "También es inseminador" en la vista Veterinarios (CM-040).
- [ ] Lotes · Grupos: una ruta con tabs "Lotes" | "Grupos", cada una con su
      tabla y "+ Nuevo" (CM-035).
- [ ] Inactivar/Activar con confirmación y copy del efecto; nota muted de
      integridad bajo la tabla (CM-044..CM-046).
- [ ] Estado vacío de lista con CTA "+ Nuevo" (CM-038).
- [ ] Conectar SelectConCreacion de los formularios existentes a crearMaestro
      (CM-043).
- [ ] Paginación si el volumen lo amerita (S-2, CM-037).

## Criterios
- [ ] Ciclo completo (crear, editar, inactivar, reactivar) funciona para los
      10 maestros; no existe botón de eliminar en ninguna vista.
- [ ] Inactivos ocultos por defecto y visibles con toggle; se conservan para
      históricos (RN-050).
- [ ] Crear desde Inseminadores produce un veterinario con flag; la vista
      lista solo el subconjunto.
- [ ] Sheet en mobile y panel lateral en desktop; targets >= 48px y foco
      correcto en ambos.
- [ ] SelectConCreacion crea registros reales con configuracion:crear y no se
      renderiza sin el permiso.
```

## Sub-issue 5 - [#151](https://github.com/lrodriguezn/ganaweb/issues/151) Datos de la finca + catálogos globales solo lectura

**Título:** `Configuración maestros: Datos de la finca y catálogos globales solo lectura`

**Dueño:** Frontend

**Labels:** `feature`, `frontend`, `módulo:configuracion`

```markdown
## Alcance
Implementar §5.4 y §5.5 del requisito (CM-050, CM-051, CM-053, CM-054) sobre
los contratos del sub-issue 2.

## Tareas Frontend
- [ ] Ruta /fincas/$fincaId/configuracion/predio: formulario con codigo (solo
      lectura), nombre*, departamento, municipio, vereda, area_hectareas,
      capacidad_maxima y tipo_explotacion_id (select del catálogo global).
- [ ] Guardar vía editarFinca con toast y errores de campo; sin
      configuracion:editar el formulario es solo lectura.
- [ ] Sin acciones de crear/borrar finca en esta vista (CM-051).
- [ ] Listas solo lectura de Razas (nombre, descripcion, origen,
      tipo_produccion), Tipos de explotación y Calidades (nombre,
      descripcion) con búsqueda y nota "Catálogo global gestionado por la
      administración de GanaWeb" (CM-053, CM-054).
- [ ] Card Predios del hub refleja "1 registro" / "Incompleto" según CM-007
      (coordinado con sub-issue 2).

## Criterios
- [ ] Editar datos de la finca persiste; codigo no editable.
- [ ] Las tres listas globales no muestran affordances de escritura.
- [ ] Sin configuracion:editar no hay acción de guardado en Datos de la
      finca.
```

## Sub-issue 6 - [#152](https://github.com/lrodriguezn/ganaweb/issues/152) Suite de pruebas e invariantes RBAC

**Título:** `Configuración maestros: suite de pruebas y verificación de invariantes RBAC`

**Dueño:** QA

**Labels:** `qa`, `feature`, `módulo:configuracion`

```markdown
## Alcance
Verificar §8 completo (13 criterios de aceptación) y §9 QA del requisito.
Complementa (no reemplaza) los tests TDD de los sub-issues 1-5.

## Tareas QA
- [ ] Integración de adaptadores contra Postgres efímero (escritura, conteos,
      scope por finca).
- [ ] Tests de rutas/vistas con Testing Library: hub, CRUD genérico, tabs
      Lotes·Grupos, Datos de la finca, listas globales.
- [ ] E2E Playwright: flujo completo de al menos un maestro por grupo
      (crear -> editar -> inactivar -> reactivar), progreso del hub, flujo
      Inseminadores (flag) y edición de Datos de la finca.
- [ ] Invariante RBAC: usuario Solo-lectura no ve Configuración ni botones de
      crear (TS-004(4)); invocación directa de funciones de servidor sin
      permiso devuelve permiso_denegado.
- [ ] Accesibilidad: targets >= 48px en mobile, foco visible, labels reales,
      semántica de tabs, alertas de vacío con texto.
- [ ] Temas: light/dark vía tokens en hub y CRUD (sin dark: variants).

## Criterios
- [ ] E2E verde para los flujos listados.
- [ ] Checklist de los 13 criterios de aceptación verificada y adjunta al PR
      de cierre.
- [ ] Cobertura de dominio >= 90 % en el código nuevo.
```

## Dependencias y decisiones futuras

- Edición de catálogos globales, `lugares_ventas`, `config_colores`, parámetros de finca (`config_parametros_finca`) y gestión de usuarios/roles desde Configuración quedan fuera de v1 (requisito §1.3).
- La paginación concreta (S-2) y el sub-menú mobile (S-1) se confirman durante la implementación y se documentan en los PRs.
- Issues creados (#146–#152) con `status:approved` según autorización del mantenedor; el gate de CI sobre PRs vinculados sigue aplicando.
