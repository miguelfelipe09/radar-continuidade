import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { RespostaBoletim } from '@/tipos/api';
import { api, ErroApi } from '@/lib/api';
import { competencia as fmtCompetencia, inteiro } from '@/lib/formato';
import { irPara } from '@/lib/rotas';
import { Esqueleto, EstadoErro, Pagina, TituloSecao } from '@/componentes/ui/Pagina';
import { CardsAlertas, ResumoDelta } from '@/componentes/boletim/CardsAlertas';
import {
  DistribuidorasAusentes,
  EventoRegional,
  Pioraram,
  Reincidentes,
} from '@/componentes/boletim/Destaques';

/** Espelham os limiares da API (config.limiarEventoRegional e
 *  config.minimoFrotaEventoRegional). */
const LIMIAR_EVENTO_REGIONAL = 0.5;
const FROTA_MINIMA = 10;

export function Boletim({ competencia }: { competencia: string }) {
  const [dados, setDados] = useState<RespostaBoletim | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setDados(null);
    setErro(null);
    api
      .boletim(competencia)
      .then((r) => ativo && setDados(r))
      .catch((e: ErroApi) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, [competencia]);

  if (erro) {
    return (
      <Pagina titulo="Boletim da carga">
        <EstadoErro mensagem={erro} />
      </Pagina>
    );
  }

  if (!dados) return <BoletimCarregando />;

  const { cobertura, destaques, delta } = dados;

  // As duas condições ficam explícitas aqui, e não só implícitas na consulta
  // da API: saturação alta sem frota é aritmética de frota pequena — uma
  // distribuidora de um conjunto satura em 100% com um alerta só.
  const s = destaques.maior_saturacao;
  const eventoRegional =
    s && s.saturacao_frota >= LIMIAR_EVENTO_REGIONAL && s.avaliados >= FROTA_MINIMA
      ? s
      : null;

  return (
    <Pagina
      titulo="Boletim da carga"
      subtitulo={
        <>
          Competência {fmtCompetencia(dados.competencia.rotulo)} ·{' '}
          <span className="numerico">{inteiro(cobertura.avaliados)}</span> conjuntos
          avaliados de <span className="numerico">{inteiro(cobertura.conjuntos_considerados)}</span>{' '}
          considerados
        </>
      }
      acoes={
        <button
          onClick={() => irPara({ tela: 'fila' })}
          className="flex h-10 items-center gap-2 rounded-lg bg-acento px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Abrir a fila
          <ChevronRight className="size-4" />
        </button>
      }
    >
      <TituloSecao>Alertas por severidade</TituloSecao>
      <CardsAlertas boletim={dados} />
      <ResumoDelta boletim={dados} />

      {eventoRegional && (
        <>
          <TituloSecao>Evento regional</TituloSecao>
          <EventoRegional destaque={eventoRegional} />
        </>
      )}

      <TituloSecao>Pioraram de severidade</TituloSecao>
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">
        Estavam em moderada na competência anterior e passaram para alta.
      </p>
      <Pioraram
        itens={delta.pioraram}
        competenciaAnterior={delta.competencia_anterior}
      />

      <TituloSecao>Reincidentes</TituloSecao>
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">
        Na fila em {delta.reincidencia_meses} competências seguidas — problema que não
        passou.
      </p>
      <Reincidentes
        itens={delta.reincidentes}
        mesesExigidos={delta.reincidencia_meses}
        competenciasComDeteccao={delta.reincidencia_competencias_com_deteccao}
      />

      {destaques.distribuidoras_ausentes.length > 0 && (
        <>
          <TituloSecao>Distribuidoras sem envio</TituloSecao>
          <p className="-mt-2 mb-4 text-sm text-muted-foreground">
            Os conjuntos delas não estão na fila por falta de dado, não por ausência de
            problema.
          </p>
          <DistribuidorasAusentes itens={destaques.distribuidoras_ausentes} />
        </>
      )}
    </Pagina>
  );
}

function BoletimCarregando() {
  return (
    <Pagina titulo="Boletim da carga" subtitulo="Carregando…">
      <TituloSecao>Alertas por severidade</TituloSecao>
      <div className="grid grid-cols-4 gap-6">
        {[0, 1, 2, 3].map((i) => (
          <Esqueleto key={i} className="h-[92px]" />
        ))}
      </div>
      <TituloSecao>Pioraram de severidade</TituloSecao>
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Esqueleto key={i} className="h-[60px]" />
        ))}
      </div>
    </Pagina>
  );
}
