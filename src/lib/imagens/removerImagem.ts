/**
 * Remoção do arquivo de imagem de um modelo (usado na deleção física — regra 3).
 * Best-effort: arquivo já ausente (ENOENT) não é erro; outros erros são logados
 * e não abortam o fluxo (o registro no banco já foi apagado).
 */

import { unlink } from "node:fs/promises";
import { join } from "node:path";

function pastaBase(): string {
  return process.env.UPLOAD_DIR ?? "./uploads";
}

/** "uploads/x.png" → caminho absoluto do arquivo no disco. */
export function caminhoArquivoImagem(imagemPath: string): string {
  const nome = imagemPath.replace(/^uploads\//, "");
  return join(pastaBase(), nome);
}

export async function removerImagem(imagemPath: string): Promise<void> {
  try {
    await unlink(caminhoArquivoImagem(imagemPath));
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(
        JSON.stringify({ evento: "remover_imagem_falhou", imagemPath, erro: String(erro) }),
      );
    }
  }
}
