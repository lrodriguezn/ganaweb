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

# Forzar password explícitamente: el hash que asigna initdb al crear el
# cluster no siempre coincide con la conexión TCP desde el host (Docker NAT
# hace que la IP origen sea la del bridge, no 127.0.0.1, y cae en la regla
# scram-sha-256). Este ALTER asegura que el hash sea correcto.
echo "=== Asegurando contraseña del rol postgres ==="
docker exec "$DB_CONTAINER" psql -U postgres -d ganaweb \
  -c "ALTER ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'postgres';"

echo "=== Ejecutando migraciones ==="
pnpm --filter @ganaweb/db migrate

echo "=== Ejecutando seed (sistema + datos demo) ==="
DATABASE_URL="$DB_URL" SEED_DEMO=true pnpm --filter @ganaweb/db seed

echo ""
echo "✅ DB lista."
echo ""
echo "   Usuarios demo disponibles:"
echo "   - admin@ganaweb.demo / Admin123!  (Administradora en La Esperanza)"
echo "   - pedro@ganaweb.demo / Admin123!  (Mayordomo en La Esperanza)"
echo ""
echo "   Comandos útiles:"
echo "   psql $DB_URL"
echo "   docker exec -it $DB_CONTAINER psql -U postgres -d ganaweb"
