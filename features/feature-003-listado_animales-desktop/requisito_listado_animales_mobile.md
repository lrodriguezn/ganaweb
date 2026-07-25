# GanaWeb — Requisito Funcional: Listado de Animales Mobile (RF-ANIM-LIST-M v1.0)

> Complementa a `requisito_listado_animales.md` (desktop). Cubre la
> pantalla 03 (Animales · Mobile). Reglas propias: **LM-xxx**.
> Referencias: `schema_v3_corregido.sql` (columnas), `crud_animales.md`
> (CA-xxx), pantalla 03/04 del `.op`.

---

## 1. Decisión de fondo: cards, no tabla

En mobile el listado se mantiene como **cards apiladas verticalmente**, NO
como la tabla densa del desktop. Justificación: en pantalla angosta una
tabla obliga a scroll horizontal (se pierde la columna de identificación al
desplazarse), mientras las cards fluyen en vertical —el gesto natural del
pulgar—. Desktop escanea muchos animales a lo ancho; mobile recorre a lo
largo y profundiza con un toque. **Es correcto que ambos diseños diverjan.**

La tabla de 30 columnas, filtros por columna, ordenamiento y exportación
del desktop **no se replican en mobile**: ese es trabajo de escritorio. El
mobile prioriza identificar y decidir rápido en el corral.

## 2. Anatomía de la card (enriquecida)

Jerarquía de arriba hacia abajo (LM-001):

1. **Identidad** — `codigo` en negrita + `nombre` (si existe; si no, solo
   código, sin guión de relleno).
2. **Naturaleza** — línea fina: `sexo` (texto/ícono ♀♂) · `raza`.
3. **Estado** (badges — lo que se escanea primero):
   - Categoría reproductiva (hembras) con su color de dominio; en
     machos/pajuelas con `no_aplica` NO se muestra, o "Reproductor" si
     `es_de_monta=1`.
   - Salud: verde (Sano/a) o rojo (Enfermo/a) — **siempre** ese par de
     colores (invariante del catálogo).
4. **Procedencia** (pie, separado por línea sutil) — los datos que el
   usuario pidió priorizar:
   - **Propietario** (`propietario_id` → nombre).
   - **Madre**: `codigo_madre` · nombre resuelto (`madre_id`→`nombre`).
     Si no hay madre registrada: "Madre: sin registrar" en gris.

- **LM-002** — Todas las FK/key en texto legible, nunca id/número
  (CA-UI-001). Campos vacíos: el nombre se omite; la madre ausente se
  indica explícitamente ("sin registrar"), no se deja en blanco.
- **LM-003** — Toda la card es tappable → abre la ficha (pantalla 04). El
  chevron › es solo indicador visual.
- **LM-004** — El padre NO va en la card (tres relaciones saturarían); vive
  en la ficha. Reevaluar si producto lo pide.

## 3. Filtro rápido

- **LM-005** — Fila de **chips horizontales scrolleables** sobre la lista,
  tappables con el pulgar (sin teclado): **Todas · Preñadas · Enfermas ·
  Propietario ▾**.
  - *Todas*: sin filtro (default, activo).
  - *Preñadas*: `categoria_reproductiva = prenada`.
  - *Enfermas*: `salud_animal_key = 1`.
  - *Propietario ▾*: abre un selector (drawer/sheet) con los propietarios
    de la finca; al elegir uno, filtra por `propietario_id`.
- **LM-006** — Un chip activo a la vez para los predefinidos (Todas/
  Preñadas/Enfermas son excluyentes); "Propietario" puede combinarse con
  ellos (AND). El chip activo usa `bg-primary`; los inactivos, borde.
- **LM-007** — El **buscador** (código/nombre/arete/RFID) se mantiene
  arriba y coexiste con el filtro rápido (AND). Buscador = "encuentra
  este"; chips = "muéstrame este grupo".
- **LM-008** — Contador discreto del resultado ("18 animales") y estado sin
  resultados ("Ningún animal coincide · Quitar filtro").

## 4. Carga y rendimiento

- **LM-009** — Lista **paginada con scroll infinito** (a diferencia del
  desktop, que usa paginación numerada): en mobile el scroll continuo es el
  patrón natural. Se cargan páginas de 20–30 al llegar al final; indicador
  de carga al pie. El filtro/búsqueda reinicia la paginación.
- **LM-010** — La consulta trae solo los campos que la card muestra
  (código, nombre, sexo, raza, categoría, salud, propietario, madre) — no
  las 30 columnas del desktop. Los joins de texto se resuelven en servidor.
- **LM-011** — Funciona offline desde la réplica local (los filtros rápidos
  y el buscador operan sobre los datos sincronizados).

## 5. Lo que NO cambia

Header con finca + sync, botón "+" (nuevo animal), bottom nav. El FAB/botón
"+" respeta el permiso `animales:crear` (se oculta sin él).

## 6. Criterios de aceptación

1. La card muestra identidad, sexo·raza, badges de estado y el pie con
   propietario + madre (código·nombre); nombre y madre vacíos se manejan
   según LM-002.
2. Categoría y salud son las reales del animal (depende de BUG-DATA-001);
   machos no muestran "Novilla".
3. Filtro rápido Todas/Preñadas/Enfermas/Propietario funciona y combina con
   el buscador (LM-005..007).
4. Scroll infinito carga más al llegar al final; filtro reinicia la lista
   (LM-009).
5. Toda la card abre la ficha; el "+" respeta permiso.
6. Render correcto en los 10 temas; salud siempre verde/rojo.

## 7. Relación con otros documentos

- **BUG-DATA-001** — este requisito asume que la categoría/salud se leen
  correctamente; ese bug debe corregirse en paralelo o la card seguirá
  mostrando "Novilla/Sana" fijo.
- **requisito_listado_animales.md** — el desktop es la herramienta de
  análisis (tabla, filtros por columna, export); este mobile es la de
  campo. No se solapan; se complementan.
