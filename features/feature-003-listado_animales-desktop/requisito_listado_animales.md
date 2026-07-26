# GanaWeb - Requisito funcional: Listado de Animales Desktop (RF-ANIM-LIST v2.1)

> **Decisión v2.1:** entrega exclusivamente online. La fuente de verdad de las columnas es la matriz canónica de este documento: **36 columnas totales, 29 visibles por defecto y 7 opcionales**.

## 1. Objetivo y alcance

Implementar en `/fincas/$fincaId/animales` una tabla desktop densa para consultar, filtrar, ordenar, paginar y exportar animales mediante servicios del servidor.

- La entrega es **online-only** y todas las operaciones dependen de servicios del servidor.
- La vista inicial muestra 29 columnas base, en el orden de la matriz canónica.
- `Código` y `Nombre` permanecen congeladas y no pueden ocultarse.
- `Lugar compra` no forma parte de las 36 columnas ni de la exportación.

## 2. RBAC y seguridad

- **LA-RBAC-01:** listar, filtrar, ordenar y paginar requiere `animales:ver`.
- **LA-RBAC-02:** `Nuevo animal` solo se renderiza con `animales:crear`.
- **LA-RBAC-03:** `Exportar` solo se renderiza con `animales:ver` y `reportes:exportar`.
- **LA-RBAC-04:** listado y exportación validan en servidor que el usuario pertenece a `fincaId` mediante `usuarios_fincas`. Una finca no autorizada responde 403.
- **LA-RBAC-05:** ocultar botones es una regla de presentación; endpoint y exportación vuelven a validar permisos en servidor.

## 3. Matriz canónica de columnas

### 3.1 Convenciones del contrato

- `ordinal` define el orden visual y de exportación. `columnId` es el identificador estable usado en `cols` y preferencias.
- `responseKey` identifica el campo del DTO de fila. Nunca se deriva de la etiqueta visible.
- `filterKey` identifica `f.<filterKey>` en URL/API. `sortKey` identifica `sort=<sortKey>:<dir>`.
- `filterValue` define el valor serializado. Los catálogos y enums filtran por ID/key estable; el texto legible solo se presenta en `label`.
- `-` significa que la operación no está permitida para esa columna.

| ordinal | columnId | Etiqueta | responseKey | Tipo/nulabilidad | Visible | filterKey | filterValue | sortKey |
|---:|---|---|---|---|:---:|---|---|---|
| 1 | `codigo` | Código | `codigo` | `string` | Sí | `codigo` | texto | `codigo` |
| 2 | `nombre` | Nombre | `nombre` | `string` | Sí | `nombre` | texto | `nombre` |
| 3 | `sexo` | Sexo | `sexo` | `KeyLabel` | Sí | `sexoKey` | key | `sexoKey` |
| 4 | `raza` | Raza | `raza` | `IdLabel?` | Sí | `razaId` | id | `razaLabel` |
| 5 | `fechaNacimiento` | Fecha nacimiento | `fechaNacimiento` | `string?` ISO date | Sí | `fechaNacimiento` | fecha ISO | `fechaNacimiento` |
| 6 | `edad` | Edad | `edadAnios` | `number?` derivada | Sí | `edadAnios` | decimal | `edadAnios` |
| 7 | `color` | Color | `color` | `IdLabel?` | Sí | `colorId` | id | `colorLabel` |
| 8 | `origen` | Origen | `origen` | `IdLabel?` | Sí | `tipoIngresoId` | id | `tipoIngresoId` |
| 9 | `codigoMadre` | Madre (Cód.) | `codigoMadre` | `string?` | Sí | `codigoMadre` | texto | `codigoMadre` |
| 10 | `nombreMadre` | Madre (Nom.) | `nombreMadre` | `string?` | Sí | `nombreMadre` | texto | `nombreMadre` |
| 11 | `codigoPadre` | Padre (Cód.) | `codigoPadre` | `string?` | Sí | `codigoPadre` | texto | `codigoPadre` |
| 12 | `nombrePadre` | Padre (Nom.) | `nombrePadre` | `string?` | Sí | `nombrePadre` | texto | `nombrePadre` |
| 13 | `propietario` | Propietario | `propietario` | `IdLabel?` | Sí | `propietarioId` | id | `propietarioLabel` |
| 14 | `hierro` | Hierro | `hierro` | `IdLabel?` | Sí | `hierroId` | id | `hierroLabel` |
| 15 | `numeroPezones` | No. Pezones | `numeroPezones` | `number?` entero | Sí | `numeroPezones` | entero | `numeroPezones` |
| 16 | `calidad` | Calidad | `calidad` | `IdLabel?` | Sí | `calidadAnimalId` | id | `calidadLabel` |
| 17 | `arete` | Arete | `codigoArete` | `string?` | Sí | `codigoArete` | texto | `codigoArete` |
| 18 | `fechaCompra` | Fecha compra | `fechaCompra` | `string?` ISO date | Sí | `fechaCompra` | fecha ISO | `fechaCompra` |
| 19 | `precioCompra` | Precio | `precioCompra` | `number?` | Sí | `precioCompra` | decimal | `precioCompra` |
| 20 | `pesoCompra` | Peso compra | `pesoCompraKg` | `number?` | Sí | `pesoCompraKg` | decimal | `pesoCompraKg` |
| 21 | `tatuado` | Tatuado | `tatuado` | `boolean` | Sí | `tatuado` | boolean | `tatuado` |
| 22 | `herrado` | Herrado | `herrado` | `boolean` | Sí | `herrado` | boolean | `herrado` |
| 23 | `descornado` | Descornado | `descornado` | `boolean` | Sí | `descornado` | boolean | `descornado` |
| 24 | `rfid` | RFID | `codigoRfid` | `string?` | Sí | `codigoRfid` | texto | `codigoRfid` |
| 25 | `potrero` | Potrero | `potrero` | `IdLabel?` | Sí | `potreroId` | id | `potreroLabel` |
| 26 | `sector` | Sector | `sector` | `IdLabel?` | Sí | `sectorId` | id | `sectorLabel` |
| 27 | `lote` | Lote | `lote` | `IdLabel?` | Sí | `loteId` | id | `loteLabel` |
| 28 | `grupo` | Grupo | `grupo` | `IdLabel?` | Sí | `grupoId` | id | `grupoLabel` |
| 29 | `comentarios` | Comentarios | `comentarios` | `string?` | Sí | `comentarios` | texto | - |
| 30 | `salud` | Salud | `salud` | `KeyLabel?` | No | `saludKey` | key | `saludKey` |
| 31 | `categoriaReproductiva` | Categoría reprod. | `categoriaReproductiva` | `KeyLabel?` | No | `categoriaReproductivaKey` | key | `categoriaReproductivaKey` |
| 32 | `estado` | Estado | `estado` | `KeyLabel?` | No | `estadoKey` | key | `estadoKey` |
| 33 | `pesoUltimo` | Peso último | `pesoUltimo` | `PesoUltimo?` derivada | No | `pesoUltimoKg` | decimal | `pesoUltimoKg` |
| 34 | `qr` | QR | `codigoQr` | `string?` | No | `codigoQr` | texto | `codigoQr` |
| 35 | `esDeMonta` | Es de monta | `esDeMonta` | `boolean` | No | `esDeMonta` | boolean | `esDeMonta` |
| 36 | `tipoExplotacion` | Tipo explotación | `tipoExplotacion` | `IdLabel?` | No | `tipoExplotacionId` | id | `tipoExplotacionLabel` |

### 3.2 Resoluciones y derivadas

- **LA-001:** relaciones y enums exponen el identificador estable y la etiqueta. La UI muestra `label`; filtros envían `id` o `key`.
- **LA-002:** Edad se calcula en años con un decimal desde `fecha_nacimiento` hasta la fecha de consulta. Orden y filtro operan sobre el decimal derivado.
- **LA-003:** Peso último es el registro de `pesos` con mayor `fecha` y desempate por `id`; usa `pesos.peso_kg`, no `peso_compra`.
- **LA-004:** `tipo_ingreso_id` se resuelve contra `config_key_values` con `config_key = 'tipo_ingreso'`. Los IDs/keys conocidos `0` y `1` producen su etiqueta configurada. Un valor desconocido conserva `{id, label: "Desconocido (<id>)"}`; `null` produce `null`.
- **LA-005:** nunca se presentan `finca_id`, auditoría, versión, `activo`, `ind_descartado` ni IDs/keys crudos como columnas independientes.

### 3.3 Nota histórica

`Lugar compra` se evaluó y se retiró antes de v2.1 porque `animales` no tiene `lugar_compra_id`. Podrá proponerse en otra versión solo después de crear y aprobar esa relación de dominio. No es una columna activa, un campo del DTO ni una tarea de esta entrega.

## 4. Filtros, búsqueda y orden

- **LA-010:** texto usa `contains:<texto>` sin distinguir mayúsculas ni acentos; catálogos/enums usan `in:<id|key>,...`; números `range:<min>,<max>`; fechas `drange:<desde>,<hasta>`; booleanos `bool:true|false`.
- **LA-011:** filtros de columna y buscador se combinan con AND. El buscador aplica OR a `codigo`, `nombre`, `codigo_arete` y `codigo_rfid`.
- **LA-012:** chips permiten quitar filtros y `Limpiar todo` los elimina. Cambiar filtro, búsqueda, orden o tamaño vuelve a `page=1`.
- **LA-020:** columnas ordenables recorren ASC, DESC y sin orden. El orden inicial es `codigo:asc`.
- **LA-021:** todo orden añade `id:asc` como desempate estable. Texto usa ordenación `es-CO`; fechas y números usan su valor real.

## 5. Selector y preferencias

- **LA-030:** el selector contiene las 36 columnas: 29 activas y 7 opcionales. `Código` y `Nombre` no son ocultables. Reordenar queda fuera de alcance.
- **LA-031:** el equipo backend es dueño del endpoint y almacenamiento de preferencias por `usuario + finca`; el equipo frontend es dueño de leer, guardar y restablecer. No se usa `localStorage`.
- **LA-032:** sin preferencia, error al leerla o después de `Restablecer`, se aplican exactamente los 29 `columnId` visibles de la matriz.

## 6. Contrato HTTP

### 6.1 Solicitud

```text
GET /api/fincas/{fincaId}/animales?page=1&pageSize=25
  &sort=codigo:asc&q=MT-12
  &f.razaId=in:raza-uuid
  &f.sexoKey=in:1
  &f.edadAnios=range:2,5
  &f.fechaNacimiento=drange:2020-01-01,2024-12-31
  &cols=codigo,nombre,sexo,raza
```

- `page` es 1-based; `pageSize` pertenece a `{25,50,100}` y vale 25 por defecto.
- `sort` solo acepta `sortKey` no nulos de la matriz.
- `f.*` solo acepta los `filterKey` y tipos declarados en la matriz.
- `cols` solo acepta `columnId`, sin repetidos, y se usa para exportar la vista actual. No modifica el shape de la respuesta del listado.

### 6.2 DTO completo

```ts
type IdLabel = { id: string; label: string };
type KeyLabel = { key: string; label: string };
type PesoUltimo = { pesoKg: number; fecha: string };

type AnimalListadoRowDto = {
  id: string;
  codigo: string;
  nombre: string;
  sexo: KeyLabel;
  raza: IdLabel | null;
  fechaNacimiento: string | null;
  edadAnios: number | null;
  color: IdLabel | null;
  origen: IdLabel | null;
  codigoMadre: string | null;
  nombreMadre: string | null;
  codigoPadre: string | null;
  nombrePadre: string | null;
  propietario: IdLabel | null;
  hierro: IdLabel | null;
  numeroPezones: number | null;
  calidad: IdLabel | null;
  codigoArete: string | null;
  fechaCompra: string | null;
  precioCompra: number | null;
  pesoCompraKg: number | null;
  tatuado: boolean;
  herrado: boolean;
  descornado: boolean;
  codigoRfid: string | null;
  potrero: IdLabel | null;
  sector: IdLabel | null;
  lote: IdLabel | null;
  grupo: IdLabel | null;
  comentarios: string | null;
  salud: KeyLabel | null;
  categoriaReproductiva: KeyLabel | null;
  estado: KeyLabel | null;
  pesoUltimo: PesoUltimo | null;
  codigoQr: string | null;
  esDeMonta: boolean;
  tipoExplotacion: IdLabel | null;
};

type AnimalListadoResponseDto = {
  data: AnimalListadoRowDto[];
  page: number;
  pageSize: 25 | 50 | 100;
  total: number;
  totalSinFiltro: number;
  sort: string | null;
  cols: string[];
};

type ApiErrorDto = {
  error: string;
  campo: string | null;
  motivo: string;
  requestId: string;
};
```

- Fechas del DTO son ISO 8601. Valores ausentes son `null`; la UI presenta `-` o `Sin registrar`, nunca cero ni `null` literal.
- `cols` devuelve los `columnId` efectivos y normalizados de la vista.

### 6.3 Errores

- **LA-040 (400):** el frontend conserva la última tabla válida, elimina o sanea de la URL todos los parámetros indicados como inválidos por `campo`, vuelve a la página 1 cuando corresponda y muestra un toast. No reemplaza la tabla por un estado de error.
- **LA-041 (403):** muestra estado de error `No tienes acceso a esta finca`, sin datos previos, con navegación segura de regreso.
- **LA-042 (500/timeout de listado):** muestra estado de error con `Reintentar`. No presenta una tabla vacía silenciosa.
- **LA-043:** backend devuelve `ApiErrorDto` para 400/403/500; frontend es dueño del comportamiento visual y del saneamiento de URL.

## 7. Paginación y contador

- **LA-050:** la respuesta contiene la página pedida, `total` filtrado y `totalSinFiltro` de la finca.
- **LA-051:** el encabezado muestra `N de TOTAL` usando `total` y `totalSinFiltro`. El pie muestra `Mostrando X-Y de N`, donde N es `total`.
- **LA-052:** navegación numerada y selector 25/50/100; no hay scroll infinito.

## 8. Estados de interfaz

- **LA-060:** loading conserva encabezados y presenta skeletons de 36-40 px para la página solicitada.
- **LA-061:** finca vacía (`totalSinFiltro = 0`) muestra `Aún no hay animales`; la acción de registro respeta RBAC.
- **LA-062:** sin resultados (`total = 0`, `totalSinFiltro > 0`) conserva filtros y ofrece `Limpiar filtros`.
- **LA-063:** 403 y error de servidor/timeout son estados diferenciados según §6.3.

## 9. Exportación

- **LA-070:** Excel, CSV y PDF apaisado se generan en servidor con los mismos filtros y orden.
- **LA-071:** alcance `Vista actual` usa `cols`; `Todas` usa las 36 columnas. Se exporta el conjunto filtrado completo, no solo la página.
- **LA-072:** máximo 50 000 filas. HTTP 413 pide afinar filtros; timeout de 30 s muestra un mensaje específico. El equipo frontend es dueño de ambos casos.
- **LA-073:** valores que comiencen por `=`, `+`, `-`, `@`, tab o CR se neutralizan en CSV y se fuerzan a texto en XLSX.
- **LA-074:** PDF con 36 columnas advierte que puede ser difícil de leer y recomienda Excel, permitiendo continuar.
- **LA-075:** exportación aplica RBAC y aislamiento por finca en servidor.
- **LA-076 (500 de exportación):** el frontend mantiene abierto el diálogo, muestra un mensaje no destructivo y ofrece `Reintentar`. El reintento conserva los filtros vigentes, el alcance de columnas y el formato seleccionados; no limpia la tabla ni presenta una descarga vacía.

## 10. Diseño, temas y accesibilidad

- **LA-080:** el `.op` representa las 29 columnas base reales, en orden, sobre lienzo interno ancho con scroll horizontal; `Código` y `Nombre` aparecen congeladas.
- **LA-081:** filas y skeletons miden 36-40 px; encabezado sticky.
- **LA-082:** filtros, datos, contador y paginación del diseño usan un mismo escenario.
- **LA-083:** el `.op` incluye referencia de tabla, selector 36/29/7, exportación, advertencia PDF y estados loading, vacío, sin resultados, 403 y error de servidor.
- **LA-084:** el `.op` usa variables/tokens y variantes visuales representativas. No constituye evidencia exhaustiva de los 10 temas.
- **LA-085:** implementación y QA validan la interfaz en los 10 temas reales del sistema, incluyendo contraste AA.
- **LA-090:** accesibilidad se verifica en código/tests: tabla semántica, encabezados con `scope`, `aria-sort`, teclado, foco visible, labels y anuncios `aria-live`. El diseño estático solo documenta intención.
- **LA-091:** clic o Enter en una fila fuera de controles navega a la ficha del animal.

## 11. Rendimiento e índices

- **LA-100:** respuesta paginada p95 < 400 ms con el escenario de prueba acordado; búsqueda con debounce de 300 ms.
- **LA-101 (existente):** el esquema actual ya aporta índices equivalentes a `animales(finca_id, activo)` y `pesos(animal_id, fecha)`.
- **LA-102 (migración requerida):** backend/database debe crear y medir índices adicionales para el patrón final, como `animales(finca_id, activo, codigo)` y el índice que soporte peso último con desempate. No se declararán existentes hasta que la migración sea aplicada.
- **LA-103:** joins y derivadas se resuelven en la consulta paginada, sin N+1.

## 12. Criterios de aceptación

1. Los tres artefactos declaran una entrega online-only con 29 columnas visibles y 36 totales.
2. La tabla inicial muestra las 29 columnas base de §3, sin Categoría reprod. ni Peso último, con Código/Nombre congeladas y filas de 36-40 px.
3. Cada columna usa los `columnId`, `responseKey`, `filterKey`, `sortKey` y `filterValue` exactos de la matriz.
4. Filtros de catálogo/envío usan ID/key estable y la UI presenta labels.
5. El DTO implementa las 36 columnas, derivadas, nulabilidad, paginación, errores y `cols`.
6. Un 400 conserva la última tabla válida, sanea la URL y muestra toast; 403/500/timeout muestran sus estados definidos.
7. `tipo_ingreso_id` se resuelve contra `config_key_values.tipo_ingreso`; desconocidos usan el fallback definido.
8. Selector y preferencias manejan 36 columnas, 29 activas y 7 opcionales, persistidas por usuario+finca.
9. RBAC oculta acciones y vuelve a validar endpoint/exportación; finca ajena devuelve 403.
10. Exportación aplica alcance, límites, seguridad CSV/XLSX y advertencia PDF; un HTTP 500 conserva filtros y selección, muestra un mensaje no destructivo y permite reintentar.
11. Migraciones de índices requeridas tienen dueño y se miden antes de aceptar LA-100.
12. Implementación y QA validan los 10 temas y la accesibilidad mediante código/tests; el `.op` es referencia representativa, no evidencia exhaustiva.

## 13. Dependencias y fuera de alcance

- **Backend/API:** endpoint de listado, DTO, validación, resolución de relaciones y endpoint/almacenamiento de preferencias.
- **Backend/Database:** migración y medición de índices LA-102.
- **Frontend:** tabla, RBAC visual, URL, preferencias y manejo de 400/403/413/500/timeouts.
- **QA:** contrato, rendimiento, accesibilidad y validación en los 10 temas.
- Fuera de alcance: Lugar compra, multiorden, reordenar columnas y exportación asíncrona.
