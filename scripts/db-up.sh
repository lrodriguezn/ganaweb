#!/usr/bin/env bash
# =============================================================================
# db-up.sh — Levanta PostgreSQL en Docker desde cero (fresh), ejecuta
# migraciones y seed.
#
# Uso:
#   bash scripts/db-up.sh
#   pnpm db:up            (desde el root package.json)
# =============================================================================
set -euo pipefail

DB_CONTAINER="ganaweb-postgres"
DB_VOLUME="ganaweb_pgdata"
DB_IMAGE="postgres:17-alpine"
DB_URL="postgresql://postgres:postgres@localhost:5432/ganaweb"

echo "=== Limpiando contenedor y volumen anterior (si existen) ==="
docker rm -f "$DB_CONTAINER" 2>/dev/null || true
docker volume rm "$DB_VOLUME" 2>/dev/null || true

echo "=== Creando contenedor PostgreSQL ==="
docker run -d \
  --name "$DB_CONTAINER" \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ganaweb \
  -v "$DB_VOLUME":/var/lib/postgresql/data \
  -p 5432:5432 \
  "$DB_IMAGE"

echo "=== Esperando a que PostgreSQL esté listo ==="
until docker exec "$DB_CONTAINER" pg_isready -U postgres > /dev/null 2>&1; do
  sleep 1
done
echo "PostgreSQL listo."

echo "=== Ejecutando migraciones ==="
pnpm --filter @ganaweb/db migrate

echo "=== Ejecutando seed (sistema) ==="
DATABASE_URL="$DB_URL" pnpm --filter @ganaweb/db seed

echo ""
echo "✅ DB lista. Usuarios disponibles:"
echo "   - admin@ganaweb.demo / Admin123!  (si correste seed-v3-full con SEED_DEMO=true)"
echo ""
echo "   Comandos útiles:"
echo "   psql $DB_URL"
echo "   docker exec -it $DB_CONTAINER psql -U postgres -d ganaweb"
