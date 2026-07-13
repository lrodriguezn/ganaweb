# GanaWeb — Especificación CRUD Animales (v1.2)

> Especificación de implementación para desarrolladores y agentes de IA.
> Referencias normativas: `arquitectura_funcional.md` (reglas RN/TR/PE),
> `schema_v3_corregido.sql` (estructura — los nombres de columna aquí son
> los REALES del esquema), `especificaciones_tecnicas.md` (capas, sync,
> tests), pantallas 03/04/18/19/20/21 del `.op`.
> Reglas propias de este flujo: **CA-xxx** (citables en tests y PRs).
> Ante contradicción con los documentos base: reportar (IA-001), no resolver.

---

## 0. Alcance

Casos de uso cubiertos: `crearAnimal`, `actualizarAnimal`, `eliminarAnimal`
(decide físico vs inactivar), `reactivarAnimal`, `adjuntarImagenAnimal`,
`marcarImagenPrincipal`, `eliminarImagenAnimal`, `obtenerFichaAnimal`
(incluye timeline). Los EVENTOS del animal (pesos, servicios, vacunas…)
NO son parte de este CRUD — son casos de uso propios (§4 arquitectura
funcional); aquí solo se consumen para el timeline y la regla de borrado.

## 1. Extensión de esquema requerida (mínima)

El esquema YA modela imágenes correctamente (v1.2): `imagenes` es la tabla
GENERAL de archivos de la aplicación y `animales_imagenes` es la tabla
puente animal↔imagen (con único `(animal_id, imagen_id)`). Este diseño es
reutilizable: otras entidades futuras se vinculan con su propia tabla
puente sin tocar `imagenes`. Solo se requieren dos columnas nuevas:

## 2. Permisos (catálogo §1.2 de arquitectura funcional)

| Operación | Permiso |
|---|---|
| Ver listado / ficha / timeline / imágenes | `animales:ver` |
| Crear (incluye adjuntar imágenes al crear) | `animales:crear` |
| Editar datos / imágenes / foto principal / reactivar | `animales:editar` |
| Inactivar / reactivar | `animales:inactivar` |
| Eliminar FÍSICO | `animales:eliminar` (v1.1 — permiso propio; semilla: solo Administrador) o la regla de autoservicio CA-DEL-008 |

Toda server function revalida permiso + pertenencia del animal a una finca
del usuario (PE-002/PE-003). El `fincaId` de la URL nunca se confía.

## 3. CREATE — `crearAnimal`

### 3.1 Campos obligatorios (el mínimo viable de campo — capturar rápido)

| Campo (columna real) | Obligatorio | Regla |
|---|---|---|
| `codigo` | **Sí** | Único por finca, comparación case-insensitive y sin espacios extremos (CA-CRE-001). Máx 20 chars |
| `sexo_key` | **Sí** | 0=Macho, 1=Hembra, 2=Pajuela (config_key_values) |
| `tipo_ingreso_id` | **Sí** | 0=Nacido en finca, 1=Comprado |
| `fecha_nacimiento` | **Sí** si nacido en finca | No futura (RN-002). Si comprado y se desconoce: estimable (ver 3.2) |
| `fecha_compra` | **Sí** si comprado | No futura; ≥ fecha_nacimiento si ambas existen |
| `finca_id` | **Sí** (implícito) | La finca activa; jamás editable después |

Todo lo demás es **opcional al crear** (nombre, raza, arete, RFID, QR,
madre/padre, color vía comentarios, hierro, propietario, calidad, ubicación,
peso, tatuado/herrado/descornado, numero_pezones, comentarios). Filosofía:
en campo se registra el ternero con código y sexo; el resto se completa
después. La ficha muestra qué falta, no bloquea.

### 3.2 Reglas de creación

- **CA-CRE-001** — Unicidad de `codigo` por finca. Offline se valida contra
  la réplica local; el conflicto global se resuelve en sync (RN-060: el
  segundo va a bandeja de revisión, nada se pierde).
- **CA-CRE-002** — Condicionales por origen: *Nacido en finca* habilita
  `madre_id`/`padre_id`(o `codigo_pajuela`); *Comprado* habilita
  `fecha_compra`, `precio_compra`, `peso_compra` y lugar de compra. Los
  campos del modo no elegido se guardan vacíos/0 (defaults del esquema).
- **CA-CRE-003** — Parentesco: `madre_id` debe ser hembra de la misma
  finca; `padre_id` macho (o `codigo_pajuela` si `tipo_padre_key`=IA);
  ninguno puede ser el propio animal. Advertencia (no bloqueo) si la madre
  tendría <24 meses al nacimiento de la cría.
- **CA-CRE-004** — Fecha de nacimiento desconocida (compra): la UI ofrece
  "estimar por edad" (ej. "≈ 3 años" → fecha calculada al día 1 del mes);
  se anota `[fecha estimada]` en `comentarios`.
- **CA-CRE-005** — Valores iniciales fijados por el sistema, NUNCA por el
  cliente: `estado_animal_key=0` (EN_FINCA), `salud_animal_key=0` (Sano),
  `categoria_reproductiva` = `novilla` (hembra) / `no_aplica` (macho o
  pajuela) según TR del §2 AF, `ind_descartado=0`, `activo=1`, `version=1`,
  `usuario_creado_por` = usuario autenticado (PE-006).
- **CA-CRE-006** — Efectos colaterales (misma transacción + outbox, T-002):
  1) si se capturó ubicación → fila inicial en `animales_ubicacion_historico`;
  2) si se capturó peso → fila en `pesos` con `tipo_peso` = `nacimiento` o
  `compra` según origen; 3) imágenes adjuntadas → §6.
- **CA-CRE-007** — Disponible offline al 100% (UUID generado en cliente).

### 3.3 Flujo de proceso (crear)

```mermaid
flowchart TD
    A[Listado 18/03: + Nuevo animal] --> B[Formulario 20/21]
    B --> C{Validaciones locales\nCA-CRE-001..004}
    C -- error --> B
    C -- ok --> D[INSERT animales + efectos CA-CRE-006\n+ sync_outbox]
    D --> E[Toast: Animal MT-122 creado\n· Ver ficha · Registrar otro]
    E --> F{¿Online?}
    F -- sí --> G[Push inmediato]
    F -- no --> H[Cola outbox · SyncPill actualiza]
    G & H --> I[Ficha 19/04]
```

"Registrar otro" conserva raza, ubicación y tipo de ingreso (captura en
serie de terneros).

## 4. READ

### 4.1 Listado (pantallas 18 desktop / 03 mobile)

- Filtro base SIEMPRE: `finca_id = finca activa` AND `activo = 1` AND
  `estado_animal_key = 0` (EN_FINCA). Toggle "Incluir vendidos/muertos" y
  "Ver inactivos" (este último solo con `animales:inactivar`).
- Búsqueda sobre: `codigo`, `nombre`, `codigo_arete`, `codigo_rfid` (lector
  BLE/NFC escribe aquí — §5 AF).
- Filtros: categoría reproductiva, salud, potrero, lote. Orden default:
  `codigo` asc. Numéricas alineadas a la derecha, filas 44px,
  virtualización desde 100 filas.

### 4.2 Ficha (19 desktop / 04 mobile) — incluye TIMELINE

**Timeline (CA-TL-001..004):**

- **CA-TL-001 · Fuentes** — UNION de: `pesos`, `servicios`, `palpaciones`,
  `partos` (como madre), `partos_crias` (nacimiento propio),
  `producciones_lacteas`, `aplicaciones_sanitarias`,
  `revisiones_veterinarias`, `animales_ubicacion_historico`,
  `animales_condicion_corporal`, `ventas`, `muertes`, y las altas de
  `imagenes` (§6). Cada ítem: dominio (color/ícono §2 estilos), título,
  meta, fecha, usuario.
- **CA-TL-002 · Orden** — `fecha` desc, desempate `created_at` desc. Se
  excluyen filas de registros grupales anulados (RN-051).
- **CA-TL-003 · Paginación** — 20 ítems por página ("Ver N eventos más"),
  agrupación visual por año cuando el rango supera 12 meses.
- **CA-TL-004 · Encabezado de ficha** — badges desde los caches
  (`categoria_reproductiva`, `salud_animal_key`); si el animal está
  VENDIDO/MUERTO o `activo=0`, banner de estado permanente arriba y las
  acciones de evento se ocultan.

## 5. UPDATE — `actualizarAnimal`

- **CA-UPD-001** — Mismo formulario 20/21 en modo edición. Editables: todo
  lo capturable del §3 EXCEPTO:
  - `codigo`: inmutable si el animal "tiene eventos" (RN-001). Definición
    exacta de *tener eventos*: existe ≥1 fila que lo referencia en
    cualquiera de las fuentes de CA-TL-001 (excluyendo la ubicación inicial
    y las imágenes) O es `madre_id`/`padre_id`/`donadora_id` de otro animal.
    El formulario lo muestra deshabilitado con hint "El código no se puede
    cambiar: el animal tiene N eventos".
  - `finca_id`, `estado_animal_key`, `categoria_reproductiva`,
    `salud_animal_key`, `ind_descartado`: JAMÁS editables aquí — cambian
    solo por eventos (TR-001/TR-010) o por la acción de descarte.
  - Ubicación (`potrero/sector/lote/grupo_id`): NO editable en el
    formulario tras la creación — se cambia con el evento MoverUbicacion
    (deja histórico). El form la muestra como solo-lectura con link
    "Mover animal".
- **CA-UPD-002** — Concurrencia optimista con la columna `version`: el
  update exige la versión leída; en conflicto (editado en otro dispositivo)
  → recargar y re-aplicar, informando al usuario. En sync aplica RN-061.
- **CA-UPD-003** — `updated_at` y outbox en cada cambio; disponible offline.

## 6. Imágenes del animal

- **CA-IMG-001 · Límites** — Máximo **5 imágenes activas** por animal.
  Formatos de entrada: JPEG/PNG/WebP/HEIC (cámara). El cliente comprime
  ANTES de guardar: lado mayor 1600px, WebP calidad 0.8, objetivo ≤ 1 MB
  (`tamano_bytes` real). Sin video.
- **CA-IMG-002 · Captura** — Fuentes: cámara o galería, desde la ficha
  (galería en tab Resumen) y desde el formulario de creación. En UNA
  transacción: fila en `imagenes` (`finca_id`, `ruta`, `nombre_original`,
  `mime_type` final image/webp, `tamano_bytes`, `descripcion` opcional,
  `usuario_creado_por`) + fila de vínculo en `animales_imagenes`. El
  "máximo 5" de CA-IMG-001 cuenta vínculos ACTIVOS del animal.
- **CA-IMG-003 · Principal** — `es_principal` vive en el VÍNCULO
  (`animales_imagenes`): el primer vínculo del animal queda `es_principal=1`
  automáticamente; cambiable con `marcarImagenPrincipal` (transacción:
  desmarca el anterior del mismo animal). La principal es el avatar del
  animal en listados. Máximo un principal activo por animal (invariante
  verificable).
- **CA-IMG-004 · Almacenamiento** — `ruta` = `fincas/{finca_id}/imagenes/
  {imagen_id}.webp` (la ruta NO incluye al animal: `imagenes` es tabla
  general y un archivo podría vincularse a otras entidades) en el volumen
  de la app (Docker volume,
  respaldado junto a la BD). El acceso se sirve autenticado (verifica
  `usuarios_fincas`), nunca como estático público. Puerto `AlmacenArchivos`
  en `aplicacion` — S3-compatible es un adaptador futuro sin tocar casos
  de uso.
- **CA-IMG-005 · Offline** — El blob se guarda en OPFS y la fila viaja por
  una **cola de binarios separada** del outbox de datos (los binarios no
  bloquean el sync de eventos). La UI muestra la imagen local de inmediato
  con badge "pendiente de subir". Al reconectar: sube blob → confirma fila.
- **CA-IMG-006 · Timeline** — Cada alta genera ítem de timeline (dominio
  manejo): "Foto agregada" + thumbnail.
- **CA-IMG-007 · Borrado** — Se DESVINCULA: `animales_imagenes.activo=0`
  (la fila de `imagenes` no se toca). Si el vínculo era principal, el
  siguiente activo más antiguo del animal hereda `es_principal`. Un job
  server-side purga blob + fila de `imagenes` cuando lleva ≥30 días sin
  ningún vínculo activo en ninguna tabla puente.

## 7. DELETE — `eliminarAnimal` (físico) vs inactivar

Regla de producto (la tuya, formalizada):

- **CA-DEL-001** — La **eliminación física** procede si y solo si el animal
  NO "tiene eventos" según la definición exacta de CA-UPD-001 (cero filas
  en las fuentes del timeline, sin crías ni rol de madre/padre/donadora).
  Los vínculos de `animales_imagenes` y la fila de ubicación inicial NO
  bloquean: se eliminan en cascada dentro de la misma transacción (las
  filas de `imagenes` quedan huérfanas y las purga el job de CA-IMG-007).
  Es el caso "lo creé por error".
- **CA-DEL-002** — Si tiene eventos → **inactivación**: `activo=0` +
  outbox. El histórico queda íntegro y consultable; el animal desaparece
  de listados operativos y selects.
- **CA-DEL-003** — UNA sola acción en la UI ("Eliminar animal", zona
  inferior del modo edición). El **servidor decide** cuál de las dos
  aplica según eventos Y permisos del usuario, y el diálogo lo comunica
  (si solo puede inactivar, esa es la única opción que ve):
  - Sin eventos → "Se eliminará definitivamente MT-122. Esta acción no se
    puede deshacer." [Cancelar / Eliminar]
  - Con eventos → "MT-122 tiene 14 eventos registrados y no puede
    eliminarse. Puedes marcarlo como inactivo: se oculta de la operación y
    conserva su historia." [Cancelar / Marcar inactivo]
- **CA-DEL-004** — La eliminación FÍSICA es **solo online** (la
  verificación de referencias debe ser global — un evento capturado en
  otro dispositivo sin sincronizar no es visible localmente). Offline, el
  botón ofrece únicamente inactivar. La inactivación sí funciona offline.
- **CA-DEL-005** — El delete físico genera un tombstone en el protocolo de
  sync para que las réplicas locales de otros dispositivos lo purguen.
- **CA-DEL-006** — Semántica de `activo=0`: SOLO depuración/captura
  errónea. Las salidas reales del hato son eventos `ventas`/`muertes`
  (TR-001/TR-002) y mantienen `activo=1`. Prohibido inactivar como atajo
  de venta — el diálogo lo recuerda si el usuario no ha registrado salida.
- **CA-DEL-008 · Autoservicio de errores (v1.1)** — Además del permiso
  `animales:eliminar`, puede eliminar físicamente quien cumpla TODO:
  (a) tiene `animales:crear`, (b) es el `usuario_creado_por` del animal,
  (c) el animal fue creado hace < 24 horas, (d) no tiene eventos
  (CA-DEL-001). Es el patrón "borra tu propio error reciente": el
  mayordomo corrige su duplicado sin esperar al administrador. Se valida
  SIEMPRE en servidor.
- **CA-DEL-009 · Auditoría del borrado físico (v1.1)** — En la misma
  transacción del DELETE se inserta una fila de auditoría inmutable:
  `{animal codigo y nombre, finca_id, usuario, fecha, dispositivo_id,
  via: 'permiso'|'autoservicio'}`. El registro desaparece; la traza de
  quién lo eliminó, jamás. (Tabla `auditoria_eliminaciones` — migración
  junto a la de imágenes del §1.)
- **CA-DEL-007** — `reactivarAnimal` (permiso `animales:editar`) revierte
  la inactivación desde el listado con "Ver inactivos". Valida que el
  código no haya sido reutilizado; si lo fue → exige nuevo código.

### Flujo de decisión (eliminar)

```mermaid
flowchart TD
    A[Editar animal → Eliminar animal] --> B{¿Online?}
    B -- no --> C[Solo opción: Marcar inactivo\nCA-DEL-004]
    B -- sí --> D{¿Tiene eventos?\nCA-UPD-001}
    D -- no --> E[Confirmar → DELETE físico\n+ cascada imágenes/ubicación inicial\n+ tombstone sync]
    D -- sí --> F[Explicar → Marcar inactivo\nactivo=0 + outbox]
    C & F --> G[Sale de listados operativos\nHistórico intacto]
    E --> H[Desaparece de todas las réplicas]
```

## 8. Contratos de casos de uso (capa `aplicacion`)

| Caso de uso | Entrada (esencial) | Salida | Offline |
|---|---|---|---|
| `crearAnimal` | datos §3 + imágenes[] opcionales | animal + efectos | ✓ |
| `actualizarAnimal` | id, cambios, `version` leída | animal actualizado | ✓ |
| `eliminarAnimal` | id | `{resultado: 'eliminado'\|'inactivado'\|'requiere_confirmacion', eventos: N}` | solo inactivar |
| `reactivarAnimal` | id | animal | ✓ |
| `adjuntarImagenAnimal` | animalId, blob, descripcion? | imagen + vínculo (estado subida) | ✓ (cola binarios) |
| `marcarImagenPrincipal` | imagenId | ok | ✓ |
| `eliminarImagenAnimal` | imagenId | ok | ✓ |
| `obtenerFichaAnimal` | id, cursorTimeline? | ficha + página de timeline | ✓ (réplica) |

Cada caso de uso: valida permiso → reglas de dominio (CA/RN citables) →
escribe por puertos → outbox. Misma implementación corre en SQLite y
Postgres (suite de integración dual, TS de especificaciones técnicas).

## 9. Criterios de aceptación (mínimos para dar por cerrado el flujo)

1. Unit (TDD, dominio): un test por cada CA-xxx nombrándola en el
   `describe` (TS-001). Property test: crear→consultar→editar→eliminar
   físico deja la BD idéntica al estado previo (round-trip limpio).
2. Integración dual (SQLite y Postgres): `crearAnimal` con efectos
   CA-CRE-006; `eliminarAnimal` en ambas ramas; concurrencia CA-UPD-002.
3. E2E Playwright: (a) crear animal OFFLINE con foto → reconectar →
   verificar animal + imagen en servidor; (b) intentar eliminar animal con
   eventos → verifica diálogo de inactivación; (c) usuario Solo lectura no
   ve botones de crear/editar/eliminar (RBAC).
4. El timeline de un animal con >20 eventos pagina y agrupa por año.

## 10. Decisiones asumidas (ajustables — confirmar con producto)

1. Obligatorios mínimos = código + sexo + origen + fecha (§3.1). Alternativa
   estricta: exigir también raza y ubicación.
2. Máximo 5 imágenes por animal, compresión a WebP 1600px/≤1MB (CA-IMG-001).
3. ~~Permiso único~~ **RESUELTO v1.1**: el borrado físico usa el permiso
   propio `animales:eliminar` (semilla: solo Administrador) + la regla de
   autoservicio CA-DEL-008 + auditoría CA-DEL-009. Razón: inactivar es
   reversible, eliminar no — no comparten llave (mínimo privilegio).
