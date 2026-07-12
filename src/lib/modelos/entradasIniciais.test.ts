import { describe, expect, it } from "vitest";
import { entradasIniciais } from "./entradasIniciais";

const variacoes = [
  { id: "a", pedra: "01", tamanho: "14" },
  { id: "b", pedra: "01", tamanho: "16" },
  { id: "c", pedra: "06", tamanho: "14" },
];

describe("entradasIniciais", () => {
  it("casa quantidades por pedra+tamanho e ignora qtd 0", () => {
    const entradas = entradasIniciais(variacoes, [
      { pedra: "01", tamanho: "14", quantidade: 2 },
      { pedra: "01", tamanho: "16", quantidade: 0 },
      { pedra: "06", tamanho: "14", quantidade: 3 },
    ]);
    expect(entradas).toEqual([
      { variacaoId: "a", quantidade: 2 },
      { variacaoId: "c", quantidade: 3 },
    ]);
  });

  it("casa variações sem tamanho (brinco) por pedra", () => {
    const entradas = entradasIniciais(
      [{ id: "x", pedra: "01", tamanho: null }],
      [{ pedra: "01", tamanho: null, quantidade: 5 }],
    );
    expect(entradas).toEqual([{ variacaoId: "x", quantidade: 5 }]);
  });

  it("retorna vazio quando nenhuma quantidade é informada", () => {
    expect(entradasIniciais(variacoes, [])).toEqual([]);
  });
});
