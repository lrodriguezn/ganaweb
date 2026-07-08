# GanaWeb — Control ganadero bovino para Colombia

Sistema web para administrar fincas, animales y eventos productivos, diseñado para funcionar **offline-first** en zonas rurales con conectividad intermitente.

- **Monorepo Clean/Hexagonal**: dominio puro → puertos → adaptadores.
- **Sync offline-first**: protocolo push/pull/outbox para replicación local-remota.
- **Componentes de dominio reutilizables**: sistema de diseño `ganado/` con modo oscuro integrado.

## Camino rápido para empezar

1. **Requisitos**: Node 22, pnpm ≥ 9 y PostgreSQL 17 corriendo.
2. **Instalar dependencias**:
   ```bash
   pnpm install
   ```
3. **Preparar la base de datos**:
   ```bash
   cd packages/db
   pnpm generate
   pnpm push
   pnpm seed
   ```
4. **Arrancar la app**:
   ```bash
   pnpm --filter web dev
   ```
5. **Verificar**: abre `http://localhost:3000` y el endpoint `GET /api/health` debe responder `ok`.

## Comandos útiles desde la raíz

| Comando | Para qué sirve |
|--------|----------------|
| `pnpm build` | Build completo con Turborepo |
| `pnpm test` | Ejecuta tests de todos los paquetes |
| `pnpm typecheck` | Verificación de tipos TypeScript |
| `pnpm lint` | Lint con Biome |
| `pnpm ci` | Pipeline completa de CI: lint → typecheck → test → build |

## Despliegue

> **Nota**: aún no hay Dockerfile ni GitHub Actions. El despliegue actual es manual sobre Node 22 + PostgreSQL 17.

### Variables de entorno

| Variable | Requerida | Default | Descripción |
|----------|-----------|---------|-------------|
| `DATABASE_URL` | Sí | — | URL de conexión a PostgreSQL 17 |
| `PORT` | No | `3000` | Puerto del servidor HTTP |
| `HOST` | No | `0.0.0.0` | Host de bind del servidor |

### Pasos en el servidor

1. **Clonar, instalar y construir**:
   ```bash
   pnpm install
   pnpm build
   ```

2. **Preparar la base de datos**:
   ```bash
   pnpm --filter @ganaweb/db migrate
   pnpm --filter @ganaweb/db seed
   ```

3. **Iniciar la aplicación**:
   ```bash
   pnpm --filter @ganaweb/web start
   ```

4. **Verificar salud**:
   ```bash
   curl http://localhost:3000/api/health
   # Esperado: { "status": "ok", "db": "ok" }
   ```

### Consideraciones de producción

- El script `start` es un wrapper de Node para el bundle de TanStack Start. **No sirve assets estáticos** (`/assets/*` devuelve 404).
- En producción real, usa un reverse proxy (nginx, Caddy) o el adaptador del provider (Vercel, Netlify, Cloudflare Workers) para servir `dist/client/`.
- El endpoint `/api/health` responde `503` si la DB no está disponible; úsalo como `HEALTHCHECK` del contenedor/orquestador.

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Runtime | Node 22 |
| Package manager | pnpm workspaces |
| Build | Turborepo |
| Framework | TanStack Start (React 19 + Vite 7 + Nitro) |
| Routing | TanStack Router (file-based) |
| UI | Tailwind CSS v4 + shadcn/ui + Lucide |
| Estado | Cambio de finca por ruta (`/fincas/$fincaId`), no estado global |
| DB | PostgreSQL 17 + Drizzle ORM |
| Sync | Protocolo push/pull/outbox (interfaces definidas) |
| Tests | Vitest + `@vitest/coverage-v8` |
| Calidad | Biome + dependency-cruiser (reglas de capa) |

## Estructura del monorepo

```
ganaweb/
├── apps/
│   └── web/                    # Aplicación TanStack Start
├── packages/
│   ├── dominio/                # Entidades y reglas de negocio puras
│   ├── aplicacion/             # Puertos (interfaces de casos de uso)
│   ├── sync/                   # Protocolo de sincronización offline-first
│   ├── db/                     # Schema Drizzle, cliente y seed
│   ├── ui/                     # Componentes React: sistema de diseño ganado/
│   └── config/                 # tsconfig compartido + preset Biome
├── docs/                       # Documentación de referencia
└── openspec/                   # Especificaciones y cambios SDD
```

### Qué contiene cada paquete

| Paquete | Responsabilidad | Estado |
|---------|-----------------|--------|
| `@ganaweb/dominio` | Entidades + reglas de negocio puras. Sin dependencias externas. | ✅ Regla RN-001 con TDD |
| `@ganaweb/aplicacion` | Puertos: repositorios, reloj de sistema, outbox. | ✅ Interfaces |
| `@ganaweb/sync` | Puertos de push/pull/resolución de conflictos. | ✅ Interfaces |
| `@ganaweb/db` | Schema PostgreSQL, cliente Drizzle, seed. | ✅ Funcional |
| `@ganaweb/ui` | Componentes `ganado/` + primitives shadcn + tokens CSS. | ✅ Funcional |
| `@ganaweb/config` | Configuración compartida de TypeScript y Biome. | ✅ Funcional |
| `@ganaweb/web` | Aplicación web, rutas y layout raíz. | ✅ Scaffold funcional |

## Convenciones importantes

| Convención | Qué significa |
|------------|---------------|
| **Arquitectura** | `dominio` no conoce a `db`, `sync` ni `web`. `web` consume `aplicacion` + `ui` + `db`. `ui` no depende de `dominio`. |
| **Dependencias** | `dependency-cruiser` en CI bloquea violaciones de capa. |
| **Idioma del dominio** | Entidades y reglas en español: `Animal`, `validarCodigoUnicoPorFinca`, `RolFinca`. |
| **TDD** | Tests antes de implementar. Cobertura de `dominio` ≥ 90% en CI. |
| **UI** | Los componentes `ganado/` encapsulan todo el diseño; las páginas solo componen. |
| **Dark mode** | Tokens CSS runtime redefinidos bajo `.dark`. Ningún componente usa variantes `dark:`. |
| **RBAC** | La UI se protege por **permiso**, no por rol. Usar `tienePermiso()` de `types.ts`. |
| **Touch** | Elementos interactivos con altura mínima `--h-touch` (44px) y `focus-visible:ring`. |

## Componentes del sistema de diseño `ganado/`

Viven en `packages/ui/src/ganado/` y se exportan desde `@ganaweb/ui`.

| Componente | Para qué sirve |
|------------|----------------|
| `AnimalCard` | Listado mobile de animales (long-press, selección) |
| `MetricCard` | Métricas navegables con estado de carga |
| `EstadoBadge` | Badges de categoría, salud y stock |
| `SyncPill` | Indicador de sincronización (3 estados) |
| `Timeline` | Línea de tiempo con colores de dominio |
| `EmptyState` | Estado vacío con acción obligatoria |
| `FincaSwitcher` | Selector multi-finca (dropdown/lista) |
| `MaestroCard` / `MaestroGrid` / `MaestrosProgreso` | Índice de Configuración/Maestros |
| `ThemeToggle` | Alternador claro/oscuro |
| `EventDrawer` | Orquestador de eventos + formulario de vacuna |

> **Regla clave**: los componentes reciben datos por props desde la réplica local; nunca hacen fetch directo.

## Estado actual

### ✅ Ya funciona

- [x] Monorepo scaffold con Turborepo + pnpm workspaces.
- [x] Regla de negocio RN-001 (código único por finca) con TDD.
- [x] Schema Drizzle para `fincas` y `animales` con seed v3.
- [x] 12 componentes React del dominio ganadero.
- [x] 8 primitives shadcn + tokens CSS con modo oscuro.
- [x] RBAC con helpers de permisos.
- [x] Health-check endpoint (`GET /api/health`).
- [x] CI pipeline: lint → typecheck → test → build.
- [x] Layer enforcement con dependency-cruiser.

### 🔲 Próximo

- [ ] Casos de uso en `aplicacion`.
- [ ] Implementación del protocolo sync push/pull/outbox.
- [ ] Completar formularios del `EventDrawer` (peso, palpación, servicio, parto, producción).
- [ ] Capa offline: SQLite local + `sync_outbox` + tabla `usuarios_fincas`.
- [ ] Más rutas en `apps/web`.

## Documentación adicional

- [`docs/ganaweb-componentes/ganaweb/README.md`](./docs/ganaweb-componentes/ganaweb/README.md) — guía detallada de los componentes `ganado/`.
- [`openspec/`](./openspec/) — especificaciones SDD del proyecto.
