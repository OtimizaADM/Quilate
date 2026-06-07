/**
 * API de movimentação — POST /api/movimentacoes (tela 7.2).
 * Origem 'manual'. A lógica e o mapa de erros ficam em responderMovimentacao.
 */

import { type NextRequest, type NextResponse } from "next/server";
import { responderMovimentacao } from "@/lib/movimentacoes/responderMovimentacao";

export async function POST(request: NextRequest): Promise<NextResponse> {
  return responderMovimentacao(request, "manual");
}
