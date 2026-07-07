# GanaWeb — Especificaciones Técnicas (v1.0)
## Contrato de ingeniería para desarrolladores y agentes de IA

> Complementa: `arquitectura_funcional.md` (comportamiento),
> `schema_v3_corregido.sql` (datos), `design_brief_app_ganadera.md` (UX),
> `ganaweb-design.md` (visual), `seed_v3.ts` (datos iniciales).
>
> **Precedencia ante conflicto**: arquitectura funcional > esquema > este
> documento > brief. Un agente que encuentre una contradicción la REPORTA,
> no la resuelve en silencio.

---

## 1. Decisiones de arquitectura (resumen ADR)

| # | Decisión | Elección | Razón |
|---|---|---|---|
| A1 | Repositorio | **Monorepo GitHub** · pnpm workspaces + Turborepo | Un solo lugar para dominio, UI y app; caché de builds; refactors atómicos |
| A2 | Framework | **TanStack Start** (fullstack, server functions) | Un artefacto de deploy; type-safety extremo a extremo; el "backend" real es sync + dominio, no una API pública |
| A3 | ORM | **Drizzle** | Ya elegido (seed); mismo esquema tipado para Postgres y SQLite |
| A4 | Datos servidor | **PostgreSQL 17** | Fuente de verdad multi-finca |
| A5 | Datos cliente | **SQLite WASM (wa-sqlite) + OPFS** | PWA instalable; réplica local por finca para offline total |
| A6 | Sincronización | **Sync propio** sobre `sync_outbox` (§6) | El esquema v3 ya lo modela; control total de conflictos (RN-060/061); sin dependencia de un motor externo |
| A7 | Distribución móvil | **PWA instalable** | Sin tiendas; actualización inmediata; Capacitor queda como vía futura sin cambios de arquitectura |
| A8 | Estilos/UI | Tailwind v4 + shadcn/ui + paquete `ui` propio | Ya construido (ganaweb-componentes v1.2.1) |
| A9 | Tests | **Vitest** (unit/integración) + **Playwright** (E2E) + TDD en dominio | §5 |
| A10 | Lint/format | **Biome** | Una sola herramienta rápida (reemplaza ESLint+Prettier) |
| A11 | Despliegue | **Docker multi-stage + docker-compose en VPS Linux con Dokploy** | §7 |
| A12 | CI/CD | GitHub Actions + auto-deploy Dokploy (webhook en `main`) | §8 |

**Vía de escape documentada (A2)**: si se necesita la API pública del §5 de
la arquitectura funcional, se crea `apps/api` (Hono) en el monorepo
consumiendo `packages/dominio` y `packages/aplicacion`. La regla de capas
(§3) garantiza que esto no exige reescritura.

Versiones base: Node 22 LTS · pnpm ≥ 9 · TypeScript `strict: true` ·
PostgreSQL 17 · Playwright y Vitest últimas estables. Renovate bot activo.

---

## 2. Estructura del monorepo

```
ganaweb/
├─ apps/
│  └─ web/                     # TanStack Start (UI + server functions)
│     ├─ src/routes/           # file-based routing (/fincas/$fincaId/...)
│     ├─ src/server/           # server functions (adaptadores HTTP)
│     ├─ src/client/           # adaptadores cliente (SQLite local, sync)
│     └─ e2e/                  # tests Playwright
├─ packages/
│  ├─ dominio/                 # ★ Entidades, reglas RN/TR/PE PURAS (cero deps)
│  ├─ aplicacion/              # ★ Casos de uso = eventos de dominio (§4 AF) + puertos
│  ├─ db/                      # Esquema Drizzle (PG + SQLite) + repositorios + migraciones + seed
│  ├─ sync/                    # Protocolo de sincronización (§6), compartido cliente/servidor
│  ├─ ui/                      # Componentes ganado/ (v1.2.1) + tokens
│  └─ config/                  # tsconfig, biome, presets compartidos
├─ turbo.json · pnpm-workspace.yaml · biome.json
├─ Dockerfile · docker-compose.yml · .env.example
└─ .github/workflows/ci.yml
```

---

## 3. Arquitectura limpia — regla de dependencias

Las capas se materializan como **paquetes**, y la dirección de dependencia es
ley (verificada en CI con `dependency-cruiser`):

```
ui ──────────────┐
apps/web ──► aplicacion ──► dominio
   │              ▲
   └──► db ───────┘   (db implementa los puertos que aplicacion define)
```

- **`dominio`**: entidades (`Animal`, `Servicio`…), value objects, la máquina
  de estados (§2 AF) y las reglas RN/TR como **funciones puras**. Prohibido
  importar Drizzle, React, fetch o cualquier I/O. Aquí vive el TDD.
- **`aplicacion`**: un caso de uso por evento de dominio (§4 AF):
  `registrarVacuna`, `registrarParto`, `venderAnimal`… Cada caso de uso:
  valida permisos (PE-002), ejecuta reglas de dominio, escribe vía **puertos**
  (interfaces `RepositorioAnimales`, `RelojDelSistema`, `Outbox`) y retorna
  eventos/efectos. No sabe si corre en el navegador o en el servidor — **el
  mismo caso de uso se ejecuta offline contra SQLite y online contra
  Postgres**; esa simetría es el corazón del diseño.
- **`db`**: implementaciones Drizzle de los puertos,×2 (driver PG y driver
  wa-sqlite). Migraciones con `drizzle-kit` — **el esquema v3 es la fuente;
  ninguna migración manual por fuera**.
- **`apps/web`**: solo orquesta — rutas, loaders, server functions que
  invocan casos de uso, componentes de `ui`. **Las páginas no contienen
  reglas de negocio** (si un `if` de negocio aparece en una ruta, va a
  dominio).

Reglas duras:
- **T-001** — Ningún umbral de negocio hardcodeado: viene de
  `config_parametros_finca` (§7 AF).
- **T-002** — Todo insert de evento es append-only + fila outbox +
  efectos idempotentes (§4 AF). Los efectos re-derivables (categoría
  reproductiva, stock) se implementan como funciones recalculables (TR-014).
- **T-003** — Los nombres del dominio van **en español** (como el esquema:
  `registrarPalpacion`, `categoriaReproductiva`); el código de
  infraestructura puede usar inglés técnico. No traducir el dominio.
- **T-004** — Prohibido `dark:` en componentes/páginas: el theming es por
  tokens (`ganaweb-design.md` §4).

---

## 4. Convenciones de código y Git

- TypeScript `strict`, sin `any` (Biome lo bloquea); `type` sobre `interface`
  salvo puertos.
- **Trunk-based**: ramas cortas `feat/...`, `fix/...` → PR → squash a `main`.
  `main` siempre desplegable.
- **Conventional Commits** (`feat:`, `fix:`, `test:`, `refactor:`) — el
  scope es el paquete: `feat(dominio): RN-014 validación de parto`.
- Todo PR referencia las reglas que implementa (`Implementa RN-013, TR-011`)
  y CI en verde es requisito de merge.
- Un `CODEOWNERS` mínimo: `packages/dominio` y `packages/db` requieren
  revisión (es donde viven las reglas y los datos).

---

## 5. Testing — TDD y E2E

### Pirámide y dónde aplica TDD

| Nivel | Herramienta | Qué cubre | Regla |
|---|---|---|---|
| Unit (dominio) | Vitest | Reglas RN/TR/PE puras, máquina de estados, cálculos KPI | **TDD obligatorio**: red → green → refactor. Cobertura ≥ 90 % en `dominio` (gate de CI) |
| Integración | Vitest + SQLite en memoria / Postgres (Testcontainers) | Casos de uso completos contra ambos drivers; migraciones; sync push/pull | Cada caso de uso se testea **dos veces** (driver PG y SQLite) con la misma suite — garantiza la simetría offline/online |
| E2E | Playwright | Flujos críticos de usuario en el navegador real | Corre en PR sobre build de producción + Postgres efímero + `seed_v3` demo |
| Contrato de sync | Vitest | Protocolo §6: idempotencia, conflictos, orden | Property-based donde aplique (fast-check) |

### Reglas de test

- **TS-001** — Toda regla de negocio citable tiene al menos un test que la
  nombra: `describe('RN-014 parto exige PRENADA', ...)`. Un agente de IA que
  implemente una RN sin su test no cumple el Definition of Done.
- **TS-002** — Test de propiedad para TR-014: recalcular
  `categoria_reproductiva` desde la secuencia de eventos == valor cacheado,
  para secuencias generadas aleatoriamente.
- **TS-003** — Fixtures = `seed_v3.ts` (nivel demo). Los tests no inventan
  catálogos propios.
- **TS-004** — E2E mínimos e innegociables: (1) login + "mantener sesión";
  (2) registrar vacuna grupal **offline** (`context.setOffline(true)`) →
  reconectar → verificar sync y stock; (3) cambio de finca con pendientes
  (diálogo de advertencia); (4) RBAC: usuario Solo lectura no ve
  Configuración ni botones de crear.
- **TS-005** — Los tests de KPI validan contra las definiciones exactas del
  §6 de la arquitectura funcional (casos borde incluidos: ÷0 → "—",
  abortos fuera del IEP, etc.).

---

## 6. Sincronización offline (spec del protocolo propio)

Fuente de verdad: Postgres. Réplica: una base SQLite (OPFS) **por finca**
descargada tras el login (RN de FincaSwitcher: sin réplica local ⇒ finca
deshabilitada offline).

### Escritura (push)

1. El caso de uso escribe en SQLite local **y** encola en `sync_outbox`
   (misma transacción): `{id: UUID, finca_id, dispositivo_id, tabla_destino,
   operacion, payload, created_at}`.
2. El cliente hace push por lotes (orden FIFO por dispositivo) a la server
   function `sync.push`.
3. El servidor aplica cada entrada de forma **idempotente**: el UUID del
   registro es la clave — si ya existe, no-op (reintentos seguros). Marca
   `aplicado_en`.
4. Validaciones globales (unicidad de código, RN-060): si fallan, la entrada
   se responde como `conflicto` → el cliente la mueve a la **bandeja
   "Pendientes de revisión"** — nada se descarta en silencio.

### Lectura (pull)

- Pull incremental por finca con cursor `updated_at` + `id` (estable ante
  empates). Toda tabla sincronizable tiene `updated_at` indexado.
- Borrados lógicos viajan como updates (`activo=0` / `anulado_en`) — no hay
  DELETE físico en tablas de dominio, por diseño.
- Conflictos de estado: RN-061 (last-write-wins por timestamp del evento;
  ciclo de vida por severidad MUERTO > VENDIDO > EN_FINCA).

### Ciclo y garantías

- Trigger de sync: al recuperar conexión, al abrir la app, cada N min en
  foreground, y manual desde el SyncPill.
- El cliente muestra siempre el estado real (SyncPill: sincronizado / N
  pendientes / offline). Stock puede quedar negativo (RN-041): alerta, no
  error.
- Permisos offline: PE-004 (cacheados en la réplica; revocación aplica al
  próximo sync).
- Snapshot inicial: `sync.snapshot(fincaId)` streamea las tablas de la finca
  + catálogos globales a SQLite (una sola pasada, comprimida).

### PWA (cliente)

- `vite-plugin-pwa`: precache del shell, instalable, actualización con aviso
  ("Nueva versión — recargar").
- wa-sqlite sobre OPFS exige workers con `COOP: same-origin` y
  `COEP: require-corp` (configurar en el server Nitro y verificar en E2E).
- `navigator.storage.persist()` al primer login para reducir evicción
  (iOS/Safari puede purgar OPFS bajo presión: el outbox pendiente es lo único
  irrecuperable, por eso el sync es agresivo al reconectar).

---

## 7. Docker + Dokploy (VPS Linux)

### `Dockerfile` (multi-stage)

```dockerfile
# ---- deps + build ----
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter=web

# ---- runtime (solo el output de Nitro) ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /repo/apps/web/.output ./
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "server/index.mjs"]
```

### `docker-compose.yml`

```yaml
services:
  web:
    build: .
    restart: unless-stopped
    environment:
      DATABASE_URL: postgres://ganaweb:${POSTGRES_PASSWORD}@db:5432/ganaweb
      AUTH_SECRET: ${AUTH_SECRET}
      NODE_ENV: production
    depends_on:
      db: { condition: service_healthy }
    ports: ["3000:3000"]

  db:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ganaweb
      POSTGRES_USER: ganaweb
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ganaweb"]
      interval: 10s
      retries: 5

volumes:
  pgdata:
```

### Notas Dokploy

- Dokploy consume este compose directamente (proyecto tipo *Compose*); el
  dominio + TLS los gestiona su Traefik — **no** publicar el puerto 3000 en
  producción: usar la red de Dokploy y declarar el dominio en su UI.
- Secretos (`POSTGRES_PASSWORD`, `AUTH_SECRET`) en el gestor de variables de
  Dokploy, nunca en el repo (`.env.example` documenta las llaves).
- Migraciones: job de release `pnpm --filter db migrate` antes de levantar
  la nueva versión (Dokploy pre-deploy command). Seed sistema:
  `pnpm --filter db seed` (con `SEED_DEMO=true` solo en staging).
- Backups: cron en el VPS con `pg_dump` diario a almacenamiento externo
  (Dokploy tiene backups de volumen programables — activarlos).

---

## 8. CI/CD (GitHub Actions)

Pipeline `ci.yml` en cada PR y push a `main` (Turborepo cachea entre jobs):

1. `pnpm install --frozen-lockfile`
2. `biome ci .` (lint + format)
3. `pnpm turbo typecheck`
4. `pnpm turbo test` (unit + integración; Postgres via Testcontainers)
5. `pnpm turbo build`
6. `pnpm turbo e2e` (Playwright contra el build + seed demo)
7. Gate de cobertura de `packages/dominio` ≥ 90 %.

Deploy: merge a `main` → webhook de Dokploy → build del Dockerfile →
pre-deploy (migraciones) → swap. Rollback = redeploy del tag anterior desde
la UI de Dokploy.

---

## 9. Seguridad (resumen operativo)

- Contraseñas: **argon2id** (o bcrypt cost ≥ 12); historial contra reuso.
- Tokens de sesión/recuperación/2FA: **solo hashes** en BD (esquema v3.1).
- Server functions: revalidan permiso (PE-002) y finca del recurso en cada
  llamada — el `fincaId` de la URL jamás se confía sin verificar
  `usuarios_fincas`.
- Rate limiting en login/recuperación; lockout por `intentos_fallidos` +
  `bloqueado_hasta`.
- Headers: HSTS, COOP/COEP (§6 PWA), CSP básica. Cookies `httpOnly`,
  `secure`, `sameSite=lax`.

---

## 10. Definition of Done + reglas para agentes de IA

Un cambio está terminado cuando: implementa las reglas citándolas
(RN/TR/PE/T/TS-xxx) · tiene tests en el nivel que corresponde (TDD si tocó
dominio) · pasa CI completo · no introduce umbrales hardcodeados (T-001) ·
no rompe la regla de dependencias (§3) · actualiza la documentación afectada.

Para agentes de IA, además:
- **IA-001** — Ante ambigüedad o contradicción entre documentos: detenerse y
  preguntar citando los documentos en conflicto. Nunca inventar una regla.
- **IA-002** — No crear tablas, columnas ni permisos fuera del esquema v3 y
  del catálogo §1.2 de la arquitectura funcional sin proponerlo primero.
- **IA-003** — Reutilizar los componentes de `packages/ui` antes de crear
  nuevos; un componente nuevo exige justificar por qué ninguno existente
  sirve.
- **IA-004** — Los textos de UI en español (Colombia), con el vocabulario del
  dominio (potrero, palpación, pajuela) — ver "Voz y contenido" del design
  system.
