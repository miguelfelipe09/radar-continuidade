"""Configuração e constantes do ETL."""

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"

# Acima disto a duração é marcada como suspeita, mas a linha é mantida
# (ACHADOS §9): 843 casos em 2026, plausíveis em área rural.
DURACAO_SUSPEITA_MINUTOS = 7 * 24 * 60

# Só códigos IBGE de 7 dígitos são aceitos (ACHADOS §10).
IBGE_MIN = 1_000_000
IBGE_MAX = 9_999_999

# No layout novo o campo nunca é nulo: sem expurgo vem este texto (ACHADOS §6).
SEM_EXPURGO = "Não houve Expurgo"

# Prefixo numérico do código IBGE -> sigla da UF. Tabela fixa do IBGE; a
# exploração confirmou 27 UFs nos códigos válidos.
UF_POR_PREFIXO = {
    11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO",
    21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB", 26: "PE", 27: "AL",
    28: "SE", 29: "BA", 31: "MG", 32: "ES", 33: "RJ", 35: "SP", 41: "PR",
    42: "SC", 43: "RS", 50: "MS", 51: "MT", 52: "GO", 53: "DF",
}


def database_url() -> str:
    """URL do Postgres, do ambiente ou do .env na raiz do projeto."""
    url = os.environ.get("DATABASE_URL")
    if url:
        return url

    env = ROOT / ".env"
    if env.exists():
        for linha in env.read_text(encoding="utf-8").splitlines():
            linha = linha.strip()
            if linha.startswith("DATABASE_URL="):
                return linha.split("=", 1)[1].strip()

    raise RuntimeError(
        "DATABASE_URL não definida. Copie .env.example para .env ou exporte a variável."
    )


def parquet_path(ano: int) -> Path:
    return DATA_DIR / f"interrupcoes-energia-eletrica-{ano}.parquet"
