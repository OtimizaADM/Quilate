/** Integração: GET /api/integracao/fornecedores — opções válidas para entrada. */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { listarFornecedores } from "@/lib/fornecedores/fornecedores";
import { exigirToken } from "@/lib/integracao/exigirToken";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const naoAutorizado = exigirToken(request);
  if (naoAutorizado) return naoAutorizado;

  return NextResponse.json({ fornecedores: await listarFornecedores(db) });
}
