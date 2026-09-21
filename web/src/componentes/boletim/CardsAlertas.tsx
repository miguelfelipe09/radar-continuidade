import { AlertTriangle, CheckCircle2, CircleAlert, TrendingDown } from 'lucide-react';
import type { RespostaBoletim } from '@/tipos/api';
import { CardMetrica } from '@/componentes/ui/Estado';
import { comSinal, competencia, inteiro, porcentagem } from '@/lib/formato';

/** Quatro severidades. O número grande é o total da competência; a terceira
 *  linha dá a proporção, que é o que diz se 199 é muito ou pouco. */
export function CardsAlertas({ boletim }: { boletim: RespostaBoletim }) {
  const { alertas, cobertura } = boletim;
  const avaliados = cobertura.avaliados || 1;

  const proporcao = (n: number) => `${porcentagem(n / avaliados, 1)} dos avaliados`;

  return (
    <div className="grid grid-cols-4 gap-6">
      <CardMetrica
        estado="alta"
        Icone={AlertTriangle}
        valor={inteiro(alertas.alta)}
        rotulo="Alta"
        detalhe={proporcao(alertas.alta)}
      />
      <CardMetrica
        estado="moderada"
        Icone={CircleAlert}
        valor={inteiro(alertas.moderada)}
        rotulo="Moderada"
        detalhe={proporcao(alertas.moderada)}
      />
      <CardMetrica
        estado="normal"
        Icone={CheckCircle2}
        valor={inteiro(alertas.normal)}
        rotulo="Normal"
        detalhe={proporcao(alertas.normal)}
      />
      <CardMetrica
        estado="queda"
        Icone={TrendingDown}
        valor={inteiro(alertas.queda)}
        rotulo="Queda"
        detalhe="sinal de qualidade, fora da fila"
      />
    </div>
  );
}

/** Uma frase, não um card: o total de alertas e como ele se move. O
 *  `entraram_na_fila` fica de fora de propósito — entre 62% e 95% da fila se
 *  renova todo mês, então o número parece manchete e é rotina. */
export function ResumoDelta({ boletim }: { boletim: RespostaBoletim }) {
  const { delta } = boletim;
  if (delta.alertas_anterior === null || delta.variacao_alertas === null) return null;

  const subiu = delta.variacao_alertas > 0;
  const estavel = delta.variacao_alertas === 0;

  return (
    <p className="mt-4 text-[15px] text-secondary-foreground">
      <b className="font-semibold numerico">{inteiro(delta.alertas_atual)}</b> conjuntos na
      fila desta competência
      {!estavel && (
        <>
          {' '}
          —{' '}
          <span
            className={
              subiu ? 'font-semibold text-alta-fg' : 'font-semibold text-normal-fg'
            }
          >
            {comSinal(delta.variacao_alertas)}
          </span>{' '}
          contra {competencia(delta.competencia_anterior)}, que teve{' '}
          <span className="numerico">{inteiro(delta.alertas_anterior)}</span>
        </>
      )}
      {estavel && <> — mesmo número de {competencia(delta.competencia_anterior)}</>}.
    </p>
  );
}
