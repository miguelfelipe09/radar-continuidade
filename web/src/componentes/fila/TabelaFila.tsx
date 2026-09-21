import { useState } from 'react';
import { ChevronDown, ChevronRight, Shuffle, Users, WifiOff } from 'lucide-react';
import type { ItemFila } from '@/tipos/api';
import { Badge, Chip } from '@/componentes/ui/Estado';
import { decimal, inteiro, plural, porcentagem } from '@/lib/formato';
import { irPara } from '@/lib/rotas';
import { cn, type Estado } from '@/lib/utils';

const BARRA: Record<string, string> = {
  alta: 'bg-alta-fg',
  moderada: 'bg-moderada-fg',
  normal: 'bg-normal-fg',
  queda: 'bg-queda-fg',
  ausente: 'bg-ausente-fg',
};

/** Sinais de contexto: discretos por definição — qualificam a linha sem
 *  disputar atenção com a severidade. */
function Sinais({ item }: { item: ItemFila }) {
  const { reconfiguracao, baseline_esburacado, buracos_envio } = item.contexto;
  if (!reconfiguracao && !baseline_esburacado) return null;

  return (
    <span className="flex items-center gap-1.5">
      {reconfiguracao && (
        <span
          title="O conjunto foi redesenhado no período: mudança administrativa, não anomalia operacional."
          className="text-muted-foreground"
        >
          <Shuffle className="size-3.5" />
        </span>
      )}
      {baseline_esburacado && (
        <span
          title={`Baseline com ${buracos_envio} ${plural(buracos_envio, 'mês', 'meses')} de falha de envio da distribuidora.`}
          className="text-muted-foreground"
        >
          <WifiOff className="size-3.5" />
        </span>
      )}
    </span>
  );
}

function Celulas({ item }: { item: ItemFila }) {
  return (
    <>
      <td className="py-2.5 pl-3 pr-2">
        <Badge>#{item.conjunto.id}</Badge>
      </td>
      <td className="max-w-0 py-2.5 pr-3">
        <div className="truncate text-[14px] font-semibold">{item.conjunto.nome ?? '—'}</div>
      </td>
      <td className="py-2.5 pr-3 text-[13px] text-muted-foreground">
        {item.distribuidora.sigla}
      </td>
      <td className="py-2.5 pr-3">
        {item.severidade && (
          <Chip estado={item.severidade as Estado} className="px-2 py-1 text-[12px]">
            {item.severidade}
          </Chip>
        )}
      </td>
      <td className="py-2.5 pr-3 text-right text-[14px] numerico">
        <span className="font-semibold">{decimal(item.dec_aprox)}</span>
        {item.baseline && (
          <span className="ml-1 text-[12px] text-muted-foreground">
            vs {decimal(item.baseline.mediana)}
          </span>
        )}
      </td>
      <td className="py-2.5 pr-3 text-right text-[13px] text-muted-foreground numerico">
        {item.desvio_iqr === null ? '—' : `${decimal(item.desvio_iqr, 1)} IQR`}
      </td>
      <td className="py-2.5 pr-3 text-right text-[14px] font-semibold numerico">
        {inteiro(item.consumidores_afetados)}
      </td>
      <td className="py-2.5 pr-2">
        <Sinais item={item} />
      </td>
      <td className="py-2.5 pr-3 text-muted-foreground">
        <ChevronRight className="size-4" />
      </td>
    </>
  );
}

function Linha({ item }: { item: ItemFila }) {
  return (
    <tr
      onClick={() => irPara({ tela: 'conjunto', id: item.conjunto.id })}
      className="group cursor-pointer border-b last:border-b-0 hover:bg-muted/60"
    >
      <td className="w-1 p-0">
        <div className={cn('h-10 w-1', BARRA[item.severidade ?? 'ausente'])} />
      </td>
      <Celulas item={item} />
    </tr>
  );
}

/** Evento regional: a frota inteira alertando junto não são N problemas de
 *  rede, é um evento. Vira um bloco só, com a conta à vista, em vez de
 *  ocupar a fila com 90 linhas soltas. */
function GrupoEvento({
  itens,
  total,
  aberto,
  alternar,
}: {
  itens: ItemFila[];
  total: number | null;
  aberto: boolean;
  alternar: () => void;
}) {
  const primeiro = itens[0];
  const { saturacao_frota, frota_avaliada } = primeiro.contexto;

  return (
    <>
      <tr className="border-b bg-alta-bg/30">
        <td className="w-1 p-0">
          <div className="h-12 w-1 bg-alta-fg" />
        </td>
        <td colSpan={9} className="py-2.5 pl-3 pr-3">
          <button
            onClick={alternar}
            className="flex w-full items-center gap-3 text-left"
          >
            {aberto ? (
              <ChevronDown className="size-4 shrink-0 text-alta-fg" />
            ) : (
              <ChevronRight className="size-4 shrink-0 text-alta-fg" />
            )}
            <Users className="size-4 shrink-0 text-alta-fg" />
            <span className="text-[14px] font-semibold">
              {primeiro.distribuidora.sigla}
            </span>
            <Chip estado="alta" className="px-2 py-1 text-[12px]">
              evento regional
            </Chip>
            <span className="text-[13px] text-muted-foreground">
              {total === null ? (
                <>
                  {inteiro(itens.length)} nesta página
                </>
              ) : (
                <>
                  <b className="font-semibold text-secondary-foreground numerico">
                    {inteiro(total)}
                  </b>{' '}
                  {plural(total, 'conjunto na fila', 'conjuntos na fila')}
                </>
              )}{' '}
              · {porcentagem(saturacao_frota)} de{' '}
              <span className="numerico">{inteiro(frota_avaliada)}</span> avaliados
            </span>
          </button>
        </td>
      </tr>
      {aberto &&
        itens.map((item) => (
          <tr
            key={item.conjunto.id}
            onClick={() => irPara({ tela: 'conjunto', id: item.conjunto.id })}
            className="cursor-pointer border-b bg-muted/20 last:border-b-0 hover:bg-muted/60"
          >
            <td className="w-1 p-0">
              <div className={cn('h-10 w-1', BARRA[item.severidade ?? 'ausente'])} />
            </td>
            <Celulas item={item} />
          </tr>
        ))}
    </>
  );
}

const CABECALHO =
  'px-3 py-2 text-rotulo uppercase text-muted-foreground';

export function TabelaFila({
  itens,
  totaisPorDistribuidora,
}: {
  itens: ItemFila[];
  /** Total de alertas da distribuidora na competência, para o cabeçalho do
   *  grupo não afirmar só o que está na página. */
  totaisPorDistribuidora: Record<string, number>;
}) {
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

  // Percorre na ordem de impacto. A primeira linha de uma distribuidora em
  // evento regional vira o bloco, e as demais entram dentro dele — assim o
  // grupo fica na posição do seu conjunto mais relevante.
  const blocos: Array<
    { tipo: 'linha'; item: ItemFila } | { tipo: 'grupo'; cnpj: string; itens: ItemFila[] }
  > = [];
  const grupos = new Map<string, ItemFila[]>();

  for (const item of itens) {
    const cnpj = item.distribuidora.cnpj;
    if (item.contexto.evento_regional) {
      const existente = grupos.get(cnpj);
      if (existente) {
        existente.push(item);
      } else {
        const novos = [item];
        grupos.set(cnpj, novos);
        blocos.push({ tipo: 'grupo', cnpj, itens: novos });
      }
    } else {
      blocos.push({ tipo: 'linha', item });
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border shadow-card">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-1" />
          <col className="w-[86px]" />
          <col />
          <col className="w-[130px]" />
          <col className="w-[110px]" />
          <col className="w-[140px]" />
          <col className="w-[96px]" />
          <col className="w-[130px]" />
          <col className="w-[54px]" />
          <col className="w-[36px]" />
        </colgroup>
        <thead className="border-b bg-muted/40">
          <tr>
            <th />
            <th className={cn(CABECALHO, 'text-left')}>ID</th>
            <th className={cn(CABECALHO, 'text-left')}>Conjunto</th>
            <th className={cn(CABECALHO, 'text-left')}>Distribuidora</th>
            <th className={cn(CABECALHO, 'text-left')}>Severidade</th>
            <th className={cn(CABECALHO, 'text-right')}>DEC aprox.</th>
            <th className={cn(CABECALHO, 'text-right')}>Desvio</th>
            <th className={cn(CABECALHO, 'text-right')}>Afetados</th>
            <th className={CABECALHO} />
            <th />
          </tr>
        </thead>
        <tbody>
          {blocos.map((bloco) =>
            bloco.tipo === 'linha' ? (
              <Linha key={bloco.item.conjunto.id} item={bloco.item} />
            ) : (
              <GrupoEvento
                key={bloco.cnpj}
                itens={bloco.itens}
                total={totaisPorDistribuidora[bloco.cnpj] ?? null}
                aberto={abertos[bloco.cnpj] ?? false}
                alternar={() =>
                  setAbertos((a) => ({ ...a, [bloco.cnpj]: !a[bloco.cnpj] }))
                }
              />
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
