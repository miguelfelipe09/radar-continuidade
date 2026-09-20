/** Gera src/docs/exemplos.ts a partir de chamadas reais à API rodando.
 *
 *   node scripts/capturar-exemplos.mjs http://localhost:3001
 *
 * Os exemplos do Swagger precisam ser respostas que existiram de verdade;
 * número inventado em documentação é número que alguém vai acreditar.
 */

import { writeFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:3001';

const chamadas = {
  boletim: '/api/v1/boletim',
  ranking: '/api/v1/ranking?limite=3',
  fila: '/api/v1/fila?severidade=alta,moderada&tamanho=2',
  filaAusentes: '/api/v1/fila?situacao=ausente&tamanho=2',
  conjunto: '/api/v1/conjuntos/16900',
};

const exemplos = {};
for (const [nome, caminho] of Object.entries(chamadas)) {
  const resposta = await fetch(base + caminho);
  if (!resposta.ok) throw new Error(`${caminho} devolveu ${resposta.status}`);
  exemplos[nome] = await resposta.json();
  console.log(`capturado ${nome}: ${caminho}`);
}

const cabecalho = `/** Exemplos de resposta do Swagger.
 *
 * Gerado por scripts/capturar-exemplos.mjs a partir de chamadas reais contra
 * a base carregada. Não editar à mão: número de documentação que não veio de
 * uma chamada que rodou é número que alguém vai acreditar.
 *
 * Chamadas usadas:
${Object.entries(chamadas)
  .map(([nome, caminho]) => ` *   ${nome}: ${caminho}`)
  .join('\n')}
 */

export const exemplos: Record<string, unknown> = `;

writeFileSync(
  new URL('../src/docs/exemplos.ts', import.meta.url),
  cabecalho + JSON.stringify(exemplos, null, 2) + ';\n',
  'utf8',
);
console.log('src/docs/exemplos.ts atualizado');
