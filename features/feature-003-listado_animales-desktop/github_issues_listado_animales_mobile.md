# Issues de GitHub — Listado de Animales Mobile (v1.1)

> **Issues creados en GitHub** (#153–#158; ver números en cada sección). Fuente
> de verdad: `requisito_listado_animales_mobile.md` **v1.1** (reglas LM-xxx +
> LM-RBAC-xx).
>
> **Estructura**: Épica + sub-issues (decisión del maintainer). El borrador v1.0
> era un solo issue de feature porque la spec v1.0 tenía 11 reglas en una sola
> superficie. La spec **v1.1** agrega contrato HTTP dedicado, RBAC, estados de
> interfaz y accesibilidad, lo que separa el trabajo en capas (1 backend + 3
> frentes de frontend) que pueden tomarse en paralelo — misma forma que la épica
> desktop. El issue referencia la spec por regla (LM-xxx), no la copia.

---

═══════════════════════════════════════════════════════════════════
## ÉPICA
═══════════════════════════════════════════════════════════════════

**Issue**: [#154](https://github.com/lrodriguezn/ganaweb/issues/154)

**Título**: `[Épica] Listado de Animales Mobile — card enriquecida + filtro rápido + scroll infinito (v1.1)`

**Dueño**: Product/Tech Lead

**Labels**: `enhancement`, `type:feature`, `status:needs-review`, `priority:medium`, `area:web`

```markdown
## Objetivo

Entregar el listado mobile como herramienta de campo: cards apiladas con
identidad, naturaleza, estado y procedencia (propietario + madre), un filtro
rápido de chips tappables, buscador y scroll infinito — todo sobre un endpoint
dedicado ligero (no la tabla de 30 columnas del desktop).

## Especificación (fuente de verdad)

📄 `features/feature-003-listado_animales-desktop/requisito_listado_animales_mobile.md`
(RF-ANIM-LIST-M v1.1). No duplicar la spec aquí — referirla por regla (LM-xxx).
Ante contradicción: reportar, no resolver en el issue.

## ⚠️ Bloqueado por

- #153 **BUG-DATA-001** — el listado muestra "Novilla/Sana" fijo (incluso en
  machos). La card enriquecida asume que categoría y salud se leen correctamente.
  El sub-issue 1 ya lee valores reales en el nuevo endpoint, pero el bug debe
  cerrarse para corregir el mapper legado y el género del badge de salud.

## Sub-issues y orden

- [ ] #155 Contrato mobile, DTO, consulta e índices (backend) — bloquea 2, 3 y 4
- [ ] #156 Card enriquecida, badges, RBAC visual y accesibilidad — depende de 1
- [ ] #157 Filtro rápido, buscador y selector de propietario — depende de 1 y 2
- [ ] #158 Scroll infinito y estados de interfaz — depende de 1 y 2

## Lo que NO cambia

Header (finca + sync), botón "+" (respeta `animales:crear`), bottom nav.
Fuera de alcance: filtros por columna, orden, exportación (son del desktop),
selección múltiple, y offline LM-011 (dependencia futura, gate `no-sqlite`).

## Cierre

- [ ] Se cumplen los 9 criterios de aceptación de RF-ANIM-LIST-M v1.1.
- [ ] QA valida los 10 temas del sistema en implementación; el `.op` no se usa
      como evidencia exhaustiva de diez renders.
```

---

═══════════════════════════════════════════════════════════════════
## SUB-ISSUE 1 — Contrato mobile, DTO, consulta e índices
═══════════════════════════════════════════════════════════════════

**Issue**: [#155](https://github.com/lrodriguezn/ganaweb/issues/155)

**Título**: `Listado mobile: implementar contrato server-side dedicado v1.1`

**Dueño**: Backend/API; Backend/Database para índices

**Labels**: `enhancement`, `type:feature`, `status:needs-review`, `priority:medium`, `area:web`

```markdown
## Alcance

Implementar §5 (LM-020/021/023), §4.1 (LM-012), LM-010 y LM-050 del requisito.
Este issue BLOQUEA el resto: define el endpoint y el DTO que consumen la card,
los filtros y el scroll infinito.

## Tareas Backend/API

- [ ] `GET /api/fincas/{fincaId}/animales/mobile` con `page`, `pageSize`
      (∈ {20,25,30}, default 25), `q`, `f.categoriaReproductivaKey`,
      `f.saludKey`, `f.propietarioId`.
- [ ] Devolver `AnimalMobileListResponseDto`: `data`, `page`, `pageSize`,
      `total`, `totalSinFiltro`, `hayMas`.
- [ ] `AnimalMobileRowDto` con SOLO los campos de la card (LM-010): `id`,
      `codigo`, `nombre`, `sexo`, `raza`, `categoriaReproductiva`, `salud`,
      `esDeMonta`, `propietario`, `madre`. Nada de las 30 columnas desktop.
- [ ] `categoriaReproductiva`: LEER el valor real del animal y devolver
      `null` cuando sea `no_aplica`; en otro caso `{key,label}`. NUNCA
      hardcodear (hardcodear es la raíz de BUG-DATA-001).
- [ ] `salud`: leer `salud_animal_key` real y traducir vía `config_key_values`
      `opcion='salud_animal'` (CA-UI-001); sin default que enmascare el valor.
- [ ] `sexo`: resolver `sexo_key` vía `config_key_values` `opcion='sexo'`.
      OJO a la trampa: `config_key_values.value` guarda el número y
      `.key` guarda el texto (0=Macho, 1=Hembra, 2=Pajuela).
- [ ] `madre`: resolver `madre_id`→`codigo`/`nombre`. Si solo hay
      `codigo_madre` (externa/IA), `nombre=null`. Si no hay `codigo_madre`
      ni `madre_id`, `madre=null`.
- [ ] `propietario`: resolver `propietario_id`→`nombre`; `null` si ausente.
- [ ] `raza`: resolver `raza_id`→`config_razas.nombre`; `null` si ausente.
- [ ] Aplicar SIEMPRE el filtro base (LM-012): `finca_id` activo AND
      `activo=1` AND `estado_animal_key=0`. No viaja en la URL.
- [ ] Filtros por key/id, NUNCA por label. `q` es `contains` que ignora
      mayúsculas/acentos sobre `codigo`/`nombre`/`codigo_arete`/`codigo_rfid`.
- [ ] RBAC: requerir `animales:ver`; `fincaId` ajena o sin membership → 403
      `ApiErrorDto` (LM-RBAC-01/02). Revalidar en servidor.
- [ ] Validar `page`/`pageSize`/`q`/`f.*`; responder 400 `ApiErrorDto` con
      `campo` accionable (LM-023).
- [ ] Joins de texto resueltos en servidor; evitar N+1.

## Tareas Backend/Database

- [ ] Verificar el índice existente `idx_animales_finca_activo (finca_id,
      activo)`. Si el plan de la consulta con filtro base + `estado_animal_key`
      lo requiere, proponer un índice compuesto y medir el plan real antes de
      cerrar rendimiento (LM-050, como LA-102).

## Criterios

- [ ] Un request con filtros de texto y catálogo devuelve el DTO exacto con
      nulabilidad correcta.
- [ ] `categoriaReproductiva`/`salud` son los reales del animal
      (MT-130 macho NO devuelve `novilla`).
- [ ] Los filtros viajan por key/id, nunca por label; inválidos → 400 con
      `campo` y `motivo`.
- [ ] Finca ajena produce 403 y no filtra datos de otra finca.
- [ ] La suite prueba la nulabilidad de cada campo del DTO mobile.
- [ ] Evidencia p95 < 400 ms adjunta al PR de implementación.
```

---

═══════════════════════════════════════════════════════════════════
## SUB-ISSUE 2 — Card enriquecida, badges, RBAC visual y accesibilidad
═══════════════════════════════════════════════════════════════════

**Issue**: [#156](https://github.com/lrodriguezn/ganaweb/issues/156)

**Título**: `Listado mobile: card enriquecida con procedencia, badges y a11y`

**Dueño**: Frontend; QA para accesibilidad y temas

**Labels**: `enhancement`, `type:feature`, `status:needs-review`, `priority:medium`, `area:ui`

```markdown
## Alcance

Implementar §3 (LM-001..004, matriz de datos §3.3, LM-060) y LM-RBAC-03 del
requisito. Depende del contrato (sub-issue 1).

## Tareas Frontend

- [ ] Jerarquía: identidad (código + nombre) → sexo·raza → badges de estado →
      pie con procedencia (LM-001).
- [ ] Pie con **Propietario** (`propietario_id`→nombre) y **Madre**
      (`codigo`·`nombre`), separado por línea sutil. El pie REEMPLAZA al
      `potrero·lote` de la card actual.
- [ ] FK/key en texto legible, nunca id/número (LM-002 / CA-UI-001).
- [ ] Manejo de vacíos: nombre ausente → solo código (sin guión); madre
      ausente → "Madre: sin registrar" en gris; propietario ausente se omite.
- [ ] Badges de categoría: color de dominio por tokens del tema; en
      machos/pajuelas `no_aplica` NO se muestra badge, o "Reproductor" si
      `esDeMonta=true` (LM-060).
- [ ] Badge de salud SIEMPRE verde/rojo con tokens `--exito-*`/`--peligro-*`;
      el texto concuerda en género con el sexo (Sano/Sana, Enfermo/Enferma)
      (LM-060). Corregir el femenino fijo actual de `estado-badge.tsx`.
- [ ] Toda la card es tappable → abre la ficha (pantalla 04); el chevron es
      decorativo con `aria-hidden` (LM-003).
- [ ] El padre NO va en la card (LM-004).
- [ ] Ocultar el botón "+" cuando falte `animales:crear` (LM-RBAC-03).

## Tareas QA

- [ ] Verificar targets táctiles ≥44×44 px, card navegable por teclado,
      semántica de enlace a la ficha, badges con label para lector de pantalla
      (LM-040).
- [ ] Verificar contraste y comportamiento en los 10 temas reales del sistema;
      salud siempre verde/rojo.

## Criterios

- [ ] La card muestra identidad, sexo·raza, badges y el pie con propietario +
      madre; vacíos manejados según LM-002. El pie ya no muestra potrero·lote.
- [ ] Machos no muestran "Novilla"; el texto de salud concuerda en género.
- [ ] Toda la card abre la ficha; el "+" respeta `animales:crear`.
- [ ] Tests automatizados y revisión manual cubren a11y; el `.op` solo
      documenta intención.
```

---

═══════════════════════════════════════════════════════════════════
## SUB-ISSUE 3 — Filtro rápido, buscador y selector de propietario
═══════════════════════════════════════════════════════════════════

**Issue**: [#157](https://github.com/lrodriguezn/ganaweb/issues/157)

**Título**: `Listado mobile: chips de filtro rápido, buscador y selector de propietario`

**Dueño**: Frontend

**Labels**: `enhancement`, `type:feature`, `status:needs-review`, `priority:medium`, `area:ui`

```markdown
## Alcance

Implementar §4 (LM-005..008, LM-014, LM-015) del requisito. Depende de 1 y 2.

## Tareas

- [ ] Chips horizontales scrolleables sobre la lista: **Todas · Preñadas ·
      Enfermas · Propietario ▾**, tappables con el pulgar (LM-005).
- [ ] *Preñadas* → `f.categoriaReproductivaKey=in:prenada`; *Enfermas* →
      `f.saludKey=in:1`.
- [ ] Predefinidos excluyentes (un chip activo a la vez); "Propietario" puede
      combinarse con ellos (AND) (LM-006).
- [ ] Chip activo usa `bg-primary`; los inactivos, borde.
- [ ] Selector de propietario (drawer/sheet): lista los propietarios de la
      finca activa con opción "Todos los propietarios"; si la finca no tiene
      propietarios, el chip se muestra deshabilitado con hint (LM-015). Mostrar
      el nombre, nunca el id (CA-UI-001).
- [ ] Buscador arriba sobre `codigo`/`nombre`/`codigo_arete`/`codigo_rfid`,
      `contains` que ignora mayúsculas/acentos, debounce 300 ms; coexiste con
      los chips (AND) (LM-007, LM-014).
- [ ] Contador discreto del resultado ("18 animales") con `aria-live="polite"`;
      estado sin resultados "Ningún animal coincide · Quitar filtro" (LM-008).
- [ ] Cambiar filtro o búsqueda reinicia la paginación a `page=1` (LM-009).

## Criterios

- [ ] Filtro rápido Todas/Preñadas/Enfermas/Propietario funciona y combina con
      el buscador.
- [ ] Los filtros viajan al endpoint por key/id, nunca por label.
- [ ] Cambiar filtro o búsqueda vuelve a página 1.
- [ ] Contador y estado sin-results se anuncian correctamente.
```

---

═══════════════════════════════════════════════════════════════════
## SUB-ISSUE 4 — Scroll infinito y estados de interfaz
═══════════════════════════════════════════════════════════════════

**Issue**: [#158](https://github.com/lrodriguezn/ganaweb/issues/158)

**Título**: `Listado mobile: scroll infinito y estados de interfaz`

**Dueño**: Frontend

**Labels**: `enhancement`, `type:feature`, `status:needs-review`, `priority:medium`, `area:ui`

```markdown
## Alcance

Implementar §6 (LM-030) y §7 (LM-009) del requisito. Depende de 1 y 2.

## Tareas

- [ ] Scroll infinito: páginas de 20–30 al llegar al final, guiado por
      `hayMas`; indicador de carga al pie mientras llega la siguiente página
      (LM-009).
- [ ] Estados distinguibles (LM-030): loading inicial (skeleton de cards),
      cargando más, finca vacía (`totalSinFiltro=0` con empty state y "+" si
      hay permiso), sin resultados, 403, y error/timeout con `Reintentar`.
- [ ] Ante 400: sanear/remover el filtro ofensivo, volver a `page=1`, mostrar
      toast y conservar la última lista válida (LM-023).
- [ ] Ante 403: estado "No tienes acceso a esta finca", sin datos previos, con
      navegación segura de regreso.
- [ ] Ante 500/timeout: estado de error con `Reintentar`; nunca una lista
      vacía silenciosa.
- [ ] Preparar el punto de integración offline (LM-011) como nota de diseño;
      hoy está gateado por `no-sqlite` y NO se implementa.

## Criterios

- [ ] Scroll infinito carga más al llegar al final; filtro o búsqueda reinicia
      la lista a `page=1`.
- [ ] Los seis estados se distinguen; no se confunde 403 con lista vacía.
- [ ] 400/403/500 se comportan según LM-023.
```

---

═══════════════════════════════════════════════════════════════════
## ISSUE DE BUG (dependencia bloqueante)
═══════════════════════════════════════════════════════════════════

**Issue**: [#153](https://github.com/lrodriguezn/ganaweb/issues/153)

**Título**: `[Bug] Listado mobile muestra siempre "Novilla / Sana" (incluso en machos)`

**Labels**: `bug`, `type:bug`, `status:needs-review`, `priority:high`, `area:web`

```markdown
## Descripción

En el listado de animales (mobile actual), todas las cards muestran categoría
"Novilla" y salud "Sana" sin importar el animal — incluso en machos
(MT-130 Trueno), donde "Novilla" es imposible. Los datos del seed sí tienen
variedad, así que es un problema de **lectura o renderizado**, no de datos de
origen.

## Causa raíz (identificada)

El mapper server-side `toAnimalListItem` en
`apps/web/src/server/animal-actions.server.ts` hardcodea:

    salud: "sano",
    categoriaReproductiva: animal.sexoKey === 1 ? "novilla" : "no_aplica",

El repo Drizzle sí lee bien las columnas, y el read-model desktop
(`DrizzleAnimalListadoReadModel`) lee los valores reales — el desktop NO está
afectado. Solo la rama mobile legado descarta los valores y hardcodea.

## Especificación

📄 `features/bug-004-bug_listado_categoria_salud/bug_listado_categoria_salud.md`
(BUG-DATA-001).

## Corrección

Leer `categoria_reproductiva` y `salud_animal_key` reales del animal y
traducirlos a texto con el mapeo del sistema (`config_key_values`), nunca un
default que enmascare el valor (CA-UI-001). Para machos/pajuelas `no_aplica`,
ocultar el badge de categoría; si `es_de_monta=1`, mostrar "Reproductor".
Corregir también el género del texto de salud en `estado-badge.tsx` (hoy
etiqueta en femenino fijo): debe concordar con el sexo del animal.

## Criterios de aceptación

- [ ] MT-130 (macho) NO muestra "Novilla" (muestra "Reproductor" o ninguno).
- [ ] MT-124 (Paloma) muestra "Enferma", no "Sana".
- [ ] ≥3 categorías distintas visibles entre los 13 animales de La Esperanza.
- [ ] El texto de salud concuerda en género con el sexo.

## Bloquea a

- #154 Épica Listado Animales Mobile (la card enriquecida depende de que estos
  campos se lean bien).
```

---

═══════════════════════════════════════════════════════════════════
## Estado en GitHub (issues ya creados)
═══════════════════════════════════════════════════════════════════

| # | Issue | Rol |
|---|---|---|
| #153 | [Bug] Listado mobile muestra siempre "Novilla / Sana" | BUG-DATA-001, bloqueante |
| #154 | [Épica] Listado de Animales Mobile v1.1 | épica, bloqueada por #153 |
| #155 | Contrato mobile, DTO, consulta e índices | backend, bloquea #156–#158 |
| #156 | Card enriquecida, badges, RBAC visual y a11y | depende de #155 |
| #157 | Chips filtro rápido, buscador, selector propietario | depende de #155, #156 |
| #158 | Scroll infinito y estados de interfaz | depende de #155, #156 |

Todos nacen con `status:needs-review`. Un mantenedor debe añadir
`status:approved` antes de que cualquier PR vinculado pase el gate de CI
(ver `CONTRIBUTING.md`). Los labels de arriba son los reales aplicados; los del
borrador original (`epic`, `módulo:animales`, `mobile`, `backend`, `a11y`,
`prioridad:alta`, etc.) no existen en el repo y se mapearon a los existentes.

### Por qué épica + sub-issues (y no un solo feature como el borrador v1.0)

- El borrador v1.0 asumía 11 reglas sobre una sola superficie (la card + su
  filtro) → un feature con checklist bastaba.
- La spec **v1.1** agrega contrato HTTP dedicado, RBAC, estados de interfaz y
  accesibilidad. Eso separa el trabajo en capas: un backend (sub-issue 1) que
  bloquea el resto, y tres frentes de frontend (card, filtros, scroll/estados)
  que pueden tomarse en paralelo sin pisarse — misma forma que la épica desktop.
- Regla práctica: sub-issues cuando distintas personas pueden tomar partes en
  paralelo. Aquí el backend es una dependencia clara y el frontend se divide en
  superficies independientes → épica.

### El vínculo bug ↔ épica importa

Marcar el bug como "bloquea a" la épica evita que alguien implemente la card
enriquecida, la vea mostrando "Novilla" en todos, y crea que su código está mal.
El sub-issue 1 ya lee valores reales en el nuevo endpoint, pero el bug debe
cerrarse para corregir el mapper legado y el género del badge de salud.