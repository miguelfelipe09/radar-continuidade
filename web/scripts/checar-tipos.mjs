/** Garante que src/tipos/api.ts continua idêntico a api/src/models/index.ts.
 *
 * O front espelha os tipos da API em vez de importá-los por caminho relativo,
 * porque a imagem Docker do web não enxerga a pasta da API. Espelho que pode
 * divergir em silêncio é pior que nenhum espelho — então a divergência falha
 * aqui, e não em produção.
 *
 *   npm run checar-tipos
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const espelho = resolve(aqui, '../src/tipos/api.ts');
const origem = resolve(aqui, '../../api/src/models/index.ts');

let original;
try {
  original = readFileSync(origem, 'utf8');
} catch {
  console.log('api/src/models/index.ts não encontrado (build isolado) — checagem pulada.');
  process.exit(0);
}

if (readFileSync(espelho, 'utf8') !== original) {
  console.error(
    'Os tipos divergiram.\n' +
      '  origem:  api/src/models/index.ts\n' +
      '  espelho: web/src/tipos/api.ts\n\n' +
      'Para sincronizar:\n' +
      '  cp api/src/models/index.ts web/src/tipos/api.ts',
  );
  process.exit(1);
}

console.log('Tipos em dia com a API.');
