/** Integração: GET /api/integracao/variacoes?q= — desambiguação por código/descrição. */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { exigirToken } from "@/lib/integracao/exigirToken";
import { buscarVariacoes } from "@/lib/variacoes/buscarVariacoes";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const naoAutorizado = exigirToken(request);
  if (naoAutorizado) return naoAutorizado;

  const termo = request.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json({ resultados: await buscarVariacoes(db, termo) });
}
