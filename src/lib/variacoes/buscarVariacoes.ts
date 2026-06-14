/**
 * Busca de variações por código ou descrição do modelo (tela 7.2 / catálogo / bot).
 *
 * Tolerante a ACENTO e a MÚLTIPLAS palavras: "zirconia" acha "Zircônia",
 * "anel de zirconia" acha anéis com zircônia. O catálogo é pequeno, então
 * trazemos as variações ativas e filtramos em memória (mais simples e robusto
 * que depender da extensão unaccent no Postgres). Limite de 20 resultados.
 */

import { eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { modelos, saldos, variacoes } from "@/db/schema";
import { corresponde } from "@/lib/texto/buscaProduto";

const LIMITE_BUSCA = 20;

export interface VariacaoEncontrada {
  codigo: string;
  descricao: string | null;
  saldo: number;
}

/**
 * @example buscarVariacoes(db, "anel de zirconia") // acha "Anel ... Zircônia ..."
 */
export async function buscarVariacoes(db: Database, termo: string): Promise<VariacaoEncontrada[]> {
  const limpo = termo.trim();
  if (!limpo) return [];

  const linhas = await db
    .select({
      codigo: variacoes.codigo,
      descricao: modelos.descricao,
      saldo: saldos.saldo,
    })
    .from(variacoes)
    .innerJoin(modelos, eq(modelos.id, variacoes.modeloId))
    .leftJoin(saldos, eq(saldos.variacaoId, variacoes.id))
    .where(eq(variacoes.ativo, true));

  return linhas
    .filter((l) => corresponde(limpo, { codigo: l.codigo, descricao: l.descricao }))
    .slice(0, LIMITE_BUSCA)
    .map((l) => ({ codigo: l.codigo, descricao: l.descricao, saldo: Number(l.saldo ?? 0) }));
}
