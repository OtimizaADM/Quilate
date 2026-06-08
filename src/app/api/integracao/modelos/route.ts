/**
 * Integração: POST /api/integracao/modelos — cadastro de produto pelo bot/N8N.
 *
 * Reusa a regra da tela (cadastrarViaIntegracao → esquemaCadastroModelo +
 * cadastrarModelo). O modelo nasce SEM imagem; a foto é anexada depois via
 * /api/integracao/modelos/imagem.
 */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { exigirToken } from "@/lib/integracao/exigirToken";
import { ErroCadastroIntegracao, cadastrarViaIntegracao } from "@/lib/modelos/cadastrarViaIntegracao";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const naoAutorizado = exigirToken(request);
  if (naoAutorizado) return naoAutorizado;

  const corpo = await request.json().catch(() => null);
  if (corpo === null || typeof corpo !== "object") {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 422 });
  }

  try {
    const resultado = await cadastrarViaIntegracao(db, corpo);
    return NextResponse.json(resultado, { status: 201 });
  } catch (erro) {
    if (erro instanceof ErroCadastroIntegracao) {
      return NextResponse.json({ erro: erro.message }, { status: erro.status });
    }
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : String(erro) },
      { status: 400 },
    );
  }
}
