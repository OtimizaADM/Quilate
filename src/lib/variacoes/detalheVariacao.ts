/**
 * Detalhe de uma variação (SKU) por código exato — usado na consulta de produto
 * pelo bot (com imagem). Retorna o nome decodificado, preço, saldo e o arquivo
 * de imagem (nome puro, para servir via /api/integracao/imagens/:arquivo).
 */

import { eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { decodificarLegivel } from "@/lib/codigo/codigo";
import { modelos, saldos, variacoes } from "@/db/schema";

export interface DetalheVariacao {
  codigo: string;
  decodificado: string;
  descricao: string | null;
  precoVenda: number | null;
  saldo: number;
  imagemArquivo: string | null;
}

export async function detalheVariacao(
  db: Database,
  codigo: string,
): Promise<DetalheVariacao | null> {
  const [linha] = await db
    .select({
      codigo: variacoes.codigo,
      descricao: modelos.descricao,
      precoVenda: modelos.precoVenda,
      imagemPath: modelos.imagemPath,
      saldo: saldos.saldo,
      ativo: variacoes.ativo,
    })
    .from(variacoes)
    .innerJoin(modelos, eq(modelos.id, variacoes.modeloId))
    .leftJoin(saldos, eq(saldos.variacaoId, variacoes.id))
    .where(eq(variacoes.codigo, codigo))
    .limit(1);

  if (!linha || !linha.ativo) return null;

  return {
    codigo: linha.codigo,
    decodificado: decodificarLegivel(linha.codigo),
    descricao: linha.descricao,
    precoVenda: linha.precoVenda === null ? null : Number(linha.precoVenda),
    saldo: Number(linha.saldo ?? 0),
    // imagem_path é "uploads/<arquivo>"; o bot baixa por /api/integracao/imagens/<arquivo>.
    imagemArquivo: linha.imagemPath ? (linha.imagemPath.split("/").pop() ?? null) : null,
  };
}
