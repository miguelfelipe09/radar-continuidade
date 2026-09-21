import { useEffect, useState } from 'react';
import type { ItemFila } from '@/tipos/api';
import { api, ErroApi } from '@/lib/api';
import { competencia as fmtCompetencia, inteiro, plural } from '@/lib/formato';
import type { Estado } from '@/lib/utils';
import {
  Esqueleto,
  EstadoErro,
  EstadoVazio,
  Pagina,
  TituloSecao,
} from '@/componentes/ui/Pagina';
import { Filtros, type Distribuidora } from '@/componentes/fila/Filtros';
import { TabelaFila } from '@/componentes/fila/TabelaFila';
import { TabelaAusentes } from '@/componentes/fila/TabelaAusentes';

const TAMANHO_PAGINA = 50;

export function Fila({ competencia }: { competencia: string }) {
  const [severidades, setSeveridades] = useState<Estado[]>(['alta', 'moderada']);
  const [cnpj, setCnpj] = useState('');
  const [pagina, setPagina] = useState(1);

  const [itens, setItens] = useState<ItemFila[] | null>(null);
  const [total, setTotal] = useState(0);
  const [ausentes, setAusentes] = useState<ItemFila[]>([]);
  const [distribuidoras, setDistribuidoras] = useState<Distribuidora[]>([]);
  const [totaisEvento, setTotaisEvento] = useState<Record<string, number>>({});
  const [erro, setErro] = useState<string | null>(null);

  // A lista de distribuidoras vem do ranking, que é a única rota que devolve
  // todas as da competência.
  useEffect(() => {
    let ativo = true;
    api
      .ranking(competencia, 'dec_aprox', 100)
      .then((r) => {
        if (!ativo) return;
        setDistribuidoras(
          r.itens
            .map((i) => i.distribuidora)
            .sort((a, b) => a.sigla.localeCompare(b.sigla, 'pt-BR')),
        );
      })
      .catch(() => ativo && setDistribuidoras([]));
    return () => {
      ativo = false;
    };
  }, [competencia]);

  useEffect(() => {
    setPagina(1);
  }, [competencia, cnpj, severidades.join(',')]);

  useEffect(() => {
    let ativo = true;
    setItens(null);
    setErro(null);

    const filtro = {
      competencia,
      severidade: severidades.join(','),
      distribuidora: cnpj || undefined,
      pagina,
      tamanho: TAMANHO_PAGINA,
    };

    Promise.all([
      api.fila(filtro),
      api.fila({ competencia, situacao: 'ausente', distribuidora: cnpj || undefined, tamanho: 200 }),
    ])
      .then(async ([alertas, semDado]) => {
        if (!ativo) return;
        setItens(alertas.itens ?? []);
        setTotal(alertas.total);
        setAusentes(semDado.itens ?? []);

        // O cabeçalho do grupo precisa do total da distribuidora na
        // competência, não só do que coube nesta página.
        const cnpjsEvento = [
          ...new Set(
            (alertas.itens ?? [])
              .filter((i) => i.contexto.evento_regional)
              .map((i) => i.distribuidora.cnpj),
          ),
        ];
        const totais: Record<string, number> = {};
        await Promise.all(
          cnpjsEvento.map(async (c) => {
            const r = await api.fila({
              competencia,
              severidade: severidades.join(','),
              distribuidora: c,
              tamanho: 1,
            });
            totais[c] = r.total;
          }),
        );
        if (ativo) setTotaisEvento(totais);
      })
      .catch((e: ErroApi) => ativo && setErro(e.message));

    return () => {
      ativo = false;
    };
  }, [competencia, severidades.join(','), cnpj, pagina]);

  const alternarSeveridade = (s: Estado) =>
    setSeveridades((atual) =>
      atual.includes(s) ? atual.filter((x) => x !== s) : [...atual, s],
    );

  const limpar = () => {
    setSeveridades(['alta', 'moderada']);
    setCnpj('');
  };

  const temFiltro =
    cnpj !== '' ||
    severidades.length !== 2 ||
    !severidades.includes('alta') ||
    !severidades.includes('moderada');

  const ultimaPagina = Math.max(1, Math.ceil(total / TAMANHO_PAGINA));

  return (
    <Pagina
      titulo="Fila de investigação"
      subtitulo={
        <>
          Competência {fmtCompetencia(competencia)} · ordenada por consumidores
          afetados
        </>
      }
    >
      <Filtros
        severidades={severidades}
        aoAlternarSeveridade={alternarSeveridade}
        distribuidoras={distribuidoras}
        cnpjSelecionado={cnpj}
        aoSelecionarDistribuidora={setCnpj}
        aoLimpar={limpar}
        temFiltro={temFiltro}
      />

      {erro ? (
        <EstadoErro mensagem={erro} />
      ) : (
        <>
          <TituloSecao>
            Alertas
            {itens && (
              <span className="ml-2 text-[15px] font-medium text-muted-foreground">
                {inteiro(total)} {plural(total, 'conjunto', 'conjuntos')}
              </span>
            )}
          </TituloSecao>

          {!itens ? (
            <Esqueleto className="h-[420px]" />
          ) : itens.length === 0 ? (
            <EstadoVazio titulo="Nenhum conjunto na fila com os filtros atuais." />
          ) : (
            <>
              <TabelaFila itens={itens} totaisPorDistribuidora={totaisEvento} />
              {ultimaPagina > 1 && (
                <div className="mt-4 flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">
                    Página <span className="numerico">{pagina}</span> de{' '}
                    <span className="numerico">{ultimaPagina}</span>
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={pagina === 1}
                      onClick={() => setPagina((p) => p - 1)}
                      className="rounded-lg border px-3 py-1.5 font-semibold shadow-card disabled:opacity-40"
                    >
                      anterior
                    </button>
                    <button
                      disabled={pagina === ultimaPagina}
                      onClick={() => setPagina((p) => p + 1)}
                      className="rounded-lg border px-3 py-1.5 font-semibold shadow-card disabled:opacity-40"
                    >
                      próxima
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {ausentes.length > 0 && (
            <>
              <TituloSecao className="text-muted-foreground">
                Sem dado
                <span className="ml-2 text-[15px] font-medium text-muted-foreground">
                  {inteiro(ausentes.length)} {plural(ausentes.length, 'conjunto', 'conjuntos')}
                </span>
              </TituloSecao>
              <p className="-mt-2 mb-4 text-sm text-muted-foreground">
                Conjuntos que reportavam e não aparecem nesta competência. Não estão na
                fila por falta de dado, não por ausência de problema.
              </p>
              <TabelaAusentes itens={ausentes} />
            </>
          )}
        </>
      )}
    </Pagina>
  );
}
