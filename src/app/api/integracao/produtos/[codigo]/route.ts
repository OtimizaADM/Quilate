/** Integração: GET /api/integracao/produtos/:codigo — detalhe do produto (com imagem). */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { exigirToken } from "@/lib/integracao/exigirToken";
import { detalheVariacao } from "@/lib/variacoes/detalheVariacao";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ codigo: string }> },
): Promise<NextResponse> {
  const naoAutorizado = exigirToken(request);
  if (naoAutorizado) return naoAutorizado;

  const { codigo } = await ctx.params;
  const detalhe = await detalheVariacao(db, codigo);
  if (!detalhe) {
    return NextResponse.json({ erro: `Produto não encontrado: "${codigo}".` }, { status: 404 });
  }
  return NextResponse.json(detalhe);
}
