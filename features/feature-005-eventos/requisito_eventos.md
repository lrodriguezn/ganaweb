# GanaWeb — Requisito funcional: Eventos (RF-EVENTOS v1.1)

> Eventos es el flujo transversal para registrar y consultar actividad reproductiva,
> productiva, sanitaria y de movimientos. No crea una tabla ni permisos `eventos:*`.
> Fuente de verdad: esquema vigente y permisos por dominio.
> Ubicación: `features/feature-005-eventos/requisito_eventos.md`.

## 1. Decisiones de alcance

- **EV-ARQ-001** — Cada evento se persiste en su tabla especializada. No existe una tabla `eventos` genérica.
- **EV-ARQ-002** — El read model unificado reutiliza y extiende el UNION del timeline entregado en #167, su exclusión de registros grupales anulados (#181) y su conteo/paginación (#183); no los reconstruye.
- **EV-ARQ-003** — No hay tronco físico común. El alcance de finca se obtiene mediante el animal de cada fila; solo `registros_grupales` contiene `finca_id` directamente.
- **EV-ARQ-004** — Los eventos son append-only. Una corrección anula de forma auditable el evento anterior y registra uno nuevo o una compensación. No hay edición destructiva ni eliminación física.
- **EV-ARQ-005** — Sanidad forma parte de Eventos. Las capacidades sanitarias de #211 se reutilizan como contrato de dominio/captura; Eventos aporta navegación, read model e integración, sin implementar un segundo contrato.

## 2. Catálogo y matriz de captura

`diagnosticos_veterinarios` es un catálogo. El evento asociado es **Revisión veterinaria**.

| Dominio | Tipo / tabla | Individual | Grupal v1 | Campos compartidos | Campos por animal | Efecto lateral |
|---|---|:---:|:---:|---|---|---|
| Reproductivo | Servicio / `servicios` | Sí | Sí | fecha, tipo, padre/pajuela, inseminador, dosis | observaciones o resultado efectivo cuando aplique | Actualiza ciclo reproductivo según contrato de dominio |
| Reproductivo | Palpación / `palpaciones` | Sí | Sí | fecha, diagnóstico, resultado | días de gestación cuando varíe | Actualiza estado reproductivo según contrato de dominio |
| Reproductivo | Parto / `partos`, `partos_crias` | Sí | **No** | fecha, servicio, tipo | crías y resultado del parto | Puede crear/vincular crías; exclusivamente individual en v1 |
| Sanidad | Aplicación sanitaria / `aplicaciones_sanitarias` | Sí | Sí | producto, fecha, dosis, precio_dosis, próxima_dosis, comentarios | dosis si varía | Consume inventario según contrato #211 |
| Sanidad | Revisión veterinaria / `revisiones_veterinarias` | Sí | Sí | fecha, diagnóstico, tipo, veterinario | observaciones/resultado cuando varíe | Ninguno implícito |
| Productivo | Pesaje / `pesos` | Sí | Sí | fecha, tipo de peso | peso_kg | Actualiza lectura productiva, no reescribe historial |
| Productivo | Producción láctea / `producciones_lacteas` | Sí | Sí | fecha, turno/contexto | cantidades por animal | Agrega producción |
| Productivo | Condición corporal / `animales_condicion_corporal` | Sí | Sí* | fecha, condición | puntaje | Ninguno implícito |
| Movimientos | Venta / `ventas` | Sí | Sí | fecha, motivo, lugar, comprador | peso/precio cuando varíen | Cambia estado a vendido |
| Movimientos | Muerte / `muertes` | Sí | Sí* | fecha, causa | observaciones cuando varíen | Cambia estado a muerto |
| Movimientos | Traslado / `animales_ubicacion_historico` | Sí | Sí | fecha, destino, motivo | ninguno | Actualiza ubicación actual y escribe histórico |

`*` Requiere migración para añadir `registro_grupal_id` a `muertes` y
`animales_condicion_corporal` antes de habilitar su captura grupal.

Las columnas sanitarias reales son `producto_id`, `dosis`, `precio_dosis` y
`proxima_dosis`. Vía, lote de producto o vencimiento no forman parte del contrato
actual; agregarlos requeriría una migración o dependencia explícita.

## 3. Tablero e historial

- **EV-UI-001** — La ruta `/fincas/$fincaId/eventos` muestra cuatro categorías: Reproductivo, Sanidad, Productivo y Movimientos/salidas.
- **EV-UI-002** — Cada tipo muestra el conteo del mes en curso, con etiqueta temporal visible y alcance de finca aplicado en servidor.
- **EV-UI-003** — El feed presenta eventos recientes ordenados por fecha descendente, con tipo, animal o alcance grupal, detalle y fecha.
- **EV-UI-004** — Los filtros permiten categoría, tipo y rango de fechas. Un resultado vacío por filtro se distingue del estado sin eventos.
- **EV-UI-005** — “Ver todo” forma parte de v1 y abre un historial paginado y filtrable. La paginación y el conteo extienden los contratos existentes de #167/#183.
- **EV-UI-006** — La pantalla define estados de carga, vacío inicial, vacío por filtro, error con reintento y permisos parciales.
- **EV-UI-007** — Debe existir cobertura responsive/mobile para tablero, historial y registro antes de cerrar v1.

## 4. Registro individual y grupal

- **EV-CAP-001** — El wizard usa tres pasos: tipo, alcance y datos. Desde la ficha fija el animal y omite decisiones ya resueltas.
- **EV-CAP-002** — El alcance individual selecciona un animal. El grupal parte de selección manual, lote, potrero o grupo y permite exclusiones antes de confirmar.
- **EV-CAP-003** — `registros_grupales` se amplía con `origen_seleccion` (`manual`, `lote`, `potrero`, `grupo`) y `grupo_id`; conserva además el criterio aplicable (`lote_id`/`potrero_id`/`grupo_id`).
- **EV-CAP-004** — La cabecera grupal conserva el origen/criterio solicitado. Las N filas hijas representan los participantes efectivos después de exclusiones y comparten `registro_grupal_id`.
- **EV-CAP-005** — Cabecera y filas hijas se guardan en una transacción. `total_animales` coincide con las filas efectivas; un fallo revierte todo.
- **EV-CAP-006** — Los campos compartidos se capturan una vez; los variables se capturan por animal. La matriz de §2 es el contrato inicial y cada dominio concreta validaciones.
- **EV-CAP-007** — Parto no ofrece alcance grupal en v1.
- **EV-CAP-008** — Los formularios de dominio se reutilizan entre Eventos y la ficha/EventDrawer; el shell no duplica reglas reproductivas, productivas, sanitarias ni de movimientos.

## 5. Alcance de finca, RBAC e integración

- **EV-SEC-001** — Toda lectura y escritura valida finca activa en servidor. Para filas individuales se deriva por `animal_id`; para cabeceras grupales se valida también `registros_grupales.finca_id`. Una finca ajena responde 403.
- **EV-SEC-002** — RBAC se evalúa por tipo, sin crear `eventos:*`:

| Dominio | Permisos |
|---|---|
| Reproductivo | `eventos_reproductivos:{ver,crear,editar,anular}` |
| Productivo | `eventos_productivos:{ver,crear,editar,anular}` |
| Sanidad | `sanidad:{ver,crear,editar,anular}` |
| Movimientos | `movimientos:{ver,crear,anular}` |

- **EV-SEC-003** — `editar` no autoriza mutación destructiva de eventos históricos; puede habilitar preparación/corrección mediante el flujo append-only del dominio.
- **EV-SEC-004** — Con permisos parciales, tablero, filtros, contadores, atajos y tipos disponibles muestran solo dominios autorizados; no se infiere autorización desde el nombre del rol.
- **EV-INT-001** — El timeline de ficha sigue siendo el read model base. Un hijo grupal aparece en cada animal e identifica su origen grupal.
- **EV-INT-002** — La entrada desde ficha reutiliza EventDrawer/wizard con animal preseleccionado y aplica el permiso del dominio elegido.

## 6. Anulación, corrección y auditoría

- **EV-AUD-001** — Anular exige `*:anular`, motivo, actor y fecha. El evento permanece consultable como anulado para auditoría y se excluye de vistas activas.
- **EV-AUD-002** — En grupales, la anulación se representa en `registros_grupales.anulado_en`; los hijos se consideran anulados por derivación. No se exige una columna inexistente en cada tabla hija.
- **EV-AUD-003** — Corregir crea un evento nuevo o compensatorio enlazable al anulado. Las columnas de enlace/motivo/actor que no existan son migraciones del contrato de auditoría, no hechos actuales.
- **EV-AUD-004** — Venta, muerte y traslado requieren compensación coherente con el estado vigente. No se restaura ciegamente un estado anterior si hubo eventos posteriores.
- **EV-AUD-005** — La UI incluye confirmación, explicación del impacto, éxito/error y representación del estado anulado.

## 7. Cobertura visual y brechas

- **EV-VIS-001** — `ganaweb-diseno.op` contiene diez copias/variantes, pero `themes` está vacío; esto es cobertura visual nominal, no verificación de diez temas.
- **EV-VIS-002** — El diseño actual no cubre de forma verificable loading, empty, error, vacío por filtro, anulación/confirmación, historial completo ni Eventos mobile.
- **EV-VIS-003** — Esas pantallas requieren trabajo visual con herramienta adecuada. En esta revisión solo se corrige copy semántico seguro; no se inventan layouts dentro del JSON masivo.

## 8. Criterios de aceptación

1. **EV-CA-001** — Una consulta de finca nunca retorna eventos cuyo animal pertenece a otra finca; una cabecera grupal ajena produce 403 (EV-ARQ-003, EV-SEC-001).
2. **EV-CA-002** — Tablero y “Ver todo” mezclan los tipos autorizados, filtran y paginan resultados reutilizando #167/#181/#183 (EV-ARQ-002, EV-UI-001..006).
3. **EV-CA-003** — Un usuario con permisos parciales solo ve y registra dominios autorizados; no existe comprobación `eventos:*` (EV-SEC-002..004).
4. **EV-CA-004** — Una selección grupal conserva origen y criterio, mientras sus hijas coinciden exactamente con participantes no excluidos (EV-CAP-002..005).
5. **EV-CA-005** — Pesaje grupal admite peso por animal; una aplicación sanitaria usa solo su contrato real y reutiliza #211 (EV-CAP-006, EV-ARQ-005).
6. **EV-CA-006** — Parto solo puede registrarse individualmente (EV-CAP-007).
7. **EV-CA-007** — Muerte y condición corporal grupales quedan bloqueadas hasta migrar `registro_grupal_id` (matriz §2).
8. **EV-CA-008** — Anular no borra ni edita el evento; registra auditoría y el read model excluye anulados activos (EV-AUD-001..003).
9. **EV-CA-009** — Una corrección con efectos laterales aplica compensación considerando eventos posteriores (EV-AUD-004).
10. **EV-CA-010** — El mismo contrato/formulario de dominio funciona desde Eventos y ficha/EventDrawer (EV-CAP-008, EV-INT-002).
11. **EV-CA-011** — Loading, vacíos, error, historial, confirmación de anulación y mobile cuentan con diseño y pruebas antes del cierre (EV-UI-006..007, EV-VIS-002..003).

## 9. Dependencias y fuera de alcance

- Dependencias: migraciones de trazabilidad grupal y auditoría; contratos por dominio; integración sanitaria #211; read model existente #167/#181/#183.
- Fuera de v1: exportación/reportes y nuevos campos sanitarios no presentes en esquema.
- El soporte offline solo se incorpora mediante el contrato transversal de sincronización aprobado; este documento no inventa uno.
