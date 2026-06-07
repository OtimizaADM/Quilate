/**
 * Relatório de posição de estoque (seção 7.4).
 *
 * Por SKU ativo: código, produto, quantidade (saldo), custo e venda unitários,
 * e os totais (saldo × preço). Inclui os totais gerais da carteira.
 *
 * O cálculo (montarPosicao) é puro e testável; a query apenas o alimenta.
 */

import { and, asc, eq, gt } from "drizzle-orm";
import type { Database } from "@/db/client";
import { decodificarLegivel } from "@/lib/codigo/codigo";
import { modelos, saldos, variacoes } from "@/db/schema";

export interface LinhaCrua {
  codigo: string;
  descricao: string | null;
  saldo: number;
  precoCusto: string | null; // numeric do Postgres chega como string
  precoVenda: string | null;
}

export interface ItemPosicao {
  codigo: string;
  produto: string;
  quantidade: number;
  custo: number | null;
  venda: number | null;
  totalCusto: number;
  totalVenda: number;
}

export interface PosicaoEstoque {
  itens: ItemPosicao[];
  totalQuantidade: number;
  totalCusto: number;
  totalVenda: number;
}

function paraNumero(valor: string | null): number | null {
  if (valor === null) return null;
  const n = Number(valor);
  return Number.isNaN(n) ? null : n;
}

/** Nome do produto: descrição do modelo ou, na falta, o código decodificado. */
function nomeProduto(codigo: string, descricao: string | null): string {
  if (descricao && descricao.trim() !== "") return descricao;
  try {
    return decodificarLegivel(codigo);
  } catch {
    return codigo; // código legado não-canônico: mostra o próprio código
  }
}

/** Transforma as linhas cruas em itens com totais e soma os totais gerais. */
export function montarPosicao(linhas: readonly LinhaCrua[]): PosicaoEstoque {
  const itens = linhas.map((l): ItemPosicao => {
    const custo = paraNumero(l.precoCusto);
    const venda = paraNumero(l.precoVenda);
    return {
      codigo: l.codigo,
      produto: nomeProduto(l.codigo, l.descricao),
      quantidade: l.saldo,
      custo,
      venda,
      totalCusto: l.saldo * (custo ?? 0),
      totalVenda: l.saldo * (venda ?? 0),
    };
  });

  return {
    itens,
    totalQuantidade: itens.reduce((s, i) => s + i.quantidade, 0),
    totalCusto: itens.reduce((s, i) => s + i.totalCusto, 0),
    totalVenda: itens.reduce((s, i) => s + i.totalVenda, 0),
  };
}

/**
 * Posição de estoque atual: apenas SKUs ativos (de modelos ativos) que têm
 * saldo positivo — itens zerados não aparecem.
 */
export async function posicaoEstoque(db: Database): Promise<PosicaoEstoque> {
  const linhas = await db
    .select({
      codigo: variacoes.codigo,
      descricao: modelos.descricao,
      saldo: saldos.saldo,
      precoCusto: modelos.precoCusto,
      precoVenda: modelos.precoVenda,
    })
    .from(variacoes)
    .innerJoin(modelos, eq(modelos.id, variacoes.modeloId))
    .innerJoin(saldos, eq(saldos.variacaoId, variacoes.id))
    .where(and(eq(variacoes.ativo, true), eq(modelos.ativo, true), gt(saldos.saldo, 0)))
    .orderBy(asc(modelos.tipo), asc(modelos.sequencial), asc(variacoes.codigo));

  return montarPosicao(linhas.map((l) => ({ ...l, saldo: Number(l.saldo ?? 0) })));
}
