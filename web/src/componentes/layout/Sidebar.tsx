import { Activity, BarChart3, ListFilter, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { irPara, type Rota } from '@/lib/rotas';

const ITENS = [
  { tela: 'boletim', rotulo: 'Boletim', Icone: Activity },
  { tela: 'fila', rotulo: 'Fila', Icone: ListFilter },
  { tela: 'ranking', rotulo: 'Ranking', Icone: BarChart3 },
] as const;

export function Sidebar({ rota }: { rota: Rota }) {
  // O detalhe do conjunto é drill-down da fila, então mantém a Fila acesa.
  const ativo = rota.tela === 'conjunto' ? 'fila' : rota.tela;

  return (
    <aside className="w-sidebar shrink-0 bg-sidebar py-8">
      <div className="flex items-center justify-center gap-2.5 px-6 pb-10">
        <Zap className="size-6 text-sidebar-spark" fill="currentColor" strokeWidth={0} />
        <span className="text-[17px] font-bold tracking-tight text-white">
          Radar de Continuidade
        </span>
      </div>

      <nav className="flex flex-col gap-2 px-6">
        {ITENS.map(({ tela, rotulo, Icone }) => (
          <button
            key={tela}
            onClick={() => irPara({ tela } as Rota)}
            className={cn(
              'flex h-12 items-center gap-3.5 rounded-lg px-[18px] text-[15px] font-semibold transition-colors',
              ativo === tela
                ? 'bg-white text-sidebar'
                : 'text-sidebar-fg hover:bg-white/10',
            )}
          >
            <Icone className="size-[19px]" />
            {rotulo}
          </button>
        ))}
      </nav>
    </aside>
  );
}
