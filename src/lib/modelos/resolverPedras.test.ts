import { describe, expect, it } from "vitest";
import { ErroCadastroIntegracao, resolverPedras } from "./cadastrarViaIntegracao";

describe("resolverPedras", () => {
  it("converte nomes em códigos (insensível a caixa e acento)", () => {
    expect(resolverPedras(["Cristal", "azul", "PÉROLA"])).toEqual(["01", "10", "14"]);
  });

  it("aceita códigos já prontos", () => {
    expect(resolverPedras(["00", "06"])).toEqual(["00", "06"]);
  });

  it("mistura nome e código na mesma chamada", () => {
    expect(resolverPedras(["Cristal", "10"])).toEqual(["01", "10"]);
  });

  it("lança ErroCadastroIntegracao 422 com o valor ofensor em pedra desconhecida", () => {
    expect.assertions(3);
    try {
      resolverPedras(["Turquesa"]);
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroCadastroIntegracao);
      expect((erro as ErroCadastroIntegracao).status).toBe(422);
      expect((erro as Error).message).toContain("Turquesa");
    }
  });
});
