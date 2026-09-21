import { useEffect, useState } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import type { RespostaConjunto } from '@/tipos/api';
import { api, ErroApi } from '@/lib/api';
import {
  competencia as fmtCompetencia,
  decimal,
  inteiro,
  plural,
  porcentagem,
} from '@/lib/formato';
import { irPara } from '@/lib/rotas';
import { cn, type Estado } from '@/lib/utils';
import { Badge, Chip, FaixaEstado } from '@/componentes/ui/Estado';
import {
  Esqueleto,
  EstadoErro,
  EstadoVazio,
  Pagina,
  TituloSecao,
} from '@/componentes/ui/Pagina';
import { GraficoSerie } from '@/componentes/conjunto/GraficoSerie';

export function Conjunto({ id, competencia }: { id: number; competencia: string }) {
  const [dados, setDados] = useState<RespostaConjunto | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setDados(null);
    setErro(null);
    api
      .conjunto(id, competencia)
      .then((r) => ativo && setDados(r))
      .catch((e: ErroApi) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, [id, competencia]);

  const voltar = (
    <button
      onClick={() => irPara({ tela: 'fila' })}
      className="flex h-10 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold shadow-card hover:bg-muted"
    >
      <ArrowLeft className="size-4" />
      Voltar à fila
    </button>
  );

  if (erro) {
    return (
      <Pagina titulo={`Conjunto ${id}`} acoes={voltar}>
        <EstadoErro mensagem={erro} />
      </Pagina>
    );
  }

  if (!dados) {
    return (
      <Pagina titulo="Carregando…" acoes={voltar}>
        <Esqueleto className="mt-6 h-[120px]" />
        <Esqueleto className="mt-6 h-[340px]" />
      </Pagina>
    );
  }

  const { resumo, serie, mesmo_mes_anos_anteriores, causas, alimentadores } = dados;

  return (
    <Pagina
      titulo={dados.conjunto.nome ?? `Conjunto ${dados.conjunto.id}`}
      subtitulo={
        <span className="flex flex-wrap items-center gap-2">
          <Badge>#{dados.conjunto.id}</Badge>
          <span>{dados.distribuidora.sigla}</span>
          <span className="text-muted-foreground">·</span>
          <span>competência {fmtCompetencia(dados.competencia.rotulo)}</span>
        </span>
      }
      acoes={voltar}
    >
      {resumo && <Resumo resumo={resumo} />}

      <TituloSecao>Série histórica</TituloSecao>
      <GraficoSerie serie={serie} competenciaAtual={dados.competencia.rotulo} />

      <TituloSecao>Mesmo mês, anos anteriores</TituloSecao>
      <MesmoMes itens={mesmo_mes_anos_anteriores} atual={dados.competencia.rotulo} />

      <TituloSecao>Causas da competência</TituloSecao>
      {causas.length === 0 ? (
        <EstadoVazio titulo="Nenhuma interrupção registrada nesta competência." />
      ) : (
        <TabelaCausas causas={causas} />
      )}

      <TituloSecao>Alimentadores</TituloSecao>
      {!dados.alimentadores_disponiveis ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-dashed border-ausente-fg/30 bg-ausente-bg/60 px-4 py-3 text-sm text-ausente-fg">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            O detalhamento por alimentador existe apenas a partir de 2026. Na estrutura
            anterior da base, metade dos códigos de alimentador não sobrevive à virada de
            layout, então eles não são comparáveis com os atuais.
          </span>
        </div>
      ) : alimentadores.length === 0 ? (
        <EstadoVazio titulo="Nenhum alimentador registrado nesta competência." />
      ) : (
        <TabelaAlimentadores itens={alimentadores} />
      )}
    </Pagina>
  );
}

function Resumo({ resumo }: { resumo: NonNullable<RespostaConjunto['resumo']> }) {
  const { contexto, baseline } = resumo;

  return (
    <div className="mt-6 rounded-lg border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start gap-x-10 gap-y-5">
        <Campo rotulo="Situação">
          {resumo.severidade ? (
            <Chip estado={resumo.severidade as Estado}>{resumo.severidade}</Chip>
          ) : (
            <Chip estado="ausente">{resumo.situacao}</Chip>
          )}
        </Campo>
        <Campo rotulo="DEC aproximado">
          <span className="text-numero numerico">{decimal(resumo.dec_aprox)}</span>
        </Campo>
        {baseline && (
          <>
            <Campo rotulo="Normal do conjunto">
              <span className="text-[15px] font-semibold numerico">
                {decimal(baseline.mediana)}
              </span>
              <span className="ml-1 text-[13px] text-muted-foreground">
                mediana de {inteiro(baseline.pontos)} competências
              </span>
            </Campo>
            <Campo rotulo="Desvio">
              <span className="text-[15px] font-semibold numerico">
                {decimal(resumo.desvio_iqr, 1)} IQR
              </span>
            </Campo>
          </>
        )}
        <Campo rotulo="Consumidores afetados">
          <span className="text-[15px] font-semibold numerico">
            {inteiro(resumo.consumidores_afetados)}
          </span>
          <span className="ml-1 text-[13px] text-muted-foreground">
            de {inteiro(resumo.consumidores_ativos)} ativos
          </span>
        </Campo>
        <Campo rotulo="Eventos">
          <span className="text-[15px] font-semibold numerico">
            {inteiro(resumo.eventos)}
          </span>
        </Campo>
      </div>

      {resumo.observacao && (
        <div className="mt-5">
          <FaixaEstado estado="ausente">{resumo.observacao}</FaixaEstado>
        </div>
      )}

      {(contexto.evento_regional || contexto.concentrado || contexto.reconfiguracao ||
        contexto.baseline_esburacado) && (
        <div className="mt-5 flex flex-col gap-2">
          {contexto.evento_regional && (
            <Aviso estado="alta">
              Evento regional: {porcentagem(contexto.saturacao_frota)} dos{' '}
              {inteiro(contexto.frota_avaliada)} conjuntos avaliados desta distribuidora
              estão na fila nesta competência. Quando a frota inteira sobe junto, costuma
              ser evento sistêmico ou falha de envio.
            </Aviso>
          )}
          {contexto.concentrado && (
            <Aviso estado="moderada">
              Mais de 70% do consumidor-hora do mês vem dos 5 maiores eventos. O indicador
              está apoiado em poucos registros — vale olhá-los antes de concluir algo
              sobre a rede.
            </Aviso>
          )}
          {contexto.reconfiguracao && (
            <Aviso estado="ausente">
              O conjunto foi redesenhado no período. Mudança administrativa não é anomalia
              operacional.
            </Aviso>
          )}
          {contexto.baseline_esburacado && (
            <Aviso estado="ausente">
              O baseline tem {inteiro(contexto.buracos_envio)}{' '}
              {plural(contexto.buracos_envio, 'mês', 'meses')} em que a distribuidora
              falhou no envio. Ausência de envio não é ausência de interrupção.
            </Aviso>
          )}
        </div>
      )}
    </div>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-rotulo uppercase text-muted-foreground">{rotulo}</div>
      <div className="mt-1.5 flex items-baseline">{children}</div>
    </div>
  );
}

function Aviso({ estado, children }: { estado: Estado; children: React.ReactNode }) {
  return <FaixaEstado estado={estado}>{children}</FaixaEstado>;
}

function MesmoMes({
  itens,
  atual,
}: {
  itens: RespostaConjunto['mesmo_mes_anos_anteriores'];
  atual: string;
}) {
  const valores = itens.map((i) => i.dec_aprox ?? 0);
  const maximo = Math.max(...valores, 1);

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-5 shadow-card">
      {itens.map((i) => {
        const ehAtual = i.competencia === atual;
        return (
          <div key={i.competencia} className="flex items-center gap-3">
            <span
              className={cn(
                'w-[86px] shrink-0 text-[13px]',
                ehAtual ? 'font-semibold' : 'text-muted-foreground',
              )}
            >
              {fmtCompetencia(i.competencia)}
            </span>
            <span className="h-5 flex-1 overflow-hidden rounded-sm bg-muted">
              <span
                className={cn('block h-full rounded-sm', ehAtual ? 'bg-alta-fg' : 'bg-normal-fg')}
                style={{ width: `${((i.dec_aprox ?? 0) / maximo) * 100}%` }}
              />
            </span>
            <span className="w-[64px] shrink-0 text-right text-[13px] font-semibold numerico">
              {decimal(i.dec_aprox)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TabelaCausas({ causas }: { causas: RespostaConjunto['causas'] }) {
  return (
    <div className="overflow-hidden rounded-lg border shadow-card">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col />
          <col className="w-[110px]" />
          <col className="w-[150px]" />
          <col className="w-[160px]" />
        </colgroup>
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-3 py-2 text-left text-rotulo uppercase text-muted-foreground">
              Causa (texto da distribuidora)
            </th>
            <th className="px-3 py-2 text-right text-rotulo uppercase text-muted-foreground">
              Eventos
            </th>
            <th className="px-3 py-2 text-right text-rotulo uppercase text-muted-foreground">
              Afetados
            </th>
            <th className="px-3 py-2 text-right text-rotulo uppercase text-muted-foreground">
              Consumidor-hora
            </th>
          </tr>
        </thead>
        <tbody>
          {causas.map((c, i) => (
            <tr key={i} className="border-b last:border-b-0">
              <td className="max-w-0 truncate px-3 py-2.5 text-[13px]" title={c.causa ?? ''}>
                {c.causa ?? '—'}
              </td>
              <td className="px-3 py-2.5 text-right text-[13px] numerico">
                {inteiro(c.eventos)}
              </td>
              <td className="px-3 py-2.5 text-right text-[13px] numerico">
                {inteiro(c.consumidores_afetados)}
              </td>
              <td className="px-3 py-2.5 text-right text-[13px] font-semibold numerico">
                {inteiro(Math.round(c.consumidor_horas))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t bg-muted/20 px-3 py-2 text-[12px] text-muted-foreground">
        Texto como a distribuidora enviou, sem normalização: a estrutura antiga da base
        tem 705 grafias diferentes para a mesma taxonomia.
      </p>
    </div>
  );
}

function TabelaAlimentadores({
  itens,
}: {
  itens: RespostaConjunto['alimentadores'];
}) {
  return (
    <div className="overflow-hidden rounded-lg border shadow-card">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col />
          <col className="w-[110px]" />
          <col className="w-[150px]" />
          <col className="w-[160px]" />
        </colgroup>
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-3 py-2 text-left text-rotulo uppercase text-muted-foreground">
              Alimentador
            </th>
            <th className="px-3 py-2 text-right text-rotulo uppercase text-muted-foreground">
              Eventos
            </th>
            <th className="px-3 py-2 text-right text-rotulo uppercase text-muted-foreground">
              Afetados
            </th>
            <th className="px-3 py-2 text-right text-rotulo uppercase text-muted-foreground">
              Consumidor-hora
            </th>
          </tr>
        </thead>
        <tbody>
          {itens.map((a) => (
            <tr key={a.codigo} className="border-b last:border-b-0">
              <td className="px-3 py-2.5 text-[13px] font-semibold">{a.codigo}</td>
              <td className="px-3 py-2.5 text-right text-[13px] numerico">
                {inteiro(a.eventos)}
              </td>
              <td className="px-3 py-2.5 text-right text-[13px] numerico">
                {inteiro(a.consumidores_afetados)}
              </td>
              <td className="px-3 py-2.5 text-right text-[13px] font-semibold numerico">
                {inteiro(Math.round(a.consumidor_horas))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
