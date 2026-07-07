# GanaWeb — Componentes base `ganado/` (v1.2.1)

Componentes React del sistema de diseño ganadero, listos para un proyecto
TanStack Start + Tailwind CSS v4 + shadcn/ui.

**Novedades v1.2**: tokens con contraste AA en muted, `--primary-hover` propio (fix de hover en oscuro), semántico `info`, dominio manejo con hue azul, selección inequívoca, `MetricCard` navegable (onPress), fix de long-press en `AnimalCard` (useRef), advertencia de pendientes en `FincaSwitcher`, `EstadoBadge` con `withDot`/`size`/variante info. Requiere además: `npx shadcn@latest add alert-dialog`.

**Novedades v1.1**: modo oscuro por tokens runtime (todos los componentes se
adaptan sin cambios), `FincaSwitcher` (selector multi-finca), `MaestroCard` /
`MaestroGrid` / `MaestrosProgreso` (índice de Configuración) y `ThemeToggle`.

## Contenido

```
src/
  styles/globals.css                    Tokens v1.1: claro + oscuro (.dark)
  lib/utils.ts                          Helper cn() (estándar shadcn)
  components/ganado/
    types.ts                            Tipos del dominio (+ FincaResumen, MaestroResumen)
    estado-badge.tsx                    EstadoBadge + Categoria/Salud/Stock badges
    metric-card.tsx                     MetricCard + skeleton
    animal-card.tsx                     Card del listado mobile (long-press, selección)
    sync-pill.tsx                       Indicador de sincronización (3 estados)
    timeline.tsx                        Timeline con colores de dominio
    empty-state.tsx                     Estado vacío con acción obligatoria
    finca-switcher.tsx                  NUEVO: selector multi-finca (dropdown/lista)
    maestro-card.tsx                    NUEVO: índice de Configuración/Maestros
    theme-toggle.tsx                    NUEVO: alternador claro/oscuro
    event-drawer/
      index.tsx                         Orquestador (tipo → alcance → formulario)
      formulario-vacuna.tsx             Formulario de referencia
```

## Instalación

```bash
npm install lucide-react class-variance-authority clsx tailwind-merge
npx shadcn@latest add button input label select drawer collapsible dropdown-menu
```

Copiar los archivos respetando la estructura e importar
`src/styles/globals.css` como hoja principal. Verificar el alias `@/* → ./src/*`.

## Modo oscuro

Los tokens son variables CSS runtime redefinidas bajo `.dark` en `<html>`,
así que **ningún componente necesita variantes `dark:`** — clases como
`bg-exito-100`, `text-dom-sanidad` o `bg-card` cambian solas de tema.

- Alternar: montar `<ThemeToggle/>` en el header (junto al SyncPill).
- Evitar el flash inicial: script inline en el `<head>` (ver comentario en
  `theme-toggle.tsx`).
- Regla del sistema: en oscuro el primario es más claro (`#4C9D62`) con
  **texto oscuro** encima (`--on-primary`); los paneles grandes de marca
  usan `bg-brand-panel` (verde oscuro), nunca el primario.

## Uso rápido

```tsx
import { FincaSwitcher } from "@/components/ganado/finca-switcher";
import { MaestroGrid, MaestrosProgreso } from "@/components/ganado/maestro-card";
import { ThemeToggle } from "@/components/ganado/theme-toggle";

// Header del shell
<header className="flex items-center gap-3 h-[--h-header] px-4 bg-card border-b">
  <FincaSwitcher
    fincas={fincas}                 // FincaResumen[]: rol + sync por finca
    fincaActivaId={fincaId}
    offline={!navigator.onLine}
    puedeCrearFinca={rolActual === "admin"}
    onSeleccionar={(f) => navigate({ to: `/fincas/${f.id}` })}
  />
  <div className="ms-auto flex items-center gap-2">
    <ThemeToggle />
    <SyncPill estado={sync.estado} pendientes={sync.pendientes} />
  </div>
</header>

// Página /configuracion
<MaestrosProgreso maestros={maestros} />
<MaestroGrid maestros={maestros} onPress={(m) => navigate({ to: m.ruta })} />
```

## RBAC: roles dinámicos y gating por permiso (v1.2.1)

El esquema v3 trae RBAC configurable (`usuarios_roles` + `usuarios_permisos`
+ `roles_permisos`, con rol POR FINCA). Consecuencias en el frontend:

- `RolFinca` es `string` (el nombre del rol viene de la base de datos);
  el badge del FincaSwitcher lo muestra tal cual y se destaca con
  `esAdmin` — nunca comparar contra nombres de rol hardcodeados.
- La UI se protege por **permiso**, no por rol. Helper incluido en types:

```tsx
import { crearPermisos, tienePermiso } from "@/components/ganado/types";

const permisos = crearPermisos(permisosDeLaFincaActiva); // del loader raíz

// Sidebar: Configuración visible por permiso, no por rol
{tienePermiso(permisos, "configuracion", "ver") && (
  <NavItem to="/fincas/$fincaId/configuracion">Configuración</NavItem>
)}

// Mismo patrón para acciones: crear finca, anular registros grupales, etc.
<FincaSwitcher puedeCrearFinca={tienePermiso(permisos, "fincas", "crear")} ... />
```

## Reglas del sistema (resumen)

- Los componentes de `ganado/` encapsulan TODAS las decisiones de diseño;
  las páginas solo componen.
- Color semántico = estado; color de dominio = categoría de evento.
- `FincaSwitcher`: sin conexión, las fincas sin réplica local se muestran
  deshabilitadas — nunca ocultas. El cambio de finca es un cambio de ruta
  (`/fincas/$fincaId`), no estado global.
- Maestros: los registros usados en eventos se inactivan, no se eliminan.
- Los catálogos llegan por props desde la réplica local — los componentes
  nunca hacen fetch.
- Interactivos: mínimo `--h-touch` (44px) y `focus-visible:ring`.

## Pendientes de conexión (fuera de este paquete)

- Formularios restantes del EventDrawer (peso, palpación, servicio, parto,
  producción) — contrato de `formulario-vacuna.tsx`.
- Variante mobile del FincaSwitcher: montar `<FincaList/>` dentro del
  Drawer de shadcn (el contenido ya es compartido).
- Capa de datos: SQLite local + `sync_outbox` + tabla `usuarios_fincas`
  (usuario ↔ finca ↔ rol) que este selector requiere en el esquema.
