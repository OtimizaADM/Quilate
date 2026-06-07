/**
 * Regras puras de saldo das movimentações (regra de negócio 2, seção 6).
 *
 * Saldo nunca pode ficar negativo: uma saída maior que o saldo atual é recusada
 * e não é gravada. Funções puras, sem banco — testáveis isoladamente.
 */

export type TipoMovimento = "entrada" | "saida";

/**
 * Lança erro se a saída deixaria o saldo negativo. Não retorna nada em sucesso.
 * @example validarSaida(5, 3) // ok
 * @example validarSaida(2, 3) // Error: saldo insuficiente
 */
export function validarSaida(saldoAtual: number, quantidade: number): void {
  if (quantidade > saldoAtual) {
    throw new Error(
      `Saldo insuficiente: saldo atual ${saldoAtual}, saída solicitada ${quantidade}.`,
    );
  }
}

/**
 * Calcula o saldo após aplicar a movimentação. Para saída, valida antes.
 * @example saldoResultante(10, "entrada", 4) // 14
 * @example saldoResultante(10, "saida", 4)   // 6
 */
export function saldoResultante(
  saldoAtual: number,
  tipoMov: TipoMovimento,
  quantidade: number,
): number {
  if (tipoMov === "entrada") {
    return saldoAtual + quantidade;
  }
  validarSaida(saldoAtual, quantidade);
  return saldoAtual - quantidade;
}
