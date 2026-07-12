/**
 * Casa as quantidades informadas no cadastro às variações recém-inseridas.
 *
 * Cada SKU é identificado por (pedra, tamanho). Só gera entrada para qtd > 0 —
 * SKUs com quantidade 0 existem, mas sem movimentação (saldo 0).
 */

export interface QuantidadeSku {
  pedra: string;
  tamanho: string | null;
  quantidade: number;
}

export interface VariacaoComId {
  id: string;
  pedra: string | null;
  tamanho: string | null;
}

export interface EntradaInicial {
  variacaoId: string;
  quantidade: number;
}

function chave(pedra: string | null, tamanho: string | null): string {
  return `${pedra ?? ""}|${tamanho ?? ""}`;
}

export function entradasIniciais(
  variacoes: readonly VariacaoComId[],
  quantidades: readonly QuantidadeSku[],
): EntradaInicial[] {
  const mapa = new Map<string, number>();
  for (const q of quantidades) mapa.set(chave(q.pedra, q.tamanho), q.quantidade);

  const entradas: EntradaInicial[] = [];
  for (const v of variacoes) {
    const qtd = mapa.get(chave(v.pedra, v.tamanho)) ?? 0;
    if (qtd > 0) entradas.push({ variacaoId: v.id, quantidade: qtd });
  }
  return entradas;
}
