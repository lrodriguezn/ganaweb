# Design Brief — Gestión Ganadera Web (v1.1)
## TanStack Start + Tailwind CSS + shadcn/ui + Base UI

> v1.1 — incorpora: modo oscuro (tokens runtime), autenticación
> (login/registro), módulo de Configuración/Maestros con creación
> contextual, y selector multi-finca en el shell.
> Documentos hermanos: `especificaciones_diseno_css.md`,
> `diseno_paginas_detallado.md`, `ganaweb-design.md` (v1.1).

---

## 1. Fundamentos compartidos

### Breakpoints y estrategia responsive

Mobile-first obligatorio: el usuario primario en campo usa celular con una
mano, con guantes, bajo sol directo. Desktop es el contexto secundario
(administrador/gerente en oficina).

| Breakpoint | Ancho | Contexto de uso | Layout |
|---|---|---|---|
| base | < 640px | Campo (celular) | 1 columna, bottom nav, FAB |
| `sm` | ≥ 640px | Celular horizontal / tablet chica | 2 columnas en cards |
| `md` | ≥ 768px | Tablet (oficina de finca) | Sidebar colapsable aparece |
| `lg` | ≥ 1024px | Desktop (gerencia) | Sidebar fija + grillas 3-4 col |
| `xl` | ≥ 1280px | Monitores grandes | Máx ancho de contenido 1200px |

### Temas: claro y oscuro (v1.1)

- **Claro (default)**: trabajo diurno al aire libre — contraste alto,
  fondo crema, cero sombras.
- **Oscuro**: caso de uso real, no cosmético — el ordeño y los manejos de
  madrugada (4-5 am), donde una pantalla crema a máximo brillo enceguece.
- Implementación: tokens CSS runtime redefinidos bajo `.dark` en `<html>`
  (ver `globals.css` v1.1). Ningún componente usa variantes `dark:`; las
  clases semánticas cambian solas de tema.
- Reglas duras del tema oscuro: es un **mapeo semántico, no una
  inversión** (los colores funcionales suben de luminosidad); el primario
  claro (`#4C9D62`) lleva **texto oscuro** encima; los paneles grandes de
  marca usan verde oscuro (`brand-panel`), jamás el primario claro.
- Alternador: `ThemeToggle` en el header, preferencia persistida, script
  anti-flash en el `<head>`.

### Shell de la aplicación

- **Desktop (`md+`)**: sidebar izquierda fija con: Inicio, Animales,
  Eventos, Sanidad, Reportes, Tareas y **Configuración** (esta última solo
  para rol administrador). Header superior con **FincaSwitcher** (selector
  multi-finca), buscador global (Cmd+K), **ThemeToggle**, indicador de
  sincronización (SyncPill) y avatar.
- **Mobile (base)**: bottom navigation de 5 ítems (Inicio, Animales,
  botón central [+] Registrar, Tareas, Más). Configuración y el cambio de
  tema viven bajo "Más". El [+] abre el `EventDrawer` con las acciones
  rápidas: Peso, Vacuna, Servicio, Palpación, Parto, Producción, Mover de
  potrero.
- **Indicador de sync siempre visible** en ambos: verde "sincronizado" /
  ámbar "N pendientes" / gris "offline". Nunca modal, nunca bloqueante —
  offline es estado normal, no error.

### FincaSwitcher — selector multi-finca (v1.1)

El trigger vive en el header y es parte del shell (no de cada página).
Dropdown en desktop, bottom sheet en mobile, con el mismo contenido:

- Cada finca es una **fila informada**: nombre + badge del ROL del usuario
  en esa finca (Administrador/Operador — el rol es por finca, tabla
  `usuarios_fincas`) + estado de sincronización con color semántico.
- La activa: fondo de selección + check primario.
- **Offline manda**: sin conexión, las fincas SIN réplica local aparecen
  deshabilitadas ("Requiere conexión · sin datos locales") — nunca
  ocultas. Si la finca actual tiene pendientes, se informa antes del
  cambio (los pendientes no se pierden: quedan en la cola local).
- Buscador si hay más de ~5 fincas; "+ Crear finca" según permiso.
- En TanStack Start el cambio de finca es un **cambio de ruta**
  (`/fincas/$fincaId`): los loaders recargan el contexto completo, sin
  estado global que sincronizar a mano.

### Tokens de diseño

Definidos en `ganaweb-design.md` v1.1 y `globals.css`: radios 12px cards /
8px controles, separación por bordes de 1px sin sombras, base tipográfica
16px mobile con `tabular-nums` en cifras, color semántico (estado) separado
del color de dominio (categoría de evento), touch targets mínimos 44px.

### Mapa de componentes shadcn/ui + Base UI

| Necesidad | Componente |
|---|---|
| Métricas de dashboard | `MetricCard` (composición propia sobre Card) |
| Listado de animales | TanStack Table + shadcn `Table` (desktop) / `AnimalCard` (mobile) |
| Formularios de eventos | TanStack Form + shadcn `Form`, `Input`, `Select`, `DatePicker` |
| Selección múltiple | `Checkbox` + `Command` |
| Registro rápido mobile | `Drawer` (bottom sheet) — `EventDrawer` |
| Selector multi-finca | `DropdownMenu` (desktop) / `Drawer` (mobile) — `FincaSwitcher` |
| Índice de maestros | `MaestroCard` / `MaestroGrid` / `MaestrosProgreso` |
| Alternador de tema | `ThemeToggle` |
| Confirmaciones destructivas | `AlertDialog` |
| Notificaciones | `Sonner` — "Guardado · pendiente de sincronizar" |
| Gráficos | Recharts en shadcn `Chart` |
| Tabs de la ficha | `Tabs` desktop / pills con scroll en mobile (sub-rutas) |
| Árbol genealógico | Componente custom SVG |

---

## 2. Página: Autenticación — Login / Registro (v1.1)

**Rutas**: `/login`, `/registro` (o tabs en una misma vista)
**Job**: entrar en segundos y no quedar bloqueado nunca en campo.

- **Mobile**: logo centrado (marca cuadrada verde + "GanaWeb"), tabs pill
  Iniciar sesión / Crear cuenta, campos de 48px (Usuario o correo,
  Contraseña con toggle de visibilidad), botón primario full-width, link
  de contraseña olvidada.
- **Desktop**: panel dividido — banda izquierda de marca (verde; en tema
  oscuro `brand-panel`) con la propuesta de valor en 3 bullets ("Registra
  eventos sin señal", "Sincroniza al volver la conexión", "Reportes
  reproductivos y de producción"); card de credenciales a la derecha.
- **"Mantener sesión iniciada" viene MARCADO por defecto** con la nota
  "Necesario para trabajar sin señal en campo": si la sesión expira
  offline, el operario queda bloqueado sin poder trabajar. Decisión de
  producto, no de conveniencia.
- **Registro**: Nombre completo, Correo, Contraseña (mín. 8) y **"Código
  de finca (opcional) — te lo entrega el administrador"**: resuelve el
  alta multi-tenant (el usuario queda asociado a la finca correcta) sin
  pantallas adicionales de configuración.
- Sin marcas de terceros en la interfaz: solo identidad GanaWeb.

---

## 3. Página: Inicio (Dashboard)

**Ruta**: `/fincas/$fincaId`
**Job**: en 5 segundos, cómo está el hato y qué hay que hacer hoy.

1. **Fila de métricas** (composición del hato): Activos, Preñadas (%),
   Leche hoy, Enfermos (cifra en danger). Grid 2×2 en mobile — visible sin
   scroll.
2. **Card "Requiere acción"**: máx. 5 alertas accionables (refuerzos por
   vencer, stock bajo, días abiertos altos), cada una navega al detalle
   precargado. Si está vacía: estado positivo, nunca oculta.
3. **Producción 7 días**: línea simple + delta %, sin ejes recargados.
4. **Actividad reciente**: últimos registros (grupales como una sola fila
   con conteo). Colapsada en mobile.

En una finca nueva, el dashboard muestra además el **checklist de
preparación de maestros** ("5 de 8 requeridos completos") que desaparece
al completarse — es el onboarding.

Datos: un loader con `Promise.all`; métricas con `staleTime` 60s; gráfico
en deferred.

---

## 4. Página: Animales (listado)

**Ruta**: `/fincas/$fincaId/animales`

- **Desktop**: TanStack Table (Código, Nombre, Sexo, Categoría, Potrero,
  Lote, Último peso, Salud, Estado), columnas configurables, filtros como
  pills persistidos en la URL (compartibles), selección múltiple con barra
  flotante de acciones → crea `registro_grupal`.
- **Mobile**: la tabla NO se adapta — se reemplaza por `AnimalCard`
  (72px: código en negrita + badges + ubicación). Filtro primario de
  Lote/Potrero + búsqueda por código. Long-press activa selección
  múltiple. Virtualización obligatoria desde ~100 filas.

---

## 5. Página: Ficha Animal

**Ruta**: `/fincas/$fincaId/animales/$animalId/*`

- Header persistente (código + nombre, badges, potrero, foto) + sub-rutas
  como tabs: Resumen · Reproducción · Producción · Sanidad · Genealogía ·
  Histórico. Cada sección con loader propio.
- Resumen: timeline de últimos eventos (nodo circular con color de
  DOMINIO: morado reproducción, coral sanidad, teal producción, neutro
  manejo) + mini-métricas (último peso, GDP, producción promedio, días
  abiertos).
- Genealogía: árbol SVG de 3 generaciones, nodos clicables; mobile con
  scroll horizontal + pinch-zoom.
- Botón "+ Evento" en el header → EventDrawer con el animal preseleccionado.

---

## 6. Página: Registro rápido de eventos (EventDrawer)

**Job**: registrar un evento para 1..N animales en menos de 20 segundos.

- 3 pasos: Tipo → Alcance (lote/potrero con contador, o animal único) →
  Formulario. Se salta a paso 3 si viene de una ficha, de selección
  múltiple o de una alerta.
- Solo campos esenciales visibles; opcionales tras "Más detalles". Fecha
  default hoy. **Catálogos leídos de la réplica local, nunca de red.**
- **Creación contextual**: todo select de catálogo termina en "+ Crear
  nuevo" (mini-formulario inline) — la pieza que permite esconder los
  maestros del menú sin bloquear a nadie en campo.
- Botón sticky con el conteo real: "Guardar 17 registros". Toast:
  "Guardado · pendiente de sincronizar" + opción "Registrar otro".
- Variantes: peso pide valor por animal; palpación pide resultado por
  animal (checklist con ToggleGroup); vacuna/producción usan valor común;
  servicio cambia campos según Monta/IA/TE.

---

## 7. Página: Reportes

**Ruta**: `/fincas/$fincaId/reportes/$reporte`

- Índice como grid de cards con sparkline + cifra clave (Concepción por
  reproductor, IEP, Días abiertos, Producción por potrero, GDP, Costo
  sanitario, Efectividad por inseminador).
- Página de reporte: filtros con presets de fecha en la URL (compartibles
  por WhatsApp), gráfico arriba, tabla de detalle con export CSV.
- Mobile: solo lectura, gráfico + tabla de 2-3 columnas.
- Online-only: sin conexión, empty state honesto con "Reintentar" — nunca
  datos viejos sin marcar.

---

## 8. Página: Sanidad e Inventario

**Ruta**: `/fincas/$fincaId/sanidad`

- Tres tabs: Catálogo (productos con stock calculado y badge semáforo),
  Almacén (entradas de stock), **Refuerzos (tab default — lo accionable)**.
- Refuerzos agrupados por semana; el grupo "Esta semana" lleva el botón
  "Registrar aplicación" que abre el EventDrawer con producto Y animales
  precargados — el flujo estrella: de alerta a registro masivo en 2 taps.

---

## 9. Página: Configuración / Maestros (v1.1)

**Ruta**: `/fincas/$fincaId/configuracion` (solo administrador)
**Job**: diligenciar y mantener los datos base sin contaminar el menú.

**Decisión de arquitectura**: los maestros NO van desplegados en la
navegación principal — una sola entrada "Configuración". Razones:
frecuencia de uso (se cargan una vez, se tocan rara vez, no pueden
competir con lo diario), mobile (no caben en el bottom nav de ninguna
forma) y permisos (ocultar una entrada para operadores es trivial). El
riesgo de "esconderlos" lo resuelve la creación contextual del §6.

- **Índice**: cards agrupadas en Personas (Veterinarios, Propietarios,
  Inseminadores) / Ubicación (Predios, Potreros, Sectores, Lotes, Grupos)
  / Clasificación y Comerciales (Hierros, Diagnósticos, Motivos de venta,
  Causas de muerte, Lugares de compra, Razas, Tipos de explotación,
  Calidades). Cada card: conteo de registros; si está vacío y bloquea un
  proceso → alerta danger "Vacío · requerido para Servicios IA".
  Indicador global: "5 de 8 requeridos completos".
- **CRUD genérico** (UN patrón para los 12+ maestros, componente
  parametrizado por columnas y campos): tabla con búsqueda + "+ Nuevo" +
  panel lateral de formulario (desktop) o sheet (mobile).
- **Regla de integridad**: los registros usados en eventos NO se eliminan
  — se inactivan (badge neutral "Inactivo"), con la regla visible como
  nota bajo la tabla.
- Mobile: lista de filas agrupadas con chevron, accesible desde "Más".

---

## 10. Página: Tareas (Programador)

**Ruta**: `/fincas/$fincaId/tareas`

- Lista agrupada por día (Hoy / Mañana / Esta semana), no calendario
  mensual. Tareas manuales + generadas por el sistema desde
  `proxima_dosis` (badge "auto", no se borran: se completan o posponen).
- Completar una tarea de tipo evento ofrece registrarlo de inmediato.

---

## 11. Estados del sistema (transversal)

- Empty states con acción, nunca solo texto.
- Skeletons con la geometría exacta del contenido final; nunca spinner de
  página completa.
- Errores de sync: bandeja "Pendientes de revisión" accesible desde el
  SyncPill — nada se descarta en silencio.
- Optimistic UI en todo registro: la fila aparece al guardar local; el
  ícono por fila (reloj → check) comunica el ciclo local→sincronizado.
- Ambos temas cumplen las mismas reglas: color + ícono + texto para
  estados, contraste AA/AAA, cero sombras.

---

## 12. Prioridad de construcción sugerida

1. Autenticación + shell (con FincaSwitcher y ThemeToggle desde el día
   uno: son parte del layout raíz, no un refactor posterior)
2. Listado de animales
3. Registro rápido de peso y vacuna (mayor frecuencia de campo) con
   creación contextual de catálogos
4. Dashboard de inicio (con checklist de maestros para onboarding)
5. Configuración/Maestros (índice + CRUD genérico)
6. Ficha animal completa
7. Reportes
8. Sync offline completo (empezar online-only + outbox; activar réplica
   local SQLite cuando el CRUD esté estable) y multi-finca offline
   (réplicas por finca)
