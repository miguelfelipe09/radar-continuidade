import { ArrowUpRight, CalendarX2, ChevronRight, Repeat2, Users } from 'lucide-react';
import type { RespostaBoletim } from '@/tipos/api';
import { Badge, Chip } from '@/componentes/ui/Estado';
import { EstadoVazio } from '@/componentes/ui/Pagina';
import { competencia, inteiro, plural, porcentagem } from '@/lib/formato';
import { irPara } from '@/lib/rotas';
import { cn, CORES_ESTADO } from '@/lib/utils';

function LinhaDestaque({
  corBarra,
  conjuntoId,
  nome,
  sigla,
  afetados,
  children,
}: {
  corBarra: string;
  conjuntoId: number;
  nome: string | null;
  sigla: string;
  afetados: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={() => irPara({ tela: 'conjunto', id: conjuntoId })}
      className="group flex w-full items-center gap-4 overflow-hidden rounded-lg border bg-card text-left shadow-card transition-colors hover:bg-muted/50"
    >
      <span className={cn('h-[60px] w-1 shrink-0', corBarra)} />
      <span className="flex min-w-0 flex-1 items-center gap-3 py-3">
        <Badge>#{conjuntoId}</Badge>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold">{nome ?? '—'}</span>
          <span className="block truncate text-[13px] text-muted-foreground">{sigla}</span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-4 pr-4">
        {children}
        <span className="hidden text-right text-[13px] text-muted-foreground xl:block">
          <span className="block font-semibold text-secondary-foreground numerico">
            {inteiro(afetados)}
          </span>
          consumidores afetados
        </span>
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

/** Bloco principal do boletim: quem subiu de patamar. É o que a fila sozinha
 *  não mostra, porque ela só enxerga a competência atual. */
export function Pioraram({
  itens,
  competenciaAnterior,
}: {
  itens: RespostaBoletim['delta']['pioraram'];
  competenciaAnterior: string | null;
}) {
  // Sem competência anterior detectada não há comparação possível. Dizer
  // "nenhum piorou" seria afirmar ausência de problema onde falta dado.
  if (competenciaAnterior === null) {
    return (
      <EstadoVazio
        motivo="indisponivel"
        titulo="Não há detecção da competência anterior para comparar."
      />
    );
  }

  if (itens.length === 0) {
    return (
      <EstadoVazio
        titulo={`Nenhum conjunto passou de moderada para alta contra ${competencia(competenciaAnterior)}.`}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {itens.map((i) => (
        <LinhaDestaque
          key={i.conjunto.id}
          corBarra="bg-alta-fg"
          conjuntoId={i.conjunto.id}
          nome={i.conjunto.nome}
          sigla={i.distribuidora.sigla}
          afetados={i.consumidores_afetados}
        >
          <span className="flex items-center gap-2 text-[13px] font-semibold">
            <Chip estado="moderada">{i.de}</Chip>
            <ArrowUpRight className="size-4 text-alta-fg" />
            <Chip estado="alta">{i.para}</Chip>
          </span>
        </LinhaDestaque>
      ))}
    </div>
  );
}

/** Conjuntos na fila em competências consecutivas: problema que não passou. */
export function Reincidentes({
  itens,
  mesesExigidos,
  competenciasComDeteccao,
}: {
  itens: RespostaBoletim['delta']['reincidentes'];
  mesesExigidos: number;
  competenciasComDeteccao: number;
}) {
  if (competenciasComDeteccao < mesesExigidos) {
    return (
      <EstadoVazio
        motivo="indisponivel"
        titulo={`Só ${competenciasComDeteccao} das ${mesesExigidos} competências da janela têm detecção — não dá para apurar reincidência.`}
      />
    );
  }

  if (itens.length === 0) {
    return (
      <EstadoVazio titulo={`Nenhum conjunto alertou em ${mesesExigidos} competências seguidas.`} />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {itens.map((i) => (
        <LinhaDestaque
          key={i.conjunto.id}
          corBarra={i.severidade === 'alta' ? 'bg-alta-fg' : 'bg-moderada-fg'}
          conjuntoId={i.conjunto.id}
          nome={i.conjunto.nome}
          sigla={i.distribuidora.sigla}
          afetados={i.consumidores_afetados}
        >
          <span className="flex items-center gap-2">
            <Chip estado={i.severidade === 'alta' ? 'alta' : 'moderada'}>
              {i.severidade}
            </Chip>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-[13px] font-semibold text-secondary-foreground">
              <Repeat2 className="size-3.5" />
              {i.meses_seguidos} meses seguidos
            </span>
          </span>
        </LinhaDestaque>
      ))}
    </div>
  );
}

/** Ausência é informação: a distribuidora parou de enviar e os conjuntos dela
 *  sumiram da fila. Sem isto, o analista teria falsa sensação de cobertura. */
export function DistribuidorasAusentes({
  itens,
}: {
  itens: RespostaBoletim['destaques']['distribuidoras_ausentes'];
}) {
  if (itens.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-6">
      {itens.map((i) => (
        <div
          key={i.distribuidora.cnpj}
          className="flex items-center gap-4 rounded-lg border bg-card p-5 shadow-card"
        >
          <div
            className={cn(
              'flex size-[52px] shrink-0 items-center justify-center rounded-icone',
              CORES_ESTADO.ausente,
            )}
          >
            <CalendarX2 className="size-[22px]" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold">{i.distribuidora.sigla}</div>
            <div className="mt-0.5 text-[13px] text-muted-foreground">
              <b className="font-semibold text-secondary-foreground numerico">
                {inteiro(i.conjuntos)}
              </b>{' '}
              {plural(i.conjuntos, 'conjunto sem dado', 'conjuntos sem dado')} · último envio em{' '}
              <b className="font-semibold text-secondary-foreground">
                {competencia(i.ultimo_envio)}
              </b>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Evento regional: quando a frota inteira alerta junto, não é conjunto com
 *  problema — é a distribuidora. */
export function EventoRegional({
  destaque,
}: {
  destaque: NonNullable<RespostaBoletim['destaques']['maior_saturacao']>;
}) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-alta-fg/20 bg-alta-bg/40 p-5">
      <div
        className={cn(
          'flex size-[52px] shrink-0 items-center justify-center rounded-icone',
          CORES_ESTADO.alta,
        )}
      >
        <Users className="size-[22px]" strokeWidth={2.2} />
      </div>
      <div>
        <p className="text-[15px] font-semibold">
          {destaque.distribuidora.sigla} com {porcentagem(destaque.saturacao_frota)} da
          frota alertando
        </p>
        <p className="mt-1 text-sm text-secondary-foreground">
          <span className="numerico">{inteiro(destaque.alertas)}</span> de{' '}
          <span className="numerico">{inteiro(destaque.avaliados)}</span> conjuntos
          avaliados dessa distribuidora estão na fila. Quando a frota inteira sobe junto,
          costuma ser evento sistêmico ou falha de envio, não rede de um conjunto.
        </p>
      </div>
    </div>
  );
}
