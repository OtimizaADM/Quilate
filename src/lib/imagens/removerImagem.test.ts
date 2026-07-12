import { afterEach, describe, expect, it } from "vitest";
import { join } from "node:path";
import { caminhoArquivoImagem } from "./removerImagem";

describe("caminhoArquivoImagem", () => {
  const original = process.env.UPLOAD_DIR;
  afterEach(() => {
    if (original === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = original;
  });

  it("usa ./uploads como base por padrão", () => {
    delete process.env.UPLOAD_DIR;
    expect(caminhoArquivoImagem("uploads/abc.png")).toBe(join("./uploads", "abc.png"));
  });

  it("respeita UPLOAD_DIR e remove o prefixo uploads/", () => {
    process.env.UPLOAD_DIR = "/var/data/uploads";
    expect(caminhoArquivoImagem("uploads/abc.png")).toBe(join("/var/data/uploads", "abc.png"));
  });
});
