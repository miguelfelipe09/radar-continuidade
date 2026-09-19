"""Download dos Parquet anuais do portal de dados abertos da ANEEL.

O portal roda CKAN, então a URL do arquivo é resolvida pela API em vez de
ficar fixa no código: a ANEEL republica o arquivo do ano a cada mês e o
identificador do recurso pode mudar.
"""

import json
import time
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


def catalogo() -> dict:
    """Baixa o package_show do dataset. Ver etl/fixtures/package_show.json."""
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
    return pacote


def encontrar_recurso(pacote: dict, ano: int) -> dict:
    """Acha o recurso Parquet do ano dentro do catálogo.

    Cada ano aparece duas vezes: um ZIP com o nome sem extensão e um Parquet
    cujo nome traz o `.parquet`. É o Parquet que queremos — o DuckDB o lê
    direto, sem descompactar.
    """
    alvo = f"interrupcoes-energia-eletrica-{ano}"
    for recurso in pacote["result"]["resources"]:
        nome = (recurso.get("name") or "").strip().lower()
        formato = (recurso.get("format") or "").strip().lower()
        if formato == "parquet" and nome.removesuffix(".parquet") == alvo:
            return recurso

    disponiveis = sorted(
        (r.get("name") or "?") for r in pacote["result"]["resources"]
        if (r.get("format") or "").lower() == "parquet"
    )
    raise DownloadError(
        f"ano {ano} não encontrado no catálogo. Parquets disponíveis: {', '.join(disponiveis)}"
    )


def resource_url(ano: int) -> str:
    return encontrar_recurso(catalogo(), ano)["url"]


def baixar_ano(ano: int, forcar: bool = False, limite_bytes: int | None = None) -> Path:
    """Baixa o Parquet do ano para data/. Devolve o caminho do arquivo.

    `limite_bytes` interrompe depois de N bytes e não promove o arquivo: serve
    para validar a URL sem puxar o arquivo inteiro.
    """
    destino = parquet_path(ano)
    if destino.exists() and not forcar and limite_bytes is None:
        print(f"  {destino.name} já existe ({destino.stat().st_size:,} bytes) — use --forcar para rebaixar")
        return destino

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    recurso = encontrar_recurso(catalogo(), ano)
    url = recurso["url"]
    esperado = recurso.get("size")
    print(f"  {ano}: {url}")
    print(f"  publicado em {recurso.get('last_modified')}, {esperado:,} bytes no catálogo")

    # Baixa para .part e só renomeia no fim, para uma interrupção não deixar
    # arquivo truncado passando por íntegro.
    parcial = destino.with_suffix(".parquet.part")
    baixados = 0
    inicio = time.monotonic()
    try:
        with _abrir(url) as resp, open(parcial, "wb") as saida:
            while bloco := resp.read(1024 * 1024):
                saida.write(bloco)
                baixados += len(bloco)
                print(f"\r  baixados {baixados:,} bytes", end="", flush=True)
                if limite_bytes is not None and baixados >= limite_bytes:
                    break
        print()
    except (urllib.error.URLError, TimeoutError, OSError) as erro:
        parcial.unlink(missing_ok=True)
        raise DownloadError(f"falha ao baixar {url}: {erro}") from erro

    segundos = time.monotonic() - inicio
    if limite_bytes is not None:
        parcial.unlink(missing_ok=True)
        print(f"  parcial: {baixados:,} bytes em {segundos:.1f}s — URL resolvida e servindo dados")
        return destino

    # O catálogo informa o tamanho: conferir evita promover download truncado.
    if esperado and baixados != esperado:
        parcial.unlink(missing_ok=True)
        raise DownloadError(
            f"download incompleto: {baixados:,} bytes recebidos, {esperado:,} esperados"
        )

    parcial.replace(destino)
    print(f"  {destino.name}: {destino.stat().st_size:,} bytes em {segundos:.1f}s")
    return destino
