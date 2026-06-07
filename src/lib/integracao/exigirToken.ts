/**
 * Autenticação por token (Bearer) das rotas /api/integracao/* (N8N/WhatsApp).
 *
 * Server-to-server: separado da sessão de navegador do NextAuth. Compara o token
 * em tempo constante para não vazar informação por timing.
 */

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

function igualConstante(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Retorna uma resposta 401 se o token for inválido/ausente, ou null se ok.
 * @example const erro = exigirToken(request); if (erro) return erro;
 */
export function exigirToken(request: Request): NextResponse | null {
  const cabecalho = request.headers.get("authorization") ?? "";
  const prefixo = "Bearer ";
  const token = cabecalho.startsWith(prefixo) ? cabecalho.slice(prefixo.length) : "";
  const esperado = process.env.INTEGRACAO_API_TOKEN ?? "";

  if (esperado === "" || !igualConstante(token, esperado)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  return null;
}
