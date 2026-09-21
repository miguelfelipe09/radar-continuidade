import { useEffect, useState } from 'react';
import { Sidebar } from '@/componentes/layout/Sidebar';
import { BarraSuperior } from '@/componentes/layout/BarraSuperior';
import { Pagina, EstadoErro, EstadoVazio } from '@/componentes/ui/Pagina';
import { Boletim } from '@/telas/Boletim';
import { Fila } from '@/telas/Fila';
import { Conjunto } from '@/telas/Conjunto';
import { Ranking } from '@/telas/Ranking';
import { api, ErroApi } from '@/lib/api';
import { useRota } from '@/lib/rotas';
import type { RespostaBoletim } from '@/tipos/api';

export default function App() {
  const rota = useRota();
  // A lista vem da API, e não de uma constante: só entra no seletor a
  // competência que tem detecção gravada. Uma lista fixa oferecia meses que
  // numa instalação limpa não existiam, e escolhê-los dava erro.
  const [competencias, setCompetencias] = useState<string[] | null>(null);
  const [competencia, setCompetencia] = useState<string | null>(null);
  const [boletim, setBoletim] = useState<RespostaBoletim | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    api
      .competencias()
      .then((r) => {
        if (!ativo) return;
        const rotulos = r.competencias.map((c) => c.rotulo);
        setCompetencias(rotulos);
        setCompetencia((atual) => atual ?? rotulos[0] ?? null);
      })
      .catch((e: ErroApi) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!competencia) return;
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
          competencias={competencias ?? []}
          selecionada={competencia}
          aoSelecionar={setCompetencia}
        />

        {erro ? (
          <Pagina titulo="Radar de Continuidade">
            <EstadoErro mensagem={erro} />
          </Pagina>
        ) : competencias !== null && competencias.length === 0 ? (
          <Pagina titulo="Radar de Continuidade">
            <EstadoVazio titulo="Nenhuma competência detectada ainda. Rode a ingestão: python -m etl ingest --ano 2024 --ano 2025 --ano 2026" />
          </Pagina>
        ) : competencia ? (
          <Conteudo rota={rota} competencia={competencia} />
        ) : null}

        <footer className="px-9 pb-8 pt-4 text-xs text-muted-foreground">
          Os indicadores são aproximações reconstruídas do dado bruto da ANEEL —
          não são os valores oficiais de DEC e FEC, que seguem metodologia
          própria de expurgo e apuração.
        </footer>
      </main>
    </div>
  );
}

function Conteudo({
  rota,
  competencia,
}: {
  rota: ReturnType<typeof useRota>;
  competencia: string;
}) {
  switch (rota.tela) {
    case 'fila':
      return <Fila competencia={competencia} />;
    case 'ranking':
      return <Ranking competencia={competencia} />;
    case 'conjunto':
      return <Conjunto id={rota.id} competencia={competencia} />;
    default:
      return <Boletim competencia={competencia} />;
  }
}
