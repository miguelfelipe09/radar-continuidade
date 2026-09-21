import type { ReactNode } from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';
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

export function EstadoVazio({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <div className="mt-6 flex flex-col items-center rounded-lg border border-dashed px-6 py-12 text-center">
      <Inbox className="size-7 text-muted-foreground" />
      <p className="mt-3 text-[15px] font-semibold">{titulo}</p>
      {descricao && (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{descricao}</p>
      )}
    </div>
  );
}
