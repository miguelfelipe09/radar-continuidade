import { X } from 'lucide-react';
import { cn, CORES_ESTADO, type Estado } from '@/lib/utils';

const SEVERIDADES: Estado[] = ['alta', 'moderada', 'normal', 'queda'];

export interface Distribuidora {
  sigla: string;
  cnpj: string;
}

/** Severidade é seleção múltipla em pílulas — o analista alterna "só alta" e
 *  "alta e moderada" o tempo todo, e um menu suspenso cobraria dois cliques
 *  por alternância. */
export function Filtros({
  severidades,
  aoAlternarSeveridade,
  distribuidoras,
  cnpjSelecionado,
  aoSelecionarDistribuidora,
  aoLimpar,
  temFiltro,
}: {
  severidades: Estado[];
  aoAlternarSeveridade: (s: Estado) => void;
  distribuidoras: Distribuidora[];
  cnpjSelecionado: string;
  aoSelecionarDistribuidora: (cnpj: string) => void;
  aoLimpar: () => void;
  temFiltro: boolean;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        {SEVERIDADES.map((s) => {
          const ativo = severidades.includes(s);
          return (
            <button
              key={s}
              onClick={() => aoAlternarSeveridade(s)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-[13px] font-semibold capitalize transition-colors',
                ativo
                  ? cn(CORES_ESTADO[s], 'border-transparent')
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {s}
            </button>
          );
        })}
      </div>

      <label className="flex h-9 items-center gap-2 rounded-lg border px-3 shadow-card">
        <span className="text-[13px] text-muted-foreground">Distribuidora</span>
        <select
          value={cnpjSelecionado}
          onChange={(e) => aoSelecionarDistribuidora(e.target.value)}
          className="cursor-pointer bg-transparent text-[13px] font-semibold outline-none"
        >
          <option value="">todas</option>
          {distribuidoras.map((d) => (
            <option key={d.cnpj} value={d.cnpj}>
              {d.sigla}
            </option>
          ))}
        </select>
      </label>

      {temFiltro && (
        <button
          onClick={aoLimpar}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-acento hover:underline"
        >
          <X className="size-3.5" />
          limpar
        </button>
      )}
    </div>
  );
}
