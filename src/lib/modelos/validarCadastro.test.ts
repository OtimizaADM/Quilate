import { describe, expect, it } from "vitest";
import { esquemaCadastroModelo } from "./validarCadastro";

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
});
