/**
 * Integração: POST /api/integracao/extrair-documento — lê uma nota/recibo
 * (imagem) e devolve os dados estruturados da compra para o bot conferir.
 * O N8N manda só JSON { messageId, remoteJid, legenda? } — sem binário.
 */

import { NextResponse, type NextRequest } from "next/server";
import { extrairDocumento } from "@/lib/integracao/extrairDocumento";
import { exigirToken } from "@/lib/integracao/exigirToken";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const naoAutorizado = exigirToken(request);
  if (naoAutorizado) return naoAutorizado;

  const corpo = (await request.json().catch(() => null)) as
    | { messageId?: string; remoteJid?: string; legenda?: string }
    | null;
  if (!corpo?.messageId) {
    return NextResponse.json({ erro: "Informe messageId." }, { status: 422 });
  }

  try {
    const documento = await extrairDocumento(corpo.messageId, corpo.remoteJid, corpo.legenda);
    return NextResponse.json(documento, { status: 200 });
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : String(erro) },
      { status: 502 },
    );
  }
}
