/**
 * API de busca de variações — GET /api/variacoes?q=termo (tela 7.2).
 * Usada pela busca do balcão (por código ou descrição do modelo).
 */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { buscarVariacoes } from "@/lib/variacoes/buscarVariacoes";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const termo = request.nextUrl.searchParams.get("q") ?? "";
  const resultados = await buscarVariacoes(db, termo);
  return NextResponse.json({ resultados });
}
