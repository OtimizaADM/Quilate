/** API de Produtos — GET (listar com filtros). */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { TIPOS, type TipoCodigo } from "@/lib/codigo/referencia";
import { listarProdutos, type StatusFiltro } from "@/lib/produtos/listarProdutos";

const CODIGOS_TIPO = new Set(TIPOS.map((t) => t.codigo));
const STATUS_VALIDOS = new Set<StatusFiltro>(["ativos", "inativos", "todos"]);

export async function GET(request: NextRequest): Promise<NextResponse> {
  const p = request.nextUrl.searchParams;

  const tipoNum = Number(p.get("tipo"));
  const tipo = CODIGOS_TIPO.has(tipoNum as TipoCodigo) ? (tipoNum as TipoCodigo) : undefined;
  const statusBruto = p.get("status") as StatusFiltro | null;
  const status = statusBruto && STATUS_VALIDOS.has(statusBruto) ? statusBruto : "ativos";

  const produtos = await listarProdutos(db, {
    tipo,
    colecaoId: p.get("colecaoId") ?? undefined,
    fornecedorId: p.get("fornecedorId") ?? undefined,
    status,
  });
  return NextResponse.json({ produtos });
}
