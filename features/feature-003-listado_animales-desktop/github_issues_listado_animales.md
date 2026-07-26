# Issues de GitHub — Listado de Animales Desktop (v2.0)

> Reorganizados según la revisión: **el contrato backend va primero** (todo
> depende de él), la ruta del `.md` es la real, y las reglas antes huérfanas
> (estados, densidad, navegación, rendimiento, a11y) tienen dueño.
> Fuente de verdad: `features/feature-003-listado_animales-desktop/requisito_listado_animales.md`
> (RF-ANIM-LIST v2.0). Los issues referencian por regla LA-xxx; no copian.

---

## ÉPICA

**Título**: `[Épica] Listado de Animales Desktop — tabla densa (v2.0)`
**Labels**: `epic`, `feature`, `módulo:animales`

```markdown
## Objetivo
Tabla densa de análisis del hato: 30 columnas base visibles, filtros, orden,
paginación server-side, exportación, offline y accesible.

## Fuente de verdad
📄 features/feature-003-listado_animales-desktop/requisito_listado_animales.md
Decisión raíz cerrada: vista inicial = **30 columnas base** (§3). La matriz
§3 manda sobre cualquier otro documento.

## Orden de ejecución (los sub-issues NO son paralelos)
El contrato backend es prerrequisito de todo lo demás.
- [ ] #_ **1. Contrato de consulta backend** (§8, §3, §14) — base de todo
- [ ] #_ 2. Tabla + columnas + estados (§3, §9, §12, §13) ← depende de 1
- [ ] #_ 3. Filtros + buscador + orden (§4, §5) ← depende de 1 y 2
- [ ] #_ 4. Paginación + selector de columnas + persistencia (§6, §7) ← dep 1,2
- [ ] #_ 5. Exportación (§11) ← depende de 1
- [ ] #_ 6. Offline (§10) ← depende de 1,2,3,4

## Dependencias previas
- Índices LA-101 (`animales(finca_id,activo,codigo)`, `pesos(animal_id,fecha desc)`).
- Endpoint de preferencias UI para columnas (LA-031) si no existe.
- `reportes:exportar` en el catálogo RBAC (LA-RBAC-03).

## Cierre
12 criterios de aceptación del §15 verificados en los 10 temas.
```

---

## SUB-ISSUE 1 — Contrato de consulta backend (PRIMERO)

**Título**: `Listado animales: contrato de consulta server-side (query + respuesta)`
**Labels**: `feature`, `backend`, `módulo:animales`

```markdown
Parte de #_ (épica). Prerrequisito de los sub-issues 2–6.
Spec: requisito §3 (matriz), §8 (contrato), §14 (rendimiento), §2 (RBAC).

## Tareas
- [ ] Endpoint `GET /api/fincas/{fincaId}/animales` con params §8.1
      (page, pageSize, sort, q, f.*), operadores contains/in/range/drange/bool.
- [ ] Respuesta §8.2: data con FK resueltas a texto (LA-001), enum crudo para
      badge, id; total + totalSinFiltro.
- [ ] Resolución de las 37 columnas de §3 incluidas derivadas: Edad
      (de fecha_nacimiento) y Peso último (máx fecha en `pesos`) — LA-003.
- [ ] Lugar compra vía `lugar_compra_id → lugares_compras` (LA-002, existe).
- [ ] Orden: solo keys permitidos (§3 col "Orden"); desempate `,id:asc`
      siempre (LA-022/044).
- [ ] Nulos como null (LA-042). Errores 400/403/500 (LA-043).
- [ ] RBAC server-side: `animales:ver`; filtro por `usuarios_fincas` +
      finca activa; finca ajena → 403 (LA-RBAC-01/04).
- [ ] Índices LA-101; p95 < 400ms con 543 animales (LA-100).
- [ ] Implementación LOCAL equivalente (mismo shape) contra la réplica para
      offline (LA-060) — puede ser sub-tarea coordinada con #_ (offline).

## Criterios de aceptación
- [ ] Un request con 3 filtros + sort + page devuelve exactamente la spec §8.2.
- [ ] sort con campo no permitido → 400; finca ajena → 403.
- [ ] Peso ASC ordena 89<289<412 con desempate estable (sin repetir filas al
      paginar sobre valores iguales).
- [ ] p95 < 400ms verificado en suite de carga.
```

---

## SUB-ISSUE 2 — Tabla, columnas, estados y accesibilidad

**Título**: `Listado animales: tabla 30 columnas + estados + a11y`
**Labels**: `feature`, `frontend`, `a11y`, `módulo:animales`

```markdown
Parte de #_. Depende de #_ (contrato).
Spec: §3, §9 (estados), §12 (diseño), §13 (a11y).

## Tareas
- [ ] Render de las 30 columnas base en orden §3; scroll horizontal; Código
      y Nombre congeladas (LA-080). Filas 36–40px, header sticky (LA-081).
- [ ] FK/key en texto; nulos "—"/"sin registrar" (LA-001/042).
- [ ] Badges: Salud siempre verde/rojo; categoría con colores de dominio;
      machos no_aplica sin badge (coordinar con BUG-DATA-001).
- [ ] Estados §9: skeleton, finca vacía, sin resultados, error+reintento,
      offline (LA-050..054).
- [ ] Navegación desde fila → ficha 19 (LA-086).
- [ ] A11y: tabla semántica, aria-sort, teclado, aria-live del contador,
      foco visible (LA-090..095).
- [ ] Solo tokens; correcto en los 10 temas (LA-085).

## Criterios de aceptación
- [ ] Las 30 columnas en orden §3; Código/Nombre no se pierden al scroll H.
- [ ] Los 5 estados se ven según §9.
- [ ] Teclado: ordenar con Enter en el header; abrir ficha con Enter en fila.
- [ ] Render correcto en los 10 temas.
```

---

## SUB-ISSUE 3 — Filtros, buscador y ordenamiento

**Título**: `Listado animales: filtros por columna + buscador + orden`
**Labels**: `feature`, `frontend`, `módulo:animales`

```markdown
Parte de #_. Depende de #_ (contrato) y #_ (tabla).
Spec: §4 (filtros), §5 (orden).

## Tareas
- [ ] Fila de filtros por tipo (§3): contiene/in[]/rango núm/rango fecha/sí-no.
- [ ] AND entre columnas y con buscador; chips + "Limpiar todo"; contador
      "N de TOTAL" con aria-live (LA-010/011).
- [ ] Buscador global OR sobre codigo/nombre/arete/rfid, debounce 300ms
      (LA-012/103).
- [ ] Cambiar filtro/buscador resetea a página 1 (LA-013).
- [ ] Orden ASC→DESC→ninguno con aria-sort; default codigo ASC (LA-020/021).

## Criterios de aceptación
- [ ] Filtrar Salud=Enferma + Potrero=POT-1 → filas y contador coinciden.
- [ ] Peso ASC 89<289<412.
- [ ] Cambiar un filtro vuelve a página 1.
```

---

## SUB-ISSUE 4 — Paginación, selector de columnas y persistencia

**Título**: `Listado animales: paginación + mostrar/ocultar columnas persistente`
**Labels**: `feature`, `frontend`, `backend`, `módulo:animales`

```markdown
Parte de #_. Depende de #_ (contrato) y #_ (tabla).
Spec: §6 (columnas), §7 (paginación), §8.1 (URL).

## Tareas
- [ ] Paginación server-side 25/50/100 (default 25); "Mostrando X–Y de N"
      (LA-032/033).
- [ ] page/pageSize/sort/filtros en query params URL; atrás/compartir
      funcionan; cambios de filtro/orden/size → page=1 (LA-034).
- [ ] Selector "Columnas" (37); Código y Nombre no ocultables; "Restablecer"
      → 30 base (LA-030).
- [ ] Persistir columnas por usuario+finca vía endpoint de preferencias
      (NO localStorage); primer ingreso = 30 base (LA-031).

## Criterios de aceptación
- [ ] Con 543 animales, Network trae solo la página pedida.
- [ ] Ocultar "Raza", recargar y cambiar de dispositivo: sigue oculta.
- [ ] URL pegada en otra pestaña reproduce la vista.
```

---

## SUB-ISSUE 5 — Exportación

**Título**: `Listado animales: exportar Excel/CSV/PDF con límites y seguridad`
**Labels**: `feature`, `backend`, `frontend`, `seguridad`, `módulo:animales`

```markdown
Parte de #_. Depende de #_ (contrato).
Spec: §11.

## Tareas
- [ ] Export Excel/CSV/PDF apaisado (LA-070).
- [ ] Diálogo vista actual (cols=) vs todas (37); filas = filtrado completo
      (LA-071).
- [ ] Generación server-side con mismos filtros/orden (LA-072).
- [ ] Límite 50k filas → 413; timeout 30s (LA-073/074).
- [ ] Neutralización CSV injection (prefijo `'` a `= + - @`/tab/CR; XLSX como
      texto) — LA-075.
- [ ] PDF "todas" advierte y sugiere Excel (LA-076).
- [ ] Valores: FK texto, fechas es-CO, bool Sí/No, nulos vacíos (LA-077).
- [ ] RBAC: ver+reportes:exportar; botón oculto sin permiso; finca
      server-side (LA-RBAC-03/04, LA-078).

## Criterios de aceptación
- [ ] Filtrar a 40 → archivo con 40 filas (no la página de 25).
- [ ] Un nombre "=CMD()" sale neutralizado, no ejecutable.
- [ ] Sin reportes:exportar, el botón no se renderiza.
```

---

## SUB-ISSUE 6 — Offline

**Título**: `Listado animales: operación offline sobre réplica local`
**Labels**: `feature`, `frontend`, `offline`, `módulo:animales`

```markdown
Parte de #_. Depende de #_ (contrato, incl. su implementación local) y 2/3/4.
Spec: §10.

## Tareas
- [ ] Listado/buscador/filtros/orden/conteo/paginación sobre la réplica local
      con el mismo request/response del contrato (LA-060).
- [ ] Export deshabilitado offline + tooltip "Disponible con conexión"
      (LA-061).
- [ ] Banner "Sin conexión · datos locales"; revalidar al reconectar
      (LA-054/062).
- [ ] Columnas editables offline, sync al reconectar (LA-063).

## Criterios de aceptación
- [ ] En avión, la tabla lista, filtra, ordena y pagina desde la réplica.
- [ ] El botón Exportar está deshabilitado con tooltip.
- [ ] Al reconectar, la vista se revalida contra el servidor.
```

---

## Notas de la reorganización (respuesta a la revisión)

1. **Ruta corregida**: los issues apuntan a
   `features/feature-003-listado_animales-desktop/requisito_listado_animales.md`.
2. **Dependencia real explícita**: el contrato backend (#1) es prerrequisito;
   los issues 2–6 lo declaran. No son 5 issues paralelos como en v1.0.
3. **Reglas antes huérfanas, ahora con dueño**: estados (LA-050..054) y a11y
   (LA-090..095) → sub-issue 2; densidad/tokens (LA-081/085) → sub-issue 2;
   navegación (LA-086) → sub-issue 2; rendimiento (LA-100..103) → sub-issue 1
   (contrato) y 3 (debounce).
4. **Lugar compra**: ya NO es migración pendiente — el esquema tiene
   `lugar_compra_id` (verificado); es tarea normal del contrato (#1).
5. **Ejemplo de orden corregido**: 89<289<412 en ASC (el "412 antes que 89"
   solo valía en DESC).
