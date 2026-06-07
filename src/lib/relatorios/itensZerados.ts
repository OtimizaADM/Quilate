/**
 * Relatório: itens (SKUs) ativos com saldo zerado — seção 7.4.
 */

import { and, asc, eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { modelos, saldos, variacoes } from "@/db/schema";

export interface ItemZerado {
  codigo: string;
  descricao: string | null;
}

export async function itensZerados(db: Database): Promise<ItemZerado[]> {
  const linhas = await db
    .select({ codigo: variacoes.codigo, descricao: modelos.descricao })
    .from(variacoes)
    .innerJoin(modelos, eq(modelos.id, variacoes.modeloId))
    .innerJoin(saldos, eq(saldos.variacaoId, variacoes.id))
    .where(and(eq(variacoes.ativo, true), eq(modelos.ativo, true), eq(saldos.saldo, 0)))
    .orderBy(asc(modelos.tipo), asc(modelos.sequencial), asc(variacoes.codigo));

  return linhas.map((l) => ({ codigo: l.codigo, descricao: l.descricao }));
}
