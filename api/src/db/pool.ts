/** Pool único de conexões, criado uma vez e injetado nos repositories. */

import { Pool } from 'pg';
import { config } from '../config';

let pool: Pool | null = null;

export function criarPool(): Pool {
  if (pool) return pool;
  pool = new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
  return pool;
}

export function obterPool(): Pool {
  if (!pool) throw new Error('pool não inicializado');
  return pool;
}

export async function fecharPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
