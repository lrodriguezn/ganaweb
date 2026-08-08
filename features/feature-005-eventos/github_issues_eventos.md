# Issues de GitHub — Eventos

> Publicados en GitHub el 2026-08-06. Estado: abiertos, `status:needs-review`.
> Épica: https://github.com/lrodriguezn/ganaweb/issues/225
> Fuente: `features/feature-005-eventos/requisito_eventos.md` (RF-EVENTOS v1.1).
> Template: `.github/ISSUE_TEMPLATE/feature_request.yml`.
> Issues publicados: #225–#235.

## Convenciones de publicación

- Pre-flight completado: no se encontraron duplicados exactos; la implementación sigue pendiente de aprobación.
- Labels permitidos: `enhancement`, `type:feature`, `priority:high`, `area:web`, `area:ui`, `status:needs-review` según cada unidad.
- Cada cuerpo cubre área, problema, solución, alternativas y contexto/criterios.

## Mapa y trazabilidad

| Issue | Unidad | Requisitos | Depende de |
|---|---|---|---|
| [#225](https://github.com/lrodriguezn/ganaweb/issues/225) | Épica Eventos | Todos | — |
| [#226](https://github.com/lrodriguezn/ganaweb/issues/226) | Contrato transversal, esquema y RBAC | EV-ARQ-001/003/004, EV-CAP-003/004, EV-SEC-001..004, EV-AUD-003 | — |
| [#227](https://github.com/lrodriguezn/ganaweb/issues/227) | Read model e historial | EV-ARQ-002, EV-UI-002..005, EV-INT-001 | #226 |
| [#228](https://github.com/lrodriguezn/ganaweb/issues/228) | Ruta, tablero y estados | EV-UI-001..007, EV-VIS-001..003 | #227 |
| [#229](https://github.com/lrodriguezn/ganaweb/issues/229) | Shell, alcance y trazabilidad grupal | EV-CAP-001..005/007 | #226 |
| [#230](https://github.com/lrodriguezn/ganaweb/issues/230) | Captura reproductiva | matriz §2, EV-CAP-006..008 | #229 |
| [#232](https://github.com/lrodriguezn/ganaweb/issues/232) | Captura productiva | matriz §2, EV-CAP-006/008 | #229 |
| [#231](https://github.com/lrodriguezn/ganaweb/issues/231) | Eventos sanitarios + #211 | EV-ARQ-005, matriz §2, EV-CAP-006/008 | #229, #211 |
| [#233](https://github.com/lrodriguezn/ganaweb/issues/233) | Venta, muerte y traslado | matriz §2, EV-CAP-006/008, EV-AUD-004 | #229 |
| [#234](https://github.com/lrodriguezn/ganaweb/issues/234) | Ficha/EventDrawer y permisos parciales | EV-SEC-004, EV-INT-001/002 | #230–#233, #227 |
| [#235](https://github.com/lrodriguezn/ganaweb/issues/235) | Anulación, corrección y auditoría | EV-AUD-001..005 | #230–#233, #226 |

## Plantilla común

Todos los issues confirman: “Busqué issues existentes y no es duplicado” y
“Entiendo que requiere `status:approved` antes de un PR”. Alternativa común
descartada: crear tabla/permisos
`eventos:*`; rompería los contratos especializados y RBAC por dominio.

---

## `#225` — Eventos: flujo transversal de actividad del hato

**Labels**: `enhancement`, `type:feature`, `priority:high`, `area:web`, `area:ui`, `status:needs-review`

**Área**: Web App / UI/UX

**Problema**: La actividad está fragmentada por dominio y no existe un flujo coherente para consultar, registrar y corregir eventos con alcance individual o grupal.

**Solución**: Coordinar las unidades del mapa anterior, manteniendo tablas y permisos por dominio, historial v1, Sanidad integrada y semántica append-only.

**Contexto y criterios**:
- [ ] Cada sub-issue referencia EV-xxx y declara dependencias.
- [ ] Se cubren EV-CA-001..011 sin reconstruir #167/#181/#183 ni duplicar #211.
- [ ] Ninguna unidad implementa tabla o permiso `eventos:*`.

---

## `#226` — Eventos: contrato transversal, migraciones y RBAC por dominio

**Labels**: `enhancement`, `type:feature`, `priority:high`, `area:web`, `status:needs-review`

**Área**: Base de Datos / Autenticación

**Problema**: El esquema no conserva origen `grupo`, muerte/condición corporal carecen de `registro_grupal_id` y la auditoría de correcciones necesita contrato explícito.

**Solución**: Diseñar y migrar `origen_seleccion`, `grupo_id`, las dos FK grupales y los metadatos mínimos de anulación/corrección; aplicar RBAC real por dominio y alcance de finca derivado por animal.

**Alternativas**: Inferir origen desde hijas pierde la intención original; agregar `finca_id` a todas las tablas duplica una relación derivable.

**Criterios**:
- [ ] `registros_grupales` acepta origen `manual|lote|potrero|grupo` y criterio correspondiente.
- [ ] `muertes` y `animales_condicion_corporal` admiten `registro_grupal_id` con FK.
- [ ] Se documenta qué columnas nuevas soportan motivo, actor y enlace de corrección.
- [ ] Matriz RBAC usa exactamente los permisos de EV-SEC-002; finca ajena responde 403.

---

## `#227` — Eventos: extender read model para finca, contadores e historial

**Labels**: `enhancement`, `type:feature`, `priority:high`, `area:web`, `status:needs-review`

**Área**: Web App

**Problema**: El timeline existente es por animal; tablero e historial requieren alcance de finca, agregados, filtros y paginación sin duplicar su UNION.

**Solución**: Extender el contrato de #167/#181/#183 para feed, conteos mensuales e historial paginado, derivando finca por animal y agrupando hijos por cabecera cuando corresponda.

**Alternativas**: Un segundo UNION divergiría del timeline; una tabla materializada añade sincronización prematura.

**Criterios**:
- [ ] Reutiliza exclusión de `registros_grupales.anulado_en` y conteo/paginación existentes.
- [ ] Filtra por categoría, tipo y fechas; orden estable y página sin duplicados.
- [ ] Un grupal aparece una vez en feed de finca y cada hijo en su ficha.
- [ ] Solo retorna dominios autorizados y animales de la finca activa.

---

## `#228` — Eventos: tablero, historial y estados responsive

**Labels**: `enhancement`, `type:feature`, `priority:high`, `area:web`, `area:ui`, `status:needs-review`

**Área**: UI/UX

**Problema**: El diseño nominal no cubre estados operativos, historial completo ni mobile, y `themes` vacío impide afirmar verificación multitema.

**Solución**: Implementar ruta, cuatro categorías, filtros, “Ver todo” y estados loading/empty/error/vacío por filtro con diseño responsive validado previamente.

**Alternativas**: Copiar las diez variantes actuales no demuestra temas ni comportamiento.

**Criterios**:
- [ ] Tablero e historial cumplen EV-UI-001..007 con permisos parciales.
- [ ] “Ver todo” es paginado y filtrable en v1.
- [ ] Hay evidencia visual desktop/mobile y verificación real de temas soportados.
- [ ] Los vacíos inicial y por filtro tienen mensajes/acciones distintos.

---

## `#229` — Eventos: shell de captura y selección grupal trazable

**Labels**: `enhancement`, `type:feature`, `priority:high`, `area:web`, `area:ui`, `status:needs-review`

**Área**: Web App / UI/UX

**Problema**: Falta un shell común que seleccione tipo y participantes sin acoplar ni duplicar formularios de dominio.

**Solución**: Wizard Tipo → Alcance → Datos; selección individual o manual/lote/potrero/grupo, exclusiones y contrato transaccional de cabecera + hijas efectivas.

**Alternativas**: Un formulario monolítico mezclaría reglas; guardar la selección original como participantes incluiría animales excluidos.

**Criterios**:
- [ ] Cabecera conserva origen/criterio y `total_animales` efectivo.
- [ ] Hijas coinciden exactamente con participantes confirmados.
- [ ] Fallo de una hija revierte toda la operación.
- [ ] Parto no ofrece alcance grupal; el shell delega datos/validación al dominio.

---

## `#230` — Eventos: captura reproductiva append-only

**Labels**: `enhancement`, `type:feature`, `priority:high`, `area:web`, `status:needs-review`

**Área**: Web App

**Problema**: Servicio, palpación y parto necesitan formularios especializados reutilizables y consistentes con alcance y RBAC.

**Solución**: Conectar formularios de dominio al shell; servicio/palpación individual y grupal, parto exclusivamente individual; usar `eventos_reproductivos:*`.

**Alternativas**: Editar filas históricas se descarta por append-only.

**Criterios**:
- [ ] Campos y efectos coinciden con matriz §2 y validaciones del dominio.
- [ ] Parto nunca genera `registro_grupal_id` en v1.
- [ ] Corrección se realiza por anulación + nuevo evento/compensación.

---

## `#232` — Eventos: captura productiva individual y grupal

**Labels**: `enhancement`, `type:feature`, `priority:high`, `area:web`, `status:needs-review`

**Área**: Web App

**Problema**: Pesaje, producción láctea y condición corporal necesitan distinguir datos compartidos de valores por animal.

**Solución**: Formularios reutilizables con grilla por animal cuando corresponda y permisos `eventos_productivos:*`.

**Alternativas**: Aplicar un valor único a todo el grupo falsea mediciones individuales.

**Criterios**:
- [ ] Pesaje grupal exige un peso válido por participante.
- [ ] Producción y condición corporal siguen la matriz §2.
- [ ] Condición corporal grupal se bloquea hasta completar #226.

---

## `#231` — Eventos: integrar captura sanitaria con #211

**Labels**: `enhancement`, `type:feature`, `priority:high`, `area:web`, `status:needs-review`

**Área**: Web App

**Problema**: Sanidad debe aparecer en Eventos sin crear un contrato paralelo al módulo sanitario.

**Solución**: Reutilizar #211 y permisos `sanidad:*` para Aplicación sanitaria y Revisión veterinaria; Eventos aporta shell, navegación y read model.

**Alternativas**: Excluir Sanidad rompe la visión transversal; duplicarla crea reglas divergentes.

**Criterios**:
- [ ] `diagnosticos_veterinarios` solo se usa como catálogo; no aparece como tipo de evento.
- [ ] Aplicación usa `producto_id`, `dosis`, `precio_dosis`, `proxima_dosis`; campos adicionales quedan como migración separada.
- [ ] Inventario/offline y validaciones provienen de #211, no se reimplementan.

---

## `#233` — Eventos: venta, muerte y traslado con efectos laterales

**Labels**: `enhancement`, `type:feature`, `priority:high`, `area:web`, `status:needs-review`

**Área**: Web App

**Problema**: Los movimientos cambian estado o ubicación y una anulación ingenua puede sobrescribir eventos posteriores.

**Solución**: Formularios con `movimientos:{ver,crear,anular}` y efectos atómicos; delegar correcciones al contrato compensatorio.

**Alternativas**: Restaurar siempre “en finca” se descarta porque puede invalidar historia posterior.

**Criterios**:
- [ ] Venta/muerte cambian estado y traslado actualiza ubicación + histórico en una transacción.
- [ ] Muerte grupal espera la migración de #226.
- [ ] Las compensaciones consideran el estado y eventos posteriores.

---

## `#234` — Eventos: integrar ficha/EventDrawer con permisos parciales

**Labels**: `enhancement`, `type:feature`, `area:web`, `area:ui`, `status:needs-review`

**Área**: Web App / UI/UX

**Problema**: La ficha ya tiene timeline/EventDrawer, pero debe compartir contratos y respetar autorización por tipo sin bifurcar formularios.

**Solución**: Reutilizar read model y formularios; abrir con animal preseleccionado y filtrar tipos/acciones por permisos efectivos.

**Alternativas**: Formularios exclusivos de ficha se descartan por divergencia.

**Criterios**:
- [ ] Un hijo grupal identifica su origen sin duplicarse.
- [ ] Los mismos formularios funcionan desde ficha y Eventos.
- [ ] Un usuario puede ver un dominio autorizado aunque carezca de otros.

---

## `#235` — Eventos: anulación, corrección y compensación auditable

**Labels**: `enhancement`, `type:feature`, `priority:high`, `area:web`, `area:ui`, `status:needs-review`

**Área**: Web App / UI/UX

**Problema**: Editar o borrar eventos destruye trazabilidad; además, hijos grupales no tienen una columna de anulación propia.

**Solución**: Flujo append-only con confirmación, motivo, actor/fecha, anulación derivada desde cabecera y nuevo evento o compensación.

**Alternativas**: Soft-delete por hija duplica estado y puede divergir de `registros_grupales.anulado_en`.

**Criterios**:
- [ ] No existe acción “eliminar” ni edición destructiva.
- [ ] Anular grupal marca cabecera y el read model deriva exclusión de hijas.
- [ ] UI muestra impacto, confirmación, éxito/error y estado anulado.
- [ ] Venta, muerte y traslado prueban compensación segura ante eventos posteriores.

## Revisión previa a publicación

- [x] Sustituir placeholders por números reales, sin inventarlos.
- [x] Buscar duplicados abiertos/cerrados y actualizar referencias a #167/#181/#183/#211.
- [x] Confirmar labels existentes y replicar el formulario `feature_request.yml` por API según `CONTRIBUTING.md`.
- [x] Verificar que la épica cubre EV-CA-001..011 exactamente una vez o por dependencia explícita.

---

## Feature Branch Chain publicada para #227

> Publicada el 2026-08-08. Tracker draft hacia `master` con `Closes #227`; cuatro PRs hijos encadenados por capa (dominio → aplicación → db → web), cada uno contra su padre inmediato y el primero contra `master`. `size:exception` aplicada a los hijos y al tracker que superan 400 líneas. Ningún PR fusionado todavía.

### Topología

```text
master
 ├── #257 feat/issue-227-eventos-readmodel   (tracker draft → master, Closes #227, type:feature, size:exception)
 │
 ├── #248 feat/issue-227-eventos-readmodel-01-dominio    (Refs #227 → master, +354, type:feature)
 │     └── #254 feat/issue-227-eventos-readmodel-02-aplicacion (Refs #227 → 01-dominio, +651, type:feature, size:exception)
 │           └── #255 feat/issue-227-eventos-readmodel-03-db    (Refs #227 → 02-aplicacion, +1064, type:feature, size:exception)
 │                 └── #256 feat/issue-227-eventos-readmodel-04-web  (Refs #227 → 03-db, +238, type:feature)
```

### PRs

| # | URL | Capa | Base | Head | Líneas | Labels | Estado |
|---|---|---|---|---|---|---|---|
| [#248](https://github.com/lrodriguezn/ganaweb/pull/248) | https://github.com/lrodriguezn/ganaweb/pull/248 | Dominio (RBAC + filtros) | `master` | `feat/issue-227-eventos-readmodel-01-dominio` | +354 / -0 (3 files) | `type:feature` | draft, no-merge |
| [#254](https://github.com/lrodriguezn/ganaweb/pull/254) | https://github.com/lrodriguezn/ganaweb/pull/254 | Aplicación (caso de uso + puerto) | `01-dominio` | `feat/issue-227-eventos-readmodel-02-aplicacion` | +651 / -0 (5 files) | `type:feature`, `size:exception` | draft, no-merge |
| [#255](https://github.com/lrodriguezn/ganaweb/pull/255) | https://github.com/lrodriguezn/ganaweb/pull/255 | DB (Drizzle UNION ALL) | `02-aplicacion` | `feat/issue-227-eventos-readmodel-03-db` | +1064 / -0 (3 files) | `type:feature`, `size:exception` | draft, no-merge |
| [#256](https://github.com/lrodriguezn/ganaweb/pull/256) | https://github.com/lrodriguezn/ganaweb/pull/256 | Web (boundary HTTP) | `03-db` | `feat/issue-227-eventos-readmodel-04-web` | +238 / -0 (3 files) | `type:feature` | draft, no-merge |
| [#257](https://github.com/lrodriguezn/ganaweb/pull/257) | https://github.com/lrodriguezn/ganaweb/pull/257 | Tracker (integración) | `master` | `feat/issue-227-eventos-readmodel` | +2307 / -0 (14 files) | `type:feature`, `size:exception` | draft, no-merge, Closes #227 |

### Ramas en `origin`

- `feat/issue-227-eventos-readmodel` (tracker)
- `feat/issue-227-eventos-readmodel-01-dominio`
- `feat/issue-227-eventos-readmodel-02-aplicacion`
- `feat/issue-227-eventos-readmodel-03-db`
- `feat/issue-227-eventos-readmodel-04-web`

### Notas operativas

- Cada PR replica `.github/PULL_REQUEST_TEMPLATE.md` y añade la sección `## Chain Context` con diagrama, posición, base, dependencia, follow-up, líneas, inicio/fin, scope y autonomy.
- Los PRs hijos llevan `Refs #227`; el tracker lleva `Closes #227`. Todos con `type:feature` único.
- Verificación local previa al push: tests por capa en `packages/{dominio,aplicacion,db}` y boundary en `apps/web`. CI fresco se materializa con `gh workflow run` (ver bloque inferior) desde la rama del tracker contra el PR #257, vía dispatch manual del #245.
- El contenido aprobado de issues (secciones anteriores) queda intacto. Esta sección se añadió al final del archivo para registrar la trazabilidad de la cadena.
- Comandos de recuperación manual del CI (tracker):

```bash
gh workflow run pr-validation.yml --ref feat/issue-227-eventos-readmodel -f pr_number=257
gh workflow run pr-check.yml      --ref feat/issue-227-eventos-readmodel -f pr_number=257
gh workflow run ci.yml            --ref feat/issue-227-eventos-readmodel -f pr_number=257
gh workflow run e2e.yml           --ref feat/issue-227-eventos-readmodel -f pr_number=257
```
