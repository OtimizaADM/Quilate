/**
 * Relatório: saldo por categoria (tipo) — seção 7.4.
 * Soma saldo e valores (custo/venda) dos SKUs ativos, agrupado por tipo.
 */

import { and, asc, eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { modelos, saldos, variacoes } from "@/db/schema";
import { buscarTipo, type TipoCodigo } from "@/lib/codigo/referencia";

export interface SaldoCategoria {
  tipo: TipoCodigo;
  categoria: string;
  skus: number;
  saldo: number;
  valorCusto: number;
  valorVenda: number;
}

export async function saldoPorCategoria(db: Database): Promise<SaldoCategoria[]> {
  const linhas = await db
    .select({
      tipo: modelos.tipo,
      skus: sql<number>`count(*)`,
      saldo: sql<number>`coalesce(sum(${saldos.saldo}), 0)`,
      valorCusto: sql<number>`coalesce(sum(${saldos.saldo} * ${modelos.precoCusto}), 0)`,
      valorVenda: sql<number>`coalesce(sum(${saldos.saldo} * ${modelos.precoVenda}), 0)`,
    })
    .from(variacoes)
    .innerJoin(modelos, eq(modelos.id, variacoes.modeloId))
    .leftJoin(saldos, eq(saldos.variacaoId, variacoes.id))
    .where(and(eq(variacoes.ativo, true), eq(modelos.ativo, true)))
    .groupBy(modelos.tipo)
    .orderBy(asc(modelos.tipo));

  return linhas.map((l) => {
    const tipo = l.tipo as TipoCodigo;
    return {
      tipo,
      categoria: buscarTipo(tipo)?.descricao ?? `Tipo ${tipo}`,
      skus: Number(l.skus),
      saldo: Number(l.saldo),
      valorCusto: Number(l.valorCusto),
      valorVenda: Number(l.valorVenda),
    };
  });
}
