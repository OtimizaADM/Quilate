import { describe, expect, it } from "vitest";
import { limparBase64 } from "./transcreverAudio";

describe("limparBase64", () => {
  it("remove o prefixo data-uri", () => {
    expect(limparBase64("data:audio/ogg;base64,T2dnUw==")).toBe("T2dnUw==");
  });

  it("mantém um base64 puro", () => {
    expect(limparBase64("T2dnUwAC")).toBe("T2dnUwAC");
  });

  it("tolera nulo/indefinido", () => {
    expect(limparBase64(undefined as unknown as string)).toBe("");
  });
});
