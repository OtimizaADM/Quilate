import { describe, expect, it } from "vitest";
import { consolidarPorCategoria } from "./consolidarPorCategoria";
import type { Produto } from "./listarProdutos";

function produto(tipo: number, categoria: string, saldoTotal: number): Produto {
  return {
    id: crypto.randomUUID(),
    tipo: tipo as Produto["tipo"],
    categoria,
    sequencial: "00001",
    codigoBase: `${tipo}00001`,
    descricao: null,
    precoVenda: null,
    colecao: null,
    fornecedor: null,
    qtdVariacoes: 1,
    saldoTotal,
    ativo: true,
    teveMovimentacao: false,
  };
}

describe("consolidarPorCategoria", () => {
  it("agrupa por tipo somando produtos e saldo, ordenado por tipo", () => {
    const resumo = consolidarPorCategoria([
      produto(1, "Anel", 5),
      produto(1, "Anel", 3),
      produto(2, "Brinco", 10),
    ]);
    expect(resumo).toEqual([
      { tipo: 1, categoria: "Anel", qtdProdutos: 2, saldoTotal: 8 },
      { tipo: 2, categoria: "Brinco", qtdProdutos: 1, saldoTotal: 10 },
    ]);
  });

  it("retorna vazio para lista vazia", () => {
    expect(consolidarPorCategoria([])).toEqual([]);
  });
});
