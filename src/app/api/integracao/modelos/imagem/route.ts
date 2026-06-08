/**
 * Integração: POST /api/integracao/modelos/imagem — anexa a foto ao modelo
 * recém-cadastrado pelo bot (etapa 2 do fluxo de cadastro via WhatsApp).
 *
 * Aceita JSON `{ messageId, remoteJid }` (o app baixa a imagem da Evolution —
 * sem binário no N8N) OU multipart com o campo `imagem`.
 */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { baixarMediaEvolution } from "@/lib/integracao/evolutionMedia";
import { exigirToken } from "@/lib/integracao/exigirToken";
import { limparBase64 } from "@/lib/integracao/transcreverAudio";
import { anexarImagemUltimoModelo } from "@/lib/modelos/anexarImagem";
import { ErroCadastroIntegracao } from "@/lib/modelos/cadastrarViaIntegracao";

function extensaoDe(mimetype: string): string {
  if (mimetype.includes("png")) return "png";
  if (mimetype.includes("webp")) return "webp";
  return "jpg";
}

async function arquivoDaRequisicao(request: NextRequest): Promise<File> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const corpo = (await request.json().catch(() => null)) as
      | { messageId?: string; remoteJid?: string }
      | null;
    if (!corpo?.messageId) {
      throw new ErroCadastroIntegracao("Informe messageId (ou envie multipart).", 422);
    }
    const midia = await baixarMediaEvolution(corpo.messageId, corpo.remoteJid);
    const buffer = Buffer.from(limparBase64(midia.base64), "base64");
    return new File([buffer], `foto.${extensaoDe(midia.mimetype)}`, {
      type: midia.mimetype || "image/jpeg",
    });
  }

  const form = await request.formData();
  const imagem = form.get("imagem");
  if (!(imagem instanceof File) || imagem.size === 0) {
    throw new ErroCadastroIntegracao("Imagem é obrigatória.", 422);
  }
  return imagem;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const naoAutorizado = exigirToken(request);
  if (naoAutorizado) return naoAutorizado;

  try {
    const arquivo = await arquivoDaRequisicao(request);
    const resultado = await anexarImagemUltimoModelo(db, arquivo);
    return NextResponse.json(resultado, { status: 200 });
  } catch (erro) {
    if (erro instanceof ErroCadastroIntegracao) {
      return NextResponse.json({ erro: erro.message }, { status: erro.status });
    }
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : String(erro) },
      { status: 502 },
    );
  }
}
