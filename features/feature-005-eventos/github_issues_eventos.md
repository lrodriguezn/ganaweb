# Issues de GitHub — Eventos

> Estrategia: **1 épica** + sub-issues por capa, con el **modelo de datos y
> la vista unificada primero** (todo lo demás depende de ellos), luego el
> flujo de registro (individual y grupal), y la integración con la ficha.
> Fuente de verdad: `features/feature-004-eventos/requisito_eventos.md`
> (RF-EVENTOS v1.0, reglas EV-xxx). Los issues referencian por regla; no
> copian la spec.

---

## ÉPICA

**Título**: `[Épica] Eventos — tablero por categoría + registro individual y grupal`
**Labels**: `epic`, `feature`, `módulo:eventos`

```markdown
## Objetivo
Registrar y consultar la actividad del hato (reproductiva, sanitaria,
productiva, salidas) sobre las tablas especializadas del esquema, con
tablero por categoría, feed unificado y registro individual/grupal.

## Fuente de verdad
📄 features/feature-004-eventos/requisito_eventos.md
Decisión de arquitectura (EV-ARQ-01/02/03): NO se crea tabla `eventos`
genérica; la vista unificada es UNION sobre las tablas por tipo; los
grupales usan `registros_grupales` (ya existe).

## Orden de ejecución (dependencias reales)
- [ ] #_ 1. Vista unificada de eventos (UNION + feed) — base
- [ ] #_ 2. Tablero por categoría (desktop) ← dep 1
- [ ] #_ 3. Registro individual (wizard + formularios por tipo) ← dep 1
- [ ] #_ 4. Registro grupal (registros_grupales + N filas) ← dep 3
- [ ] #_ 5. Efectos de estado por tipo (venta/muerte/traslado/parto) ← dep 3
- [ ] #_ 6. Integración con ficha del animal (timeline + registro) ← dep 1,3

## Dependencias previas
- Confirmar permisos `eventos:ver|crear|editar|eliminar` en RBAC (EV-RBAC).
- Alinear efectos de estado con la máquina de estados de
  `arquitectura_funcional.md`.

## Cierre
Los 9 criterios de aceptación del §9 verificados en los 10 temas.
```

---

## SUB-ISSUE 1 — Vista unificada de eventos (UNION + feed)

**Título**: `Eventos: vista unificada por UNION sobre las tablas de evento`
**Labels**: `feature`, `backend`, `módulo:eventos`

```markdown
Parte de #_. Prerrequisito de los demás.
Spec: §1 (arquitectura), §2 (catálogo de tipos), EV-004..006.

## Tareas
- [ ] Consulta que UNIFICA por UNION las tablas de evento sobre su tronco
      común (animal_id, registro_grupal_id, fecha, usuario, discriminador de
      tipo) — servicios, palpaciones, partos, aplicaciones_sanitarias,
      revisiones_veterinarias, pesos, producciones_lacteas,
      condicion_corporal, ventas, muertes, ubicacion_historico (EV-ARQ-02).
- [ ] Cada fila trae: tipo, categoría, título legible (evento · animal),
      detalle corto, alcance (individual o "N animales" si grupal), fecha.
- [ ] Filtro por categoría/tipo; orden por fecha desc; paginación.
- [ ] Distinción individual vs grupal por `registro_grupal_id` (EV-006).
- [ ] RBAC server-side: solo eventos de las fincas del usuario (EV-RBAC-02).

## Criterios de aceptación
- [ ] El feed mezcla eventos de todas las tablas ordenados por fecha.
- [ ] Un evento grupal aparece como una fila con "N animales".
- [ ] Filtrar por "Sanitario" solo trae aplicaciones y revisiones.
```

---

## SUB-ISSUE 2 — Tablero por categoría (desktop)

**Título**: `Eventos: tablero por categoría con contadores y feed`
**Labels**: `feature`, `frontend`, `módulo:eventos`

```markdown
Parte de #_. Depende de #_ (vista unificada).
Spec: §3 (EV-001..007), diseño `.op` "02 Eventos · Desktop".

## Tareas
- [ ] 4 tarjetas de categoría (Reproductivo, Sanitario, Productivo, Salidas)
      con sus tipos y contador del mes en curso (EV-002/003).
- [ ] Feed de últimos eventos bajo las tarjetas, con filtro "Todos ▾" y
      "Ver todo →" (EV-004/005).
- [ ] Botón "+ Registrar evento" (abre wizard) y atajos "+ Registrar →" por
      categoría (abren wizard filtrado) (EV-007).
- [ ] Estados: cargando, sin eventos, error (EV-040). Solo tokens, 10 temas.

## Criterios de aceptación
- [ ] Las 4 tarjetas muestran contador del mes; render en 10 temas.
- [ ] El atajo de una categoría abre el wizard ya en esa categoría.
```

---

## SUB-ISSUE 3 — Registro individual (wizard + formularios por tipo)

**Título**: `Eventos: wizard de registro individual (3 pasos)`
**Labels**: `feature`, `frontend`, `backend`, `módulo:eventos`

```markdown
Parte de #_. Depende de #_ (vista unificada).
Spec: §4 (EV-010..015), diseño `.op` "02a/02b/02c Evento · Paso 1/2/3".

## Tareas
- [ ] Wizard modal de 3 pasos: Tipo → Alcance → Datos (EV-010/011).
- [ ] Paso 1: selector de tipo agrupado por categoría.
- [ ] Paso 3: formulario específico por tipo con SUS campos propios (§2):
      servicio (tipo/padre/pajuela/inseminador/dosis), palpación
      (resultado/dias_gestacion), parto (machos/hembras/muertos/tipo),
      pesaje (peso_kg/tipo), venta (motivo/lugar/precio/comprador), etc.
- [ ] Guardar individual: 1 fila en la tabla del tipo con finca_id y
      usuario del contexto, fecha default hoy (EV-013).
- [ ] Validaciones de dominio por tipo (EV-014).
- [ ] Los formularios son COMPONENTES REUTILIZABLES (se usan también desde
      la ficha — EV-021). Un solo formulario por tipo.
- [ ] RBAC: requiere `eventos:crear`; botón oculto sin permiso (EV-RBAC-03).

## Criterios de aceptación
- [ ] Registrar un servicio individual crea 1 fila en `servicios` con sus
      campos.
- [ ] El formulario de cada tipo valida sus reglas propias.
- [ ] El mismo formulario se invoca desde Eventos y desde la ficha.
```

---

## SUB-ISSUE 4 — Registro grupal (registros_grupales + N filas)

**Título**: `Eventos: registro grupal por lote/potrero con valor por animal`
**Labels**: `feature`, `frontend`, `backend`, `módulo:eventos`

```markdown
Parte de #_. Depende de #_ (registro individual).
Spec: §4 (EV-011/012), diseño `.op` "02b" (selección) y "02d" (grilla).

## Tareas
- [ ] Paso 2 del wizard: alcance grupal con selección por lista/lote/
      potrero/grupo; cargar animales y permitir excluir (EV-011).
- [ ] Datos COMPARTIDOS vs POR ANIMAL: campos como fecha/producto se
      capturan una vez; campos variables (p. ej. peso) se capturan en una
      GRILLA con una fila por animal (decisión de producto). Ver `.op` 02d.
- [ ] Transacción de guardado (EV-012):
      1. INSERT en `registros_grupales` (tipo_evento, total_animales,
         lote_id/potrero_id, fecha).
      2. INSERT de N filas en la tabla del tipo, todas con el mismo
         `registro_grupal_id`; los campos por-animal toman su valor de la
         grilla, los compartidos el valor común.
      Todo en una transacción: o entran todas o ninguna.
- [ ] El grupal aparece como 1 tarjeta en el feed y como evento individual
      en la ficha de cada animal.

## Criterios de aceptación
- [ ] Registrar pesaje grupal de 40 animales crea 1 fila en
      `registros_grupales` + 40 en `pesos`, cada una con SU peso de la grilla
      y el mismo `registro_grupal_id`.
- [ ] Excluir un animal en el paso 2 lo deja fuera del conteo y del guardado.
- [ ] Si falla una fila, la transacción revierte todo (no quedan grupales
      huérfanos).
```

---

## SUB-ISSUE 5 — Efectos de estado por tipo

**Título**: `Eventos: efectos de estado (venta/muerte/traslado/parto)`
**Labels**: `feature`, `backend`, `módulo:eventos`

```markdown
Parte de #_. Depende de #_ (registro individual).
Spec: §4 (EV-014/015), §6 (EV-031). Alinear con máquina de estados.

## Tareas
- [ ] Venta → `estado_animal_key` = Vendido.
- [ ] Muerte → `estado_animal_key` = Muerto.
- [ ] Traslado → actualiza ubicación actual del animal
      (potrero/sector/lote/grupo) ADEMÁS de escribir `ubicacion_historico`.
- [ ] Parto → puede crear las crías como nuevos animales (vía `partos_crias`).
- [ ] Anular un evento con efecto de estado REVIERTE el efecto (anular venta
      → animal vuelve a "En finca") — EV-031.

## Criterios de aceptación
- [ ] Registrar una venta cambia el estado del animal a Vendido.
- [ ] Anular esa venta lo devuelve a En finca.
- [ ] Un traslado deja el animal en el nuevo potrero y escribe el histórico.
```

---

## SUB-ISSUE 6 — Integración con ficha del animal

**Título**: `Eventos: timeline y registro desde la ficha del animal`
**Labels**: `feature`, `frontend`, `módulo:eventos`

```markdown
Parte de #_. Depende de #_ (vista unificada) y #_ (registro individual).
Spec: §5 (EV-020/021).

## Tareas
- [ ] La ficha (pantalla 19) muestra el timeline del animal desde la vista
      unificada (EV-020); reutiliza CA-TL-xxx de crud_animales.
- [ ] Un evento grupal aparece en la ficha como evento individual con nota
      de que fue parte de un registro grupal.
- [ ] "Registrar evento" desde la ficha abre el MISMO wizard con el animal
      preseleccionado (alcance individual) — EV-021.

## Criterios de aceptación
- [ ] El timeline del animal lista sus eventos ordenados por fecha.
- [ ] Registrar desde la ficha usa el mismo formulario que desde Eventos.
```

---

## Notas de estrategia

- **La vista unificada (#1) es el cimiento**: el feed, el tablero y la ficha
  la consumen. Sin ella, los demás no tienen qué mostrar.
- **#4 depende de #3**: el registro grupal reutiliza los formularios por tipo
  del registro individual; construir grupal primero duplicaría trabajo.
- **#5 (efectos de estado) separado**: toca la máquina de estados y tiene
  reglas de reversión propias; mezclarlo con el registro haría el issue
  inmanejable.
- Reutilización clave: **un solo formulario por tipo** sirve a individual,
  grupal y ficha. Si se bifurcan, divergirán.
