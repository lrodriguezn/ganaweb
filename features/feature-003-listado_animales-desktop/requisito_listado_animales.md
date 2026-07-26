# GanaWeb — Requisito Funcional: Listado de Animales Desktop (RF-ANIM-LIST v1.0)

> Documento de requisito funcional para el equipo de desarrollo y los
> agentes de IA. Mejora la pantalla 18 (Animales · Desktop).
> Referencias: `schema_v3_corregido.sql` / `0000_initial.sql` (columnas
> reales), `crud_animales.md` v1.6 (reglas CA-xxx), `arquitectura_funcional.md`
> (RBAC, KPIs), pantalla 18/19 del `.op`.
> Reglas propias de este requisito: **LA-xxx** (citables en PRs y tests).
> Ante contradicción con los documentos base: reportar (IA-001), no resolver.

---

## 1. Problema y objetivo

El listado desktop actual muestra 4 columnas (Código, Nombre, Estado,
Ubicación) con Ubicación vacía: entrega MENOS información que la versión
mobile y desaprovecha el ancho de pantalla. El ganadero no puede escanear
su hato (quién está preñada, enferma, dónde, cuánto pesa) sin abrir cada
ficha.

**Objetivo**: convertir el listado en una **tabla densa de análisis del
hato** con todas las columnas del animal visibles, filtros por columna,
ordenamiento, paginación y exportación. Sirve para revisar el hato de un
vistazo y para producir subconjuntos filtrados exportables.

## 2. Alcance

- Aplica a la pantalla de listado desktop (`/fincas/$fincaId/animales`).
- NO cambia la ficha (19) ni el formulario (20/21) ni el listado mobile
  (03) — este último conserva su diseño de cards.
- Permiso base: `animales:ver` (mismo filtro de finca activa y pertenencia,
  PE-002/003).

## 3. Columnas (todas visibles por defecto, en este orden)

Todas las columnas se muestran por defecto. El botón "Columnas" (§6) sirve
para OCULTAR las que el usuario no quiera, no para revelarlas. Las FK/key
muestran **solo su texto legible**, nunca el id ni el número (LA-001,
reafirma CA-UI-001).

| # | Columna | Origen (esquema) | Tipo | Filtro | Orden |
|---|---|---|---|---|---|
| 1 | Código | `codigo` | texto | contiene | ✓ |
| 2 | Nombre | `nombre` | texto | contiene | ✓ |
| 3 | Sexo | `sexo_key` → texto (Macho/Hembra/Pajuela) | catálogo | dropdown | ✓ |
| 4 | Raza | `raza_id` → `config_razas.nombre` | catálogo | dropdown | ✓ |
| 5 | Fecha nacimiento | `fecha_nacimiento` (epoch→fecha) | fecha | rango | ✓ |
| 6 | Edad | derivada de `fecha_nacimiento` | número (años) | rango | ✓ |
| 7 | Color | `color_id` → `config_colores.nombre` | catálogo | dropdown | ✓ |
| 8 | Origen | `tipo_ingreso_id` → texto (Nacido/Comprado) | catálogo | dropdown | ✓ |
| 9 | Madre (Código) | `codigo_madre` | texto | contiene | ✓ |
| 10 | Madre (Nombre) | `madre_id` → `animales.nombre` | texto (resuelto) | contiene | ✓ |
| 11 | Padre (Código) | `codigo_padre` | texto | contiene | ✓ |
| 12 | Padre (Nombre) | `padre_id` → `animales.nombre` | texto (resuelto) | contiene | ✓ |
| 13 | Propietario | `propietario_id` → `propietarios.nombre` | catálogo | dropdown | ✓ |
| 14 | Hierro | `hierro_id` → `hierros.nombre` | catálogo | dropdown | ✓ |
| 15 | Nº Pezones | `numero_pezones` | número | rango | ✓ |
| 16 | Calidad | `calidad_animal_id` → `config_calidad_animal.nombre` | catálogo | dropdown | ✓ |
| 17 | Arete | `codigo_arete` | texto | contiene | ✓ |
| 18 | Fecha compra | `fecha_compra` (epoch→fecha) | fecha | rango | ✓ |
| 19 | Precio | `precio_compra` | número (COP) | rango | ✓ |
| 20 | Peso compra | `peso_compra` | número (kg) | rango | ✓ |
| 21 | Lugar compra | `lugares_compras` (⚠ ver LA-002) | catálogo | dropdown | ✓ |
| 22 | Tatuado | `tatuado` | sí/no | sí/no | ✓ |
| 23 | Herrado | `herrado` | sí/no | sí/no | ✓ |
| 24 | Descornado | `descornado` | sí/no | sí/no | ✓ |
| 25 | RFID | `codigo_rfid` | texto | contiene | ✓ |
| 26 | Potrero | `potrero_id` → `potreros.nombre` | catálogo | dropdown | ✓ |
| 27 | Sector | `sector_id` → `sectores.nombre` | catálogo | dropdown | ✓ |
| 28 | Lote | `lote_id` → `lotes.nombre` | catálogo | dropdown | ✓ |
| 29 | Grupo | `grupo_id` → `grupos.nombre` | catálogo | dropdown | ✓ |
| 30 | Comentarios | `comentarios` | texto | contiene | — |

- **LA-001** — Ninguna FK/key expone id o número: se muestra el texto del
  catálogo. La resolución (join) se hace en el servidor; el cliente recibe
  el texto ya listo.
- **LA-002 · Lugar de compra (pendiente de esquema)** — `animales` no tiene
  hoy columna que vincule al lugar de compra (no hay `lugar_compra_id`). La
  columna se incluye en el orden pero queda vacía hasta que se agregue la
  relación `animales.lugar_compra_id → lugares_compras(id)`. Reportar como
  dependencia; no inventar el dato.

### 3.1 Columnas disponibles pero OCULTAS por defecto

Activables desde "Columnas" (§6). No estaban en la lista solicitada pero
existen en el modelo y son útiles; el usuario puede mostrarlas:

Salud (`salud_animal_key`→texto), Categoría reproductiva
(`categoria_reproductiva`), Estado (`estado_animal_key`→texto), Peso último
(de tabla `pesos`, el más reciente — LA-003), QR (`codigo_qr`), Es de monta
(`es_de_monta`, solo informativo), Tipo de explotación
(`tipo_explotacion_id`→texto).

- **LA-003 · Columnas derivadas** — "Edad" (col. 6) y "Peso último" se
  calculan, no se leen directo: Edad desde `fecha_nacimiento` a hoy (años
  con 1 decimal); Peso último = registro más reciente de `pesos` del
  animal (no `peso_compra`). Ordenan y filtran por su valor numérico real.

### 3.2 Columnas que NUNCA se muestran

Internas / de sistema: `id`, `finca_id`, `usuario_creado_por`,
`created_at`, `updated_at`, `version`, `activo`, `ind_descartado`, y todos
los `_id`/`_key` en su forma cruda (solo su texto resuelto aparece).

## 4. Filtros por columna

- **LA-004** — Fila de filtros bajo los encabezados; cada columna filtra
  según su tipo (col. "Filtro" de la tabla §3): dropdown (catálogos, opción
  "Todas"), texto "contiene" (código/nombre/arete/RFID/comentarios), rango
  mín–máx (numéricos), rango de fechas (fecha nacimiento/compra), sí/no
  (flags). Los dropdowns cargan sus opciones desde la réplica local
  (offline).
- **LA-005** — Filtros combinables (AND entre columnas). Los activos se
  muestran como **chips** sobre la tabla ("Salud: Enferma ✕", "Potrero:
  POT-1 ✕") con "Limpiar todo", visibles aunque se haga scroll.
- **LA-006** — Contador en vivo: "N de TOTAL animales coinciden". Estado
  vacío propio cuando ningún animal cumple ("Ningún animal coincide con los
  filtros · Limpiar").
- **LA-007** — Buscador global (código/nombre/arete/RFID) se mantiene
  arriba y coexiste con los filtros de columna: el buscador es "encuentra
  este animal", los filtros son "muéstrame este subconjunto". Se combinan
  (AND).

## 5. Ordenamiento

- **LA-008** — Clic en encabezado ordena por esa columna; segundo clic
  invierte; indicador ▲/▼. Numéricas y fechas ordenan por valor real (no
  alfabético); textos con locale es-CO. Una columna de orden a la vez
  (multi-orden queda fuera de alcance de v1.0).

## 6. Selector de columnas

- **LA-009** — Botón "Columnas" abre un panel con checklist de las 30+
  columnas; el usuario oculta/muestra. Código y Nombre no se pueden ocultar
  (ancla de identificación). Reordenar columnas queda fuera de alcance de
  v1.0 (el orden es el de §3).
- **LA-010** — La selección de columnas visibles **se persiste por usuario
  y finca** (LA de preferencia de UI): al volver, respeta lo que dejó. Un
  botón "Restablecer" vuelve al set por defecto (todas).

## 7. Paginación

- **LA-011** — Paginación **server-side**: el servidor recibe página,
  tamaño, orden y filtros, y devuelve solo esa página + el total. Nunca se
  traen todos los animales al cliente (una finca puede tener cientos).
- **LA-012** — Controles: rango ("Mostrando 1–25 de 543"), navegación
  numerada (‹ 1 2 3 … 22 ›) y selector de tamaño **25 / 50 / 100** (default
  25). Paginación numerada, no scroll infinito — permite saber cuántos hay
  y exportar de forma predecible.
- **LA-013** — Los filtros y el orden se conservan al cambiar de página y
  se reflejan en la URL (query params) para que la vista sea compartible y
  el botón atrás funcione.

## 8. Exportación

- **LA-014 · Formatos** — Excel (`.xlsx`), CSV y PDF. Excel y CSV con todos
  los datos; PDF apaisado, pensado para impresión/archivo.
- **LA-015 · Alcance de columnas** — Diálogo de exportación con dos
  opciones: **"Vista actual"** (solo columnas visibles + filtros aplicados)
  o **"Todas las columnas"** (las 30 del §3 + las derivadas, con los filtros
  igualmente aplicados). El usuario elige (confirmado con producto).
- **LA-016 · Alcance de filas** — Exporta SIEMPRE el resultado filtrado
  completo, no solo la página visible (si hay 3 filtros que dejan 40
  animales, exporta los 40 aunque la página muestre 25). Sin filtros,
  exporta todo el hato activo de la finca.
- **LA-017 · PDF y ancho** — Si el usuario pide "Todas las columnas" en
  PDF, advertir que 30 columnas no caben legibles y sugerir Excel; permitir
  continuar si insiste (fuentes reducidas, apaisado). Excel/CSV sin límite.
- **LA-018 · Valores** — En la exportación las FK/key también salen como
  texto legible (LA-001), no como id. Fechas en formato es-CO; números con
  separador local; booleanos como "Sí"/"No". Encabezados = nombres de
  columna del §3.
- **LA-019 · Generación** — La exportación se genera en el servidor con los
  mismos filtros/orden de la consulta (no en el cliente, que solo tiene la
  página actual). Permiso: `animales:ver` + `reportes:exportar` si el
  catálogo lo separa; verificar en RBAC.

## 9. Comportamiento general y estados

- **LA-020 · Estados de tabla** — Cargando: skeleton de filas.
  Vacío (finca sin animales): EmptyState con "+ Registrar el primero".
  Sin resultados (filtros): mensaje de LA-006. Error de carga: reintento.
- **LA-021 · Densidad y estilo** — Filas compactas (36–40px), header
  sticky al hacer scroll vertical, scroll horizontal cuando las columnas
  superan el ancho (con Código y Nombre "congeladas" a la izquierda si es
  viable). Solo tokens del sistema, render correcto en los 10 temas
  (reafirma CA-UI-016/018). Badges: Salud siempre verde/rojo, categoría
  reproductiva con sus colores de dominio (invariantes del catálogo).
- **LA-022 · Fila → ficha** — Clic en una fila (o en el chevron ›) abre la
  ficha del animal (pantalla 19). El clic en controles de filtro/orden no
  navega.
- **LA-023 · Rendimiento** — Con server-side (LA-011) y virtualización de
  filas si una página de 100 lo requiere, la tabla responde fluida. Los
  joins de texto (LA-001) se resuelven en la query paginada, no por fila
  en cliente.

## 10. Criterios de aceptación

1. La tabla muestra las 30 columnas del §3 en ese orden, todas visibles por
   defecto, con FK/key en texto legible (LA-001) — ningún id/número crudo.
2. Cada columna filtra según su tipo; los filtros combinan (AND) y con el
   buscador global; chips + contador en vivo (LA-004..007).
3. Ordenamiento por columna con valor real en numéricas/fechas (LA-008).
4. "Columnas" oculta/muestra y persiste por usuario/finca; Código y Nombre
   no ocultables (LA-009/010).
5. Paginación server-side 25/50/100, filtros/orden en URL, conservados al
   paginar (LA-011..013).
6. Exportar a Excel, CSV y PDF; diálogo vista actual vs todas; exporta el
   resultado filtrado completo, no la página; FK en texto (LA-014..019).
7. Estados cargando/vacío/sin-resultados/error (LA-020).
8. Render correcto en los 10 temas; Salud siempre verde/rojo (LA-021).
9. E2E: filtrar por Salud=Enferma + Potrero=POT-1 → contador y export
   coinciden; ocultar Raza y recargar → sigue oculta; paginar conserva
   filtros.

## 11. Dependencias y decisiones abiertas

1. **LA-002** — Falta `animales.lugar_compra_id → lugares_compras`. La
   columna "Lugar compra" queda vacía hasta esa migración.
2. **Peso último** requiere leer la tabla `pesos` (registro más reciente por
   animal) en la query del listado — confirmar índice `(animal_id, fecha)`
   para que no penalice la paginación.
3. Multi-orden y reordenar columnas: fuera de alcance de v1.0; candidatos a
   v1.1 si el uso lo pide.
4. `reportes:exportar` como permiso separado de `animales:ver` (LA-019):
   confirmar en el catálogo RBAC si la exportación se restringe a ciertos
   roles.
