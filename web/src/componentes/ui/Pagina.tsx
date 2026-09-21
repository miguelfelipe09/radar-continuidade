import type { ReactNode } from 'react';
import { AlertTriangle, HelpCircle, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Pagina({
  titulo,
  subtitulo,
  acoes,
  children,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  acoes?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="px-9 py-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-titulo">{titulo}</h1>
          {subtitulo && <p className="mt-2 text-[15px] text-muted-foreground">{subtitulo}</p>}
        </div>
        {acoes && <div className="flex shrink-0 items-center gap-3">{acoes}</div>}
      </div>
      {children}
    </div>
  );
}

export function TituloSecao({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn('mb-4 mt-[34px] text-secao text-acento', className)}>{children}</h2>;
}

/** Esqueleto, não spinner: a primeira chamada leva ~250ms por cache frio do
 *  Postgres e as seguintes ~60ms, então o que importa é não deslocar o
 *  layout quando o dado chegar. */
export function Esqueleto({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-muted', className)} />;
}

export function EstadoErro({ mensagem }: { mensagem: string }) {
  return (
    <div className="mt-6 flex items-start gap-3 rounded-lg border border-alta-fg/20 bg-alta-bg/40 p-4">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-alta-fg" />
      <div>
        <p className="text-sm font-semibold text-alta-fg">Não foi possível carregar</p>
        <p className="mt-1 text-sm text-secondary-foreground">{mensagem}</p>
      </div>
    </div>
  );
}

/** Compacto de propósito: uma frase não justifica meia tela.
 *
 *  `motivo` separa as duas situações que não podem se confundir —
 *  `vazio` é "não houve"; `indisponivel` é "não há como saber", que a tela
 *  não pode apresentar como ausência de problema. */
export function EstadoVazio({
  titulo,
  motivo = 'vazio',
}: {
  titulo: string;
  motivo?: 'vazio' | 'indisponivel';
}) {
  const Icone = motivo === 'indisponivel' ? HelpCircle : Inbox;
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-lg border border-dashed px-4 py-3 text-sm',
        motivo === 'indisponivel'
          ? 'border-ausente-fg/30 bg-ausente-bg/60 text-ausente-fg'
          : 'text-muted-foreground',
      )}
    >
      <Icone className="size-4 shrink-0" />
      <span>{titulo}</span>
    </div>
  );
}
