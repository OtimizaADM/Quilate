import { describe, expect, it } from "vitest";
import { esquemaMovimentacao } from "./validarMovimentacao";

describe("esquemaMovimentacao", () => {
  // base usa "saida" nos testes genéricos (entrada exige coleção/fornecedor).
  const base = { codigo: "3000010540", tipoMov: "saida", quantidade: 1 };

  // Regressão: observacao ausente no JSON era rejeitada como "Invalid input".
  it("aceita observacao ausente, tratando como null", () => {
    const r = esquemaMovimentacao.safeParse(base);
    expect(r.success).toBe(true);
    expect(r.success && r.data.observacao).toBeNull();
  });

  it("aceita observacao null e string vazia como null", () => {
    expect(esquemaMovimentacao.parse({ ...base, observacao: null }).observacao).toBeNull();
    expect(esquemaMovimentacao.parse({ ...base, observacao: "   " }).observacao).toBeNull();
  });

  it("apara a observação informada", () => {
    expect(esquemaMovimentacao.parse({ ...base, observacao: " venda " }).observacao).toBe("venda");
  });

  it("coage quantidade e rejeita zero ou negativo", () => {
    expect(esquemaMovimentacao.parse({ ...base, quantidade: "3" }).quantidade).toBe(3);
    expect(esquemaMovimentacao.safeParse({ ...base, quantidade: 0 }).success).toBe(false);
    expect(esquemaMovimentacao.safeParse({ ...base, quantidade: -1 }).success).toBe(false);
  });

  it("rejeita tipoMov fora do domínio", () => {
    expect(esquemaMovimentacao.safeParse({ ...base, tipoMov: "transferencia" }).success).toBe(false);
  });

  const idValido = "11111111-1111-4111-8111-111111111111";

  it("exige coleção e fornecedor na entrada", () => {
    const r = esquemaMovimentacao.safeParse({ ...base, tipoMov: "entrada" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const campos = r.error.flatten().fieldErrors;
      expect(campos.colecaoId?.[0]).toContain("Coleção");
      expect(campos.fornecedorId?.[0]).toContain("Fornecedor");
    }
  });

  it("aceita entrada com coleção e fornecedor válidos", () => {
    const r = esquemaMovimentacao.safeParse({
      ...base,
      tipoMov: "entrada",
      colecaoId: idValido,
      fornecedorId: idValido,
    });
    expect(r.success).toBe(true);
  });

  it("não exige coleção/fornecedor na saída", () => {
    const r = esquemaMovimentacao.safeParse({ ...base, tipoMov: "saida" });
    expect(r.success).toBe(true);
    expect(r.success && r.data.colecaoId).toBeNull();
  });
});
