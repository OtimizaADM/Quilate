import { describe, expect, it } from "vitest";
import { esquemaCadastroModelo, esquemaEdicaoModelo } from "./validarCadastro";

const ID = "11111111-1111-4111-8111-111111111111";

const base = {
  tipo: "1",
  descricao: "Anel solitário",
  precoCusto: "120,50",
  precoVenda: "349,90",
  colecaoId: ID,
  fornecedorId: ID,
  pedras: ["06"],
  tamanhos: ["18"],
};

describe("esquemaCadastroModelo", () => {
  it("aceita uma entrada válida e normaliza preços (vírgula → ponto)", () => {
    const r = esquemaCadastroModelo.parse(base);
    expect(r.precoCusto).toBe("120.50");
    expect(r.precoVenda).toBe("349.90");
    expect(r.descricao).toBe("Anel solitário");
  });

  it("exige descrição", () => {
    expect(esquemaCadastroModelo.safeParse({ ...base, descricao: "" }).success).toBe(false);
    expect(esquemaCadastroModelo.safeParse({ ...base, descricao: "   " }).success).toBe(false);
    expect(esquemaCadastroModelo.safeParse({ ...base, descricao: null }).success).toBe(false);
  });

  it("exige preço de custo", () => {
    const r = esquemaCadastroModelo.safeParse({ ...base, precoCusto: "" });
    expect(r.success).toBe(false);
    expect(r.success === false && r.error.flatten().fieldErrors.precoCusto?.[0]).toContain(
      "obrigatório",
    );
  });

  it("exige preço de venda", () => {
    expect(esquemaCadastroModelo.safeParse({ ...base, precoVenda: null }).success).toBe(false);
  });

  it("rejeita preço em formato inválido", () => {
    expect(esquemaCadastroModelo.safeParse({ ...base, precoVenda: "abc" }).success).toBe(false);
    expect(esquemaCadastroModelo.safeParse({ ...base, precoVenda: "10,999" }).success).toBe(false);
  });

  it("exige coleção e fornecedor", () => {
    expect(esquemaCadastroModelo.safeParse({ ...base, colecaoId: "" }).success).toBe(false);
    expect(esquemaCadastroModelo.safeParse({ ...base, fornecedorId: null }).success).toBe(false);
    expect(esquemaCadastroModelo.safeParse({ ...base, colecaoId: "nao-uuid" }).success).toBe(false);
  });

  it("aceita modelo do fornecedor e o normaliza para null quando vazio", () => {
    expect(esquemaCadastroModelo.parse({ ...base }).modeloFornecedor).toBeNull();
    expect(
      esquemaCadastroModelo.parse({ ...base, modeloFornecedor: "  REF-123 " }).modeloFornecedor,
    ).toBe("REF-123");
  });

  it("aceita tamanho fora da lista de sugestões (2 dígitos)", () => {
    expect(esquemaCadastroModelo.safeParse({ ...base, tamanhos: ["17"] }).success).toBe(true);
    expect(esquemaCadastroModelo.safeParse({ ...base, tamanhos: ["7"] }).success).toBe(false);
  });

  it("aceita quantidades para SKUs selecionados", () => {
    const r = esquemaCadastroModelo.safeParse({
      ...base,
      pedras: ["06"],
      tamanhos: ["18"],
      quantidades: [{ pedra: "06", tamanho: "18", quantidade: 3 }],
    });
    expect(r.success).toBe(true);
  });

  it("rejeita quantidade > 0 para SKU não selecionado", () => {
    const r = esquemaCadastroModelo.safeParse({
      ...base,
      pedras: ["06"],
      tamanhos: ["18"],
      quantidades: [{ pedra: "01", tamanho: "18", quantidade: 3 }],
    });
    expect(r.success).toBe(false);
  });

  it("default de quantidades é lista vazia", () => {
    expect(esquemaCadastroModelo.parse({ ...base }).quantidades).toEqual([]);
  });
});

describe("esquemaEdicaoModelo", () => {
  const baseEd = {
    descricao: "Anel X",
    precoCusto: "10,00",
    precoVenda: "20,00",
    colecaoId: ID,
    fornecedorId: ID,
    novosSkus: [],
    removerVariacaoIds: [],
  };

  it("aceita edição sem novos SKUs nem remoções", () => {
    expect(esquemaEdicaoModelo.safeParse(baseEd).success).toBe(true);
  });

  it("aceita novos SKUs com tamanho custom e quantidade", () => {
    const r = esquemaEdicaoModelo.safeParse({
      ...baseEd,
      novosSkus: [{ pedra: "06", tamanho: "17", quantidade: 2 }],
    });
    expect(r.success).toBe(true);
  });

  it("rejeita pedra inválida em novo SKU", () => {
    const r = esquemaEdicaoModelo.safeParse({
      ...baseEd,
      novosSkus: [{ pedra: "99", tamanho: "18", quantidade: 1 }],
    });
    expect(r.success).toBe(false);
  });
});
