/** Integração: GET (listar) e POST (criar) coleções para o bot/N8N. */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { criarColecao, esquemaColecao, listarColecoes } from "@/lib/colecoes/colecoes";
import { violacaoUnica } from "@/lib/db/erros";
import { exigirToken } from "@/lib/integracao/exigirToken";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const naoAutorizado = exigirToken(request);
  if (naoAutorizado) return naoAutorizado;

  return NextResponse.json({ colecoes: await listarColecoes(db) });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const naoAutorizado = exigirToken(request);
  if (naoAutorizado) return naoAutorizado;

  const parsed = esquemaColecao.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Dados inválidos.", detalhes: parsed.error.flatten() },
      { status: 422 },
    );
  }
  try {
    return NextResponse.json(await criarColecao(db, parsed.data), { status: 201 });
  } catch (erro) {
    if (violacaoUnica(erro) !== null) {
      return NextResponse.json(
        { erro: "Já existe uma coleção com este nome e data." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : String(erro) },
      { status: 400 },
    );
  }
}
