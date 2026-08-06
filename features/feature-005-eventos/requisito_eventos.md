# GanaWeb — Requisito Funcional: Eventos (RF-EVENTOS v1.0)

> Funcionalidad de registro y consulta de eventos del hato. Cubre la
> pantalla de Eventos general (tablero por categoría) en desktop, el
> registro individual y grupal, y la integración con la ficha del animal.
> Reglas propias: **EV-xxx** (citables en PRs y tests).
> Fuente de verdad del modelo: `0000_initial.sql`.
> Ubicación en repo: `features/feature-004-eventos/requisito_eventos.md`
> Ante contradicción con el esquema: gana el esquema; reportar (IA-001).

---

## 1. Decisión de arquitectura (fundamento)

**No existe ni se crea una tabla `eventos` genérica.** El esquema modela
cada tipo de evento con su propia tabla, porque cada uno tiene campos
irreductiblemente distintos. Un evento aplanado a JSON perdería validación,
integridad referencial y capacidad de reporte.

- **EV-ARQ-01** — La funcionalidad de Eventos es una **capa de presentación
  y captura** sobre las tablas especializadas ya existentes. No introduce
  una tabla contenedora.
- **EV-ARQ-02** — La **vista unificada** (feed de últimos eventos, timeline
  del animal) se construye por **UNION** sobre el tronco común de esas
  tablas (`animal_id`, `registro_grupal_id`, `fecha`, `usuario_creado_por`,
  + un discriminador de tipo), no materializando una tabla nueva. Reutiliza
  el diseño del timeline de la ficha (`crud_animales.md` CA-TL-xxx).
- **EV-ARQ-03** — Los eventos **grupales** se soportan con la tabla
  `registros_grupales` (ya existe: `tipo_evento`, `total_animales`,
  `lote_id`, `potrero_id`, `fecha`, `anulado_en`). Cada fila de evento
  individual referencia su `registro_grupal_id` cuando pertenece a un lote.

## 2. Catálogo de tipos de evento (del esquema real)

Cuatro categorías, agrupadas como las mentaliza el ganadero:

### Reproductivo
| Evento | Tabla | Campos propios clave |
|---|---|---|
| Servicio / monta | `servicios` | tipo (monta/IA), padre_id, pajuela_id, inseminador_id, tipo_inseminacion, dosis |
| Palpación | `palpaciones` | servicio_id, diagnostico_id, resultado, dias_gestacion |
| Parto | `partos` (+`partos_crias`) | servicio_id, machos, hembras, muertos, tipo_parto |

### Sanitario
| Evento | Tabla | Campos propios clave |
|---|---|---|
| Aplicación sanitaria | `aplicaciones_sanitarias` | producto, dosis, vía, lote/vencimiento |
| Revisión veterinaria | `revisiones_veterinarias` | diagnostico_id, tipo_diagnostico, celo_presentado, veterinario_id |

> Nota: `diagnosticos_veterinarios` es un **catálogo** (finca_id, nombre,
> categoria), NO un evento. El evento es `revisiones_veterinarias`.

### Productivo
| Evento | Tabla | Campos propios clave |
|---|---|---|
| Pesaje | `pesos` | peso_kg, tipo_peso |
| Producción láctea | `producciones_lacteas` | cantidad_am, cantidad_pm, potrero/sector/lote/grupo |
| Condición corporal | `animales_condicion_corporal` | condicion_id, puntaje |

### Salidas / movimientos
| Evento | Tabla | Campos propios clave |
|---|---|---|
| Venta | `ventas` | motivo_venta_id, lugar_venta_id, peso_venta_kg, precio, comprador |
| Muerte | `muertes` | causa_muerte_id |
| Traslado / ubicación | `animales_ubicacion_historico` | potrero/sector/lote/grupo, motivo |

- **EV-CAT-01** — La agrupación en 4 categorías es de presentación; cada
  evento se persiste en su tabla real. Añadir un tipo nuevo = añadir su
  tabla + su tarjeta de categoría, sin tocar las demás.

## 3. Pantalla de Eventos general (desktop) — tablero por categoría

- **EV-001** — Ruta `/fincas/$fincaId/eventos`. Permiso base:
  `eventos:ver` (verificar el nombre real en el catálogo RBAC; si no
  existe, es dependencia a crear).
- **EV-002 · Tarjetas de categoría** — 4 tarjetas (Reproductivo, Sanitario,
  Productivo, Salidas). Cada una lista sus tipos con un contador de
  actividad reciente y un atajo "+ Registrar →" por categoría.
- **EV-003 · Contador de actividad** — Muestra el conteo del **mes en
  curso** por tipo (no histórico total). Etiqueta "este mes" visible.
  Deriva de contar filas por tabla con `fecha` en el rango.
- **EV-004 · Feed de últimos eventos** — Bajo las tarjetas, lista unificada
  (UNION, EV-ARQ-02) de los eventos más recientes de toda la finca,
  ordenada por `fecha` desc. Cada fila: ícono+color de categoría, título
  ("Servicio · MT-120 Lucero"), detalle corto (IA · pajuela BR-45),
  alcance (individual o "N animales" si grupal) y fecha.
- **EV-005 · Filtro del feed** — Un selector "Todos ▾" filtra el feed por
  categoría o tipo. "Ver todo →" lleva a la vista completa del historial
  (paginada; reutiliza patrón del listado si aplica).
- **EV-006 · Distinción individual/grupal en el feed** — Los eventos
  grupales muestran el alcance ("40 animales · Lote Vientres"); los
  individuales, el animal ("MT-120 Lucero"). El ícono es el del tipo.
- **EV-007 · Botón "+ Registrar evento"** — Arriba a la derecha; abre el
  selector de tipo (EV-010). Los "+ Registrar →" de cada tarjeta son
  atajos que abren el selector ya filtrado a esa categoría.

## 4. Registro de eventos (individual y grupal)

- **EV-010 · Selector de tipo** — Al registrar, primero se elige el tipo de
  evento (dentro de su categoría). Luego se abre el formulario específico de
  ese tipo (campos propios de su tabla, §2).
- **EV-011 · Alcance del evento** — El formulario pregunta el alcance:
  **individual** (un animal) o **grupal** (varios). Individual → selector de
  un animal. Grupal → selección múltiple: por lista de animales, por lote,
  por potrero o por grupo.
- **EV-012 · Registro grupal** — Al confirmar un evento grupal:
  1. Se crea una fila en `registros_grupales` (`tipo_evento`,
     `total_animales`, `lote_id`/`potrero_id`, `fecha`).
  2. Se crea una fila de evento en la tabla específica **por cada animal**
     del grupo, todas con el mismo `registro_grupal_id`.
  Así el evento grupal es consultable como unidad (una tarjeta en el feed) y
  como eventos individuales (en la ficha de cada animal).
- **EV-012b · Wizard de 3 pasos** — El registro se presenta como un
  wizard modal: **Paso 1** elegir tipo (agrupado por categoría), **Paso 2**
  alcance (individual/grupal + selección por lista/lote/potrero/grupo con
  exclusión), **Paso 3** datos. Desde un atajo de categoría, el Paso 1 llega
  filtrado. Desde la ficha, el alcance es individual con el animal fijado.
- **EV-012c · Datos compartidos vs por-animal (grupal)** — En un evento
  grupal, los campos se dividen en dos: **compartidos** (iguales para todos:
  fecha, producto de una vacuna, tipo de servicio) se capturan una sola vez;
  **por-animal** (varían: el peso de cada uno) se capturan en una **grilla
  con una fila por animal**. Al guardar, cada fila individual toma su valor
  por-animal de la grilla y los compartidos del encabezado. Los tipos sin
  campos variables (una vacuna) omiten la grilla.
- **EV-013 · Campos comunes** — Todo evento captura `fecha` (default hoy),
  y hereda `finca_id`, `usuario_creado_por` del contexto. Los campos
  propios según la tabla del tipo (§2).
- **EV-014 · Validaciones de dominio** — Reglas propias del tipo. Ejemplos:
  un parto requiere un servicio previo opcional pero coherente; una
  palpación con resultado "preñada" habilita `dias_gestacion`; una venta
  cambia el `estado_animal_key` del animal a Vendido (coordinar con la
  máquina de estados de `arquitectura_funcional.md`); una muerte lo cambia a
  Muerto. Estos efectos de estado se documentan por tipo en el detalle
  técnico, no se improvisan.
- **EV-015 · Efectos colaterales** — Algunos eventos actualizan al animal:
  venta/muerte cambian estado; traslado actualiza ubicación actual
  (`potrero_id`/`sector_id`/`lote_id`/`grupo_id` del animal) además de
  escribir el histórico; parto puede crear las crías como nuevos animales
  (vía `partos_crias`). Cada efecto se especifica en el requisito técnico
  del tipo.

## 5. Integración con la ficha del animal

- **EV-020** — La ficha del animal (pantalla 19) muestra su **timeline**:
  los eventos de ese animal, unificados (EV-ARQ-02). Un evento grupal
  aparece en la ficha de cada animal participante como un evento individual
  con nota de que fue parte de un registro grupal.
- **EV-021 · Doble punto de entrada** — Los eventos se registran tanto desde
  la pantalla de Eventos general como desde la ficha del animal (con el
  animal ya preseleccionado). **Ambos usan los mismos formularios de
  captura** (un solo componente por tipo), para no divergir.

## 6. Anulación / corrección

- **EV-030 · Anulación de grupales** — `registros_grupales` tiene
  `anulado_en`: anular un registro grupal marca el grupo y sus eventos
  individuales como anulados (soft-delete), sin borrado físico, preservando
  auditoría. Permiso a definir (`eventos:eliminar` o equivalente).
- **EV-031 · Corrección de individuales** — Editar un evento individual
  respeta la misma política de auditoría del resto del sistema. Un evento
  con efectos de estado (venta, muerte) requiere revertir el efecto al
  anular (p. ej. anular una venta devuelve el animal a "En finca") — se
  especifica por tipo.

## 7. Estados y comportamiento

- **EV-040** — Estados de la pantalla: cargando (skeleton de tarjetas +
  feed), sin eventos aún (EmptyState "Registra el primer evento"), error con
  reintento. El feed vacío tras filtro muestra "Ningún evento de este tipo".
- **EV-041 · Offline** — Consistente con la política del listado: el feed y
  las tarjetas se leen de la réplica local si aplica; el registro offline se
  encola en `sync_outbox` como el resto de escrituras. (Si offline aún no
  está aprobado como iniciativa, este punto se limita a "no romper sin
  conexión" y se difiere.)
- **EV-042 · Tokens y temas** — Solo tokens del sistema; render correcto en
  los 10 temas. Cada categoría tiene su color de dominio consistente con el
  resto de la app.

## 8. RBAC

- **EV-RBAC-01** — Ver eventos: `eventos:ver`. Registrar: `eventos:crear`.
  Anular/editar: `eventos:eliminar`/`eventos:editar`. Verificar nombres
  reales en el catálogo; los que falten son dependencia a crear.
- **EV-RBAC-02** — Filtro de finca server-side: solo eventos de las fincas
  del usuario y de la finca activa. Finca ajena → 403.
- **EV-RBAC-03** — El botón "+ Registrar evento" y los atajos por categoría
  se ocultan sin `eventos:crear`.

## 9. Criterios de aceptación

1. El tablero muestra 4 tarjetas de categoría con sus tipos y contador del
   mes; render en los 10 temas (EV-002/003/042).
2. El feed unifica eventos de todas las tablas por UNION, ordenados por
   fecha, distinguiendo individual vs grupal (EV-004/006).
3. Registrar un evento individual crea una fila en la tabla del tipo con sus
   campos propios (EV-010/013).
4. Registrar un evento grupal crea 1 fila en `registros_grupales` + N filas
   individuales con el mismo `registro_grupal_id` (EV-012).
5. El evento grupal aparece como unidad en el feed y como evento individual
   en la ficha de cada animal (EV-012/020).
6. Venta/muerte cambian el estado del animal; traslado actualiza su
   ubicación; anular revierte el efecto (EV-014/015/031).
7. Anular un grupal marca `anulado_en` sin borrado físico (EV-030).
8. RBAC: registrar requiere `eventos:crear`; finca ajena → 403
   (EV-RBAC-01..03).
9. Los formularios de captura son los mismos desde Eventos y desde la ficha
   (EV-021).

## 10. Dependencias / fuera de alcance

1. Confirmar permisos `eventos:*` en el catálogo RBAC (EV-RBAC-01).
2. Efectos de estado por tipo (venta→Vendido, muerte→Muerto, parto→crea
   crías): especificar en requisito técnico por tipo, alineado con la
   máquina de estados de `arquitectura_funcional.md`.
3. Vista "Ver todo" del historial completo (paginado): puede reutilizar el
   contrato del listado de animales o definirse aparte; fuera del alcance de
   v1.0 de Eventos si se prioriza el tablero.
4. Offline de escritura vía `sync_outbox`: depende de la iniciativa de
   sincronización.
5. Reportes/exportación de eventos: v1.1.
