# GanaWeb - Requisitos funcionales: Paso 3 Datos del EventoWizard (RF-EWD-DAT v1.0)

> **Propósito:** definir el comportamiento funcional esperado del paso **Datos** para los 11 tipos de evento, dejando una base verificable para su posterior descomposición en issues.
>
> **Estado del documento:** matriz funcional aprobada para #282, basada en la implementación vigente y en la respuesta funcional del issue. Las reglas aún no implementables por falta de infraestructura se identifican expresamente como **pendientes técnicos**.
>
> **Convención de IDs:** `EWD-DAT-xxx` para requisitos confirmados, `EWD-PROP-xxx` para propuestas pendientes y `EWD-CA-xxx` para criterios de aceptación.

## 1. Resultado esperado

El paso Datos debe capturar, revisar y enviar sin pérdidas el payload correspondiente al tipo de evento seleccionado, tanto en alcance individual como grupal. El servidor debe validar el contrato específico de cada tipo antes de persistirlo y mantener las garantías existentes de autorización, alcance de finca y atomicidad.

La prioridad funcional y técnica es corregir la pérdida potencial del payload al pasar por Revisión de riesgo antes de ampliar los formularios.

## 2. Fuentes y clasificación de decisiones

### 2.1 Fuentes consultadas

- Observación de Engram `#1207`, topic `eventos/paso-datos-inventario`.
- `features/feature-005-eventos/requisito_eventos.md`.
- `features/feature-006-new-wizard/requisito_funcional.md`.
- Implementación vigente del wizard en `packages/ui/src/ganado/evento-wizard/`.
- Boundary de escritura en `apps/web/src/server/eventos-wizard.server.ts` y whitelist en `packages/db/src/evento-write-internal.ts`.

### 2.2 Estados usados

| Estado | Significado |
|---|---|
| Confirmado | Existe evidencia funcional previa o una garantía vigente que debe conservarse. |
| Actual, no normativo | Describe la implementación observada; no equivale a una decisión de negocio aprobada. |
| Propuesto/por confirmar | Regla necesaria o recomendable que requiere validación funcional antes de implementarse. |
| Fuera de alcance | No forma parte de esta definición del paso Datos. |

## 3. Alcance confirmado

| ID | Requisito confirmado |
|---|---|
| EWD-DAT-001 | El paso Datos debe ofrecer un formulario específico para cada uno de los 11 tipos canónicos: Servicio, Palpación, Parto, Aplicación sanitaria, Revisión veterinaria, Pesaje, Producción láctea, Condición corporal, Venta, Muerte y Traslado. |
| EWD-DAT-002 | Parto, Muerte y Condición corporal deben admitir únicamente alcance individual mientras no exista una decisión y soporte de persistencia que habiliten su captura grupal. La restricción debe aplicarse tanto en la interfaz como en el servidor. |
| EWD-DAT-003 | Servicio, Palpación, Aplicación sanitaria, Revisión veterinaria, Pesaje, Producción láctea, Venta y Traslado deben conservar soporte individual y grupal. |
| EWD-DAT-004 | El paso debe conservar el tipo, el alcance, los datos comunes, las excepciones y el borrador al volver a Alcance y regresar a Datos, sujeto a las reglas ya definidas para cambios de participantes. |
| EWD-DAT-005 | Los campos comunes de una captura grupal deben aplicarse inicialmente a todos los animales efectivos. Las excepciones se materializan por animal antes de persistir cada hijo. |
| EWD-DAT-006 | La captura enviada debe contener exactamente el payload completo producido por el formulario, incluidas normalizaciones, defaults efectivos y campos opcionales presentes. Entrar y confirmar en Revisión de riesgo no puede eliminar, reemplazar ni reconstruir parcialmente ese payload. |
| EWD-DAT-007 | Si no se activa Revisión de riesgo y si se activa y confirma la revisión, el payload enviado debe ser semánticamente idéntico para el mismo borrador, salvo cambios explícitos realizados por el usuario. |
| EWD-DAT-008 | La revisión debe mostrar un resumen del mismo payload que será enviado. No debe resumir un estado anterior o incompleto de `datosComunes`. |
| EWD-DAT-009 | Una captura grupal debe materializar los datos de cada animal combinando datos comunes y su excepción dispersa. Una excepción idéntica al valor común no debe persistirse como diferencia. |
| EWD-DAT-010 | La cabecera grupal y todos sus eventos hijos deben persistirse en una sola transacción. Si falla cualquier elemento, no debe persistirse ninguno. |
| EWD-DAT-011 | Toda captura debe revalidar en servidor: sesión, finca activa, permiso de creación del dominio, pertenencia de los animales a la finca, tipo permitido, alcance no vacío, criterio requerido por el origen y prohibición grupal de los tipos exclusivamente individuales. |
| EWD-DAT-012 | El servidor debe rechazar campos que no pertenezcan al contrato permitido del tipo de evento. La whitelist es una defensa adicional y no sustituye la validación de tipos, obligatoriedad, rangos o reglas cruzadas. |
| EWD-DAT-013 | Los errores de validación deben identificar el campo y el detalle, conservar el borrador y permitir corregir y reenviar sin repetir la captura completa. |
| EWD-DAT-014 | Los permisos deben seguir resolviéndose por dominio: reproductivo, productivo, sanidad y movimientos; el paso Datos no introduce un permiso genérico `eventos:*`. |

## 4. Inventario actual por tipo

Esta matriz documenta lo observado. **No convierte defaults, opcionalidad ni límites de la UI actual en reglas de negocio confirmadas.** "Bloqueo actual" indica únicamente qué impide hoy accionar Guardar en el formulario cliente.

| Tipo | Alcance actual | Campos capturados actualmente | Defaults actuales | Bloqueo actual para guardar | Brechas observadas |
|---|---|---|---|---|---|
| Servicio | Individual y grupal | `fecha`, `tipo`, `padreId` o `pajuelaId`, `inseminadorId`, `dosis`, `observaciones` | fecha de hoy; tipo `inseminacion`; dosis `1` | fecha presente | Usa IDs técnicos; falta definir padre/pajuela según tipo; la whitelist también admite `tipoInseminacion`, `precio` y `efectivo`, no expuestos. |
| Palpación | Individual y grupal | `fecha`, `servicioId`, `diagnosticoId`, `resultado`, `diasGestion`, `comentarios` | fecha de hoy; resultado `vacia` | fecha presente | Usa IDs técnicos; no valida coherencia entre resultado y días de gestación ni valores enteros/no negativos. |
| Parto | Solo individual | `fecha`, `servicioId`, `tipoParto`, `machos`, `hembras`, `muertos`, `comentarios` | fecha de hoy; tipo `normal`; conteos `0` | fecha presente, un animal y comprobación numérica actual | Usa ID técnico; falta confirmar si debe existir al menos una cría, relación con servicio y reglas de conteos. |
| Aplicación sanitaria | Individual y grupal | `fecha`, `productoId`, `dosis`, `precioDosis`, `proximaDosis`, `comentarios` | fecha de hoy; dosis `1`; opcionales enviados como `null` | producto, fecha y dosis mayor que cero | Producto es ID técnico; faltan validaciones completas de catálogo, fechas y contrato sanitario en este boundary. |
| Revisión veterinaria | Individual y grupal | `fecha`, `veterinarioId`, `diagnosticoId`, `tipoDiagnostico`, `celoPresentado`, `comentarios` | fecha de hoy; tipo `general`; celo `no_aplica` | fecha presente | Veterinario y diagnóstico son IDs técnicos; obligatoriedad y coherencia entre tipo, diagnóstico y celo no están definidas. |
| Pesaje | Individual y grupal | `fecha`, `pesoKg`, `tipoPeso`, `comentarios` | fecha de hoy; tipo `control` | fecha y peso finito mayor que cero | Falta confirmar rangos plausibles, precisión y disponibilidad de tipos según el animal. |
| Producción láctea | Individual y grupal | `fecha`, `cantidadAm`, `cantidadPm`, `loteId` | fecha de hoy; cantidades vacías se materializan como `0` | fecha y al menos una cantidad mayor que cero | La whitelist admite además `potreroId`, `sectorId` y `grupoId`; falta decidir cuáles se capturan y evitar IDs técnicos. |
| Condición corporal | Solo individual | `fecha`, `condicionId`, `puntaje` | fecha de hoy; puntaje `3` | fecha y puntaje entre `1` y `5` | Condición es ID técnico; escala, incrementos permitidos y relación catálogo-puntaje requieren confirmación. |
| Venta | Individual y grupal | `fecha`, `motivoVentaId`, `lugarVentaId`, `pesoVentaKg`, `precio`, `comprador`, `comentarios` | fecha de hoy | fecha presente | Motivo y lugar son IDs técnicos; faltan obligatoriedad, moneda, rangos y reglas de cambio de estado. |
| Muerte | Solo individual | `fecha`, `causaMuerteId`, `comentarios` | fecha de hoy | fecha presente | Causa es ID técnico y hoy no bloquea el guardado; debe confirmarse su obligatoriedad y efecto sobre estado. |
| Traslado | Individual y grupal | `fecha`, `potreroId`, `sectorId`, `loteId`, `grupoId`, `motivo` | fecha de hoy | fecha presente | Todos los destinos son opcionales actualmente; falta definir si se exige uno, cuáles pueden coexistir y cómo se actualiza la ubicación. |

### 4.1 Campos admitidos pero no capturados

| Tipo | Campos permitidos por persistencia y ausentes del formulario actual |
|---|---|
| Servicio | `tipoInseminacion`, `precio`, `efectivo` |
| Producción láctea | `potreroId`, `sectorId`, `grupoId` |

La ausencia de estos campos es una brecha de cobertura, no una orden automática para agregarlos. Su necesidad, etiqueta, obligatoriedad y origen deben confirmarse con negocio.

### 4.2 Matriz funcional aprobada para #282

La siguiente matriz sustituye la ambigüedad de los defaults actuales. Los valores entre paréntesis son los valores canónicos enviados por el formulario. Las fechas futuras se aceptan para los 11 tipos; no se implementa una regla de captura tardía ni relaciones temporales adicionales en este issue.

| Tipo | Campos obligatorios | Reglas de valores | Opcionales y límites explícitos |
|---|---|---|---|
| Servicio | `fecha`, `tipo`, `dosis`, `tipoInseminacion`; `padreId` si `tipo=0`; `pajuelaId` si `tipo=1` | `tipo`: `0` monta natural, `1` inseminación; `dosis > 0`, hasta 4 decimales | `inseminadorId` de veterinarios con `es_inseminador`; `precio >= 0`, hasta 2 decimales; `efectivo`; `tipoInseminacion` permanece texto |
| Palpación | `fecha`, `diagnosticoId`, `resultado`, `diasGestion` | `resultado`: `prenada`, `pp`, `ciclando`, `estatica`; `diasGestion` entero >= 0 y > 0 solo para `prenada` | `servicioId` seleccionable desde servicios; `comentarios` |
| Parto | `fecha`, `tipoParto`, `machos`, `hembras`, `muertos` | `tipoParto`: `normal`, `distocico`, `aborto`; conteos enteros >= 0; la suma puede ser 0 | `servicioId` seleccionable desde servicios; `comentarios` |
| Aplicación sanitaria | `fecha`, `productoId`, `dosis` | `dosis > 0`, hasta 4 decimales | `precioDosis >= 0`, hasta 2 decimales; `proximaDosis`; `comentarios`; solo registra y no descuenta inventario |
| Revisión veterinaria | `fecha`, `veterinarioId`, `diagnosticoId`, `tipoDiagnostico` | `tipoDiagnostico`: `no_aplica`, `vitaminas` | `celoPresentado`: `si`/`no`; `comentarios` |
| Pesaje | `fecha`, `pesoKg`, `tipoPeso` | `pesoKg > 0`, sin máximo, hasta 2 decimales; `tipoPeso`: `control`, `compra`, `venta` | `comentarios` |
| Producción láctea | `fecha`, `cantidadAm`, `cantidadPm` | Ambas cantidades >= 0, hasta 2 decimales | `loteId`, `potreroId`, `sectorId`, `grupoId` desde catálogos |
| Condición corporal | `fecha`, `condicionId`, `puntaje` | `puntaje` entero de 1 a 5 | `condicionId` desde catálogo |
| Venta | `fecha`, `motivoVentaId`, `lugarVentaId`, `pesoVentaKg`, `precio`, `comprador` | IDs desde catálogos; `pesoVentaKg > 0` sin máximo, 2 decimales; `precio >= 0`, 2 decimales | `comentarios`; al registrar, el animal pasa a inactivo |
| Muerte | `fecha`, `causaMuerteId` | Causa desde catálogo | `comentarios`; al registrar, el animal pasa a inactivo |
| Traslado | `fecha`, `potreroId`, `sectorId`, `loteId`, `grupoId`, `motivo` | Los cuatro destinos y el motivo son obligatorios y seleccionables | Al registrar, se actualizan las cuatro ubicaciones del animal |

La validación autoritativa implementada en este issue comprueba obligatoriedad, formato de fecha, enums, rangos, enteros y precisión. La pertenencia real de IDs a catálogos y los controles de selección visual quedan para el issue de catálogos. La persistencia vigente ya reproyecta los efectos de Venta, Muerte y Traslado dentro de la transacción de escritura; Servicio, Palpación y Aplicación sanitaria no ejecutan efectos adicionales.

## 5. Revisión y preservación del payload

| ID | Requisito confirmado |
|---|---|
| EWD-DAT-020 | Al accionar Guardar, el wizard debe almacenar una captura pendiente inmutable o equivalente que incluya `tipo`, `seleccion`, payload completo, excepciones materializables y referencia de corrección cuando exista. |
| EWD-DAT-021 | Si la captura requiere revisión, Confirmar debe enviar esa captura pendiente exacta; no debe construir una nueva captura desde estados parciales. |
| EWD-DAT-022 | Volver desde Revisión a Datos debe restaurar el mismo payload editable. Cualquier modificación posterior debe reemplazar de forma explícita la captura pendiente y recalcular la revisión aplicable. |
| EWD-DAT-023 | El resumen de Revisión debe representar campos con etiquetas comprensibles y valores de catálogo legibles cuando estén disponibles; no debe obligar al usuario a interpretar claves internas o IDs técnicos. |
| EWD-DAT-024 | Los estados de carga o fallo al revisar membresía no deben alterar el payload pendiente. Si la membresía no puede verificarse o presenta un conflicto no resuelto, el envío permanece bloqueado. |

## 6. Validación y persistencia

### 6.1 Garantías confirmadas

| ID | Requisito confirmado |
|---|---|
| EWD-DAT-030 | La validación de cliente debe facilitar la captura, pero la autoridad final debe residir en el servidor. Invocar directamente el boundary no puede omitir las mismas reglas. |
| EWD-DAT-031 | Los datos comunes y las excepciones deben validarse después de su materialización por animal, para impedir que una excepción genere un hijo inválido. |
| EWD-DAT-032 | El número de hijos persistidos debe coincidir exactamente con los animales efectivos y con el total de la cabecera grupal. |
| EWD-DAT-033 | Los identificadores de catálogo recibidos deben pertenecer a la finca activa o a un catálogo global aplicable. Un ID inexistente, inactivo o ajeno debe rechazarse según la política que se confirme para históricos. |
| EWD-DAT-034 | Los errores de autorización o alcance no deben revelar datos de otras fincas. |

### 6.2 Reglas resueltas y pendientes técnicos

| ID | Propuesta pendiente | Decisión requerida |
|---|---|---|
| EWD-PROP-001 | Definir un schema runtime discriminado por tipo y reutilizarlo en el boundary para individuales, datos comunes y datos materializados por animal. | Biblioteca/capa responsable y contrato de errores. |
| EWD-PROP-002 | **Resuelta para #282.** La matriz §4.2 define obligatoriedad, nulabilidad, formato, precisión y rango. | Aplicar validación autoritativa por tipo; catálogos reales quedan pendientes. |
| EWD-PROP-003 | **Resuelta para #282.** Se permiten fechas futuras en todos los tipos. | No se inventan reglas de captura tardía ni relaciones temporales. |
| EWD-PROP-004 | **Resuelta para #282.** Se cierran las condiciones de Servicio, Palpación, conteos de Parto y obligatoriedad de destinos de Traslado. | Los efectos laterales aprobados usan la persistencia existente; no se agregan otros. |
| EWD-PROP-005 | **Resuelta para #282.** Se fijan los enums de la matriz §4.2; `tipoInseminacion` continúa siendo texto. | La estrategia de históricos y futuros enums queda pendiente. |
| EWD-PROP-006 | Definir qué campos pueden variar por animal para cada tipo grupal; el editor no debería ofrecer automáticamente todas las claves comunes. | Matriz de campos excepcionables. |
| EWD-PROP-007 | Mostrar validaciones inline y un resumen accesible de errores, enfocando el primer campo inválido sin borrar valores. | Patrón UX definitivo. |
| EWD-PROP-008 | Ejecutar pruebas de integración contra PostgreSQL real para restricciones, claves foráneas y rollback. | Infraestructura de pruebas y alcance mínimo. |

## 7. Catálogos y campos de selección

| ID | Propuesta pendiente | Catálogo o fuente esperada |
|---|---|---|
| EWD-PROP-020 | Sustituir la entrada manual de `padreId`/`pajuelaId` por búsqueda contextual según el tipo de servicio. | Animales padre elegibles y catálogo/inventario de pajuelas. |
| EWD-PROP-021 | Sustituir `inseminadorId` y `veterinarioId` por selectores/autocomplete con registros activos de la finca. | Veterinarios e inseminadores. |
| EWD-PROP-022 | Sustituir `diagnosticoId` por un selector filtrable y, si aplica, filtrado por categoría o tipo. | Diagnósticos veterinarios. |
| EWD-PROP-023 | Sustituir `productoId` por selector del catálogo sanitario, mostrando al menos el nombre necesario para reconocer el producto. | Productos sanitarios disponibles para la finca. |
| EWD-PROP-024 | Sustituir `motivoVentaId`, `lugarVentaId` y `causaMuerteId` por selectores de maestros. | Motivos de venta, lugares de venta y causas de muerte. |
| EWD-PROP-025 | Sustituir IDs de potrero, sector, lote y grupo por selectores de ubicación contextual. | Maestros activos de ubicación de la finca. |
| EWD-PROP-026 | Definir si `condicionId` es un catálogo obligatorio, una etiqueta derivada del puntaje o ambos. | Modelo funcional de condición corporal. |
| EWD-PROP-027 | Los selectores deben almacenar IDs, mostrar nombres legibles, impedir selección de opciones ajenas y definir el tratamiento de registros inactivos usados en borradores o históricos. | Política transversal de catálogos. |

Crear maestros desde el paso Datos, editar catálogos o decidir sus ciclos de vida no queda aprobado por estas propuestas.

## 8. Excepciones por animal

### 8.1 Comportamiento confirmado

| ID | Requisito confirmado |
|---|---|
| EWD-DAT-040 | Las excepciones solo aplican a capturas grupales. |
| EWD-DAT-041 | Cada animal debe tener como máximo una excepción consolidada con únicamente los campos diferentes de los datos comunes. |
| EWD-DAT-042 | Si un valor vuelve a coincidir con el común, debe eliminarse de la excepción. Si no quedan diferencias, debe eliminarse la excepción del animal. |
| EWD-DAT-043 | Retirar un animal del alcance debe retirar su excepción, con la advertencia definida para cambios de alcance. |
| EWD-DAT-044 | La materialización debe conservar el tipo primitivo esperado del campo; no debe convertir indiscriminadamente enums, fechas, IDs o números a texto. |
| EWD-DAT-045 | El servidor debe rechazar excepciones para animales fuera del conjunto efectivo y campos no autorizados o no excepcionables. |

### 8.2 Pendiente de definición

El editor vigente deriva los campos desde las claves presentes en `datosComunes`, usa controles de texto genéricos y no dispone de una matriz por tipo. Deben confirmarse:

- campos excepcionables por tipo;
- control y formato apropiado para cada campo;
- campos obligatorios que una excepción no puede vaciar;
- reglas cruzadas aplicadas tras combinar común y excepción;
- presentación resumida por nombre del animal, etiqueta del campo y valor legible.

## 9. Seguridad, alcance y atomicidad

| ID | Requisito confirmado |
|---|---|
| EWD-DAT-050 | Una sesión ausente o expirada debe bloquear la persistencia y comunicar el estado sin descartar el borrador. |
| EWD-DAT-051 | La finca solicitada debe coincidir con la finca activa de la sesión. |
| EWD-DAT-052 | Cada animal, criterio de alcance e ID de catálogo con alcance de finca debe validarse contra esa finca en servidor. |
| EWD-DAT-053 | La autorización se evalúa con el permiso `crear` del dominio correspondiente al tipo elegido y debe fallar de forma cerrada si no existe mapping. |
| EWD-DAT-054 | Los tipos exclusivamente individuales deben rechazarse en servidor si reciben alcance grupal, aunque la interfaz no lo ofrezca. |
| EWD-DAT-055 | Un conjunto grupal vacío debe rechazarse. El origen lote, potrero o grupo debe incluir su criterio correspondiente. |
| EWD-DAT-056 | La operación grupal debe producir una cabecera y exactamente un hijo por animal efectivo, dentro de una transacción única. |
| EWD-DAT-057 | Campos desconocidos o ajenos al tipo deben rechazarse antes de persistir. |

## 10. Criterios de aceptación verificables

1. **EWD-CA-001 - Cobertura de tipos:** dado cada uno de los 11 tipos canónicos, al llegar a Datos se presenta su formulario correspondiente y no un formulario genérico o vacío (EWD-DAT-001).
2. **EWD-CA-002 - Alcance individual obligatorio:** al intentar enviar Parto, Muerte o Condición corporal con alcance grupal mediante UI o invocación directa, la operación se rechaza con error de `alcance` y no se persisten registros (EWD-DAT-002, EWD-DAT-054).
3. **EWD-CA-003 - Preservación sin revisión:** dado un payload con todos los campos admitidos del formulario, cuando no se activa revisión, el objeto recibido por el envío contiene los mismos valores y tipos (EWD-DAT-006).
4. **EWD-CA-004 - Preservación con revisión:** dado el mismo payload y un disparador de riesgo, cuando el usuario confirma la revisión, el objeto recibido por el envío es semánticamente idéntico al que produjo el formulario; ningún campo se pierde por no estar en `datosComunes` (EWD-DAT-006, EWD-DAT-007, EWD-DAT-021).
5. **EWD-CA-005 - Resumen fiel:** la Revisión muestra los valores de la captura pendiente y, después de editar un campo y volver a revisar, muestra y envía el valor actualizado (EWD-DAT-008, EWD-DAT-022).
6. **EWD-CA-006 - Borrador recuperable:** volver de Datos a Alcance y regresar conserva todos los campos, datos comunes y excepciones compatibles; un error de validación o servidor tampoco los elimina (EWD-DAT-004, EWD-DAT-013).
7. **EWD-CA-007 - Materialización de excepciones:** en una captura grupal con dos animales y una excepción, el hijo sin excepción recibe los datos comunes y el otro recibe la combinación común más diferencia; una diferencia redundante no aparece en el payload materializado (EWD-DAT-009, EWD-DAT-041, EWD-DAT-042).
8. **EWD-CA-008 - Excepción inválida:** una excepción asociada a un animal fuera del alcance, a un campo desconocido o a un valor que invalida el registro se rechaza antes de persistir cualquier elemento del grupo (EWD-DAT-031, EWD-DAT-045).
9. **EWD-CA-009 - Whitelist por tipo:** al enviar a un tipo un campo perteneciente a otro contrato, el servidor responde con validación y la base de datos no cambia (EWD-DAT-012, EWD-DAT-057).
10. **EWD-CA-010 - Seguridad:** solicitudes sin sesión, con finca distinta, sin permiso o con un animal ajeno se rechazan sin persistencia y sin revelar información de otra finca (EWD-DAT-011, EWD-DAT-034, EWD-DAT-050..053).
11. **EWD-CA-011 - Origen grupal:** un alcance grupal vacío o un origen lote/potrero/grupo sin su ID de criterio se rechaza con error de campo (EWD-DAT-055).
12. **EWD-CA-012 - Atomicidad:** al forzar el fallo de uno de N hijos, no quedan cabecera ni hijos persistidos; en éxito, el total de cabecera y el número de hijos son N (EWD-DAT-010, EWD-DAT-032, EWD-DAT-056).
13. **EWD-CA-013 - Matriz de payloads:** existe al menos una prueba de payload válido para cada uno de los 11 tipos, cubriendo envío directo y, cuando aplique, envío mediante Revisión (EWD-DAT-001, EWD-DAT-006).
14. **EWD-CA-014 - Validación autoritativa:** toda regla por tipo que resulte confirmada produce el mismo rechazo al omitir la UI e invocar el servidor directamente (EWD-DAT-030).
15. **EWD-CA-015 - Catálogos:** cuando se implementen EWD-PROP-020..027, el usuario selecciona opciones legibles, el payload contiene sus IDs y el servidor rechaza IDs inexistentes o ajenos.

Los criterios asociados a `EWD-PROP-*` solo serán exigibles cuando la regla propuesta correspondiente sea aprobada e incorporada al alcance de implementación.

## 11. Dependencias y riesgos

### 11.1 Dependencias

- Contratos funcionales de los dominios reproductivo, sanitario, productivo y movimientos.
- Maestros y catálogos activos necesarios para reemplazar IDs técnicos.
- Boundary de escritura y adaptador transaccional de eventos.
- Política de Revisión de riesgo: tipos sensibles, correcciones, excepciones, cambios de membresía y umbral de grupo grande cuando esté configurado.
- Infraestructura de pruebas con PostgreSQL real para comprobar restricciones y rollback.

### 11.2 Riesgos

| Riesgo | Impacto | Mitigación requerida |
|---|---|---|
| Pérdida del payload en Revisión | Registro incompleto o distinto de lo confirmado por el usuario | Resolver EWD-DAT-020..024 antes de ampliar campos. |
| Confundir validaciones HTML con reglas de negocio | Comportamiento inconsistente o invocable fuera de la UI | Aprobar EWD-PROP-001..005 y validar en servidor. |
| IDs técnicos de texto libre | Errores de referencia, mala usabilidad y riesgo de scope | Implementar catálogos tras confirmar EWD-PROP-020..027. |
| Excepciones genéricas sin tipos | Payloads inválidos por animal | Definir matriz excepcionable y validar datos materializados. |
| Whitelist sin semántica | Aceptación de valores inválidos aunque la clave sea conocida | Incorporar schemas y reglas por tipo. |
| Pruebas solo con dobles | Restricciones, FKs o rollback no verificados | Añadir pruebas proporcionales contra PostgreSQL real. |

## 12. Preguntas abiertas

1. **Resuelta en #282:** ¿Cuáles campos son obligatorios, opcionales o nulos para cada tipo, más allá del bloqueo actual de la UI?
2. **Resuelta en #282:** ¿Qué reglas de fechas aplican por dominio: eventos futuros, captura tardía y relación con eventos previos o siguientes?
3. **Resuelta en #282:** ¿Cuáles son los rangos, precisiones y unidades válidos para dosis, peso, producción, puntaje, precios y conteos?
4. **Resuelta en #282:** ¿Qué combinaciones son válidas para padre/pajuela, resultado/días de gestación, crías del parto y destinos de traslado?
5. ¿Los campos admitidos pero no expuestos de Servicio y Producción láctea deben incorporarse, permanecer derivados o eliminarse del contrato?
6. ¿Qué catálogos son obligatorios y cómo se tratan opciones inactivas en borradores, correcciones e históricos?
7. ¿Qué campos pueden variar por animal en cada uno de los ocho tipos grupales?
8. **Resuelta en #282:** ¿Causa de muerte, motivo/lugar de venta, diagnóstico y veterinario deben ser obligatorios en sus respectivos eventos?
9. ¿Cuál es la política de tipos sensibles y cuál es el umbral de grupo grande, si existe?
10. ¿Parto debe exigir al menos una cría registrada y qué flujo debe crear o vincular sus datos individuales?
11. **Resuelta en #282:** ¿Traslado exige exactamente un destino, permite varios ejes simultáneos o conserva dimensiones no informadas?
12. **Resuelta en #282:** ¿Qué efectos laterales deben validarse y ejecutarse para Venta, Muerte, Traslado, Servicio, Palpación y Aplicación sanitaria?

Las preguntas 5, 6, 7, 9 y 10 permanecen pendientes y pertenecen a los issues posteriores de campos faltantes, catálogos, excepciones tipadas, política de riesgo y flujo de crías. #282 no las inventa ni las implementa.

## 13. Fuera de alcance

- Implementar los cambios de UI, dominio, servidor, base de datos o pruebas.
- Crear issues, ramas, commits o pull requests.
- Rediseñar los pasos Tipo o Alcance, salvo las integraciones necesarias para preservar el borrador y validar el alcance recibido.
- Aprobar silenciosamente obligatoriedad, rangos, enums, reglas cruzadas o efectos laterales pendientes.
- Crear, editar, inactivar o administrar maestros desde el wizard.
- Habilitar captura grupal para Parto, Muerte o Condición corporal.
- Definir un límite máximo grupal sin evidencia y decisión funcional.
- Cambiar permisos, semántica append-only, auditoría o contrato de transacción atómica.
- Persistencia de borradores entre dispositivos o usuarios.

## 14. Descomposición futura sugerida en issues

Esta secuencia es una propuesta de trabajo posterior; **no crea ni aprueba issues**.

1. **P0 - Preservar payload en Revisión:** captura pendiente exacta, resumen fiel y pruebas de equivalencia con/sin revisión.
2. **Contratos runtime por tipo:** schemas discriminados, errores por campo y validación autoritativa en servidor.
3. **Decisiones funcionales de campos:** cerrar obligatoriedad, enums, rangos, fechas y reglas cruzadas de los 11 tipos.
4. **Catálogos y autocomplete:** reemplazar IDs técnicos según la matriz aprobada y validar scope/estado.
5. **Cobertura de campos faltantes:** resolver `tipoInseminacion`, `precio`, `efectivo`, `potreroId`, `sectorId` y `grupoId`.
6. **Excepciones tipadas:** matriz por tipo, controles apropiados y validación después de materializar cada animal.
7. **Pruebas de payload de los 11 tipos:** individual, grupal cuando aplica, revisión, errores y no regresión del borrador.
8. **Integración PostgreSQL real:** claves foráneas, restricciones, atomicidad y rollback completo.

El orden protege primero la integridad de datos. Ampliar formularios antes de resolver el P0 aumentaría la cantidad de información susceptible de perderse en Revisión.
