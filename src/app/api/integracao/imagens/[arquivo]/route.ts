/**
 * Integração: GET /api/integracao/imagens/:arquivo — imagem do produto (token).
 * O N8N baixa por aqui (com Bearer) e reenvia ao WhatsApp como mídia.
 */

import { NextResponse, type NextRequest } from "next/server";
import { exigirToken } from "@/lib/integracao/exigirToken";
import { lerImagem } from "@/lib/imagens/lerImagem";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ arquivo: string }> },
): Promise<Response> {
  const naoAutorizado = exigirToken(request);
  if (naoAutorizado) return naoAutorizado;

  const { arquivo } = await ctx.params;
  const imagem = await lerImagem(arquivo);
  if (!imagem) {
    return NextResponse.json({ erro: "Imagem não encontrada." }, { status: 404 });
  }
  return new Response(new Uint8Array(imagem.bytes), {
    headers: { "Content-Type": imagem.tipoConteudo, "Cache-Control": "private, max-age=3600" },
  });
}
