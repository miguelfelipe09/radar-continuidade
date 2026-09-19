"""Download dos Parquet anuais do portal de dados abertos da ANEEL.

O portal roda CKAN, então a URL do arquivo é resolvida pela API em vez de
ficar fixa no código: a ANEEL republica o arquivo do ano a cada mês e o
identificador do recurso pode mudar.
"""

import json
import shutil
import urllib.error
import urllib.request
from pathlib import Path

from .config import DATA_DIR, parquet_path

CKAN_BASE = "https://dadosabertos.aneel.gov.br"
DATASET = "interrupcoes-de-energia-eletrica-nas-redes-de-distribuicao"
TIMEOUT = 60
USER_AGENT = "radar-continuidade/1.0 (+ETL de interrupcoes ANEEL)"


class DownloadError(RuntimeError):
    pass


def _abrir(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    return urllib.request.urlopen(req, timeout=TIMEOUT)


def resource_url(ano: int) -> str:
    """Resolve a URL do Parquet do ano pela API do CKAN."""
    api = f"{CKAN_BASE}/api/3/action/package_show?id={DATASET}"
    try:
        with _abrir(api) as resp:
            pacote = json.load(resp)
    except (urllib.error.URLError, TimeoutError, OSError) as erro:
        raise DownloadError(
            f"não foi possível consultar o catálogo da ANEEL ({api}): {erro}"
        ) from erro

    if not pacote.get("success"):
        raise DownloadError(f"a API do CKAN respondeu sem sucesso para {DATASET}")

    alvo = f"interrupcoes-energia-eletrica-{ano}"
    for recurso in pacote["result"]["resources"]:
        nome = (recurso.get("name") or "").strip().lower()
        formato = (recurso.get("format") or "").strip().lower()
        if nome == alvo and formato == "parquet":
            return recurso["url"]

    disponiveis = sorted(
        (r.get("name") or "?") for r in pacote["result"]["resources"]
        if (r.get("format") or "").lower() == "parquet"
    )
    raise DownloadError(
        f"ano {ano} não encontrado no catálogo. Parquets disponíveis: {', '.join(disponiveis)}"
    )


def baixar_ano(ano: int, forcar: bool = False) -> Path:
    """Baixa o Parquet do ano para data/. Devolve o caminho do arquivo."""
    destino = parquet_path(ano)
    if destino.exists() and not forcar:
        print(f"  {destino.name} já existe ({destino.stat().st_size:,} bytes) — use --forcar para rebaixar")
        return destino

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    url = resource_url(ano)
    print(f"  {ano}: {url}")

    # Baixa para .part e só renomeia no fim, para uma interrupção não deixar
    # arquivo truncado passando por íntegro.
    parcial = destino.with_suffix(".parquet.part")
    try:
        with _abrir(url) as resp, open(parcial, "wb") as saida:
            shutil.copyfileobj(resp, saida, length=1024 * 1024)
    except (urllib.error.URLError, TimeoutError, OSError) as erro:
        parcial.unlink(missing_ok=True)
        raise DownloadError(f"falha ao baixar {url}: {erro}") from erro

    parcial.replace(destino)
    print(f"  {destino.name}: {destino.stat().st_size:,} bytes")
    return destino
