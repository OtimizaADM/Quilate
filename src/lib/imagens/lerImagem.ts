/**
 * Leitura segura de uma imagem do diretório de uploads, para servir via HTTP.
 *
 * Defesa contra path traversal: aceita só um nome de arquivo simples (sem
 * barras nem "..") no formato que salvarImagem gera (uuid + extensão).
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

const NOME_VALIDO = /^[a-f0-9-]+\.(png|jpe?g|webp)$/i;

const TIPOS_CONTEUDO: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export interface ImagemLida {
  bytes: Buffer;
  tipoConteudo: string;
}

function pastaUploads(): string {
  return process.env.UPLOAD_DIR ?? "./uploads";
}

/** Lê a imagem pelo nome do arquivo. Retorna null se o nome for inválido ou não existir. */
export async function lerImagem(arquivo: string): Promise<ImagemLida | null> {
  if (!NOME_VALIDO.test(arquivo)) return null;

  const extensao = arquivo.split(".").pop()!.toLowerCase();
  try {
    const bytes = await readFile(join(pastaUploads(), arquivo));
    return { bytes, tipoConteudo: TIPOS_CONTEUDO[extensao] ?? "application/octet-stream" };
  } catch {
    return null; // arquivo não encontrado
  }
}
