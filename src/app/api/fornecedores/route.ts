/** API de Fornecedores — GET (listar) e POST (criar). */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { violacaoUnica } from "@/lib/db/erros";
import {
  criarFornecedor,
  esquemaFornecedor,
  listarFornecedores,
} from "@/lib/fornecedores/fornecedores";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ fornecedores: await listarFornecedores(db) });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const parsed = esquemaFornecedor.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Dados inválidos.", detalhes: parsed.error.flatten() },
      { status: 422 },
    );
  }
  try {
    return NextResponse.json(await criarFornecedor(db, parsed.data), { status: 201 });
  } catch (erro) {
    if (violacaoUnica(erro) !== null) {
      return NextResponse.json(
        { erro: "Já existe um fornecedor com este nome." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : String(erro) },
      { status: 400 },
    );
  }
}
