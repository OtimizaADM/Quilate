/** Integração: GET (listar) e POST (criar) fornecedores para o bot/N8N. */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { violacaoUnica } from "@/lib/db/erros";
import {
  criarFornecedor,
  esquemaFornecedor,
  listarFornecedores,
} from "@/lib/fornecedores/fornecedores";
import { exigirToken } from "@/lib/integracao/exigirToken";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const naoAutorizado = exigirToken(request);
  if (naoAutorizado) return naoAutorizado;

  return NextResponse.json({ fornecedores: await listarFornecedores(db) });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const naoAutorizado = exigirToken(request);
  if (naoAutorizado) return naoAutorizado;

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
