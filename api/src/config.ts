/** Configuração lida do ambiente, uma vez só. */

export const config = {
  porta: Number(process.env.PORT ?? 3001),
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://app:app@localhost:5434/continuidade',
  // Limiares que a API aplica na apresentação. Não moram no banco porque não
  // mudam classificação: são regras de como mostrar, não de como detectar.
  limiarEventoRegional: 0.5,
  // Abaixo desta sobreposição de frota a variação contra o ano anterior vai
  // nula: compararia conjuntos diferentes (ACHADOS §14).
  minimoSobreposicao: 0.5,
};
