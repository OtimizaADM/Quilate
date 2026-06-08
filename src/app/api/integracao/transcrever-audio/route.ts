/**
 * Integração: POST /api/integracao/transcrever-audio — voz → texto (Groq Whisper).
 *
 * O N8N manda JSON (audioBase64 OU messageId) e recebe { text }. Toda a parte de
 * binário/multipart fica no servidor, fora do N8N.
 */

import { NextResponse, type NextRequest } from "next/server";
import { exigirToken } from "@/lib/integracao/exigirToken";
import { transcreverAudio } from "@/lib/integracao/transcreverAudio";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const naoAutorizado = exigirToken(request);
  if (naoAutorizado) return naoAutorizado;

  const corpo = (await request.json().catch(() => null)) as {
    audioBase64?: string;
    base64?: string;
    messageId?: string;
    remoteJid?: string;
    mimeType?: string;
    fileName?: string;
  } | null;

  if (!corpo || (!corpo.audioBase64 && !corpo.base64 && !corpo.messageId)) {
    return NextResponse.json({ erro: "Informe audioBase64 ou messageId." }, { status: 422 });
  }

  try {
    const resultado = await transcreverAudio({
      audioBase64: corpo.audioBase64 ?? corpo.base64,
      messageId: corpo.messageId,
      remoteJid: corpo.remoteJid,
      mimeType: corpo.mimeType,
      fileName: corpo.fileName,
    });
    return NextResponse.json(resultado, { status: 200 });
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : String(erro) },
      { status: 502 },
    );
  }
}
