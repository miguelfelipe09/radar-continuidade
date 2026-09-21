import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Info, Minus } from 'lucide-react';
import type { ItemRanking, RespostaRanking } from '@/tipos/api';
import { api, ErroApi } from '@/lib/api';
import {
  competencia as fmtCompetencia,
  decimal,
  inteiro,
  porcentagem,
} from '@/lib/formato';
import { cn } from '@/lib/utils';
import { Chip } from '@/componentes/ui/Estado';
import { Esqueleto, EstadoErro, Pagina, TituloSecao } from '@/componentes/ui/Pagina';

type Ordem = 'dec_aprox' | 'fec_aprox' | 'variacao';

const ORDENS: Array<{ valor: Ordem; rotulo: string }> = [
  { valor: 'dec_aprox', rotulo: 'DEC aproximado' },
  { valor: 'fec_aprox', rotulo: 'FEC aproximado' },
  { valor: 'variacao', rotulo: 'piora contra o ano anterior' },
];

/** Abaixo disto a comparação com o ano anterior cobre só parte da frota e
 *  merece ressalva: seis distribuidoras renumeraram conjuntos entre 2025 e
 *  2026 (ACHADOS §14). */
const SOBREPOSICAO_PLENA = 0.95;

export function Ranking({ competencia }: { competencia: string }) {
  const [ordem, setOrdem] = useState<Ordem>('dec_aprox');
  const [dados, setDados] = useState<RespostaRanking | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setDados(null);
    setErro(null);
    api
      .ranking(competencia, ordem, 100)
      .then((r) => ativo && setDados(r))
      .catch((e: ErroApi) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, [competencia, ordem]);

  return (
    <Pagina
      titulo="Piores distribuidoras"
      subtitulo={
        <>
          Competência {fmtCompetencia(competencia)} · <b>a posição 1 é a pior</b>, não a
          melhor
        </>
      }
    >
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-muted-foreground">Ordenar por</span>
        {ORDENS.map((o) => (
          <button
            key={o.valor}
            onClick={() => setOrdem(o.valor)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-[13px] font-semibold transition-colors',
              ordem === o.valor
                ? 'border-transparent bg-acento text-white'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {o.rotulo}
          </button>
        ))}
      </div>

      {erro ? (
        <EstadoErro mensagem={erro} />
      ) : !dados ? (
        <>
          <TituloSecao>Ranking</TituloSecao>
          <Esqueleto className="h-[520px]" />
        </>
      ) : (
        <>
          <TituloSecao>
            Ranking
            <span className="ml-2 text-[15px] font-medium text-muted-foreground">
              mediana dos conjuntos de cada distribuidora
            </span>
          </TituloSecao>
          <Tabela itens={dados.itens} />
          <p className="mt-3 flex items-start gap-2 text-[13px] text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            A comparação com o ano anterior usa apenas os conjuntos presentes nas duas
            competências. Seis distribuidoras renumeraram conjuntos entre 2025 e 2026, e
            comparar frotas diferentes produziria variação inventada.
          </p>
        </>
      )}
    </Pagina>
  );
}

function Tabela({ itens }: { itens: ItemRanking[] }) {
  return (
    <div className="overflow-hidden rounded-lg border shadow-card">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[52px]" />
          <col />
          <col className="w-[92px]" />
          <col className="w-[118px]" />
          <col className="w-[104px]" />
          <col className="w-[104px]" />
          <col className="w-[210px]" />
          <col className="w-[120px]" />
        </colgroup>
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-3 py-2 text-left text-rotulo uppercase text-muted-foreground">
              #
            </th>
            <th className="px-3 py-2 text-left text-rotulo uppercase text-muted-foreground">
              Distribuidora
            </th>
            <th className="px-3 py-2 text-right text-rotulo uppercase text-muted-foreground">
              Conjuntos
            </th>
            <th className="px-3 py-2 text-right text-rotulo uppercase text-muted-foreground">
              Consumidores
            </th>
            <th className="px-3 py-2 text-right text-rotulo uppercase text-muted-foreground">
              DEC aprox.
            </th>
            <th className="px-3 py-2 text-right text-rotulo uppercase text-muted-foreground">
              FEC aprox.
            </th>
            <th className="px-3 py-2 text-left text-rotulo uppercase text-muted-foreground">
              Contra o mesmo mês do ano anterior
            </th>
            <th className="px-3 py-2 text-left text-rotulo uppercase text-muted-foreground">
              Na fila
            </th>
          </tr>
        </thead>
        <tbody>
          {itens.map((i) => (
            <tr key={i.distribuidora.cnpj} className="border-b last:border-b-0">
              <td className="px-3 py-3">
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-md text-[13px] font-bold numerico',
                    i.posicao <= 3
                      ? 'bg-alta-bg text-alta-fg'
                      : 'bg-secondary text-secondary-foreground',
                  )}
                >
                  {i.posicao}
                </span>
              </td>
              <td className="max-w-0 truncate px-3 py-3 text-[14px] font-semibold">
                {i.distribuidora.sigla}
              </td>
              <td className="px-3 py-3 text-right text-[13px] numerico">
                {inteiro(i.conjuntos)}
              </td>
              <td className="px-3 py-3 text-right text-[13px] numerico">
                {inteiro(i.consumidores_ativos)}
              </td>
              <td className="px-3 py-3 text-right text-[14px] font-semibold numerico">
                {decimal(i.dec_aprox)}
              </td>
              <td className="px-3 py-3 text-right text-[14px] numerico">
                {decimal(i.fec_aprox)}
              </td>
              <td className="px-3 py-3">
                <Variacao item={i} />
              </td>
              <td className="px-3 py-3">
                <Alertas item={i} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Nunca um traço vazio: ou o número com a base que o sustenta, ou o motivo
 *  de não haver número. */
function Variacao({ item }: { item: ItemRanking }) {
  const a = item.ano_anterior;

  if (a.variacao_pct === null) {
    return (
      <span className="flex items-start gap-1.5 text-[13px] text-ausente-fg">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Sem base comparável: nenhum conjunto de agora existia no ano anterior.
        </span>
      </span>
    );
  }

  const piorou = a.variacao_pct > 0;
  const Seta = piorou ? ArrowUpRight : a.variacao_pct < 0 ? ArrowDownRight : Minus;
  const parcial = a.sobreposicao < SOBREPOSICAO_PLENA;

  return (
    <span className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1.5 text-[13px]">
        <Seta
          className={cn('size-4', piorou ? 'text-alta-fg' : 'text-normal-fg')}
        />
        <b
          className={cn(
            'font-semibold numerico',
            piorou ? 'text-alta-fg' : 'text-normal-fg',
          )}
        >
          {a.variacao_pct > 0 ? '+' : ''}
          {decimal(a.variacao_pct, 1)}%
        </b>
        <span className="text-muted-foreground numerico">
          de {decimal(a.dec_aprox)}
        </span>
      </span>
      {parcial && (
        <span className="text-[12px] text-moderada-fg">
          cobre {porcentagem(a.sobreposicao)} da frota ({inteiro(a.conjuntos_comparaveis)}{' '}
          de {inteiro(item.conjuntos)} conjuntos)
        </span>
      )}
    </span>
  );
}

function Alertas({ item }: { item: ItemRanking }) {
  const { alta, moderada } = item.alertas;
  if (alta === 0 && moderada === 0) {
    return <span className="text-[13px] text-muted-foreground">—</span>;
  }
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {alta > 0 && (
        <Chip estado="alta" className="px-2 py-1 text-[12px]">
          {alta} alta{alta > 1 ? 's' : ''}
        </Chip>
      )}
      {moderada > 0 && (
        <Chip estado="moderada" className="px-2 py-1 text-[12px]">
          {moderada} mod.
        </Chip>
      )}
    </span>
  );
}
