import { describe, expect, it } from "vitest";
import { violacaoUnica } from "./erros";

describe("violacaoUnica", () => {
  it("encontra o código do pg quando está em cause (wrapper do Drizzle)", () => {
    const erro = Object.assign(new Error("falha"), {
      cause: { code: "23505", constraint: "colecoes_nome_data" },
    });
    expect(violacaoUnica(erro)).toBe("colecoes_nome_data");
  });

  it("lê o código no nível raiz também", () => {
    expect(violacaoUnica({ code: "23505", constraint: "fornecedores_nome_unique" })).toBe(
      "fornecedores_nome_unique",
    );
  });

  it("retorna null para outros erros", () => {
    expect(violacaoUnica(new Error("qualquer"))).toBeNull();
    expect(violacaoUnica({ code: "23503" })).toBeNull(); // FK, não unique
    expect(violacaoUnica(null)).toBeNull();
  });
});
