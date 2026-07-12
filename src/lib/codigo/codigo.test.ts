import { describe, expect, it } from "vitest";
import {
  decodificarLegivel,
  formatarSequencial,
  montarCodigo,
  montarCodigoBase,
  parseCodigo,
  proximoSequencial,
} from "./codigo";

describe("montarCodigoBase", () => {
  it("monta o prefixo tipo+sequencial", () => {
    expect(montarCodigoBase(1, "00123")).toBe("100123");
    expect(montarCodigoBase(2, "00042")).toBe("200042");
  });

  it("rejeita tipo e sequencial inválidos", () => {
    expect(() => montarCodigoBase(9 as never, "00001")).toThrow("9");
    expect(() => montarCodigoBase(1, "12")).toThrow("12");
  });
});

describe("formatarSequencial", () => {
  it("preenche com zeros à esquerda até 5 dígitos", () => {
    expect(formatarSequencial(1)).toBe("00001");
    expect(formatarSequencial(123)).toBe("00123");
    expect(formatarSequencial(99999)).toBe("99999");
  });

  it("rejeita valores fora da faixa, citando o valor", () => {
    expect(() => formatarSequencial(0)).toThrow("0");
    expect(() => formatarSequencial(100000)).toThrow("100000");
    expect(() => formatarSequencial(1.5)).toThrow("1.5");
  });
});

describe("proximoSequencial", () => {
  it("começa em 00001 quando o tipo ainda não tem modelos", () => {
    expect(proximoSequencial(null)).toBe("00001");
  });

  it("incrementa o maior sequencial existente", () => {
    expect(proximoSequencial(122)).toBe("00123");
    expect(proximoSequencial(1)).toBe("00002");
  });
});

describe("montarCodigo", () => {
  it("monta código de 10 dígitos para tipo com tamanho", () => {
    expect(
      montarCodigo({ tipo: 1, sequencial: "00123", pedra: "06", tamanho: "18" }),
    ).toBe("1001230618");
  });

  it("monta código de 8 dígitos para brinco (sem tamanho)", () => {
    expect(
      montarCodigo({ tipo: 2, sequencial: "00042", pedra: "01", tamanho: null }),
    ).toBe("20004201");
  });

  it("recusa tamanho informado para tipo sem tamanho", () => {
    expect(() =>
      montarCodigo({ tipo: 4, sequencial: "00001", pedra: "00", tamanho: "18" }),
    ).toThrow("não tem tamanho");
  });

  it("aceita tamanho fora da lista de sugestões, desde que 2 dígitos (ex.: 17)", () => {
    expect(
      montarCodigo({ tipo: 1, sequencial: "00001", pedra: "00", tamanho: "17" }),
    ).toBe("1000010017");
  });

  it("recusa tamanho com formato inválido, citando o valor", () => {
    expect(() =>
      montarCodigo({ tipo: 1, sequencial: "00001", pedra: "00", tamanho: "7" }),
    ).toThrow("7");
    expect(() =>
      montarCodigo({ tipo: 1, sequencial: "00001", pedra: "00", tamanho: "170" }),
    ).toThrow("170");
  });

  it("recusa tamanho ausente para tipo que exige tamanho", () => {
    expect(() =>
      montarCodigo({ tipo: 3, sequencial: "00001", pedra: "00", tamanho: null }),
    ).toThrow();
  });

  it("recusa pedra inexistente", () => {
    expect(() =>
      montarCodigo({ tipo: 1, sequencial: "00001", pedra: "99", tamanho: "18" }),
    ).toThrow("99");
  });
});

describe("parseCodigo", () => {
  it("faz o parsing de código de 10 dígitos", () => {
    expect(parseCodigo("1001230618")).toEqual({
      tipo: 1,
      sequencial: "00123",
      pedra: "06",
      tamanho: "18",
    });
  });

  it("faz o parsing de código de 8 dígitos (brinco), tamanho null", () => {
    expect(parseCodigo("20004201")).toEqual({
      tipo: 2,
      sequencial: "00042",
      pedra: "01",
      tamanho: null,
    });
  });

  it("rejeita código com comprimento incompatível com o tipo", () => {
    // tipo 1 (anel) exige 10 dígitos; este tem 8
    expect(() => parseCodigo("10012306")).toThrow("exige 10");
  });

  it("rejeita código não numérico", () => {
    expect(() => parseCodigo("100x230618")).toThrow();
  });

  it("é o inverso de montarCodigo", () => {
    const partes = { tipo: 5 as const, sequencial: "00007", pedra: "10", tamanho: "20" };
    expect(parseCodigo(montarCodigo(partes))).toEqual(partes);
  });
});

describe("decodificarLegivel", () => {
  it("decodifica conforme o exemplo da spec", () => {
    expect(decodificarLegivel("1001230618")).toBe(
      "Anel · modelo 00123 · pedra Vermelho · tam. 18cm",
    );
  });

  it("omite o tamanho para brinco/pingente", () => {
    expect(decodificarLegivel("20004201")).toBe(
      "Brinco · modelo 00042 · pedra Cristal",
    );
  });
});
