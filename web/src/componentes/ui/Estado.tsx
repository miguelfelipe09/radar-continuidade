import type { LucideIcon } from 'lucide-react';
import { cn, CORES_ESTADO, type Estado } from '@/lib/utils';

/** Card de métrica: quadrado de ícone à esquerda, número e rótulo em caixa
 *  alta à direita, terceira linha opcional em cinza. */
export function CardMetrica({
  estado,
  Icone,
  valor,
  rotulo,
  detalhe,
}: {
  estado: Estado;
  Icone: LucideIcon;
  valor: string;
  rotulo: string;
  detalhe?: string;
}) {
  return (
    <div className="flex min-h-[92px] items-center gap-4 rounded-lg border bg-card p-5 shadow-card">
      <div
        className={cn(
          'flex size-[52px] shrink-0 items-center justify-center rounded-icone',
          CORES_ESTADO[estado],
        )}
      >
        <Icone className="size-[22px]" strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <div className="text-numero numerico">{valor}</div>
        <div className="mt-0.5 text-rotulo uppercase text-secondary-foreground">{rotulo}</div>
        {/* Cinza, não índigo: índigo é marca, não qualifica dado. */}
        {detalhe && <div className="mt-[3px] text-xs font-medium text-muted-foreground">{detalhe}</div>}
      </div>
    </div>
  );
}

/** Pílula com ponto — usada na tabela da fila. */
export function Chip({
  estado,
  children,
  className,
}: {
  estado: Estado;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-semibold',
        CORES_ESTADO[estado],
        className,
      )}
    >
      <span className="size-[7px] rounded-full bg-current" />
      {children}
    </span>
  );
}

/** Faixa de largura inteira — usada no card de detalhe. */
export function FaixaEstado({
  estado,
  children,
}: {
  estado: Estado;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-[13px] font-semibold',
        CORES_ESTADO[estado],
      )}
    >
      <span className="size-[7px] rounded-full bg-current" />
      {children}
    </div>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-badge bg-secondary px-2 py-1 text-[11px] font-semibold tracking-[.02em] text-secondary-foreground numerico">
      {children}
    </span>
  );
}
