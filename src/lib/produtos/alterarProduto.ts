/**
 * Ações sobre o produto (modelo) — regra de negócio 3 (seção 6).
 *
 * - Inativar/reativar: marca ativo=false/true e cascateia para as variações,
 *   para que o produto suma das telas de cadastro/movimentação mas o histórico
 *   sobreviva.
 * - Excluir (físico): só é permitido se o produto NUNCA teve movimentação.
 */

import { eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { modelos, movimentacoes, variacoes } from "@/db/schema";

type Transacao = Parameters<Parameters<Database["transaction"]>[0]>[0];

export async function definirAtivoProduto(
  db: Database,
  modeloId: string,
  ativo: boolean,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [modelo] = await tx
      .update(modelos)
      .set({ ativo })
      .where(eq(modelos.id, modeloId))
      .returning({ id: modelos.id });
    if (!modelo) {
      throw new Error(`Produto não encontrado: ${modeloId}.`);
    }
    await tx.update(variacoes).set({ ativo }).where(eq(variacoes.modeloId, modeloId));
  });
}

/** Conta movimentações de qualquer variação do modelo (0 se nunca houve). */
async function qtdMovimentacoes(tx: Transacao, modeloId: string): Promise<number> {
  const [linha] = await tx
    .select({ qtd: sql<number>`count(*)` })
    .from(movimentacoes)
    .innerJoin(variacoes, eq(variacoes.id, movimentacoes.variacaoId))
    .where(eq(variacoes.modeloId, modeloId));
  return Number(linha?.qtd ?? 0);
}

/**
 * Exclui fisicamente o produto e suas variações. Recusa (erro) se já houve
 * qualquer movimentação — apagar quebraria relatórios e deixaria órfãos.
 */
export async function excluirProduto(db: Database, modeloId: string): Promise<void> {
  await db.transaction(async (tx) => {
    if ((await qtdMovimentacoes(tx, modeloId)) > 0) {
      throw new Error(
        `Produto ${modeloId} já teve movimentação; não pode ser excluído. Inative-o.`,
      );
    }
    await tx.delete(variacoes).where(eq(variacoes.modeloId, modeloId));
    const apagado = await tx
      .delete(modelos)
      .where(eq(modelos.id, modeloId))
      .returning({ id: modelos.id });
    if (apagado.length === 0) {
      throw new Error(`Produto não encontrado: ${modeloId}.`);
    }
  });
}
