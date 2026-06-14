import { describe, expect, it } from "vitest";
import { corresponde, normalizar } from "./buscaProduto";

describe("normalizar", () => {
  it("remove acentos e baixa a caixa", () => {
    expect(normalizar("Zircônia")).toBe("zirconia");
    expect(normalizar("ANEL Coração")).toBe("anel coracao");
  });
});

describe("corresponde", () => {
  const anel = { codigo: "1001230618", descricao: "Anel Zircônia Cristal" };

  it("casa descrição ignorando acento", () => {
    expect(corresponde("zirconia", anel)).toBe(true);
  });

  it("casa com múltiplas palavras (todas presentes)", () => {
    expect(corresponde("anel zirconia", anel)).toBe(true);
    expect(corresponde("anel esmeralda", anel)).toBe(false);
  });

  it("casa por trecho de código (>=3 dígitos)", () => {
    expect(corresponde("00123", anel)).toBe(true);
    expect(corresponde("999", anel)).toBe(false);
  });

  it("termo vazio casa tudo (sem filtro)", () => {
    expect(corresponde("", anel)).toBe(true);
    expect(corresponde("   ", anel)).toBe(true);
  });

  it("não quebra com descrição nula", () => {
    expect(corresponde("anel", { codigo: "1001230618", descricao: null })).toBe(false);
    expect(corresponde("0123", { codigo: "1001230618", descricao: null })).toBe(true);
  });
});
