# Issues de GitHub - Listado de Animales Desktop (v2.1)

> Propuesta local; no crea issues en GitHub. Fuente de verdad: `requisito_listado_animales.md` v2.1.

## Épica

**Título:** `[Épica] Listado de Animales Desktop - tabla analítica online (v2.1)`

**Dueño:** Product/Tech Lead

**Labels:** `epic`, `feature`, `módulo:animales`

```markdown
## Objetivo
Entregar online una tabla analítica con 29 columnas visibles, 36 totales,
filtros, orden, paginación, preferencias y exportación server-side.

## Sub-issues y orden
- [ ] 1. Contrato, DTO, consulta e índices - bloquea 2, 3, 4 y 5
- [ ] 2. Tabla, estados, RBAC visual y accesibilidad - depende de 1
- [ ] 3. Filtros, búsqueda, orden y URL - depende de 1 y 2
- [ ] 4. Paginación, selector y preferencias - depende de 1 y 2
- [ ] 5. Exportación - depende de 1

## Cierre
- [ ] Se cumplen los 12 criterios de aceptación de RF-ANIM-LIST v2.1.
- [ ] QA valida los 10 temas del sistema en implementación; el .op no se usa
      como evidencia exhaustiva de diez renders.
```

## Sub-issue 1 - Contrato, DTO, consulta e índices

**Título:** `Listado animales: implementar contrato server-side v2.1`

**Dueño:** Backend/API; Backend/Database para migraciones

**Labels:** `feature`, `backend`, `database`, `módulo:animales`

```markdown
## Alcance
Implementar §3, §6 y §11 del requisito. Este issue bloquea el resto.

## Tareas Backend/API
- [ ] GET /api/fincas/{fincaId}/animales con page, pageSize, sort, q, f.* y cols.
- [ ] Aplicar la matriz de 36 columnas: columnId, responseKey, filterKey,
      sortKey y filterValue son contratos independientes.
- [ ] Implementar AnimalListadoRowDto, AnimalListadoResponseDto y ApiErrorDto
      completos, con nulabilidad, derivadas, paginación y cols.
- [ ] Filtrar catálogos/enums por ID/key; devolver pares ID/key + label.
- [ ] Resolver tipo_ingreso_id en config_key_values donde
      config_key='tipo_ingreso'; soportar keys 0/1 y fallback
      "Desconocido (<id>)" para valores no reconocidos.
- [ ] Calcular peso último desde pesos.peso_kg por mayor fecha y desempate por id.
- [ ] Validar sort/filter/cols y responder 400 ApiErrorDto con campo accionable.
- [ ] Aplicar animales:ver y usuarios_fincas; finca ajena devuelve 403.
- [ ] Evitar N+1 y medir p95 < 400 ms.

## Tareas Backend/Database
- [ ] Registrar como existentes solo los índices actuales equivalentes a
      animales(finca_id, activo) y pesos(animal_id, fecha).
- [ ] Crear migración para los índices adicionales de LA-102 y medir el plan
      real antes de cerrar rendimiento.

## Criterios
- [ ] Un request con filtros de texto, catálogo y derivada devuelve el DTO exacto.
- [ ] Los filtros de catálogo viajan por ID/key, nunca por label.
- [ ] sort/filter/cols inválidos producen 400 con campo y motivo.
- [ ] Peso ASC ordena 89 < 289 < 412 sin saltos al paginar.
- [ ] Finca ajena produce 403 y no filtra datos de otra finca.
- [ ] La suite prueba las 36 responseKey y su nulabilidad.
- [ ] Migración y evidencia p95 quedan adjuntas al PR de implementación.
```

## Sub-issue 2 - Tabla, estados, RBAC visual y accesibilidad

**Título:** `Listado animales: tabla de 29 columnas, estados y accesibilidad`

**Dueño:** Frontend; QA para accesibilidad y temas

**Labels:** `feature`, `frontend`, `a11y`, `módulo:animales`

```markdown
## Tareas Frontend
- [ ] Renderizar las 29 columnas base reales en orden; Categoría reprod. y
      Peso último no aparecen inicialmente.
- [ ] Usar scroll horizontal, Código/Nombre congeladas, header sticky y filas
      y skeletons de 36-40 px.
- [ ] Mostrar labels y nulos según contrato.
- [ ] Implementar loading, finca vacía, sin resultados, 403 y error/timeout.
- [ ] Conservar última tabla válida solo ante 400; para 403/500 usar estado.
- [ ] Ocultar Nuevo animal sin animales:crear y Exportar sin
      animales:ver + reportes:exportar.
- [ ] Navegar a ficha con clic/Enter fuera de controles.

## Tareas QA
- [ ] Verificar tabla semántica, scope, aria-sort, teclado, foco, labels y aria-live.
- [ ] Verificar contraste y comportamiento en los 10 temas reales del sistema.

## Criterios
- [ ] Se ven 29 encabezados/celdas reales en el lienzo desplazable.
- [ ] Código y Nombre permanecen visibles al desplazar horizontalmente.
- [ ] Los cinco estados se distinguen y no confunden 403 con lista vacía.
- [ ] Las acciones RBAC no se renderizan sin permiso.
- [ ] Tests automatizados y revisión manual cubren a11y; el .op solo documenta intención.
```

## Sub-issue 3 - Filtros, búsqueda, orden y URL

**Título:** `Listado animales: filtros tipados, búsqueda, orden y URL recuperable`

**Dueño:** Frontend

**Labels:** `feature`, `frontend`, `módulo:animales`

```markdown
## Tareas
- [ ] Implementar operadores contains/in/range/drange/bool según filterValue.
- [ ] Enviar IDs/keys de catálogos/enums y mostrar labels en controles/chips.
- [ ] Combinar filtros con AND y búsqueda OR; debounce 300 ms.
- [ ] Implementar chips, Limpiar todo y reset a page=1.
- [ ] Implementar ASC/DESC/sin orden; default codigo:asc y aria-sort.
- [ ] Sincronizar page, pageSize, sort, q, f.* y cols válidos con la URL.
- [ ] Ante 400, conservar la última tabla válida, sanear/remover todos los
      params señalados, ajustar page=1 cuando aplique y mostrar toast.

## Criterios
- [ ] Raza se solicita como f.razaId=in:<id>, no como texto Brahman.
- [ ] Una URL válida reproduce la vista al abrirse en otra pestaña.
- [ ] Un param inválido desaparece de la URL sin borrar la última tabla válida.
- [ ] Cambiar filtro, búsqueda, orden o pageSize vuelve a página 1.
```

## Sub-issue 4 - Paginación, selector y preferencias

**Título:** `Listado animales: paginación, 36 columnas y preferencias persistentes`

**Dueño:** Backend/API para endpoint y almacenamiento; Frontend para integración

**Labels:** `feature`, `backend`, `frontend`, `módulo:animales`

```markdown
## Tareas Backend/API
- [ ] Crear endpoint y almacenamiento de preferencias por usuario + finca.
- [ ] Validar columnId, deduplicar y normalizar el orden canónico.
- [ ] Aplicar RBAC y aislamiento por usuario/finca.

## Tareas Frontend
- [ ] Paginación server-side 25/50/100, navegación numerada y contador coherente.
- [ ] Selector de 36 columnas: 29 activas y 7 opcionales.
- [ ] Impedir ocultar Código/Nombre; Restablecer aplica las 29 base.
- [ ] Leer y guardar preferencias sin localStorage; fallo de lectura usa 29 base.

## Criterios
- [ ] Con pageSize=25, "Mostrando 1-25 de 128" coincide con data y total.
- [ ] El encabezado "128 de 543" coincide con total y totalSinFiltro.
- [ ] Una preferencia se conserva al cambiar de dispositivo para el mismo usuario/finca.
- [ ] IDs desconocidos o repetidos se rechazan/normalizan sin corromper preferencias.
```

## Sub-issue 5 - Exportación y errores operativos

**Título:** `Listado animales: exportar Excel/CSV/PDF con seguridad y límites`

**Dueño:** Backend/API para generación; Frontend para diálogo y errores

**Labels:** `feature`, `backend`, `frontend`, `seguridad`, `módulo:animales`

```markdown
## Tareas Backend/API
- [ ] Generar Excel, CSV y PDF con los mismos filtros/orden del listado.
- [ ] Vista actual usa cols; Todas usa las 36 columnas; exportar todo el filtrado.
- [ ] Aplicar límite 50 000 -> 413 y timeout 30 s.
- [ ] Neutralizar CSV injection y forzar texto inseguro en XLSX.
- [ ] Aplicar animales:ver + reportes:exportar y aislamiento por finca.

## Tareas Frontend
- [ ] Implementar diálogo Vista actual/Todas y advertencia PDF para 36 columnas.
- [ ] Manejar 400 saneando params y conservando última tabla válida.
- [ ] Manejar 403 como acceso denegado, 413 pidiendo afinar filtros y timeout
      con mensaje específico; no tratarlos como descarga vacía.
- [ ] Manejar HTTP 500 manteniendo abierto el diálogo, con mensaje no destructivo
      y Reintentar sin perder filtros, alcance de columnas ni formato seleccionados.
- [ ] Ocultar Exportar cuando falte cualquiera de sus permisos.

## Criterios
- [ ] Un filtro con total=40 produce 40 filas aunque pageSize sea 25.
- [ ] Un valor "=CMD()" no es ejecutable en CSV/XLSX.
- [ ] Todas exporta exactamente 36 columnas; Vista actual respeta cols normalizado.
- [ ] PDF muestra advertencia y permite continuar o cambiar a Excel.
- [ ] Un test automatizado simula HTTP 500, verifica el mensaje y Reintentar, y
      confirma que filtros, alcance de columnas y formato permanecen seleccionados.
- [ ] Tests cubren 400, 403, 413 y timeout con el comportamiento asignado.
```

## Dependencias y decisiones futuras

- `Lugar compra` queda fuera de alcance hasta que exista una relación de dominio aprobada desde `animales`; no es sub-issue de v2.1.
- Multiorden, reordenamiento de columnas y exportación asíncrona requieren propuesta posterior.
- No crear ni cerrar estos issues hasta sustituir `#_` por referencias reales durante la planificación de implementación.
