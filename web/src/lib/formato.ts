/** Formatação para leitura humana, em português do Brasil.
 *
 * Regra que vale para tudo aqui: nada de `null`, `NaN` ou `undefined` na
 * tela. Item ausente tem quase todo campo nulo, e o traço é o que ele deve
 * mostrar.
 */

const MESES = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

export const TRACO = '—';

/** 1433781 -> "1.433.781" */
export function inteiro(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return TRACO;
  return valor.toLocaleString('pt-BR');
}

/** 0.9856 -> "0,99" */
export function decimal(valor: number | null | undefined, casas = 2): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return TRACO;
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

/** 0.8257 -> "83%" */
export function porcentagem(valor: number | null | undefined, casas = 0): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return TRACO;
  return `${(valor * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}

/** 163 -> "+163" ; -12 -> "−12" */
export function comSinal(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return TRACO;
  if (valor === 0) return '0';
  return valor > 0 ? `+${inteiro(valor)}` : `−${inteiro(Math.abs(valor))}`;
}

/** "2026-07" -> "jul/2026" */
export function competencia(rotulo: string | null | undefined): string {
  if (!rotulo) return TRACO;
  const [ano, mes] = rotulo.split('-');
  const indice = Number(mes) - 1;
  if (!ano || Number.isNaN(indice) || !MESES[indice]) return rotulo;
  return `${MESES[indice]}/${ano}`;
}

/** ISO -> "20/09/2026 14:22" */
export function dataHora(iso: string | null | undefined): string {
  if (!iso) return TRACO;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return TRACO;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** O CNPJ já chega com 14 dígitos da API; aqui só recebe a máscara. */
export function cnpj(valor: string | null | undefined): string {
  if (!valor || valor.length !== 14) return valor ?? TRACO;
  return valor.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}
