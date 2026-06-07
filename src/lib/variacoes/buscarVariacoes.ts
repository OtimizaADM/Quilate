/**
 * Busca de variações por código ou descrição do modelo (tela 7.2 / catálogo).
 *
 * Retorna apenas variações ativas, já com o saldo atual (da view `saldos`) e a
 * descrição do modelo. Limitado a 20 resultados para a busca do balcão.
 */

import { and, eq, ilike, or } from "drizzle-orm";
import type { Database } from "@/db/client";
import { modelos, saldos, variacoes } from "@/db/schema";

const LIMITE_BUSCA = 20;

export interface VariacaoEncontrada {
  codigo: string;
  descricao: string | null;
  saldo: number;
}

export async function buscarVariacoes(
  db: Database,
  termo: string,
): Promise<VariacaoEncontrada[]> {
  const limpo = termo.trim();
  if (!limpo) return [];

  const padrao = `%${limpo}%`;
  const linhas = await db
    .select({
      codigo: variacoes.codigo,
      descricao: modelos.descricao,
      saldo: saldos.saldo,
    })
    .from(variacoes)
    .innerJoin(modelos, eq(modelos.id, variacoes.modeloId))
    .leftJoin(saldos, eq(saldos.variacaoId, variacoes.id))
    .where(
      and(
        eq(variacoes.ativo, true),
        or(ilike(variacoes.codigo, padrao), ilike(modelos.descricao, padrao)),
      ),
    )
    .limit(LIMITE_BUSCA);

  return linhas.map((l) => ({
    codigo: l.codigo,
    descricao: l.descricao,
    saldo: Number(l.saldo ?? 0),
  }));
}
