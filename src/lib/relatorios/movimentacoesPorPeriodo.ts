/**
 * Relatório: movimentações por período — seção 7.4.
 * Entradas/saídas com data entre `de` e `ate` (datas AAAA-MM-DD, inclusivas).
 */

import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { colecoes, fornecedores, movimentacoes, variacoes } from "@/db/schema";

export interface MovimentacaoPeriodo {
  data: string;
  codigo: string;
  tipoMov: "entrada" | "saida";
  quantidade: number;
  colecao: string | null;
  fornecedor: string | null;
  observacao: string | null;
}

export interface RelatorioMovimentacoes {
  itens: MovimentacaoPeriodo[];
  totalEntradas: number;
  totalSaidas: number;
}

export async function movimentacoesPorPeriodo(
  db: Database,
  de: string,
  ate: string,
): Promise<RelatorioMovimentacoes> {
  const linhas = await db
    .select({
      data: movimentacoes.data,
      codigo: variacoes.codigo,
      tipoMov: movimentacoes.tipoMov,
      quantidade: movimentacoes.quantidade,
      colecao: colecoes.nome,
      fornecedor: fornecedores.nome,
      observacao: movimentacoes.observacao,
    })
    .from(movimentacoes)
    .innerJoin(variacoes, eq(variacoes.id, movimentacoes.variacaoId))
    .leftJoin(colecoes, eq(colecoes.id, movimentacoes.colecaoId))
    .leftJoin(fornecedores, eq(fornecedores.id, movimentacoes.fornecedorId))
    .where(and(sql`${movimentacoes.data}::date between ${de} and ${ate}`))
    .orderBy(desc(movimentacoes.data));

  const itens = linhas.map((l) => ({
    data: l.data ? new Date(l.data).toISOString() : "",
    codigo: l.codigo,
    tipoMov: l.tipoMov as "entrada" | "saida",
    quantidade: l.quantidade,
    colecao: l.colecao,
    fornecedor: l.fornecedor,
    observacao: l.observacao,
  }));

  return {
    itens,
    totalEntradas: itens.filter((i) => i.tipoMov === "entrada").reduce((s, i) => s + i.quantidade, 0),
    totalSaidas: itens.filter((i) => i.tipoMov === "saida").reduce((s, i) => s + i.quantidade, 0),
  };
}
