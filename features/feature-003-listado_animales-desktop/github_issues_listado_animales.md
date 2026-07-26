# Issues de GitHub — Listado de Animales Desktop

> Contenido listo para copiar/pegar en GitHub. La estrategia: **1 issue
> épico** que enmarca la funcionalidad + **5 sub-issues** por capa, para que
> el trabajo sea tomable y cerrable de forma independiente. El requisito
> completo (`docs/requisito_listado_animales.md`) es la fuente de verdad;
> los issues lo referencian por regla (LA-xxx), no lo copian entero.
>
> Convención asumida: el `.md` del requisito vive en el repo en
> `docs/requisito_listado_animales.md`. Ajusta la ruta si difiere.

---

═══════════════════════════════════════════════════════════════════
## ISSUE ÉPICO
═══════════════════════════════════════════════════════════════════

**Título**: `[Épica] Listado de Animales Desktop — tabla densa con filtros, paginación y exportación`

**Labels**: `epic`, `feature`, `frontend`, `backend`, `módulo:animales`

**Cuerpo**:

```markdown
## Contexto

El listado desktop actual muestra 4 columnas (Código, Nombre, Estado,
Ubicación) con Ubicación vacía — entrega menos información que la versión
mobile y desaprovecha el ancho de pantalla. El ganadero no puede escanear
su hato sin abrir cada ficha.

## Objetivo

Convertir el listado en una **tabla densa de análisis del hato**: 30
columnas del animal, filtros por columna, ordenamiento, paginación
server-side y exportación (Excel/CSV/PDF).

## Especificación (fuente de verdad)

📄 `docs/requisito_listado_animales.md` (RF-ANIM-LIST v1.0, reglas LA-001..023)

**No dupliquen la spec en los sub-issues** — refiéranla por número de regla.
Ante contradicción con la spec: reportar en el issue, no resolver en
silencio (IA-001).

## Alcance de la épica

- [ ] #_ Tabla: 30 columnas con FK en texto legible (LA-001..003)
- [ ] #_ Filtros por columna + buscador global (LA-004..007)
- [ ] #_ Ordenamiento y selector de columnas (LA-008..010)
- [ ] #_ Paginación server-side (LA-011..013)
- [ ] #_ Exportación Excel/CSV/PDF (LA-014..019)

## Fuera de alcance (v1.0)

Multi-orden, reordenar columnas, scroll infinito (usamos paginación
numerada). Candidatos a v1.1.

## Dependencias

- ⚠️ Falta `animales.lugar_compra_id → lugares_compras` (LA-002): la columna
  "Lugar compra" queda vacía hasta esa migración. Ver sub-issue de tabla.
- Índice `pesos(animal_id, fecha)` para "Peso último" sin penalizar la
  paginación.
- Confirmar si `reportes:exportar` es permiso separado de `animales:ver`.

## Criterio de cierre de la épica

Todos los sub-issues cerrados + los 9 criterios de aceptación de la spec
(§10) verificados + render correcto en los 10 temas.
```

---

═══════════════════════════════════════════════════════════════════
## SUB-ISSUE 1 — Tabla y columnas
═══════════════════════════════════════════════════════════════════

**Título**: `Listado animales: tabla de 30 columnas con FK en texto legible`

**Labels**: `feature`, `frontend`, `backend`, `módulo:animales`

**Cuerpo**:

```markdown
Parte de #_ (épica listado animales).
Spec: `docs/requisito_listado_animales.md` §3 (LA-001..003).

## Tareas

- [ ] Query paginada que resuelve en servidor las FK a texto
      (raza→nombre, potrero→nombre, sexo_key→"Hembra", etc.) — LA-001.
- [ ] Render de las 30 columnas en el orden exacto de la spec §3, todas
      visibles por defecto.
- [ ] Columnas derivadas: Edad (de fecha_nacimiento) y Peso último (último
      registro de tabla `pesos`) — LA-003.
- [ ] Madre/Padre desdoblados en Código (directo) + Nombre (resuelto).
- [ ] Badges: Salud siempre verde/rojo; categoría reproductiva con colores
      de dominio; machos con `no_aplica` sin badge de categoría.
- [ ] Densidad: filas 36–40px, header sticky, scroll horizontal con Código
      y Nombre congeladas (LA-021).

## ⚠️ Dependencia

`animales` no tiene `lugar_compra_id`. La columna "Lugar compra" (col. 21)
se incluye en el orden pero queda VACÍA hasta la migración
`animales.lugar_compra_id → lugares_compras`. **No inventar el dato.**
Abrir issue de migración aparte y enlazar.

## Criterios de aceptación

- [ ] Las 30 columnas en el orden de §3; ningún id/número crudo visible.
- [ ] MT-130 (macho) no muestra "Novilla"; MT-124 muestra "Enferma".
- [ ] Render correcto en los 10 temas (solo tokens del sistema).
```

---

═══════════════════════════════════════════════════════════════════
## SUB-ISSUE 2 — Filtros y buscador
═══════════════════════════════════════════════════════════════════

**Título**: `Listado animales: filtros por columna + buscador global`

**Labels**: `feature`, `frontend`, `backend`, `módulo:animales`

**Cuerpo**:

```markdown
Parte de #_ (épica listado animales).
Spec: `docs/requisito_listado_animales.md` §4 (LA-004..007).

## Tareas

- [ ] Fila de filtros bajo los encabezados, cada uno según tipo de columna:
      dropdown (catálogos), texto "contiene", rango numérico, rango de
      fechas, sí/no (flags) — LA-004.
- [ ] Filtros combinables (AND); chips de filtros activos sobre la tabla
      con "Limpiar todo", visibles al hacer scroll — LA-005.
- [ ] Contador en vivo "N de TOTAL coinciden" + estado sin resultados
      (LA-006).
- [ ] Buscador global (código/nombre/arete/RFID) que coexiste con los
      filtros (AND) — LA-007.
- [ ] Los dropdowns cargan opciones desde la réplica local (offline).

## Criterios de aceptación

- [ ] Filtrar Salud=Enferma + Potrero=POT-1 → contador correcto y chips
      visibles.
- [ ] El buscador combina con los filtros de columna.
- [ ] Sin resultados muestra el estado vacío de filtros, no una tabla en
      blanco.
```

---

═══════════════════════════════════════════════════════════════════
## SUB-ISSUE 3 — Ordenamiento y selector de columnas
═══════════════════════════════════════════════════════════════════

**Título**: `Listado animales: ordenamiento por columna + mostrar/ocultar columnas`

**Labels**: `feature`, `frontend`, `módulo:animales`

**Cuerpo**:

```markdown
Parte de #_ (épica listado animales).
Spec: `docs/requisito_listado_animales.md` §5-6 (LA-008..010).

## Tareas

- [ ] Clic en encabezado ordena; segundo clic invierte; indicador ▲/▼.
      Numéricas/fechas por valor real, textos con locale es-CO — LA-008.
- [ ] Botón "Columnas": checklist para ocultar/mostrar; Código y Nombre no
      ocultables — LA-009.
- [ ] Persistir selección de columnas por usuario+finca; botón
      "Restablecer" vuelve al set completo — LA-010.

## Criterios de aceptación

- [ ] Ordenar por Peso ordena numéricamente (412 antes que 89 → correcto).
- [ ] Ocultar "Raza" y recargar la página: sigue oculta.
- [ ] Código y Nombre no pueden ocultarse.
```

---

═══════════════════════════════════════════════════════════════════
## SUB-ISSUE 4 — Paginación server-side
═══════════════════════════════════════════════════════════════════

**Título**: `Listado animales: paginación server-side con filtros en URL`

**Labels**: `feature`, `frontend`, `backend`, `módulo:animales`

**Cuerpo**:

```markdown
Parte de #_ (épica listado animales).
Spec: `docs/requisito_listado_animales.md` §7 (LA-011..013).

## Tareas

- [ ] Endpoint/consulta que recibe página, tamaño, orden y filtros y
      devuelve solo esa página + total. Nunca traer todo el hato — LA-011.
- [ ] Controles: rango "Mostrando 1–25 de N", navegación numerada, selector
      de tamaño 25/50/100 (default 25) — LA-012.
- [ ] Filtros y orden en query params de la URL; se conservan al paginar y
      permiten compartir/atrás — LA-013.

## Criterios de aceptación

- [ ] Con 543 animales, la red trae solo la página pedida (verificar en
      Network que no llegan 543 filas).
- [ ] Cambiar de página conserva filtros y orden.
- [ ] La URL refleja el estado (pegar la URL en otra pestaña reproduce la
      vista).
```

---

═══════════════════════════════════════════════════════════════════
## SUB-ISSUE 5 — Exportación
═══════════════════════════════════════════════════════════════════

**Título**: `Listado animales: exportar a Excel, CSV y PDF`

**Labels**: `feature`, `frontend`, `backend`, `módulo:animales`

**Cuerpo**:

```markdown
Parte de #_ (épica listado animales).
Spec: `docs/requisito_listado_animales.md` §8 (LA-014..019).

## Tareas

- [ ] Exportar a Excel (.xlsx), CSV y PDF (apaisado) — LA-014.
- [ ] Diálogo con dos alcances de columnas: "Vista actual" (visibles +
      filtros) vs "Todas las columnas" — LA-015.
- [ ] Exporta SIEMPRE el resultado filtrado completo, no solo la página
      visible — LA-016.
- [ ] PDF con "Todas las columnas": advertir que no caben legibles y
      sugerir Excel; permitir continuar — LA-017.
- [ ] Valores como texto legible (FK→nombre), fechas es-CO, booleanos
      Sí/No, encabezados = nombres de columna — LA-018.
- [ ] Generación en servidor con los mismos filtros/orden — LA-019.
- [ ] Verificar permiso (`animales:ver` + `reportes:exportar` si aplica).

## Criterios de aceptación

- [ ] Filtrar a 40 animales y exportar → el archivo tiene 40 filas (no 25).
- [ ] "Todas las columnas" incluye las 30 + derivadas con FK en texto.
- [ ] Excel/CSV/PDF abren correctamente; PDF avisa si se piden todas las
      columnas.
```

---

## Cómo usar esto en GitHub

1. Crea primero el **issue épico**; anota su número (ej. #42).
2. Crea los 5 **sub-issues**; en cada uno reemplaza `#_` por `#42`.
3. Vuelve al épico y reemplaza los `#_` de la lista de tareas por los
   números reales de los sub-issues (GitHub los enlaza y muestra el
   progreso automáticamente).
4. Sube `requisito_listado_animales.md` a `docs/` en el repo — es la fuente
   de verdad que todos los issues referencian.
5. Opcional: agrupa la épica en un **Milestone** ("Listado animales v1.0")
   o un **Project** para ver el tablero de avance.

### Por qué así y no un issue gigante

- Un issue debe ser una unidad de trabajo tomable y cerrable. 23 reglas en
  uno solo no se puede estimar ni repartir.
- Los sub-issues permiten que frontend y backend, o varias sesiones de IA,
  avancen en paralelo sin conflicto.
- La spec `.md` versionada en el repo evita que el detalle se disperse en
  comentarios de issues (que se pierden). Los issues son el "qué falta"; el
  `.md` es el "cómo debe ser".
```
