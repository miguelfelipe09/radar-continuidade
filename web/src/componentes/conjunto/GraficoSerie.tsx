import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PontoSerie } from '@/tipos/api';
import { competencia as fmtCompetencia, decimal, inteiro } from '@/lib/formato';

/** Série do conjunto com a faixa do baseline.
 *
 *  A faixa não é reta: o baseline é apurado na escala dessazonalizada, e a
 *  série mostra DEC bruto. A API devolve o limiar já convertido mês a mês —
 *  em jul/2026 ele vale 1,97 e em janeiro 4,51, porque janeiro é
 *  naturalmente pior. Uma linha reta esconderia isso nos dois sentidos.
 */
export function GraficoSerie({
  serie,
  competenciaAtual,
}: {
  serie: PontoSerie[];
  competenciaAtual: string;
}) {
  const dados = serie.map((p) => ({
    ...p,
    rotulo: fmtCompetencia(p.competencia),
    atual: p.competencia === competenciaAtual,
  }));

  return (
    <div className="rounded-lg border bg-card p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 bg-foreground" />
          DEC aproximado
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-5 rounded-sm bg-normal-bg" />
          faixa normal do conjunto
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 border-t-2 border-dashed border-alta-fg" />
          limite de alerta
        </span>
        <span className="ml-auto text-muted-foreground">
          O limite acompanha a sazonalidade: é mais alto nos meses que já são
          piores.
        </span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="rotulo"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => decimal(v, 1)}
          />
          <Tooltip content={<DicaGrafico />} />

          {/* Tudo abaixo do limite é comportamento esperado do conjunto. */}
          <Area
            dataKey="baseline_limite_alerta"
            stroke="none"
            fill="#DCFCE7"
            fillOpacity={0.7}
            isAnimationActive={false}
          />
          <Line
            dataKey="baseline_limite_alerta"
            stroke="#B91C1C"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="baseline_mediana"
            stroke="#15803D"
            strokeWidth={1}
            strokeDasharray="2 3"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="dec_aprox"
            stroke="#111827"
            strokeWidth={2}
            isAnimationActive={false}
            dot={(props) => {
              const { cx, cy, payload, index } = props;
              const acima =
                payload.baseline_limite_alerta !== null &&
                payload.dec_aprox !== null &&
                payload.dec_aprox > payload.baseline_limite_alerta;
              if (!acima && !payload.atual) {
                return <g key={index} />;
              }
              return (
                <circle
                  key={index}
                  cx={cx}
                  cy={cy}
                  r={payload.atual ? 5 : 3}
                  fill={acima ? '#B91C1C' : '#111827'}
                  stroke="#fff"
                  strokeWidth={payload.atual ? 2 : 1}
                />
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function DicaGrafico({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as PontoSerie & { rotulo: string };

  return (
    <div className="rounded-lg border bg-card p-3 text-[13px] shadow-lg">
      <div className="font-semibold">{p.rotulo}</div>
      <div className="mt-1.5 space-y-0.5 text-muted-foreground">
        <div>
          DEC aproximado{' '}
          <b className="font-semibold text-foreground numerico">{decimal(p.dec_aprox)}</b>
        </div>
        <div>
          limite do mês{' '}
          <span className="numerico">{decimal(p.baseline_limite_alerta)}</span>
        </div>
        <div>
          <span className="numerico">{inteiro(p.eventos)}</span> eventos ·{' '}
          <span className="numerico">{inteiro(p.consumidores_afetados)}</span> afetados
        </div>
        {p.destoante && (
          <div className="text-ausente-fg">
            denominador fora de padrão: mês fora do indicador
          </div>
        )}
      </div>
    </div>
  );
}
