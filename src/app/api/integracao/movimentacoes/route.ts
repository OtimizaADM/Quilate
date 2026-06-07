/** Integração: POST /api/integracao/movimentacoes — grava com origem 'whatsapp'. */

import { type NextRequest, type NextResponse } from "next/server";
import { exigirToken } from "@/lib/integracao/exigirToken";
import { responderMovimentacao } from "@/lib/movimentacoes/responderMovimentacao";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const naoAutorizado = exigirToken(request);
  if (naoAutorizado) return naoAutorizado;

  return responderMovimentacao(request, "whatsapp");
}
