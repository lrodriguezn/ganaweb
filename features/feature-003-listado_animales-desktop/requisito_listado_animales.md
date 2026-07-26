# GanaWeb — Requisito Funcional: Listado de Animales Desktop (RF-ANIM-LIST v2.0)

> **v2.0** — reescritura que cierra las contradicciones de la revisión.
> Decisión raíz confirmada con producto: **la vista inicial muestra las 30
> columnas base** (denso). El diseño previo que mostraba 10 queda DEROGADO;
> el `.op` debe actualizarse a 30 columnas con scroll horizontal y columnas
> congeladas (§12).
>
> Fuente de verdad única de columnas: la **matriz canónica §3**. Cualquier
> otro documento (diseño, exportación, issues) se subordina a ella.
> Reglas: **LA-xxx**. Ante contradicción con esta matriz: gana la matriz.
> Ubicación en repo: `features/feature-003-listado_animales-desktop/requisito_listado_animales.md`

---

## 1. Problema y objetivo

El listado desktop actual (4 columnas, Ubicación vacía) entrega menos
información que la versión mobile. Objetivo: **tabla densa de análisis del
hato** con las 30 columnas base visibles, filtros, orden, paginación
server-side y exportación, construida sobre un **contrato de consulta único**
(§8) del que dependen todas las capas.

## 2. Alcance y permisos (RBAC — cerrado)

- Pantalla: listado desktop `/fincas/$fincaId/animales`.
- **LA-RBAC-01** — Ver listado/paginar/filtrar/ordenar: `animales:ver`.
- **LA-RBAC-02** — Botón "Nuevo animal": visible solo con `animales:crear`;
  sin el permiso NO se renderiza (no basta con deshabilitar).
- **LA-RBAC-03** — Exportar (cualquier formato): requiere
  **`animales:ver` + `reportes:exportar`**. Sin `reportes:exportar` el botón
  Exportar no se renderiza. (Decisión cerrada: exportar es acción distinta
  de ver.)
- **LA-RBAC-04** — Toda consulta (listado y exportación) se filtra en
  **servidor** por las fincas del usuario (`usuarios_fincas`) y por
  `finca_id` = finca activa. El `fincaId` de la URL NUNCA se confía: si el
  usuario no pertenece a esa finca → 403. Aplica a paginación y export.

## 3. Matriz canónica de columnas (FUENTE DE VERDAD)

**37 columnas**: **30 visibles por defecto** (orden fijo) + **7 ocultas
activables**. "Edad" y "Peso último" son derivadas y ya están CONTADAS en
sus grupos (no se suman aparte en exportación — corrige "30 + derivadas").

Leyenda: **V**=visible por defecto. Todas exportables salvo nota.

| # | Columna | Campo/derivación | Tipo | V | Filtro | Orden (key API) |
|---|---|---|---|:-:|---|---|
| 1 | Código | `codigo` | texto | ✓ | contiene | `codigo` |
| 2 | Nombre | `nombre` | texto | ✓ | contiene | `nombre` |
| 3 | Sexo | `sexo_key`→texto | enum | ✓ | in[] | `sexo_key` |
| 4 | Raza | `raza_id`→`config_razas.nombre` | catálogo | ✓ | in[] | `raza_nombre` |
| 5 | Fecha nacimiento | `fecha_nacimiento` (epoch) | fecha | ✓ | rango fecha | `fecha_nacimiento` |
| 6 | Edad | derivada de fecha_nacimiento | número | ✓ | rango núm | `fecha_nacimiento` (inv) |
| 7 | Color | `color_id`→`config_colores.nombre` | catálogo | ✓ | in[] | `color_nombre` |
| 8 | Origen | `tipo_ingreso_key`→texto | enum | ✓ | in[] | `tipo_ingreso_key` |
| 9 | Madre (Cód.) | `codigo_madre` | texto | ✓ | contiene | `codigo_madre` |
| 10 | Madre (Nom.) | `madre_id`→`animales.nombre` | texto | ✓ | contiene | `madre_nombre` |
| 11 | Padre (Cód.) | `codigo_padre` | texto | ✓ | contiene | `codigo_padre` |
| 12 | Padre (Nom.) | `padre_id`→`animales.nombre` | texto | ✓ | contiene | `padre_nombre` |
| 13 | Propietario | `propietario_id`→`propietarios.nombre` | catálogo | ✓ | in[] | `propietario_nombre` |
| 14 | Hierro | `hierro_id`→`hierros.nombre` | catálogo | ✓ | in[] | `hierro_nombre` |
| 15 | Nº Pezones | `numero_pezones` | número | ✓ | rango núm | `numero_pezones` |
| 16 | Calidad | `calidad_animal_id`→nombre | catálogo | ✓ | in[] | `calidad_nombre` |
| 17 | Arete | `codigo_arete` | texto | ✓ | contiene | `codigo_arete` |
| 18 | Fecha compra | `fecha_compra` (epoch) | fecha | ✓ | rango fecha | `fecha_compra` |
| 19 | Precio | `precio_compra` | número | ✓ | rango núm | `precio_compra` |
| 20 | Peso compra | `peso_compra` | número | ✓ | rango núm | `peso_compra` |
| 21 | Lugar compra | `lugar_compra_id`→`lugares_compras.nombre` | catálogo | ✓ | in[] | `lugar_compra_nombre` |
| 22 | Tatuado | `tatuado` | bool | ✓ | sí/no | `tatuado` |
| 23 | Herrado | `herrado` | bool | ✓ | sí/no | `herrado` |
| 24 | Descornado | `descornado` | bool | ✓ | sí/no | `descornado` |
| 25 | RFID | `codigo_rfid` | texto | ✓ | contiene | `codigo_rfid` |
| 26 | Potrero | `potrero_id`→`potreros.nombre` | catálogo | ✓ | in[] | `potrero_nombre` |
| 27 | Sector | `sector_id`→`sectores.nombre` | catálogo | ✓ | in[] | `sector_nombre` |
| 28 | Lote | `lote_id`→`lotes.nombre` | catálogo | ✓ | in[] | `lote_nombre` |
| 29 | Grupo | `grupo_id`→`grupos.nombre` | catálogo | ✓ | in[] | `grupo_nombre` |
| 30 | Comentarios | `comentarios` | texto | ✓ | contiene | — (no ordenable) |
| 31 | Salud | `salud_animal_key`→texto | enum | ✗ | in[] | `salud_animal_key` |
| 32 | Categoría reprod. | `categoria_reproductiva` | enum | ✗ | in[] | `categoria_reproductiva` |
| 33 | Estado | `estado_animal_key`→texto | enum | ✗ | in[] | `estado_animal_key` |
| 34 | Peso último | máx(`pesos.fecha`)→`pesos.peso` | número | ✗ | rango núm | `peso_ultimo` |
| 35 | QR | `codigo_qr` | texto | ✗ | contiene | `codigo_qr` |
| 36 | Es de monta | `es_de_monta` | bool | ✗ | sí/no | `es_de_monta` |
| 37 | Tipo explotación | `tipo_explotacion_id`→texto | catálogo | ✗ | in[] | `tipo_explotacion_nombre` |

- **LA-001** — Toda FK/key se muestra y exporta como **texto legible**,
  nunca id/número. Resolución server-side; el cliente recibe texto listo.
- **LA-002 · Lugar de compra** — El esquema **sí** tiene `lugar_compra_id`
  hacia `lugares_compras` (verificado en `0000_initial.sql`). Columna
  plenamente funcional; se retira la advertencia de "columna vacía" de v1.0.
- **LA-003 · Derivadas** — Edad = años con 1 decimal desde
  `fecha_nacimiento` a hoy. Peso último = `peso` del registro de mayor
  `fecha` en `pesos` (no `peso_compra`). Ordenan por valor numérico real;
  Edad ordena por `fecha_nacimiento` inverso (menor fecha = mayor edad).
- **LA-004 · Nunca en la tabla** — `id`, `finca_id`, `usuario_creado_por`,
  `created_at`, `updated_at`, `version`, `activo`, `ind_descartado`, y los
  `_id`/`_key` en forma cruda.

## 4. Filtros

- **LA-010** — Cada columna filtra según su "Tipo filtro" (§3): `contiene`
  (texto, case-insensitive, sin acentos), `in[]` (multi-select), `rango núm`
  (min/max inclusivos), `rango fecha` (desde/hasta), `sí/no` (tri-estado:
  sí / no / cualquiera).
- **LA-011** — Filtros combinan con **AND** entre columnas y con el buscador.
  Chips de activos + "Limpiar todo"; contador "N de TOTAL" (TOTAL = hato de
  la finca, no el filtrado).
- **LA-012** — Buscador global (OR sobre `codigo`, `nombre`, `codigo_arete`,
  `codigo_rfid`) coexiste con filtros de columna (AND).
- **LA-013** — Cambiar filtro o buscador **resetea a página 1** (LA-032).

## 5. Ordenamiento

- **LA-020** — Clic en encabezado ordenable: ASC → DESC → sin orden. Indicador
  ▲/▼ + `aria-sort`.
- **LA-021** — Default: `codigo` ASC. Una columna de orden en v1.0.
- **LA-022 · Desempate estable** — Todo orden lleva desempate secundario por
  `id` ASC, para que la paginación no repita ni salte filas cuando hay
  valores iguales (p. ej. muchas "Sanas").
- **LA-023** — Numéricas/fechas por valor real; texto locale es-CO. Ejemplo:
  Peso ASC → 89, 289, 412…; DESC → 520, 445, 412… (el ejemplo de v1.0 solo
  era válido en DESC).

## 6. Selector de columnas

- **LA-030** — Botón "Columnas": checklist de las 37. **Código y Nombre no
  ocultables**. Reordenar: fuera de alcance v1.0 (orden = §3).
- **LA-031** — Selección persistida **por usuario + finca** (endpoint de
  preferencias UI, NO localStorage — debe sobrevivir cambio de dispositivo).
  "Restablecer" vuelve a las 30. Primer ingreso sin preferencia = 30 base.

## 7. Paginación

- **LA-032** — Server-side. Params: `page` (1-based), `pageSize` ∈ {25,50,100}
  (default 25). Devuelve página + `total` (filtrado) + `totalSinFiltro`.
- **LA-033** — Controles: "Mostrando X–Y de N", navegación numerada, selector
  de tamaño. Numerada (no scroll infinito) — export predecible y total visible.
- **LA-034** — `page`, `pageSize`, orden y filtros en **query params** (§8);
  la URL reproduce la vista; atrás funciona. Cambiar filtros/orden/pageSize
  resetea `page=1`.

## 8. Contrato de consulta (API / URL) — bloqueante resuelto

### 8.1 Query params

```
GET /api/fincas/{fincaId}/animales
  ?page=1&pageSize=25
  &sort=codigo:asc                      // campo:dir; campos = col "Orden" §3
  &q=MT-12                              // buscador global
  &f.sexo_key=in:1,0                    // in[] → in:v1,v2
  &f.raza_nombre=in:Brahman,Gyr
  &f.edad=range:2,5                     // rango núm → range:min,max (inclusive)
  &f.fecha_nacimiento=drange:2020-01-01,2024-12-31   // rango fecha ISO
  &f.codigo=contains:MT
  &f.tatuado=bool:true
  &cols=codigo,nombre,sexo_key,...      // opcional (export "vista actual")
```

- Nombre de filtro = `f.` + el key de "Orden" de §3. Operadores:
  `contains:`, `in:`, `range:`, `drange:`, `bool:`.
- **LA-040** — Param o valor inválido → 400 `{error, campo, motivo}`; el
  cliente lo ignora y muestra toast, sin romper la tabla.

### 8.2 Respuesta

```json
{
  "data": [ { "id":"...", "codigo":"MT-120", "nombre":"Lucero",
              "sexo":"Hembra", "raza":"Brahman", "edad":4.2,
              "salud":"Sana", "categoria":"prenada" } ],
  "page": 1, "pageSize": 25,
  "total": 128, "totalSinFiltro": 543,
  "sort": "codigo:asc"
}
```

- **LA-041** — Cada fila trae textos resueltos (LA-001), la clave cruda del
  enum para el badge (`categoria`, `salud`) y el `id` para navegar.
- **LA-042 · Nulos** — Campos nulos → `null`; el cliente pinta "—" (texto/
  número) o "sin registrar" (relaciones). Nunca "null" literal ni 0 por
  defecto en numéricos ausentes.
- **LA-043 · Errores** — 400 (params), 403 (finca ajena/sin permiso), 500.
  El cliente muestra estado de error con reintento (§9), nunca tabla vacía
  silenciosa.

### 8.3 Orden permitido

- **LA-044** — `sort` solo acepta los keys de "Orden" §3; otro → 400.
  Desempate `,id:asc` implícito siempre (LA-022).

## 9. Estados de la tabla (con dueño — bloqueante resuelto)

Responsabilidad del sub-issue de UI (§11), no "de nadie":

- **LA-050 · Cargando** — Skeleton de pageSize filas con columnas reales;
  header visible. No spinner de pantalla completa.
- **LA-051 · Finca vacía** — EmptyState "Aún no hay animales · + Registrar el
  primero" (respeta `animales:crear`).
- **LA-052 · Sin resultados** — "Ningún animal coincide · Limpiar filtros";
  conserva la fila de filtros.
- **LA-053 · Error** — Mensaje + "Reintentar"; distingue 403 ("No tienes
  acceso a esta finca") de 500 ("Error del servidor").
- **LA-054 · Offline** — Banner `info` "Sin conexión · datos locales" (§10).

## 10. Comportamiento offline — bloqueante resuelto

- **LA-060 · Funciona offline** — Listado, buscador, filtros, orden, conteo y
  paginación operan sobre la **réplica local** (SQLite/OPFS del sync). La
  consulta §8 tiene implementación local equivalente (mismo request/response);
  la UI no distingue el origen salvo el banner LA-054.
- **LA-061 · NO offline** — La **exportación** requiere servidor (LA-072) →
  offline el botón Exportar se deshabilita con tooltip "Disponible con
  conexión". Única degradación.
- **LA-062 · Consistencia** — Offline, conteo y filtros reflejan la réplica
  (puede ir por detrás del servidor); el banner lo comunica; al reconectar se
  revalida.
- **LA-063 · Columnas offline** — El set de columnas se cachea local; se puede
  cambiar offline y sincroniza al reconectar (LA-031).

## 11. Exportación (límites y seguridad — bloqueante resuelto)

- **LA-070** — Formatos: Excel (.xlsx), CSV, PDF (apaisado).
- **LA-071** — Alcance columnas: "Vista actual" (`cols=`) o "Todas" (37).
  Filas: el **conjunto filtrado completo**, no la página.
- **LA-072** — Generación **server-side** con los mismos filtros/orden.
  Requiere conexión (LA-061).
- **LA-073 · Límite** — Máximo **50 000 filas**; si excede → 413 y la UI pide
  afinar filtros.
- **LA-074 · Timeout** — 30 s; si excede → "La exportación tardó demasiado,
  afina filtros". Export asíncrono: v1.1.
- **LA-075 · CSV injection** — Todo valor que empiece por `= + - @` o tab/CR
  se prefija con `'` en CSV y se fuerza a texto en XLSX, para impedir
  ejecución de fórmulas. Aplica a nombres, comentarios y texto libre.
- **LA-076 · PDF** — "Todas" en PDF advierte que 37 columnas no caben y sugiere
  Excel; permite continuar (fuente reducida).
- **LA-077 · Valores** — FK en texto, fechas es-CO, números con separador
  local, bool "Sí/No", encabezados = §3, nulos vacíos.
- **LA-078 · Seguridad** — Respeta RBAC (LA-RBAC-03) y filtro de finca
  server-side (LA-RBAC-04); nunca exporta otra finca.

## 12. Diseño / `.op` — bloqueante resuelto

El `.op` v1.0 (10 columnas, 44px, 3 temas con colores directos) queda
DEROGADO. El nuevo debe demostrar:

- **LA-080** — Las **30 columnas base** en orden §3, con **scroll horizontal**
  y **Código + Nombre congeladas**.
- **LA-081** — Filas **36–40px** (no 44). Header sticky.
- **LA-082** — Filtros y contador **coherentes con los datos** mostrados.
- **LA-083** — Los **estados** §9 (skeleton, vacía, sin resultados, error,
  offline) como pantallas propias.
- **LA-084** — **Selector de columnas**, **diálogo de exportación** y
  **advertencia PDF** como pantallas.
- **LA-085 · Tokens** — Demostrar los **10 temas** vía tokens; nada de hex por
  pantalla que no derive de un token.
- **LA-086 · Navegación** — Clic en fila (fuera de controles) abre la ficha
  (19); indicar el área activable.

## 13. Accesibilidad — bloqueante resuelto

- **LA-090** — Tabla semántica (`<table>`/`role=grid`, `<th scope>`).
- **LA-091** — `aria-sort` en el encabezado activo, sincronizado con ▲/▼.
- **LA-092** — Teclado: Tab recorre controles; encabezados con Enter/Espacio;
  filas con Enter (navega a ficha); foco visible siempre.
- **LA-093** — Contador y cambios de estado por `aria-live=polite`.
- **LA-094** — Filtros con label accesible; chips como botones con nombre
  ("Quitar filtro Salud: Enferma").
- **LA-095** — Contraste AA en los 10 temas (garantizado por tokens).

## 14. Rendimiento — métricas verificables

- **LA-100** — Con 543 animales + filtros: respuesta paginada **< 400 ms**
  p95, verificable en suite de carga.
- **LA-101** — Índices: `animales(finca_id, activo, codigo)` y
  `pesos(animal_id, fecha desc)` para "Peso último". Joins de texto en la
  query paginada, no por fila.
- **LA-102** — Página de 100×30 fluida: virtualización de filas si se
  requiere; sin jank.
- **LA-103** — Buscador con **debounce 300 ms**.

## 15. Criterios de aceptación

1. Vista inicial = 30 columnas base en orden §3, scroll horizontal, Código/
   Nombre congeladas, filas 36–40px (LA-080/081).
2. FK/key en texto en tabla y export; nulos "—"/"sin registrar" (LA-001/042).
3. Filtros por tipo, AND, chips, contador; buscador combina; filtro resetea a
   página 1 (LA-010..013/032).
4. Orden con desempate por id; Peso ASC 89<289<412; aria-sort (LA-020..023/091).
5. Contrato §8 exacto; 400/403/500 manejados; sort solo campos permitidos
   (LA-040..044).
6. Offline: listado/filtros/orden/conteo desde réplica; export deshabilitado
   con tooltip; banner (LA-060..063).
7. RBAC: "Nuevo animal" solo con crear; Exportar solo con ver+reportes:exportar;
   finca ajena → 403 (LA-RBAC-01..04).
8. Export: vista/todas y filtrado completo; límite 50k+413; timeout 30s;
   neutralización CSV/XLSX; PDF advierte (LA-070..078).
9. Estados skeleton/vacío/sin-resultados/error/offline (LA-050..054).
10. A11y: tabla semántica, teclado, aria-sort, aria-live, foco (LA-090..095).
11. Rendimiento: p95 < 400ms; índices; debounce 300ms (LA-100..103).
12. `.op` con 30 columnas, estados, selector, export, tokens (LA-080..086).

## 16. Dependencias / fuera de alcance

- Multi-orden, reordenar columnas, export asíncrono: **v1.1**.
- Índices LA-101: backend previo a medir LA-100.
- Persistencia de columnas (LA-031): endpoint de preferencias UI; si no
  existe, dependencia a crear (no localStorage).
