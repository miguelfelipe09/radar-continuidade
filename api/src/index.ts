import { criarApp } from './app';
import { config } from './config';
import { criarPool, fecharPool } from './db/pool';

const pool = criarPool();
const app = criarApp(pool);

const servidor = app.listen(config.porta, () => {
  console.log(`API em http://localhost:${config.porta}`);
  console.log(`Documentação em http://localhost:${config.porta}/docs`);
});

async function encerrar(sinal: string): Promise<void> {
  console.log(`\n${sinal} recebido, encerrando.`);
  servidor.close();
  await fecharPool();
  process.exit(0);
}

process.on('SIGTERM', () => void encerrar('SIGTERM'));
process.on('SIGINT', () => void encerrar('SIGINT'));
