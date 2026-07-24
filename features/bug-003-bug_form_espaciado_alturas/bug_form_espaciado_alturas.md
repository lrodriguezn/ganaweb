# BUG/AJUSTE — Formulario Nuevo animal: espaciado, alturas y tokens

**ID sugerido**: BUG-FORM-003
**Módulo**: Nuevo/Editar Animal · pantalla 20 (desktop)
**Severidad**: 5 menores (layout y espaciado)
**Referencia**: `crud_animales.md` v1.6 §3.5 y reglas CA-UI-016/018

> La estructura entregada es correcta (secciones presentes, ubicación
> colapsable con resumen, panel único de Origen). Estos son ajustes de
> refinamiento sobre esa base — no requieren rehacer el formulario.

---

## 2 · Encabezados de sección pegados al bloque anterior

**Observado**: "CARACTERÍSTICAS" y "ORIGEN" quedan a ~6-8px del campo de
arriba y a distancia similar del suyo: se leen como pie del bloque
anterior, no como título del siguiente.

**Corrección**: aplicar la regla de proximidad — **24px arriba, 8px
abajo** del encabezado (`mt-6 mb-2`, o `space-y-6` entre secciones con el
encabezado pegado a su contenido). La distancia debe dejar inequívoco a
qué grupo pertenece el título.

## 3 · Alturas de control excesivas

**Observado**: inputs y selects de ~52px de alto.

**Corrección**: **38-40px en desktop** (el estándar del design system;
48px se reserva para mobile, donde el touch lo justifica). Con esto entran
~4 campos más por pantalla sin scroll. Labels con `mb-1` (4px), no más.

## 4 · Anchos inconsistentes: los controles no llenan su columna

**Observado**: en la fila `1fr 1fr 1.2fr`, Sexo y Raza miden ~260px pero
Fecha de nacimiento ~180px, siendo la columna más ancha. Igual en
Color/Calidad, que no llenan sus celdas.

**Causa probable**: el DatePicker (y algún select) no tiene `w-full` y se
encoge a su contenido dentro del grid.

**Corrección**: **todo control de formulario lleva `w-full`**; el ancho lo
decide la grilla, nunca el contenido del control. Verificar en Input,
Select, Combobox, DatePicker y Textarea de `packages/ui` — corregir ahí
una vez (IA-003), no campo por campo.

## 5 · Jerarquía plana: labels compiten con encabezados de sección

**Observado**: los labels de campo ("Código *", "Sexo *") están en ~14px
semibold, peso casi idéntico al de los encabezados de sección.

**Corrección**:
- Encabezado de sección: `text-caption font-semibold uppercase
  tracking-wide text-muted-foreground`.
- Label de campo: `text-support font-normal text-muted-foreground` (el
  valor dentro del control es lo que va en `text-foreground`).
- El asterisco de obligatorio en `text-danger`, no en negrita del label.

## 6 · Aire muerto en el panel de Origen

**Observado**: espacio vacío notable bajo Madre/Padre dentro del panel.

**Causa**: el `min-height` de CA-UI-023 está sobredimensionado.

**Corrección**: el `min-height` debe igualar **exactamente** la altura del
modo más alto ("Comprado": 2 filas de campos), calculado con las alturas
nuevas del punto 3. Ni más (aire muerto) ni menos (salto al conmutar).

---

## Criterios de cierre

1. Encabezados de sección con 24px arriba / 8px abajo.
2. Controles a 38-40px en desktop, 48px en mobile.
3. Todos los controles llenan su columna (`w-full`); comparar visualmente
   los anchos de Sexo, Raza y Fecha: deben respetar `1fr 1fr 1.2fr`.
4. Jerarquía tipográfica: encabezado ≠ label ≠ valor.
5. Conmutar Origen no produce salto de layout ni deja aire muerto.
6. Render correcto en los 10 temas (CA-UI-018).
