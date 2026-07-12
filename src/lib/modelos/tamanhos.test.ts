import { describe, expect, it } from "vitest";
import { combinarTamanhos, parseOutrosTamanhos } from "./tamanhos";

describe("parseOutrosTamanhos", () => {
  it("separa por vírgula, faz trim e padStart para 2 dígitos", () => {
    expect(parseOutrosTamanhos("26, 28")).toEqual(["26", "28"]);
    expect(parseOutrosTamanhos("8")).toEqual(["08"]);
  });

  it("ignora vazios e espaços", () => {
    expect(parseOutrosTamanhos("  ")).toEqual([]);
    expect(parseOutrosTamanhos("26, ,")).toEqual(["26"]);
  });

  it("rejeita valor não numérico ou com mais de 2 dígitos, citando o valor", () => {
    expect(() => parseOutrosTamanhos("ab")).toThrow("ab");
    expect(() => parseOutrosTamanhos("170")).toThrow("170");
  });
});

describe("combinarTamanhos", () => {
  it("une e deduplica preservando ordem (marcados primeiro)", () => {
    expect(combinarTamanhos(["14", "16"], ["16", "26"])).toEqual(["14", "16", "26"]);
  });
});
