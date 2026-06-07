/**
 * Geração das variações (SKUs) de um modelo — regra de negócio 1 (seção 6).
 *
 * Função pura: dado o tipo, o sequencial e as pedras/tamanhos selecionados,
 * produz todas as combinações com seus códigos montados. Não toca no banco.
 */

import { montarCodigo } from "@/lib/codigo/codigo";
import { tipoTemTamanho, type TipoCodigo } from "@/lib/codigo/referencia";

export interface SelecaoModelo {
  tipo: TipoCodigo;
  sequencial: string; // 5 dígitos, já gerado pelo sistema
  pedras: readonly string[]; // códigos '00'..'15' selecionados
  tamanhos: readonly string[]; // ignorado para brinco/pingente
}

export interface VariacaoGerada {
  pedra: string;
  tamanho: string | null;
  codigo: string;
}

/**
 * @example
 * gerarVariacoes({ tipo: 1, sequencial: "00123", pedras: ["06"], tamanhos: ["18", "20"] })
 * // [{ pedra: "06", tamanho: "18", codigo: "1001230618" },
 * //  { pedra: "06", tamanho: "20", codigo: "1001230620" }]
 */
export function gerarVariacoes(selecao: SelecaoModelo): VariacaoGerada[] {
  const { tipo, sequencial, pedras, tamanhos } = selecao;

  if (pedras.length === 0) {
    throw new Error(`Nenhuma pedra selecionada para o modelo tipo ${tipo}. Selecione ao menos uma.`);
  }

  if (!tipoTemTamanho(tipo)) {
    return pedras.map((pedra) => ({
      pedra,
      tamanho: null,
      codigo: montarCodigo({ tipo, sequencial, pedra, tamanho: null }),
    }));
  }

  if (tamanhos.length === 0) {
    throw new Error(
      `Nenhum tamanho selecionado para o modelo tipo ${tipo}, que exige tamanho. Selecione ao menos um.`,
    );
  }

  return pedras.flatMap((pedra) =>
    tamanhos.map((tamanho) => ({
      pedra,
      tamanho,
      codigo: montarCodigo({ tipo, sequencial, pedra, tamanho }),
    })),
  );
}
