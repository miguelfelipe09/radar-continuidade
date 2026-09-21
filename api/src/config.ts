/** Configuração lida do ambiente, uma vez só. */

export const config = {
  porta: Number(process.env.PORT ?? 3001),
  // Origens do front autorizadas a chamar a API pelo navegador. O padrão
  // cobre o Vite em desenvolvimento e o container do web no compose.
  origensPermitidas: (
    process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:4173'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://app:app@localhost:5434/continuidade',
  // Limiares que a API aplica na apresentação. Não moram no banco porque não
  // mudam classificação: são regras de como mostrar, não de como detectar.
  limiarEventoRegional: 0.5,
  // Frota mínima para a saturação significar alguma coisa. Sem isto, uma
  // distribuidora de um conjunto satura em 100% com um único alerta: medido
  // em 2026, tudo que cruza o limiar tem frota de 1 ou 2 conjuntos e nunca
  // mais de um alerta no mês. A menor frota que chega a dois alertas
  // simultâneos tem 5 conjuntos e para em 0,40, abaixo do limiar.
  minimoFrotaEventoRegional: 10,
  // Abaixo desta sobreposição de frota a variação contra o ano anterior vai
  // nula: compararia conjuntos diferentes (ACHADOS §14).
  minimoSobreposicao: 0.5,
};
