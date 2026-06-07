import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exigirToken } from "./exigirToken";

function requisicao(authorization?: string): Request {
  return new Request("http://localhost/api/integracao/x", {
    headers: authorization ? { authorization } : {},
  });
}

describe("exigirToken", () => {
  const original = process.env.INTEGRACAO_API_TOKEN;
  beforeEach(() => {
    process.env.INTEGRACAO_API_TOKEN = "token-secreto-123";
  });
  afterEach(() => {
    process.env.INTEGRACAO_API_TOKEN = original;
  });

  it("aceita o token correto (retorna null)", () => {
    expect(exigirToken(requisicao("Bearer token-secreto-123"))).toBeNull();
  });

  it("recusa token errado com 401", () => {
    const r = exigirToken(requisicao("Bearer errado"));
    expect(r?.status).toBe(401);
  });

  it("recusa ausência de header com 401", () => {
    expect(exigirToken(requisicao())?.status).toBe(401);
  });

  it("recusa quando a env não está configurada", () => {
    process.env.INTEGRACAO_API_TOKEN = "";
    expect(exigirToken(requisicao("Bearer qualquer"))?.status).toBe(401);
  });
});
