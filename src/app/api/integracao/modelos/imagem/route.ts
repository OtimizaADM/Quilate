/**
 * Integração: POST /api/integracao/modelos/imagem — anexa a foto (multipart) ao
 * modelo recém-cadastrado pelo bot (etapa 2 do fluxo de cadastro via WhatsApp).
 */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { exigirToken } from "@/lib/integracao/exigirToken";
import { anexarImagemUltimoModelo } from "@/lib/modelos/anexarImagem";
import { ErroCadastroIntegracao } from "@/lib/modelos/cadastrarViaIntegracao";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const naoAutorizado = exigirToken(request);
  if (naoAutorizado) return naoAutorizado;

  const form = await request.formData();
  const imagem = form.get("imagem");
  if (!(imagem instanceof File) || imagem.size === 0) {
    return NextResponse.json({ erro: "Imagem é obrigatória." }, { status: 422 });
  }

  try {
    const resultado = await anexarImagemUltimoModelo(db, imagem);
    return NextResponse.json(resultado, { status: 200 });
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
