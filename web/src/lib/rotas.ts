/** Roteamento por hash, escrito à mão.
 *
 * São quatro telas e um drill-down. O React Router não estava na lista de
 * dependências acordada, e trinta linhas resolvem: a URL continua
 * compartilhável e o botão voltar do navegador funciona.
 */

import { useEffect, useState } from 'react';

export type Rota =
  | { tela: 'boletim' }
  | { tela: 'fila' }
  | { tela: 'ranking' }
  | { tela: 'conjunto'; id: number };

export function lerRota(): Rota {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [tela, parametro] = hash.split('/');

  if (tela === 'fila') return { tela: 'fila' };
  if (tela === 'ranking') return { tela: 'ranking' };
  if (tela === 'conjunto' && parametro && !Number.isNaN(Number(parametro))) {
    return { tela: 'conjunto', id: Number(parametro) };
  }
  return { tela: 'boletim' };
}

export function irPara(rota: Rota): void {
  const destino = rota.tela === 'conjunto' ? `#/conjunto/${rota.id}` : `#/${rota.tela}`;
  if (window.location.hash !== destino) window.location.hash = destino;
}

export function useRota(): Rota {
  const [rota, setRota] = useState<Rota>(lerRota);

  useEffect(() => {
    const aoMudar = () => {
      setRota(lerRota());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);

  return rota;
}
