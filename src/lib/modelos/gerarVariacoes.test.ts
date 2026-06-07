import { describe, expect, it } from "vitest";
import { gerarVariacoes } from "./gerarVariacoes";

describe("gerarVariacoes", () => {
  it("gera o produto cartesiano de pedras x tamanhos para tipo com tamanho", () => {
    const variacoes = gerarVariacoes({
      tipo: 1,
      sequencial: "00123",
      pedras: ["06", "10"],
      tamanhos: ["18", "20"],
    });
    expect(variacoes).toEqual([
      { pedra: "06", tamanho: "18", codigo: "1001230618" },
      { pedra: "06", tamanho: "20", codigo: "1001230620" },
      { pedra: "10", tamanho: "18", codigo: "1001231018" },
      { pedra: "10", tamanho: "20", codigo: "1001231020" },
    ]);
  });

  it("ignora tamanhos e usa tamanho null para brinco (sem tamanho)", () => {
    const variacoes = gerarVariacoes({
      tipo: 2,
      sequencial: "00042",
      pedras: ["00", "01"],
      tamanhos: ["18"], // deve ser ignorado
    });
    expect(variacoes).toEqual([
      { pedra: "00", tamanho: null, codigo: "20004200" },
      { pedra: "01", tamanho: null, codigo: "20004201" },
    ]);
  });

  it("exige ao menos uma pedra", () => {
    expect(() =>
      gerarVariacoes({ tipo: 1, sequencial: "00001", pedras: [], tamanhos: ["18"] }),
    ).toThrow("Nenhuma pedra");
  });

  it("exige ao menos um tamanho para tipo que tem tamanho", () => {
    expect(() =>
      gerarVariacoes({ tipo: 1, sequencial: "00001", pedras: ["00"], tamanhos: [] }),
    ).toThrow("Nenhum tamanho");
  });

  it("propaga erro de tamanho inválido vindo de montarCodigo", () => {
    expect(() =>
      gerarVariacoes({ tipo: 1, sequencial: "00001", pedras: ["00"], tamanhos: ["17"] }),
    ).toThrow("17");
  });
});
