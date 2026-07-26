# Issues de GitHub — Listado de Animales Mobile

> Contenido listo para copiar/pegar en GitHub. El requisito mobile es más
> acotado que el desktop (11 reglas LM vs 23 LA), así que NO necesita una
> épica con sub-issues: basta **1 issue de feature** con sus tareas + el
> enlace al **bug de datos** que lo bloquea (ya documentado como
> BUG-DATA-001). El requisito completo
> (`docs/requisito_listado_animales_mobile.md`) es la fuente de verdad; el
> issue lo referencia por regla (LM-xxx), no lo copia.
>
> Convención asumida: los `.md` viven en `docs/` del repo. Ajusta si difiere.

---

═══════════════════════════════════════════════════════════════════
## ISSUE DE FEATURE
═══════════════════════════════════════════════════════════════════

**Título**: `[Feature] Listado de Animales Mobile — card enriquecida + filtro rápido`

**Labels**: `feature`, `frontend`, `mobile`, `módulo:animales`

**Cuerpo**:

```markdown
## Contexto

El listado mobile actual (cards con código, nombre, categoría, salud) es
correcto en su patrón pero deja espacio sin usar: el ganadero no ve de un
vistazo la procedencia del animal (propietario, madre) que necesita en el
corral.

## Objetivo

Enriquecer la card del listado mobile con datos de identificación y
procedencia, y añadir un filtro rápido de chips tappables — manteniendo el
diseño de cards (NO tabla; ver justificación en la spec §1).

## Especificación (fuente de verdad)

📄 `docs/requisito_listado_animales_mobile.md` (RF-ANIM-LIST-M v1.0,
reglas LM-001..011)

No dupliquen la spec aquí — refiéranla por regla. Ante contradicción:
reportar (IA-001), no resolver.

## ⚠️ Bloqueado por

- #_ **BUG-DATA-001** — el listado muestra "Novilla/Sana" fijo (incluso en
  machos). Este feature ASUME que categoría y salud se leen correctamente;
  si no se corrige antes o en paralelo, la card enriquecida seguirá
  mostrando datos falsos. Ver `docs/bug_listado_categoria_salud.md`.

## Tareas

### Card enriquecida (LM-001..004)
- [ ] Jerarquía: identidad (código + nombre) → sexo·raza → badges de estado
      → pie con procedencia.
- [ ] Pie con **Propietario** (`propietario_id`→nombre) y **Madre**
      (`codigo_madre` · `madre_id`→nombre), separado por línea sutil.
- [ ] FK/key en texto legible, nunca id/número (LM-002 / CA-UI-001).
- [ ] Manejo de vacíos: nombre ausente → solo código (sin guión); madre
      ausente → "Madre: sin registrar" en gris (no en blanco).
- [ ] Machos/pajuelas con `no_aplica`: sin badge de categoría, o
      "Reproductor" si `es_de_monta=1`. Salud siempre verde/rojo.
- [ ] Toda la card es tappable → abre la ficha (pantalla 04); el chevron es
      solo indicador (LM-003).
- [ ] El padre NO va en la card (LM-004).

### Filtro rápido (LM-005..008)
- [ ] Chips horizontales scrolleables: **Todas · Preñadas · Enfermas ·
      Propietario ▾**.
- [ ] Predefinidos excluyentes (un chip activo); "Propietario" abre
      selector (drawer) y combina con ellos (AND) — LM-006.
- [ ] Coexiste con el buscador global (código/nombre/arete/RFID), AND
      (LM-007).
- [ ] Contador del resultado + estado sin resultados (LM-008).

### Carga (LM-009..011)
- [ ] Scroll infinito: páginas de 20–30 al llegar al final; indicador de
      carga; filtro/búsqueda reinicia la paginación (LM-009).
- [ ] La consulta trae solo los campos que la card usa, no las 30 columnas
      del desktop (LM-010).
- [ ] Funciona offline desde la réplica local (LM-011).

## Lo que NO cambia (LM §5)

Header (finca + sync), botón "+" (respeta permiso `animales:crear`),
bottom nav.

## Criterios de aceptación

- [ ] La card muestra identidad, sexo·raza, badges y pie con propietario +
      madre; vacíos manejados según LM-002.
- [ ] Categoría/salud reales (depende de BUG-DATA-001); machos sin
      "Novilla".
- [ ] Filtro rápido funciona y combina con el buscador.
- [ ] Scroll infinito carga más al final; filtro reinicia la lista.
- [ ] Toda la card abre la ficha; el "+" respeta permiso.
- [ ] Render correcto en los 10 temas; salud siempre verde/rojo.

## Referencia visual

`ganaweb-listado-animales.op` — página Cielo, pantalla "Listado Animales ·
Mobile" (muestra la card enriquecida y el filtro rápido ya con datos
correctos por sexo).

## Fuera de alcance

Filtros por columna, ordenamiento y exportación son de la versión
**desktop** (otra épica). Mobile es la herramienta de campo, no de
análisis.
```

---

═══════════════════════════════════════════════════════════════════
## ISSUE DE BUG (dependencia — si aún no está creado)
═══════════════════════════════════════════════════════════════════

**Título**: `[Bug] Listado muestra siempre "Novilla / Sana" (incluso en machos)`

**Labels**: `bug`, `frontend`, `data`, `módulo:animales`, `prioridad:alta`

**Cuerpo**:

```markdown
## Descripción

En el listado de animales, todas las cards muestran categoría "Novilla" y
salud "Sana" sin importar el animal — incluso en machos (MT-130 Trueno),
donde "Novilla" es imposible.

Los datos del seed sí tienen variedad, así que es un problema de **lectura
o renderizado**, no de datos de origen.

## Especificación

📄 `docs/bug_listado_categoria_salud.md` (BUG-DATA-001) — causas probables,
cómo aislar y criterios de verificación.

## Resumen de causas probables

1. Valor hardcodeado/placeholder en la card ("Novilla"/"Sana" fijos).
2. La query no trae `categoria_reproductiva` / `salud_animal_key` → cae a
   default.
3. Traducción key→texto con default "Sana" que captura todo.

## Criterios de aceptación

- [ ] MT-130 (macho) NO muestra "Novilla" (muestra "Reproductor" o ninguno).
- [ ] MT-124 (Paloma) muestra "Enferma", no "Sana".
- [ ] ≥3 categorías distintas visibles entre los 13 de La Esperanza.
- [ ] Mismo comportamiento correcto en el listado desktop (18).

## Bloquea a

- #_ Feature Listado Animales Mobile (la card enriquecida depende de que
  estos campos se lean bien).
```

---

## Cómo usar esto en GitHub

1. Crea primero el **issue de bug** (BUG-DATA-001); anota su número.
2. Crea el **issue de feature**; reemplaza el `#_` de "Bloqueado por" con
   el número del bug.
3. En el bug, reemplaza el `#_` de "Bloquea a" con el número del feature
   (enlace recíproco — GitHub los conecta).
4. Sube `requisito_listado_animales_mobile.md` y
   `bug_listado_categoria_salud.md` a `docs/`.
5. Opcional: mismo Milestone que el desktop ("Módulo Animales v1.0") para
   ver desktop + mobile + bug juntos en el tablero.

### Por qué feature simple y no épica (a diferencia del desktop)

- El desktop tenía 23 reglas y 5 capas independientes (tabla, filtros,
  orden, paginación, export) → épica con sub-issues.
- El mobile son 11 reglas de una sola superficie (la card + su filtro) →
  cabe en un feature con checklist. Partirlo en sub-issues sería
  burocracia sin beneficio.
- La regla práctica: sub-issues cuando distintas personas pueden tomar
  partes en paralelo sin pisarse. Aquí es un flujo de trabajo continuo →
  un issue.

### El vínculo bug ↔ feature importa

Marcar el bug como "bloquea a" el feature evita que alguien implemente la
card enriquecida, la vea mostrando "Novilla" en todos, y crea que su código
está mal. El orden correcto es: arreglar el dato, luego enriquecer la card.
```
