import { useEffect, useState } from 'react';
import { Sidebar } from '@/componentes/layout/Sidebar';
import { BarraSuperior } from '@/componentes/layout/BarraSuperior';
import { Pagina, EstadoErro } from '@/componentes/ui/Pagina';
import { api, ErroApi } from '@/lib/api';
import { useRota } from '@/lib/rotas';
import type { RespostaBoletim } from '@/tipos/api';

/** O arquivo de 2026 vai até julho; a API aceita qualquer competência que
 *  tenha detecção gravada. */
const COMPETENCIAS = [
  '2026-07', '2026-06', '2026-05', '2026-04', '2026-03', '2026-02', '2026-01',
];

export default function App() {
  const rota = useRota();
  const [competencia, setCompetencia] = useState(COMPETENCIAS[0]);
  const [boletim, setBoletim] = useState<RespostaBoletim | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setErro(null);
    api
      .boletim(competencia)
      .then((r) => ativo && setBoletim(r))
      .catch((e: ErroApi) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, [competencia]);

  return (
    <div className="flex min-h-screen">
      <Sidebar rota={rota} />
      <main className="min-w-0 flex-1">
        <BarraSuperior
          boletim={boletim}
          competencias={COMPETENCIAS}
          selecionada={competencia}
          aoSelecionar={setCompetencia}
        />

        {erro ? (
          <Pagina titulo="Radar de Continuidade">
            <EstadoErro mensagem={erro} />
          </Pagina>
        ) : (
          <Conteudo rota={rota} />
        )}

        <footer className="px-9 pb-8 pt-4 text-xs text-muted-foreground">
          Os indicadores são aproximações reconstruídas do dado bruto da ANEEL —
          não são os valores oficiais de DEC e FEC, que seguem metodologia
          própria de expurgo e apuração.
        </footer>
      </main>
    </div>
  );
}

function Conteudo({ rota }: { rota: ReturnType<typeof useRota> }) {
  switch (rota.tela) {
    case 'fila':
      return <Pagina titulo="Fila de investigação" subtitulo="Em construção." children={null} />;
    case 'ranking':
      return <Pagina titulo="Ranking das piores" subtitulo="Em construção." children={null} />;
    case 'conjunto':
      return (
        <Pagina titulo={`Conjunto ${rota.id}`} subtitulo="Em construção." children={null} />
      );
    default:
      return <Pagina titulo="Boletim da carga" subtitulo="Em construção." children={null} />;
  }
}
