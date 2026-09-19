#!/usr/bin/env bash
#
# Aplica as migrations pendentes de db/migrations, em ordem alfabética.
#
# Usa o psql de dentro do container do Postgres (docker compose exec), então
# não exige cliente Postgres nem dependência de migration no host.
#
#   ./db/migrate.sh
#
set -euo pipefail

SERVICO="${DB_SERVICE:-db}"
USUARIO="${POSTGRES_USER:-app}"
BANCO="${POSTGRES_DB:-continuidade}"

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR_MIGRATIONS="$RAIZ/db/migrations"

cd "$RAIZ"

psql_exec() {
    docker compose exec -T "$SERVICO" \
        psql -U "$USUARIO" -d "$BANCO" -v ON_ERROR_STOP=1 "$@"
}

echo "Aguardando o Postgres aceitar conexões..."
for _ in $(seq 1 30); do
    if docker compose exec -T "$SERVICO" pg_isready -U "$USUARIO" -d "$BANCO" >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

psql_exec -q -c "
    CREATE TABLE IF NOT EXISTS schema_migrations (
        filename    text PRIMARY KEY,
        applied_at  timestamptz NOT NULL DEFAULT now()
    );
"

pendentes=0

shopt -s nullglob
for arquivo in "$DIR_MIGRATIONS"/*.sql; do
    nome="$(basename "$arquivo")"

    aplicada="$(psql_exec -tAc "SELECT 1 FROM schema_migrations WHERE filename = '$nome'")"
    if [ "$aplicada" = "1" ]; then
        echo "  já aplicada: $nome"
        continue
    fi

    echo "  aplicando:   $nome"
    # Arquivo e registro no mesmo BEGIN/COMMIT: se o SQL falhar, ON_ERROR_STOP
    # aborta antes do COMMIT e nada fica pela metade.
    {
        echo "BEGIN;"
        cat "$arquivo"
        echo "INSERT INTO schema_migrations (filename) VALUES ('$nome');"
        echo "COMMIT;"
    } | psql_exec -q -f -

    pendentes=$((pendentes + 1))
done

if [ "$pendentes" -eq 0 ]; then
    echo "Nada a aplicar."
else
    echo "$pendentes migration(s) aplicada(s)."
fi
