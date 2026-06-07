import { describe, expect, it } from "vitest";
import { saldoResultante, validarSaida } from "./regrasSaldo";

describe("validarSaida", () => {
  it("permite saída até o saldo disponível", () => {
    expect(() => validarSaida(5, 5)).not.toThrow();
    expect(() => validarSaida(5, 3)).not.toThrow();
  });

  it("recusa saída maior que o saldo, citando os valores", () => {
    expect(() => validarSaida(2, 3)).toThrow("saldo atual 2");
    expect(() => validarSaida(2, 3)).toThrow("saída solicitada 3");
  });

  it("recusa saída quando o saldo é zero", () => {
    expect(() => validarSaida(0, 1)).toThrow("Saldo insuficiente");
  });
});

describe("saldoResultante", () => {
  it("soma na entrada", () => {
    expect(saldoResultante(10, "entrada", 4)).toBe(14);
    expect(saldoResultante(0, "entrada", 7)).toBe(7);
  });

  it("subtrai na saída válida", () => {
    expect(saldoResultante(10, "saida", 4)).toBe(6);
    expect(saldoResultante(3, "saida", 3)).toBe(0);
  });

  it("recusa saída que zeraria abaixo de zero", () => {
    expect(() => saldoResultante(3, "saida", 4)).toThrow("Saldo insuficiente");
  });
});
