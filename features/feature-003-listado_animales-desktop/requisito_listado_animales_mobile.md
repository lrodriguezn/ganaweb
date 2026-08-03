# GanaWeb — Requisito Funcional: Listado de Animales Mobile (RF-ANIM-LIST-M v1.1)

> Complementa a `requisito_listado_animales.md` (desktop, RF-ANIM-LIST v2.1).
> Cubre la pantalla 03 (Animales · Mobile). Reglas propias: **LM-xxx**.
>
> **Referencias**:
> - `docs/schema_v3_corregido.sql` — columnas de dominio. ⚠️ Este doc está
>   desactualizado frente al schema Drizzle real (`packages/db/src/schema/animales.ts`):
>   donde el doc dice `config_razas_id`/`tipo_padre_key`, el código usa
>   `raza_id`/`tipo_padre_id`, y el código además tiene `color_id` y `es_de_monta`.
>   Esta spec cita los nombres **reales del código**.
> - `features/001-feature_crud_animales/crud_animales_v1.3.md` — reglas CA-xxx
>   (en particular CA-UI-001). El `crud_animales.md` v1.2 no contiene las CA-UI.
> - Pantallas mobile: la anatomía vigente vive en `docs/ganaweb-diseno.op`
>   (frame «03 Animales · Mobile» y «04 Ficha Animal · Mobile»), NO en
>   `ganaweb-listado-animales.op` (que es 100% desktop). El frame 03 aún muestra
>   `potrero·lote` al pie; el pie propietario+madre es lo nuevo que introduce LM-001.
> - `features/bug-004-bug_listado_categoria_salud/bug_listado_categoria_salud.md`
>   — BUG-DATA-001 (bloqueante).

---

## 1. Objetivo y alcance

Entregar en mobile un listado de animales optimizado para **identificar y
decidir rápido en el corral**: cards apiladas con identidad, naturaleza, estado
y procedencia, más un filtro rápido de chips tappables y buscador. Es la
herramienta de **campo**; el desktop es la herramienta de **análisis**.

### 1.1 Decisión de fondo: cards, no tabla

En mobile el listado se mantiene como **cards apiladas verticalmente**, NO
como la tabla densa del desktop. Justificación: en pantalla angosta una
tabla obliga a scroll horizontal (se pierde la columna de identificación al
desplazarse), mientras las cards fluyen en vertical —el gesto natural del
pulgar—. Desktop escanea muchos animales a lo ancho; mobile recorre a lo
largo y profundiza con un toque. **Es correcto que ambos diseños diverjan.**

La tabla de 30 columnas, filtros por columna, ordenamiento y exportación
del desktop **no se replican en mobile**: ese es trabajo de escritorio.

### 1.2 Qué es / qué no es

- **Es**: lista paginada de cards enriquecidas, filtro rápido por chips,
  buscador, estados de interfaz, y navegación a la ficha (pantalla 04).
- **No es**: tabla densa, filtros por columna, ordenamiento configurable,
  exportación, ni selección múltiple para eventos (fuera de alcance v1.1).

---

## 2. RBAC y seguridad

- **LM-RBAC-01** — Listar, filtrar y buscar animales requiere el permiso
  `animales:ver`. Sin él, el endpoint devuelve 403 y la pantalla muestra el
  estado de acceso denegado (LM-030), no una lista vacía.
- **LM-RBAC-02** — Aislamiento por finca: la consulta SIEMPRE filtra por la
  finca activa del usuario autenticado. Una `fincaId` ajena o sin membership
  devuelve **403** (`ApiErrorDto`), nunca datos de otra finca. La autorización
  se revalida en el servidor en cada request; el frontend solo refleja.
- **LM-RBAC-03** — El botón "+" (nuevo animal) respeta `animales:crear`: se
  oculta sin él (ya vigente, ver §11 "Lo que no cambia"). Listar no requiere
  `animales:crear`.

---

## 3. Anatomía de la card + matriz de datos

### 3.1 Jerarquía (LM-001)

Jerarquía de arriba hacia abajo:

1. **Identidad** — `codigo` en negrita + `nombre` (si existe; si no, solo
   código, sin guión de relleno).
2. **Naturaleza** — línea fina: `sexo` (texto/ícono ♀♂) · `raza`.
3. **Estado** (badges — lo que se escanea primero):
   - Categoría reproductiva (hembras) con su color de dominio; en
     machos/pajuelas con `no_aplica` NO se muestra, o "Reproductor" si
     `es_de_monta=1`.
   - Salud: verde (Sano/a) o rojo (Enfermo/a) — **siempre** ese par de
     colores (invariante del catálogo, ver LM-060).
4. **Procedencia** (pie, separado por línea sutil) — los datos que el
   usuario pidió priorizar:
   - **Propietario** (`propietario_id` → nombre).
   - **Madre**: `codigo_madre` · nombre resuelto (`madre_id`→`nombre`).
     Si no hay madre registrada: "Madre: sin registrar" en gris.

> El pie con propietario+madre **reemplaza** al `potrero·lote` que muestra
> la card actual (decisión de producto: la procedencia es lo que se prioriza
> en el corral). La ubicación (potrero·lote) vive en la ficha.

### 3.2 Reglas de contenido

- **LM-002** — Todas las FK/key en texto legible, nunca id/número
  (CA-UI-001). Campos vacíos: el nombre se omite; la madre ausente se
  indica explícitamente ("sin registrar"), no se deja en blanco.
- **LM-003** — Toda la card es tappable → abre la ficha (pantalla 04). El
  chevron › es solo indicador visual.
- **LM-004** — El padre NO va en la card (tres relaciones saturarían); vive
  en la ficha. Reevaluar si producto lo pide.

### 3.3 Matriz de datos (campo de card → columna real)

Fuente: schema Drizzle (`packages/db/src/schema/animales.ts`). Los joins de
texto se resuelven en el servidor (LM-010).

| Campo de card | Columna real | Resolución | Nulabilidad |
|---|---|---|---|
| `codigo` | `animales.codigo` | directa | NO nulo |
| `nombre` | `animales.nombre` | directa (default `''`) | `''` si ausente |
| `sexo` | `animales.sexo_key` | → `config_key_values` `opcion='sexo'`: 0=Macho, 1=Hembra, 2=Pajuela | NO nulo (default 0) |
| `raza` | `animales.raza_id` | → `config_razas.nombre` | nullable |
| `categoriaReproductiva` | `animales.categoria_reproductiva` | enum TEXT: `vacia/servida/prenada/parida/novilla/no_aplica` (NO es FK) | nullable |
| `salud` | `animales.salud_animal_key` | → `config_key_values` `opcion='salud_animal'`: 0=Sano, 1=Enfermo | NO nulo (default 0) |
| `esDeMonta` | `animales.es_de_monta` | directa (0/1) | NO nulo (default 0) |
| `propietario` | `animales.propietario_id` | → `propietarios.nombre` | nullable |
| `madre.codigo` | `animales.codigo_madre` ó `madre_id`→`codigo` | `codigo_madre` si no vacío; si no, el código de la madre por `madre_id` | nullable |
| `madre.nombre` | `animales.madre_id` | → `animales.nombre` de la madre (self-ref) | nullable |

> ⚠️ **Trampa `config_key_values`**: la columna `key` guarda el TEXTO legible
> y la columna `value` guarda el número. Para `salud_animal` y `sexo`, el
> entero en `animales` (`salud_animal_key`, `sexo_key`) se corresponde con
> `config_key_values.value`, y el texto a mostrar es `config_key_values.key`.
> No confundir. (CA-UI-001: a la vista llega el texto, nunca el número.)

### 3.4 Badges: colores y género

- **LM-060** — Invariantes de badge:
  - **Salud** SIEMPRE verde/rojo: `Sano`→tokens `--exito-100/--exito-600`,
    `Enfermo`→tokens `--peligro-100/--peligro-600`. Este par no cambia por
    tema ni por categoría.
  - **Categoría reproductiva** usa su color de dominio definido por los tokens
    del tema (referencia `docs/ganaweb-diseno.op` frame 03: Preñada=verde,
    Servida=ámbar, Vacía=neutro, Enferma=rojo). La paleta exacta de `parida`
    y `novilla` se confirma contra los tokens de tema en implementación.
  - **Género del texto de salud**: el label concuerda con el sexo del animal
    — Macho → "Sano"/"Enfermo"; Hembra → "Sana"/"Enferma"; Pajuela → se trata
    como femenino por convención (o se oculta el badge de salud si producto lo
    prefiere). Esto corrige el femenino fijo actual de `estado-badge.tsx`.
  - **Categoría en machos/pajuelas**: con `no_aplica` no se muestra badge de
    categoría; si `es_de_monta=1` se muestra "Reproductor".

---

## 4. Filtro rápido, buscador y filtro base

### 4.1 Filtro base (siempre aplicado)

- **LM-012** — La consulta SIEMPRE aplica el filtro base del CRUD §4.1:
  `finca_id = finca activa` AND `activo = 1` AND `estado_animal_key = 0`
  (EN_FINCA). Por defecto NO se muestran animales vendidos, muertos ni
  inactivos. (Los toggles "Incluir vendidos/muertos" y "Ver inactivos" del
  CRUD son de la vista desktop/admin y fuera de alcance mobile v1.1.)

### 4.2 Chips de filtro rápido

- **LM-005** — Fila de **chips horizontales scrolleables** sobre la lista,
  tappables con el pulgar (sin teclado): **Todas · Preñadas · Enfermas ·
  Propietario ▾**.
  - *Todas*: sin filtro (default, activo).
  - *Preñadas*: `categoria_reproductiva = 'prenada'`.
  - *Enfermas*: `salud_animal_key = 1`.
  - *Propietario ▾*: abre un selector (drawer/sheet) con los propietarios
    de la finca; al elegir uno, filtra por `propietario_id`.
- **LM-006** — Un chip activo a la vez para los predefinidos (Todas/
  Preñadas/Enfermas son excluyentes); "Propietario" puede combinarse con
  ellos (AND). El chip activo usa `bg-primary`; los inactivos, borde.
- **LM-015** — Selector de propietario: lista los propietarios de la finca
  activa (`propietarios` donde `finca_id` y `activo=1`), con opción
  "Todos los propietarios" para limpiar el filtro. Si la finca no tiene
  propietarios, el chip "Propietario ▾" se muestra deshabilitado con hint.
  El selector muestra el nombre (CA-UI-001), nunca el id.

### 4.3 Buscador

- **LM-007** — El **buscador** se mantiene arriba y coexiste con el filtro
  rápido (AND). Buscador = "encuentra este"; chips = "muéstrame este grupo".
- **LM-014** — El buscador opera sobre los campos `codigo`, `nombre`,
  `codigo_arete` y `codigo_rfid` (el lector BLE/NFC escribe en estos dos
  últimos), con coincidencia `contains` que ignora mayúsculas y acentos
  (same behavior que el desktop, LA-010). Debounce de 300 ms. Con texto
  vacío no filtra.

### 4.4 Resultado

- **LM-008** — Contador discreto del resultado ("18 animales") y estado sin
  resultados ("Ningún animal coincide · Quitar filtro"). El contador se
  anuncia con `aria-live="polite"` (LM-040).

---

## 5. Contrato HTTP y DTO mobile

> Decisión (v1.1): la lista mobile consume un **endpoint dedicado** que
> devuelve solo los campos de la card + paginación, en lugar de la server-fn
> legado actual (que trae todas las columnas y filtra en memoria) o del
> endpoint desktop de 36 columnas. Esto cumple LM-010 y prepara la simetría
> offline futura.

### 5.1 Endpoint

- **LM-020** — Endpoint dedicado:

```text
GET /api/fincas/{fincaId}/animales/mobile?page=1&pageSize=25
  &q=MT-12
  &f.categoriaReproductivaKey=in:prenada
  &f.saludKey=in:1
  &f.propietarioId=in:<uuid>
```

  - `page` 1-based; `pageSize` ∈ `{20,25,30}` (default 25).
  - `q` — búsqueda LM-014 (texto, `contains`, ignora mayúsculas/acentos).
  - `f.*` — solo estos tres `filterKey`, gramática `in:<valor>`:
    - `f.categoriaReproductivaKey` → enum `categoria_reproductiva`.
    - `f.saludKey` → entero `salud_animal_key` (0/1).
    - `f.propietarioId` → UUID `propietarios.id`.
  - El filtro base LM-012 se aplica SIEMPRE en servidor (no viaja en la URL).
  - Los filtros viajan por **key/id**, nunca por label (LA-001, CA-UI-001).

### 5.2 DTO

- **LM-021** — Contrato de respuesta (nulabilidad explícita; ausentes = `null`;
  la UI presenta "sin registrar"/omite, nunca `null` literal ni cero):

```ts
type IdLabel  = { id: string; label: string };
type KeyLabel = { key: string; label: string };

type MadreDto = {
  codigo: string;        // codigo_madre, o el codigo de la madre por madre_id
  nombre: string | null; // nombre resuelto; null si no resoluble (externa/IA)
};

type AnimalMobileRowDto = {
  id: string;
  codigo: string;
  nombre: string;                          // '' si ausente
  sexo: KeyLabel;                          // {key:'1', label:'Hembra'}
  raza: IdLabel | null;
  categoriaReproductiva: KeyLabel | null;  // null cuando es 'no_aplica'
  salud: KeyLabel;                         // {key:'0', label:'Sano'} — siempre presente
  esDeMonta: boolean;
  propietario: IdLabel | null;
  madre: MadreDto | null;                  // null si no hay madre registrada
};

type AnimalMobileListResponseDto = {
  data: AnimalMobileRowDto[];
  page: number;
  pageSize: 20 | 25 | 30;
  total: number;        // total CON filtro aplicado
  totalSinFiltro: number; // total de la finca (filtro base) — para estado vacío
  hayMas: boolean;      // true si hay página siguiente (guía el scroll infinito)
};

type ApiErrorDto = {
  error: string;
  campo: string | null;
  motivo: string;
  requestId: string;
};
```

  - Regla de categoría: el servidor devuelve `categoriaReproductiva: null`
    cuando el valor almacenado es `no_aplica`; en otro caso devuelve el par
    `{key, label}`. El frontend muestra "Reproductor" si `esDeMonta=true` y
    `categoriaReproductiva` es null (LM-060).
  - Regla de madre: `madre` es `null` solo cuando no hay `codigo_madre` ni
    `madre_id`. Si hay `codigo_madre` pero la madre no está registrada en la
    finca (externa/IA), `madre.nombre` es `null` y se muestra solo el código.

### 5.3 Errores

- **LM-023** — Comportamiento por código HTTP (el backend devuelve
  `ApiErrorDto` para 400/403/500; el frontend es dueño del comportamiento
  visual):
  - **400** (parámetro `q`/`f.*`/`page`/`pageSize` inválido): el frontend
    sanea/remueve el filtro ofensivo, vuelve a `page=1`, muestra un toast y
    conserva la última lista válida. No reemplaza la lista por un error.
  - **403** (sin `animales:ver` o finca ajena): estado de acceso denegado
    "No tienes acceso a esta finca", sin datos previos, con navegación segura
    de regreso (LM-030).
  - **500 / timeout**: estado de error con acción `Reintentar`. Nunca una
    lista vacía silenciosa.

---

## 6. Estados de interfaz

- **LM-030** — La pantalla distingue explícitamente estos estados (no se
  confunden entre sí):
  1. **Loading inicial** — skeleton de cards mientras llega la primera página.
  2. **Cargando más** — indicador de carga al pie durante el scroll infinito;
     la lista existente permanece visible.
  3. **Finca vacía** — `totalSinFiltro = 0`: empty state "Aún no hay animales
     en esta finca" + botón "+" (si `animales:crear`).
  4. **Sin resultados** — `total = 0` con `totalSinFiltro > 0`: "Ningún animal
     coincide · Quitar filtro" (LM-008); el botón limpia filtros/búsqueda.
  5. **403** — acceso denegado (LM-023).
  6. **Error / timeout** — estado con `Reintentar` (LM-023).
  7. **Offline** *(futuro, LM-011)* — cuando exista la réplica local, servir
     desde ella con indicador de datos sincronizados; hoy no aplica (gate
     `no-sqlite`).

---

## 7. Carga y rendimiento

- **LM-009** — Lista **paginada con scroll infinito** (a diferencia del
  desktop, que usa paginación numerada): en mobile el scroll continuo es el
  patrón natural. Se cargan páginas de 20–30 al llegar al final; indicador
  de carga al pie. El filtro/búsqueda **reinicia la paginación** (`page=1`).
  El frontend usa `hayMas` para decidir si pedir la siguiente página.
- **LM-010** — La consulta trae solo los campos que la card muestra
  (código, nombre, sexo, raza, categoría, salud, `es_de_monta`, propietario,
  madre) — no las 30 columnas del desktop. Los joins de texto se resuelven
  en servidor. (Formalizado en el DTO LM-021.)
- **LM-050** — Rendimiento: respuesta paginada p95 < 400 ms con el escenario
  de prueba acordado; búsqueda con debounce de 300 ms. Se aprovecha el índice
  existente `idx_animales_finca_activo (finca_id, activo)`; si el plan de la
  consulta con filtro base + `estado_animal_key` lo requiere, se propone un
  índice compuesto y se mide antes de cerrar el ítem (como LA-102).

---

## 8. Offline (dependencia futura)

- **LM-011** *(dependencia, fuera de la entrega v1.1)* — Objetivo: que la
  lista, el filtro rápido y el buscador operen sobre la réplica local
  (SQLite WASM) cuando esta exista. **Hoy es inimplementable**: el repo tiene
  un gate `no-sqlite` que prohíbe la réplica, y el código es online-only.
  Se registra como dependencia de alcance futuro (equivalente a LA-102 del
  desktop). El contrato LM-020/LM-021 se diseña para que, al existir la
  réplica, el mismo caso de uso se ejecute offline contra SQLite y online
  contra Postgres (simetría offline/online del proyecto).

---

## 9. Diseño, temas y accesibilidad

- **LM-040** — Accesibilidad (se verifica en código/tests; el `.op` solo
  documenta intención):
  - Targets táctiles ≥ 44×44 px para chips, card y botón "+".
  - La card tappable es navegable por teclado y expone semántica de enlace
    a la ficha; el chevron es decorativo (`aria-hidden`).
  - Badges con label legible por lector de pantalla (no solo color); el
    contador y el indicador de "cargando más" se anuncian con
    `aria-live="polite"`.
  - Contraste suficiente en los **10 temas** del sistema.
- **Temas** — Existen 5 estilos × claro/oscuro = **10 temas runtime**
  (`campo`, `moderna`, `indigo`, `cielo`, `grafito`; definidos en
  `packages/ui/src/styles/globals.css`). El theming es por tokens CSS;
  PROHIBIDO usar variantes `dark:` en componentes (T-004). La invariantes de
  color de salud (verde/rojo) se implementan con los tokens
  `--exito-*`/`--peligro-*` por tema (LM-060).

---

## 10. Criterios de aceptación

1. La card muestra identidad, sexo·raza, badges de estado y el pie con
   propietario + madre (código·nombre); nombre y madre vacíos se manejan
   según LM-002. El pie ya no muestra potrero·lote.
2. Categoría y salud son las reales del animal (depende de BUG-DATA-001);
   machos no muestran "Novilla". El texto de salud concuerda en género con
   el sexo (LM-060).
3. Filtro rápido Todas/Preñadas/Enfermas/Propietario funciona y combina con
   el buscador (LM-005..007, LM-014, LM-015). El filtro base excluye
   vendidos/muertos/inactivos (LM-012).
4. Scroll infinito carga más al llegar al final guiado por `hayMas`; filtro
   o búsqueda reinicia la lista a `page=1` (LM-009).
5. Toda la card abre la ficha; el "+" respeta `animales:crear` (LM-003,
   LM-RBAC-03). Listar requiere `animales:ver`; finca ajena → 403
   (LM-RBAC-01/02).
6. El endpoint mobile devuelve el DTO LM-021 con nulabilidad correcta; los
   filtros viajan por key/id, nunca label; 400/403/500 se comportan según
   LM-023.
7. Los estados de interfaz se distinguen: loading inicial, cargando más,
   finca vacía, sin resultados, 403 y error/timeout (LM-030).
8. Render correcto en los 10 temas; salud siempre verde/rojo; accesibilidad
   verificada en código (LM-040, LM-060).
9. p95 < 400 ms para la lista paginada con el escenario acordado (LM-050).

---

## 11. Lo que NO cambia · Dependencias · Fuera de alcance

### Lo que NO cambia

Header con finca + sync, botón "+" (nuevo animal), bottom nav. El FAB/botón
"+" respeta el permiso `animales:crear` (se oculta sin él).

### Dependencias

- **BUG-DATA-001** (bloqueante) — este requisito asume que la
  categoría/salud se leen correctamente. Causa raíz identificada: el mapper
  server-side `toAnimalListItem` en `apps/web/src/server/animal-actions.server.ts`
  hardcodea `salud:"sano"` y `categoriaReproductiva: sexoKey===1 ? "novilla"
  : "no_aplica"`. Debe corregirse en paralelo o la card seguirá mostrando
  "Novilla/Sana" fijo. El read-model desktop NO está afectado.
- **Offline (LM-011)** — dependencia futura; gateada por `no-sqlite`.

### Fuera de alcance (v1.1)

- Filtros por columna, ordenamiento y exportación — son de la versión
  **desktop** (RF-ANIM-LIST v2.1). Mobile es herramienta de campo, no de
  análisis.
- Selección múltiple de animales para registrar eventos (la `SelectionBar`
  del `.op` es de otro flujo).
- Toggles "Incluir vendidos/muertos" y "Ver inactivos" (CRUD §4.1, vista
  desktop/admin).
- El padre en la card (LM-004) y la genealogía real en la ficha (hoy
  `obtenerFichaAnimal` devuelve genealogía stub).

### Relación con otros documentos

- **requisito_listado_animales.md** — el desktop es la herramienta de
  análisis (tabla, filtros por columna, export); este mobile es la de
  campo. No se solapan; se complementan.