/**
 * Listagem de produtos (modelos) para a tela de Produtos, com filtros e os
 * agregados necessários: nº de variações, saldo total e se já houve
 * movimentação (define se a exclusão física é permitida — regra 3).
 */

import { and, asc, eq, sql, type SQL } from "drizzle-orm";
import type { Database } from "@/db/client";
import { colecoes, fornecedores, modelos } from "@/db/schema";
import { montarCodigoBase } from "@/lib/codigo/codigo";
import { buscarTipo, type TipoCodigo } from "@/lib/codigo/referencia";

export type StatusFiltro = "ativos" | "inativos" | "todos";

export interface FiltroProdutos {
  tipo?: TipoCodigo;
  colecaoId?: string;
  fornecedorId?: string;
  status?: StatusFiltro;
}

export interface Produto {
  id: string;
  tipo: TipoCodigo;
  categoria: string;
  sequencial: string;
  codigoBase: string;
  descricao: string | null;
  precoVenda: number | null;
  colecao: string | null;
  fornecedor: string | null;
  qtdVariacoes: number;
  saldoTotal: number;
  ativo: boolean;
  teveMovimentacao: boolean;
}

export async function listarProdutos(
  db: Database,
  filtro: FiltroProdutos,
): Promise<Produto[]> {
  const qtdVariacoes = sql<number>`(select count(*) from variacoes v where v.modelo_id = ${modelos.id})`;
  const saldoTotal = sql<number>`(
    select coalesce(sum(case when mv.tipo_mov = 'entrada' then mv.quantidade
                             when mv.tipo_mov = 'saida'   then -mv.quantidade end), 0)
    from movimentacoes mv join variacoes v on v.id = mv.variacao_id
    where v.modelo_id = ${modelos.id})`;
  const teveMovimentacao = sql<boolean>`exists (
    select 1 from movimentacoes mv join variacoes v on v.id = mv.variacao_id
    where v.modelo_id = ${modelos.id})`;

  const condicoes: SQL[] = [];
  if (filtro.tipo !== undefined) condicoes.push(eq(modelos.tipo, filtro.tipo));
  if (filtro.colecaoId) condicoes.push(eq(modelos.colecaoId, filtro.colecaoId));
  if (filtro.fornecedorId) condicoes.push(eq(modelos.fornecedorId, filtro.fornecedorId));
  if (filtro.status === "ativos") condicoes.push(eq(modelos.ativo, true));
  if (filtro.status === "inativos") condicoes.push(eq(modelos.ativo, false));

  const linhas = await db
    .select({
      id: modelos.id,
      tipo: modelos.tipo,
      sequencial: modelos.sequencial,
      descricao: modelos.descricao,
      precoVenda: modelos.precoVenda,
      colecao: colecoes.nome,
      fornecedor: fornecedores.nome,
      ativo: modelos.ativo,
      qtdVariacoes,
      saldoTotal,
      teveMovimentacao,
    })
    .from(modelos)
    .leftJoin(colecoes, eq(colecoes.id, modelos.colecaoId))
    .leftJoin(fornecedores, eq(fornecedores.id, modelos.fornecedorId))
    .where(condicoes.length ? and(...condicoes) : undefined)
    .orderBy(asc(modelos.tipo), asc(modelos.sequencial));

  return linhas.map((l) => {
    const tipo = l.tipo as TipoCodigo;
    return {
      id: l.id,
      tipo,
      categoria: buscarTipo(tipo)?.descricao ?? `Tipo ${tipo}`,
      sequencial: l.sequencial,
      codigoBase: montarCodigoBase(tipo, l.sequencial),
      descricao: l.descricao,
      precoVenda: l.precoVenda === null ? null : Number(l.precoVenda),
      colecao: l.colecao,
      fornecedor: l.fornecedor,
      qtdVariacoes: Number(l.qtdVariacoes),
      saldoTotal: Number(l.saldoTotal),
      ativo: l.ativo,
      teveMovimentacao: Boolean(l.teveMovimentacao),
    };
  });
}
