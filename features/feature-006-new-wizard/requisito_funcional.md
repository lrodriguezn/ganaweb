# Requisito funcional: nuevo wizard de registro de eventos

## 1. Propósito

Rediseñar la experiencia de registro de eventos individuales y grupales para que el usuario pueda definir con claridad los animales participantes, capturar datos comunes sin repetir información y registrar excepciones por animal cuando corresponda.

La solución conservará el wizard de tres pasos:

1. **Tipo**
2. **Alcance**
3. **Datos**

La revisión final será condicional y aparecerá únicamente cuando existan factores de riesgo.

## 2. Problema actual

La interfaz vigente presenta las siguientes dificultades:

- La selección manual carga inicialmente todos los animales y obliga a excluirlos uno por uno.
- Manual, Lote, Potrero y Grupo se presentan como alternativas equivalentes, aunque representan modelos de selección distintos.
- No existen acciones masivas para seleccionar o quitar animales.
- El contador de animales efectivos utiliza lenguaje técnico y no comunica claramente incluidos y excluidos.
- La lista consume demasiado espacio y depende de las acciones `Excluir` y `Revertir`.
- La navegación desde Datos hacia Alcance es poco visible.
- Volver entre pasos puede perder la selección o el borrador debido al desmontaje de componentes.
- Los registros grupales aplican los mismos datos a todos los animales, sin una forma clara de capturar excepciones individuales.

## 3. Principio de diseño

> Primero se define con precisión a qué animales se aplicará el evento; después se capturan los datos comunes y, si corresponde, las excepciones individuales.

La interfaz deberá mostrar en todo momento:

- el tipo de evento;
- el origen de la selección;
- la cantidad de animales incluidos;
- la cantidad de animales excluidos;
- la existencia de datos diferentes por animal;
- el carácter atómico de la operación.

## 4. Alcance funcional

### 4.1 Tipos de evento

El wizard conservará los 11 tipos canónicos existentes:

- servicio;
- palpación;
- parto;
- aplicación sanitaria;
- revisión veterinaria;
- pesaje;
- producción láctea;
- condición corporal;
- venta;
- muerte;
- traslado.

Parto, muerte y condición corporal continuarán admitiendo únicamente registros individuales.

### 4.2 Registro individual

1. El usuario seleccionará el tipo de evento.
2. En Alcance, buscará el animal por código u otro identificador disponible.
3. La búsqueda mostrará resultados sin avanzar automáticamente.
4. El usuario seleccionará explícitamente un animal.
5. Se mostrará una tarjeta estable con la información mínima necesaria para reconocerlo.
6. El botón principal indicará `Continuar con {animal}`.
7. Datos mostrará el formulario correspondiente al tipo de evento.

Cuando el wizard se abra desde la ficha de un animal, este aparecerá preseleccionado y podrá cambiarse cuando la regla funcional lo permita.

### 4.3 Registro grupal manual

La selección manual comenzará con cero animales incluidos.

El usuario podrá:

- buscar animales disponibles dentro de la finca;
- marcar los animales que participarán;
- seleccionar todos los resultados visibles;
- quitar todos los resultados visibles;
- consultar y modificar la selección acumulada.

El wizard no permitirá continuar mientras el conjunto esté vacío.

### 4.4 Registro por Lote, Potrero o Grupo

1. El usuario seleccionará Lote, Potrero o Grupo.
2. Elegirá una entidad del catálogo correspondiente.
3. Todos sus miembros disponibles quedarán incluidos inicialmente.
4. El usuario podrá buscar dentro de ese conjunto y excluir excepciones.
5. La interfaz mostrará `{incluidos} incluidos · {excluidos} excluidos`.
6. Al continuar, se capturará un snapshot de los identificadores efectivos.

El conjunto guardado estará formado exclusivamente por los identificadores incluidos, no por una referencia dinámica al origen.

## 5. Interacciones del paso Alcance

### 5.1 Seleccionar todos

- Sin una búsqueda activa, afectará a todos los animales cargados para el origen.
- Con una búsqueda activa, afectará únicamente a los resultados visibles.
- En Manual, agregará los resultados a la selección.
- En Lote, Potrero o Grupo, volverá a incluir los resultados excluidos.
- No modificará animales que hayan quedado fuera del filtro activo.
- La etiqueta deberá explicitar el universo cuando exista un filtro, por ejemplo: `Seleccionar los 8 resultados`.

### 5.2 Quitar todos

- Operará sobre el mismo universo visible que Seleccionar todos.
- En Manual, retirará los resultados de la selección.
- En Lote, Potrero o Grupo, marcará los resultados como excluidos.
- Podrá dejar temporalmente el conjunto vacío, pero el botón Continuar quedará deshabilitado.
- Cuando exista un filtro, la etiqueta indicará `Quitar los 8 resultados`.

### 5.3 Búsqueda

- Manual buscará entre los animales disponibles de la finca.
- Lote, Potrero y Grupo buscarán únicamente entre sus miembros cargados.
- Escribir, modificar o limpiar una búsqueda no alterará la selección.
- Un animal seleccionado conservará su estado aunque deje de coincidir con el filtro.
- La ausencia de resultados no deberá confundirse con un origen sin miembros.

### 5.4 Contador y acción principal

- Manual mostrará `{cantidad} animales incluidos`.
- Lote, Potrero y Grupo mostrarán `{incluidos} incluidos · {excluidos} excluidos`.
- El término `efectivos` no se utilizará como etiqueta principal de la interfaz.
- El botón principal repetirá la cantidad: `Continuar con {cantidad} animales`.
- El contador y el botón deberán mostrar siempre la misma cantidad.

### 5.5 Exclusiones

- Excluir no eliminará visualmente al animal de la lista.
- El estado se mostrará mediante una etiqueta `Excluido` y una acción `Incluir`.
- La interfaz ofrecerá una vista filtrada para consultar los excluidos.
- El snapshot final contendrá solamente los animales incluidos.

### 5.6 Cambio de origen

Cambiar entre Manual, Lote, Potrero o Grupo reemplazará el alcance actual.

Si existe una selección, la interfaz solicitará confirmación e informará que:

- el alcance será reemplazado;
- los datos comunes se conservarán;
- las excepciones incompatibles podrían descartarse.

La selección anterior deberá mantenerse hasta que el nuevo origen termine de cargar correctamente. Si la carga falla, el alcance previo permanecerá intacto.

## 6. Paso Datos

### 6.1 Contexto visible

Datos mostrará de forma persistente:

- tipo de evento;
- origen de selección;
- criterio seleccionado;
- cantidad de animales;
- acción textual `Volver a Alcance`.

### 6.2 Datos comunes

El formulario canónico correspondiente al evento se utilizará para capturar los valores comunes.

Estos valores se aplicarán inicialmente a todos los animales incluidos.

### 6.3 Excepciones por animal

Para eventos grupales, el usuario podrá declarar valores diferentes para animales específicos.

El comportamiento será el siguiente:

1. El usuario seleccionará un animal del alcance.
2. La interfaz mostrará únicamente los campos que pueden diferir.
3. Los campos no sobrescritos heredarán el valor común.
4. Cada animal tendrá una sola excepción consolidada.
5. La lista resumirá únicamente los campos diferentes.
6. Si una excepción coincide nuevamente con el valor común, se eliminará como excepción redundante.
7. Si se retira del alcance un animal con excepciones, la interfaz advertirá antes de descartarlas.

La operación final continuará siendo atómica: si falla el registro de cualquier animal, no se guardará ningún evento del conjunto.

## 7. Navegación y persistencia del borrador

Datos ofrecerá una acción visible `Volver a Alcance`, no únicamente un ícono.

Al volver deberán conservarse:

- tipo de evento;
- modo individual o grupal;
- origen y criterio;
- animales incluidos y excluidos;
- datos comunes;
- excepciones individuales;
- borrador completo del formulario.

Cuando el alcance cambie:

- los animales que permanezcan conservarán sus excepciones;
- los nuevos animales recibirán los datos comunes;
- las excepciones de animales retirados se señalarán antes de descartarse;
- al regresar a Datos se informará la nueva cantidad de animales.

Cerrar el wizard con cambios pendientes deberá ofrecer las acciones `Continuar editando` y `Descartar borrador`.

## 8. Revisión condicional basada en riesgo

La revisión final no formará parte permanente del indicador de tres pasos.

Se activará cuando se cumpla al menos una de estas condiciones:

- el tipo de evento sea sensible según la política funcional;
- se esté corrigiendo un evento existente;
- el alcance supere un umbral configurable de grupo grande;
- exista al menos una excepción por animal;
- la membresía del origen haya cambiado desde la captura del snapshot.

La revisión mostrará:

- tipo de evento;
- origen y criterio;
- cantidad total de animales;
- cantidad de exclusiones;
- resumen de datos comunes;
- animales con excepciones y campos modificados;
- cambios de membresía detectados;
- advertencia de que los registros se guardarán juntos y que un fallo impedirá guardar todo el conjunto.

La acción principal indicará `Confirmar y registrar {cantidad} eventos`.

## 9. Conflictos de membresía

Si Lote, Potrero o Grupo cambia después de capturar el snapshot, la interfaz no modificará silenciosamente los participantes.

Mostrará:

- animales agregados al origen;
- animales retirados del origen;
- opción para mantener el snapshot revisado;
- opción para actualizar al grupo actual y regresar a Alcance.

Actualizar el grupo conservará las excepciones de los animales que continúen presentes. Mantener el snapshot conservará exactamente los identificadores revisados, siempre que sigan siendo válidos dentro de la finca.

## 10. Estados operativos

| Estado | Comportamiento esperado |
| --- | --- |
| Manual vacío | Mostrar instrucción para buscar y seleccionar; CTA deshabilitado |
| Origen sin miembros | Informar que no existen animales disponibles |
| Carga inicial | Mostrar estado de carga y bloquear confirmación |
| Cambio de origen | Conservar el alcance anterior hasta completar la carga |
| Error recuperable | Permitir reintentar sin borrar selección ni borrador |
| Error de permisos | Bloquear el envío y comunicar la causa |
| Sesión expirada | Conservar el borrador y permitir reautenticación |
| Conjunto vacío | Mostrar validación inline y deshabilitar el CTA |
| Envío | Bloquear controles e indicar la cantidad procesada |
| Error transaccional | Informar que no se registró ningún evento y conservar el borrador |
| Éxito | Confirmar la cantidad registrada y limpiar el borrador |
| Conflicto de membresía | Detener el envío y solicitar resolución explícita |

## 11. Estructura visual recomendada

### Cabecera fija

- acción Atrás;
- título del evento;
- indicador Tipo, Alcance y Datos;
- resumen contextual cuando exista una selección.

### Cuerpo desplazable

- una sola tarea principal por paso;
- mensajes junto al componente que los origina;
- resúmenes plegables para listas extensas.

### Footer fijo

- una sola acción primaria;
- cantidad de animales visible;
- validación próxima al CTA;
- estado de envío atómico.

En móvil, los orígenes se presentarán mediante un selector vertical o desplegable, evitando cuatro botones comprimidos en una sola fila.

Los campos de catálogo deberán utilizar selectores o autocompletado y no exigir que el usuario introduzca identificadores técnicos.

## 12. Criterios de aceptación UX

- Los 11 tipos canónicos son visibles o localizables.
- Parto, muerte y condición corporal no ofrecen alcance grupal.
- Manual comienza con cero animales, salvo cuando se restaura un borrador.
- Lote, Potrero y Grupo incluyen inicialmente a todos sus miembros disponibles.
- Buscar o limpiar una búsqueda no cambia la selección.
- Las acciones masivas explican si afectan a todos los miembros o solo a los resultados filtrados.
- El contador y el CTA muestran siempre la misma cantidad.
- Nunca puede enviarse un conjunto vacío.
- Volver de Datos a Alcance conserva el alcance y el borrador completo.
- Regresar a Datos conserva los valores comunes y las excepciones compatibles.
- Cada excepción identifica claramente el animal y los campos diferentes.
- Un fallo comunica que no se guardó ningún evento del conjunto.
- La revisión no aparece en flujos sin riesgo.
- Todos los disparadores de riesgo definidos abren la revisión antes del envío.
- Un cambio de membresía nunca modifica silenciosamente los identificadores efectivos.
- Los estados de carga y error no eliminan una selección válida.
- Las acciones principales son accesibles mediante teclado y tienen nombres accesibles.
- El footer permanece visible sin ocultar contenido en los viewports soportados.

## 13. Restricciones funcionales y técnicas

- Se conservarán los 11 tipos de evento canónicos y sus permisos por dominio.
- El servidor validará la finca activa y la pertenencia de cada animal.
- El conjunto efectivo no podrá estar vacío.
- La persistencia de la cabecera y sus eventos individuales será una única transacción.
- Los formularios continuarán siendo reutilizables desde Eventos y desde la ficha del animal.
- Los eventos conservarán su semántica append-only de corrección y anulación.
- La interfaz deberá materializar los identificadores efectivos antes del envío.

Antes de implementar deberá reforzarse en el boundary la prohibición de registros grupales para los tipos exclusivamente individuales; la restricción visual no es suficiente.

No existe actualmente un máximo explícito de animales por registro grupal. El límite, si resulta necesario, deberá definirse con evidencia de rendimiento, tamaño de payload, validación y costo transaccional.

## 14. Fuera de alcance

- Implementación visual o técnica del nuevo wizard.
- Persistencia de borradores entre dispositivos o usuarios.
- Edición masiva mediante una hoja de cálculo.
- Creación o modificación de lotes, potreros o grupos desde el wizard.
- Redefinición de permisos, auditoría o semántica append-only.
- Cambio del contrato de transacción atómica.
- Definición arbitraria del límite máximo grupal.
