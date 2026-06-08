import { describe, expect, it } from "vitest";
import { extrairJson } from "./extrairDocumento";

describe("extrairJson", () => {
  it("extrai JSON puro", () => {
    expect(extrairJson('{"fornecedor":"Joias X"}')).toEqual({ fornecedor: "Joias X" });
  });

  it("extrai JSON embrulhado em cerca de código", () => {
    const texto = '```json\n{"fornecedor":"Joias X","itens":[]}\n```';
    expect(extrairJson(texto)).toEqual({ fornecedor: "Joias X", itens: [] });
  });

  it("retorna objeto vazio quando não há JSON", () => {
    expect(extrairJson("não consegui ler a nota")).toEqual({});
  });

  it("retorna objeto vazio em JSON inválido", () => {
    expect(extrairJson("{quebrado:}")).toEqual({});
  });
});
