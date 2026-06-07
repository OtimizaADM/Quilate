/** Integração: GET /api/integracao/colecoes — opções válidas para entrada. */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { listarColecoes } from "@/lib/colecoes/colecoes";
import { exigirToken } from "@/lib/integracao/exigirToken";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const naoAutorizado = exigirToken(request);
  if (naoAutorizado) return naoAutorizado;

  return NextResponse.json({ colecoes: await listarColecoes(db) });
}
