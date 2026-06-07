/** Formatação de valores para exibição (pt-BR). */

const FORMATADOR_REAIS = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Formata um valor monetário em reais. Valor nulo vira "—".
 * @example formatarReais(349.9) // "R$ 349,90"
 * @example formatarReais(null)  // "—"
 */
export function formatarReais(valor: number | null): string {
  if (valor === null) return "—";
  return FORMATADOR_REAIS.format(valor);
}
