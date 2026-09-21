import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ItemFila, MotivoAusencia } from '@/tipos/api';
import { Badge, Chip } from '@/componentes/ui/Estado';
import { inteiro, plural } from '@/lib/formato';
import { irPara } from '@/lib/rotas';

const ROTULO: Record<MotivoAusencia, string> = {
  distribuidora_ausente: 'distribuidora sem envio',
  conjunto_encerrado: 'código encerrado',
  conjunto_isolado: 'mês sem interrupção',
};

interface Grupo {
  chave: string;
  sigla: string;
  motivo: MotivoAusencia | null;
  observacao: string;
  itens: ItemFila[];
}

/** Ausência é informação, mas não é alerta.
 *
 *  Em 07/2026 são 131 conjuntos, e 45 deles são da mesma distribuidora com a
 *  mesma frase. Listados um a um, ocupariam mais espaço que os próprios
 *  alertas — o oposto de subordinado. Agrupados por distribuidora e motivo,
 *  viram oito linhas que dizem a mesma coisa. */
export function TabelaAusentes({ itens }: { itens: ItemFila[] }) {
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

  const grupos: Grupo[] = [];
  const indice = new Map<string, Grupo>();

  for (const item of itens) {
    const chave = `${item.distribuidora.cnpj}|${item.motivo_ausencia}`;
    let grupo = indice.get(chave);
    if (!grupo) {
      grupo = {
        chave,
        sigla: item.distribuidora.sigla,
        motivo: item.motivo_ausencia ?? null,
        observacao: item.observacao ?? '',
        itens: [],
      };
      indice.set(chave, grupo);
      grupos.push(grupo);
    }
    grupo.itens.push(item);
  }

  grupos.sort((a, b) => b.itens.length - a.itens.length);

  return (
    <div className="divide-y overflow-hidden rounded-lg border shadow-card">
      {grupos.map((grupo) => {
        const aberto = abertos[grupo.chave] ?? false;
        return (
          <div key={grupo.chave}>
            <button
              onClick={() => setAbertos((a) => ({ ...a, [grupo.chave]: !aberto }))}
              className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted/60"
            >
              <span className="w-1 self-stretch rounded-sm bg-ausente-fg" />
              {aberto ? (
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="w-[130px] shrink-0 text-[14px] font-semibold">
                {grupo.sigla}
              </span>
              <Chip estado="ausente" className="shrink-0 px-2 py-1 text-[12px]">
                {grupo.motivo ? ROTULO[grupo.motivo] : 'ausente'}
              </Chip>
              <span className="w-[120px] shrink-0 text-[13px] text-muted-foreground">
                <b className="font-semibold text-secondary-foreground numerico">
                  {inteiro(grupo.itens.length)}
                </b>{' '}
                {plural(grupo.itens.length, 'conjunto', 'conjuntos')}
              </span>
              <span className="truncate text-[13px] text-muted-foreground">
                {grupo.observacao}
              </span>
            </button>

            {aberto && (
              <table className="w-full table-fixed border-collapse border-t bg-muted/20">
                <colgroup>
                  <col className="w-[46px]" />
                  <col className="w-[110px]" />
                  <col />
                </colgroup>
                <tbody>
                  {grupo.itens.map((item) => (
                    <tr
                      key={item.conjunto.id}
                      onClick={() => irPara({ tela: 'conjunto', id: item.conjunto.id })}
                      className="cursor-pointer border-b last:border-b-0 hover:bg-muted/60"
                    >
                      <td />
                      <td className="py-2 pr-2">
                        <Badge>#{item.conjunto.id}</Badge>
                      </td>
                      <td className="max-w-0 truncate py-2 pr-3 text-[13px] font-medium">
                        {item.conjunto.nome ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}
