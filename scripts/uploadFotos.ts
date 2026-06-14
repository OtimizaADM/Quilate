/**
 * Upload em massa de fotos de produtos a partir de uma pasta.
 *
 * O nome do arquivo traz o código (ex.: "100055  214,00.jpeg", "200149 - Copia.jpeg").
 * O script extrai os dígitos iniciais -> tipo (1º dígito) + sequencial (5) -> acha
 * o modelo e vincula a imagem (copia para UPLOAD_DIR e grava imagem_path).
 * Duplicatas ("- Copia") são ignoradas (1 foto por modelo).
 *
 * Uso (no container do app, com a pasta copiada para dentro dele):
 *   npx tsx scripts/uploadFotos.ts <pasta>            # PRÉVIA (não grava)
 *   npx tsx scripts/uploadFotos.ts <pasta> --commit   # copia + vincula
 */

import { randomUUID } from "node:crypto";
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { modelos } from "@/db/schema";

const EXTENSOES = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";

/** Extrai tipo (1º dígito) + sequencial (5 díg.) dos dígitos iniciais do nome. */
function tipoSeqDoNome(nome: string): { tipo: number; seq: string } | null {
  const m = nome.replace(/\.[^.]+$/, "").match(/^\s*(\d+)/);
  if (!m) return null;
  const digitos = m[1];
  const resto = digitos.slice(1);
  const seq = resto.length >= 5 ? resto.slice(0, 5) : resto.padStart(5, "0");
  return { tipo: Number(digitos[0]), seq };
}

async function main(): Promise<void> {
  const pasta = process.argv[2];
  const commit = process.argv.includes("--commit");
  if (!pasta) {
    console.error("Uso: npx tsx scripts/uploadFotos.ts <pasta> [--commit]");
    process.exit(1);
  }

  const arquivos = readdirSync(pasta)
    .filter((f) => EXTENSOES.has(extname(f).toLowerCase()))
    .sort();
  if (commit) mkdirSync(UPLOAD_DIR, { recursive: true });

  const vistos = new Set<string>();
  let casados = 0;
  let jaTinhamFoto = 0;
  const naoAchou: string[] = [];
  const semCodigo: string[] = [];

  for (const arquivo of arquivos) {
    const partes = tipoSeqDoNome(arquivo);
    if (!partes) {
      semCodigo.push(arquivo);
      continue;
    }
    const chave = `${partes.tipo}-${partes.seq}`;
    if (vistos.has(chave)) continue; // duplicata ("- Copia")
    vistos.add(chave);

    const [modelo] = await db
      .select({ id: modelos.id, imagem: modelos.imagemPath })
      .from(modelos)
      .where(and(eq(modelos.tipo, partes.tipo), eq(modelos.sequencial, partes.seq)))
      .limit(1);

    if (!modelo) {
      naoAchou.push(`${arquivo}  ->  tipo ${partes.tipo}, seq ${partes.seq}`);
      continue;
    }

    casados += 1;
    if (modelo.imagem) jaTinhamFoto += 1;
    if (commit) {
      const nomeDestino = `${randomUUID()}${extname(arquivo).toLowerCase()}`;
      copyFileSync(join(pasta, arquivo), join(UPLOAD_DIR, nomeDestino));
      await db.update(modelos).set({ imagemPath: `uploads/${nomeDestino}` }).where(eq(modelos.id, modelo.id));
    }
  }

  console.log("\n=== FOTOS ===");
  console.log(
    `Arquivos: ${arquivos.length} · produtos casados: ${casados}` +
      (jaTinhamFoto ? ` (${jaTinhamFoto} já tinham foto — serão sobrescritos no commit)` : ""),
  );
  if (naoAchou.length) {
    console.log(`\nNÃO ACHOU PRODUTO (${naoAchou.length}):`);
    naoAchou.forEach((x) => console.log("  " + x));
  }
  if (semCodigo.length) {
    console.log(`\nSEM CÓDIGO NO NOME (${semCodigo.length}):`);
    semCodigo.forEach((x) => console.log("  " + x));
  }
  if (!commit) console.log("\n(prévia — nada foi gravado. Rode com --commit para anexar.)");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Erro no upload de fotos:", e);
    process.exit(1);
  });
