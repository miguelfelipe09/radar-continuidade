import { AlertCircle, CalendarDays, CheckCircle2 } from 'lucide-react';
import type { RespostaBoletim } from '@/tipos/api';
import { competencia as fmtCompetencia, dataHora, inteiro } from '@/lib/formato';

/** A referência mostrava usuário e "sair" aqui. O projeto não tem
 *  autenticação, e saudar um usuário inexistente seria interface falsa. No
 *  lugar entra o contexto que o analista precisa ter sempre à vista: qual
 *  competência está sendo olhada e se a última carga foi bem. */
export function BarraSuperior({
  boletim,
  competencias,
  selecionada,
  aoSelecionar,
}: {
  boletim: RespostaBoletim | null;
  competencias: string[];
  selecionada: string | null;
  aoSelecionar: (valor: string) => void;
}) {
  const carga = boletim?.carga;
  const sucesso = carga?.status === 'sucesso';

  return (
    <header className="flex h-topbar items-center justify-between gap-6 border-b px-9">
      <label className="flex h-10 items-center gap-2.5 rounded-lg border px-3.5 shadow-card">
        <CalendarDays className="size-[17px] text-acento" />
        <span className="sr-only">Competência</span>
        <select
          value={selecionada ?? ''}
          onChange={(e) => aoSelecionar(e.target.value)}
          disabled={competencias.length === 0}
          className="cursor-pointer bg-transparent text-sm font-semibold outline-none disabled:cursor-default"
        >
          {competencias.length === 0 && <option value="">—</option>}
          {competencias.map((c) => (
            <option key={c} value={c}>
              {fmtCompetencia(c)}
            </option>
          ))}
        </select>
      </label>

      {carga && (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          {sucesso ? (
            <CheckCircle2 className="size-4 text-normal-fg" />
          ) : (
            <AlertCircle className="size-4 text-alta-fg" />
          )}
          <span>
            Última carga{' '}
            <b className="font-semibold text-secondary-foreground">
              {dataHora(carga.finalizado_em)}
            </b>{' '}
            ·{' '}
            <b className="font-semibold text-secondary-foreground numerico">
              {inteiro(carga.linhas_processadas)}
            </b>{' '}
            registros ·{' '}
            {carga.linhas_atualizadas > 0
              ? `${inteiro(carga.linhas_atualizadas)} retificados`
              : 'sem retificações'}
          </span>
        </div>
      )}
    </header>
  );
}
