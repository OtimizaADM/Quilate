/**
 * Serve as imagens de modelo salvas no disco (UPLOAD_DIR).
 * O `imagem_path` gravado no banco ("uploads/<arquivo>") mapeia direto para esta URL.
 */

import { NextResponse } from "next/server";
import { lerImagem } from "@/lib/imagens/lerImagem";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ arquivo: string }> },
): Promise<Response> {
  const { arquivo } = await ctx.params;
  const imagem = await lerImagem(arquivo);
  if (!imagem) {
    return NextResponse.json({ erro: "Imagem não encontrada." }, { status: 404 });
  }
  return new Response(new Uint8Array(imagem.bytes), {
    headers: {
      "Content-Type": imagem.tipoConteudo,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
