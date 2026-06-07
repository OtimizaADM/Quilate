/** Integração: GET /api/integracao/posicao-estoque — resumo + totais. */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { exigirToken } from "@/lib/integracao/exigirToken";
import { posicaoEstoque } from "@/lib/relatorios/posicaoEstoque";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const naoAutorizado = exigirToken(request);
  if (naoAutorizado) return naoAutorizado;

  return NextResponse.json(await posicaoEstoque(db));
}
