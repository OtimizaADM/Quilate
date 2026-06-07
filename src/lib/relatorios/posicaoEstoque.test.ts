import { describe, expect, it } from "vitest";
import { montarPosicao, type LinhaCrua } from "./posicaoEstoque";

describe("montarPosicao", () => {
  it("calcula totais por item e gerais", () => {
    const linhas: LinhaCrua[] = [
      { codigo: "1000010618", descricao: "Anel solitário", saldo: 5, precoCusto: "120.50", precoVenda: "349.90" },
      { codigo: "3000010540", descricao: "Colar fino", saldo: 2, precoCusto: "80.00", precoVenda: "200.00" },
    ];
    const posicao = montarPosicao(linhas);

    expect(posicao.itens[0]).toMatchObject({
      codigo: "1000010618",
      produto: "Anel solitário",
      quantidade: 5,
      custo: 120.5,
      venda: 349.9,
      totalCusto: 602.5,
      totalVenda: 1749.5,
    });
    expect(posicao.totalQuantidade).toBe(7);
    expect(posicao.totalCusto).toBe(602.5 + 160);
    expect(posicao.totalVenda).toBe(1749.5 + 400);
  });

  it("trata preço nulo como custo/venda nulos e total zero", () => {
    const posicao = montarPosicao([
      { codigo: "20000100", descricao: null, saldo: 3, precoCusto: null, precoVenda: null },
    ]);
    expect(posicao.itens[0].custo).toBeNull();
    expect(posicao.itens[0].totalCusto).toBe(0);
    expect(posicao.itens[0].totalVenda).toBe(0);
  });

  it("usa o código decodificado como produto quando não há descrição", () => {
    const posicao = montarPosicao([
      { codigo: "20000100", descricao: null, saldo: 0, precoCusto: null, precoVenda: null },
    ]);
    expect(posicao.itens[0].produto).toBe("Brinco · modelo 00001 · pedra Sem Pedra");
  });
});
