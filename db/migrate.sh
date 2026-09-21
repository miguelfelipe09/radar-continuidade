#!/bin/sh
#
# Aplica as migrations pendentes de db/migrations, em ordem alfabética.
#
# Roda dentro do serviço `migrate` do docker compose, que sobe junto com o
# resto no `docker compose up`, aplica o schema e encerra. Não depende de
# bash nem de cliente Postgres no host: o psql vem da própria imagem do
# Postgres, e a conexão vem de PGHOST/PGUSER/PGPASSWORD/PGDATABASE.
#
set -eu

DIR_MIGRATIONS="${DIR_MIGRATIONS:-/db/migrations}"

psql_exec() {
    psql -v ON_ERROR_STOP=1 "$@"
}

echo "Aguardando o Postgres aceitar conexões..."
tentativas=0
until pg_isready -q; do
    tentativas=$((tentativas + 1))
    if [ "$tentativas" -ge 60 ]; then
        echo "Postgres não respondeu em 60 s:" >&2
        pg_isready >&2 || true
        exit 1
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

for arquivo in "$DIR_MIGRATIONS"/*.sql; do
    [ -e "$arquivo" ] || continue
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
