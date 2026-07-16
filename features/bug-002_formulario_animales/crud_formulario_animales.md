# GanaWeb — Reporte de Bugs · Formulario Animales (BUG-2026-07-01)

> Módulo: CRUD Animales · Pantallas 20 (desktop) / 21 (mobile)
> Ruta: `/fincas/$fincaId/animales/nuevo` y `.../editar`
> Especificación de referencia: `crud_animales.md` v1.3 §3.4 (reglas CA-UI-xxx)
> Estado: **2 bloqueantes + 1 mayor + 1 menor**
>
> Instrucción para el agente de IA / desarrollador: corregir en el orden de
> este documento, citando el identificador del bug en el commit y el PR
> (ej. `fix(ui): BUG-001 selección en SelectConCreacion`). Cada bug se cierra
> SOLO con su test de regresión (§ Verificación). Ante duda sobre la causa
> raíz: reportar, no improvisar (IA-001).

---

## BUG-001 · Los selects buscables no permiten seleccionar ninguna opción
**Severidad: BLOQUEANTE** — impide crear animales con datos de catálogo.

**Afecta**: Raza, Color, Calidad, Lugar de compra (todos los
`SelectConCreacion` / Combobox). Evidencia: capturas 1, 3, 4, 6.

**Comportamiento actual**: el dropdown abre, el buscador y la lista de
opciones se renderizan correctamente (Angus/Brahman/Holstein/Jersey,
Negro/Blanco/Roano/Bayo, Extra/Primera/Segunda, ferias…), la opción
resalta al pasar el mouse, pero **al hacer clic no se selecciona**: el
valor no entra al campo y el popover no se cierra (o se cierra sin valor).

**Comportamiento esperado**: clic (o Enter con la opción resaltada)
asigna el valor, cierra el popover, muestra el TEXTO de la opción en el
trigger (CA-UI-001: nunca el id) y marca el formulario como sucio.

**Causa raíz probable** (verificar en este orden):

1. **`CommandItem` sin `onSelect`, o con `onClick` en vez de `onSelect`**:
   el componente `Command` de shadcn/cmdk NO dispara `onClick` de forma
   fiable; la selección va SIEMPRE por `onSelect`. Es la causa más común
   de este síntoma exacto.
2. **`value` del `CommandItem` vs. lo que espera el filtro de cmdk**:
   `onSelect` entrega el `value` **normalizado en minúsculas** por cmdk.
   Si el handler compara ese string contra `raza.id` (UUID/`raza-brahman`)
   sin normalizar, no encuentra la opción y no asigna nada. Patrón
   correcto: `value={raza.id}` + buscar la opción con
   `opciones.find(o => o.id.toLowerCase() === value.toLowerCase())`, o
   usar `keywords={[raza.nombre]}` para el filtrado y conservar el id como
   value.
3. **El popover se desmonta antes de que corra `onSelect`**: si el
   `PopoverContent` se cierra en `onPointerDown`/`onInteractOutside`, el
   evento de selección nunca llega. El cierre debe ocurrir DENTRO de
   `onSelect`, después de asignar (`setValue(...); setOpen(false);`).
4. **Estado no controlado por el formulario**: si el Combobox mantiene
   estado local pero no llama `field.onChange` de react-hook-form, el
   valor se pierde al re-render. Verificar que el componente esté envuelto
   en `<FormField control={form.control} .../>` y llame `field.onChange`.

**Corrección** (contrato del componente `SelectConCreacion`):

```tsx
<CommandItem
  key={o.id}
  value={o.id}                 // el id es el value real
  keywords={[o.nombre]}        // cmdk filtra por el texto visible
  onSelect={(v) => {           // v llega normalizado por cmdk
    const sel = opciones.find((x) => x.id.toLowerCase() === v.toLowerCase());
    if (!sel) return;
    field.onChange(sel.id);    // react-hook-form: valor + dirty
    setOpen(false);            // cerrar DESPUÉS de asignar
  }}
>
  {o.nombre}
  <Check className={cn("ms-auto size-4", field.value === o.id ? "opacity-100" : "opacity-0")} />
</CommandItem>
```

El trigger muestra `opciones.find(o => o.id === field.value)?.nombre ??
placeholder`. La opción "+ Crear nuevo" es también un `CommandItem` con su
propio `onSelect` que abre el mini-form (CA-UI-002) — no un `<button>`
suelto dentro de la lista.

**Verificación**: E2E por cada uno de los 4 campos — abrir, buscar,
clic en opción → el trigger muestra el texto, el popover cierra, y al
guardar el payload lleva el id correcto. Además: navegación con teclado
(↓ + Enter) selecciona igual.

---

## BUG-002 · El DatePicker de "Fecha de compra" no permite seleccionar fechas
**Severidad: BLOQUEANTE** — impide registrar animales comprados.

**Afecta**: Fecha de compra (captura 5). Verificar también Fecha de
nacimiento (captura 2): el calendario se ve, pero debe probarse el clic.

**Comportamiento actual**: el calendario abre y navega entre meses, pero
al hacer clic en un día **no se asigna** al input, que sigue en
`dd/mm/aaaa`. Nota de la captura 2: los días 17-31 de julio y todo agosto
aparecen atenuados — coherente con "no futura" para nacimiento (RN-002),
pero **esa misma restricción no debe aplicarse a compra** con la fecha de
hoy deshabilitada; hoy (16 jul) sí debe ser seleccionable en ambos.

**Causa raíz probable**:

1. **`onSelect` del `<Calendar mode="single">` no conectado a
   `field.onChange`**, o conectado a un `onChange` inexistente. El
   `Calendar` de shadcn (react-day-picker) expone `selected` + `onSelect`.
2. **`disabled` mal configurado**: `disabled={{ after: new Date() }}` con
   una fecha que incluye hora deshabilita el día de HOY (por comparación
   `>` contra el instante actual). Debe normalizarse a fin del día
   (`endOfDay(new Date())`) o usar `{ after: startOfDay(new Date()) }`
   con `today` permitido. Si TODOS los días salen disabled, el clic no
   hace nada — coincide con el síntoma.
3. **Regla de negocio mal aplicada a compra**: `fecha_compra` no futura
   (RN-002) y **≥ fecha_nacimiento** si existe (§3.1). Si el matcher
   `disabled` está tomando `fecha_nacimiento` vacía como `Invalid Date`,
   deshabilita todo el calendario.
4. El popover cierra antes del `onSelect` (mismo patrón que BUG-001).

**Corrección**:

```tsx
<Calendar
  mode="single"
  selected={field.value}
  onSelect={(d) => { if (!d) return; field.onChange(d); setOpen(false); }}
  disabled={{ after: endOfDay(new Date()),
              ...(fechaNacimiento ? { before: fechaNacimiento } : {}) }}
  defaultMonth={field.value ?? new Date()}
  locale={es}
  captionLayout="dropdown"   // navegar años sin 40 clics (ver BUG-004)
  startMonth={new Date(2000, 0)}
  endMonth={new Date()}
/>
```

**Verificación**: E2E — abrir compra, clic en un día pasado → el input
muestra `dd/mm/aaaa` correcto y el payload lleva la fecha; hoy es
seleccionable; un día futuro está deshabilitado; con fecha de nacimiento
cargada, los días anteriores a ella están deshabilitados.

---

## BUG-003 · El calendario de "Fecha de compra" se superpone sobre su label
**Severidad: MAYOR** — tapa el label y los campos vecinos (captura 5).

**Comportamiento actual**: el popover del calendario se abre **encima** de
la etiqueta "Fecha de compra" y cubre "Precio", "Peso compra" y "Lugar de
compra": queda desplazado hacia arriba/izquierda en vez de anclarse bajo
el input. En la captura 2 (nacimiento) el comportamiento es el esperado.

**Causa raíz probable**:

1. **`PopoverContent` sin anclaje correcto**: falta
   `side="bottom" align="start" sideOffset={4}` y sobre todo
   `avoidCollisions` con `collisionPadding`. Radix invierte el lado
   (`side="top"`) automáticamente cuando no hay espacio abajo — si el
   campo está cerca del borde inferior del viewport, el calendario "salta"
   sobre el label. Es coherente con que el bug aparezca solo en el campo
   de compra (más abajo en el formulario).
2. **El popover no está en un portal**: si se renderiza dentro de la card
   con `overflow` o un `transform`, el posicionamiento se calcula contra
   un contenedor equivocado. Usar `<PopoverPortal>` (o el `Portal` que
   trae `PopoverContent` de shadcn por defecto — verificar que no se haya
   quitado).
3. **z-index/stacking**: el popover debe ir por encima de la card
   (`z-50`), no al mismo nivel.

**Corrección**: portal + anclaje explícito, y dejar que Radix colisione
contra el viewport, no contra la card:

```tsx
<PopoverContent
  className="w-auto p-0 z-50"
  side="bottom" align="start" sideOffset={4}
  collisionPadding={8}
/>
```

Si el formulario es largo, el calendario debe abrir hacia arriba **sin
tapar su propio trigger** — ese es el comportamiento nativo correcto de
Radix; el bug es de configuración, no del componente.

**Verificación**: E2E/visual — abrir el calendario de compra con el
formulario scrolleado a distintas posiciones; el popover nunca cubre su
label ni el input que lo dispara.

---

## BUG-004 · El nombre del mes es desproporcionado en los calendarios
**Severidad: MENOR (estético)** — capturas 2 y 5.

**Comportamiento actual**: "julio 2026" se renderiza en ~16px/600
(equivalente a `text-section`), mientras las celdas de día usan ~13px. El
encabezado compite visualmente con los datos, que son lo que el usuario
viene a leer.

**Recomendación (respuesta a la consulta de diseño)**: **sí, reducirlo**.

| Elemento | Actual | Propuesto | Token del sistema |
|---|---|---|---|
| Caption (mes año) | ~16px / 600 | **14px / 600** | `text-support` |
| Nombres de día (lu, ma…) | ~13px / 400 | **12px / 500** en `text-muted-foreground` | `text-caption` |
| Números de día | ~13px | **13-14px / 400**, `tabular-nums` | `text-support` + `.num` |
| Día de hoy | color primario | mantener, + `font-semibold` | — |
| Celda | — | **36×36px** (desktop) / **40×40px** (mobile, cerca del mínimo táctil) | — |

Justificación: 16px es `text-section` en el design system, reservado para
títulos de card — un popover no es una card. Con 14px/600 el mes sigue
siendo el elemento jerárquicamente superior del popover sin gritar, y la
grilla de números recupera el protagonismo. `tabular-nums` alinea las
columnas de días (regla transversal del sistema para toda cifra).

**Extra recomendado**: `captionLayout="dropdown"` con `startMonth`/
`endMonth` — para una vaca de 2019, navegar con la flecha `‹` son ~80
clics; con dropdown de mes/año son 2. Aplica a Fecha de nacimiento y
Fecha de compra.

**Corrección** (classNames del `Calendar`, tokens del sistema):

```tsx
classNames={{
  caption_label: "text-support font-semibold",
  nav_button: "size-7",
  head_cell: "text-caption font-medium text-muted-foreground w-9",
  cell: "size-9",
  day: "size-9 text-support num rounded-md",
  day_today: "text-primary font-semibold",
  day_selected: "bg-primary text-primary-foreground",
  day_disabled: "text-muted-foreground opacity-40",
}}
```

**Verificación**: visual en los 10 temas del catálogo (los colores salen
de tokens; ningún hex literal en el calendario).

---

## Regresión general (aplica a los 4)

1. Los tres controles corregidos (`SelectConCreacion`, `Combobox`,
   `DatePicker`) viven en `packages/ui` — la corrección se hace UNA vez
   ahí, no por campo del formulario (IA-003).
2. Ningún hex literal ni variante `dark:` en la corrección: solo tokens
   (T-004 / regla del design system).
3. Los cuatro bugs entran a la suite E2E del formulario (criterio #5 de
   `crud_animales.md` §9) para que no reaparezcan.
4. Verificar los mismos controles en el formulario mobile (pantalla 21):
   en mobile el `SelectConCreacion` puede ser Drawer en vez de Popover,
   pero el contrato de selección es idéntico.
