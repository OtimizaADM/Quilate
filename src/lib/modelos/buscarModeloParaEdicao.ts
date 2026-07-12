/**
 * Carrega um modelo e suas variações (com saldo e flag de movimentação) para a
 * tela de edição. `teveMovimentacao` define se um SKU pode ser removido (regra 3).
 */

import { asc, eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { modelos, variacoes } from "@/db/schema";
import { montarCodigoBase } from "@/lib/codigo/codigo";
import type { TipoCodigo } from "@/lib/codigo/referencia";

export interface VariacaoEdicao {
  id: string;
  pedra: string | null;
  tamanho: string | null;
  codigo: string;
  saldo: number;
  teveMovimentacao: boolean;
}

export interface ModeloEdicao {
  id: string;
  tipo: TipoCodigo;
  sequencial: string;
  codigoBase: string;
  descricao: string | null;
  modeloFornecedor: string | null;
  precoCusto: string | null;
  precoVenda: string | null;
  imagemPath: string | null;
  colecaoId: string | null;
  fornecedorId: string | null;
  variacoes: VariacaoEdicao[];
}

export async function buscarModeloParaEdicao(
  db: Database,
  modeloId: string,
): Promise<ModeloEdicao | null> {
  const [modelo] = await db.select().from(modelos).where(eq(modelos.id, modeloId));
  if (!modelo) return null;

  const saldo = sql<number>`(
    select coalesce(sum(case when mv.tipo_mov = 'entrada' then mv.quantidade
                             when mv.tipo_mov = 'saida'   then -mv.quantidade end), 0)
    from movimentacoes mv where mv.variacao_id = ${variacoes.id})`;
  const teve = sql<boolean>`exists (
    select 1 from movimentacoes mv where mv.variacao_id = ${variacoes.id})`;

  const linhas = await db
    .select({
      id: variacoes.id,
      pedra: variacoes.pedra,
      tamanho: variacoes.tamanho,
      codigo: variacoes.codigo,
      saldo,
      teve,
    })
    .from(variacoes)
    .where(eq(variacoes.modeloId, modeloId))
    .orderBy(asc(variacoes.codigo));

  const tipo = modelo.tipo as TipoCodigo;
  return {
    id: modelo.id,
    tipo,
    sequencial: modelo.sequencial,
    codigoBase: montarCodigoBase(tipo, modelo.sequencial),
    descricao: modelo.descricao,
    modeloFornecedor: modelo.modeloFornecedor,
    precoCusto: modelo.precoCusto,
    precoVenda: modelo.precoVenda,
    imagemPath: modelo.imagemPath,
    colecaoId: modelo.colecaoId,
    fornecedorId: modelo.fornecedorId,
    variacoes: linhas.map((l) => ({
      id: l.id,
      pedra: l.pedra,
      tamanho: l.tamanho,
      codigo: l.codigo,
      saldo: Number(l.saldo),
      teveMovimentacao: Boolean(l.teve),
    })),
  };
}
