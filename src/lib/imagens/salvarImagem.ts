/**
 * Persistência de imagem de modelo no disco do servidor (seção 2).
 *
 * O binário NUNCA vai para o banco — só o caminho relativo retornado aqui.
 * A pasta de uploads (UPLOAD_DIR) deve entrar na rotina de backup (deploy §8.5).
 */

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const EXTENSOES_PERMITIDAS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB

function pastaUploads(): string {
  return process.env.UPLOAD_DIR ?? "./uploads";
}

/**
 * Salva o arquivo enviado e devolve o caminho relativo para gravar no banco.
 * Retorna null se nenhum arquivo foi enviado (imagem é opcional).
 * @example await salvarImagem(file) // "uploads/3f2a...c1.png"
 */
export async function salvarImagem(arquivo: File | null): Promise<string | null> {
  if (!arquivo || arquivo.size === 0) return null;

  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    throw new Error(
      `Imagem com ${arquivo.size} bytes excede o limite de ${TAMANHO_MAXIMO_BYTES} bytes.`,
    );
  }

  const extensao = extname(arquivo.name).toLowerCase();
  if (!EXTENSOES_PERMITIDAS.has(extensao)) {
    throw new Error(
      `Extensão "${extensao}" não permitida. Use uma de: ${[...EXTENSOES_PERMITIDAS].join(", ")}.`,
    );
  }

  const pasta = pastaUploads();
  await mkdir(pasta, { recursive: true });

  const nome = `${randomUUID()}${extensao}`;
  const destino = join(pasta, nome);
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  await writeFile(destino, bytes);

  // Caminho relativo, normalizado com "/", para servir via /uploads no futuro.
  return `uploads/${nome}`;
}
