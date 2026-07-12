/**
 * Edição de um modelo (tela Produtos → Editar).
 * - Atualiza atributos; imagem só é trocada se `imagemPath` for informado.
 * - Adiciona novos SKUs (com quantidade de entrada, herdando coleção/fornecedor).
 * - Remove SKUs somente se nunca tiveram movimentação (revalidado no servidor).
 * Tipo e sequencial (logo, o código) são imutáveis.
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { modelos, movimentacoes, variacoes } from "@/db/schema";
import { montarCodigo } from "@/lib/codigo/codigo";
import type { TipoCodigo } from "@/lib/codigo/referencia";
import { entradasIniciais } from "./entradasIniciais";

export interface NovoSku {
  pedra: string;
  tamanho: string | null;
  quantidade: number;
}

export interface AlteracaoModelo {
  descricao: string | null;
  modeloFornecedor: string | null;
  precoCusto: string | null;
  precoVenda: string | null;
  imagemPath?: string | null; // undefined = manter imagem atual
  colecaoId: string | null;
  fornecedorId: string | null;
  novosSkus: readonly NovoSku[];
  removerVariacaoIds: readonly string[];
}

type Transacao = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function garantirRemoviveis(tx: Transacao, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const [linha] = await tx
    .select({ qtd: sql<number>`count(*)` })
    .from(movimentacoes)
    .where(inArray(movimentacoes.variacaoId, [...ids]));
  if (Number(linha?.qtd ?? 0) > 0) {
    throw new Error("Um ou mais SKUs marcados para remoção já tiveram movimentação.");
  }
}

export async function alterarModelo(
  db: Database,
  modeloId: string,
  alteracao: AlteracaoModelo,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [modelo] = await tx.select().from(modelos).where(eq(modelos.id, modeloId));
    if (!modelo) throw new Error(`Produto não encontrado: ${modeloId}.`);

    await tx
      .update(modelos)
      .set({
        descricao: alteracao.descricao,
        modeloFornecedor: alteracao.modeloFornecedor,
        precoCusto: alteracao.precoCusto,
        precoVenda: alteracao.precoVenda,
        colecaoId: alteracao.colecaoId,
        fornecedorId: alteracao.fornecedorId,
        ...(alteracao.imagemPath !== undefined ? { imagemPath: alteracao.imagemPath } : {}),
      })
      .where(eq(modelos.id, modeloId));

    await garantirRemoviveis(tx, alteracao.removerVariacaoIds);
    if (alteracao.removerVariacaoIds.length > 0) {
      await tx.delete(variacoes).where(
        and(
          eq(variacoes.modeloId, modeloId),
          inArray(variacoes.id, [...alteracao.removerVariacaoIds]),
        ),
      );
    }

    if (alteracao.novosSkus.length > 0) {
      const tipo = modelo.tipo as TipoCodigo;
      const inseridas = await tx
        .insert(variacoes)
        .values(
          alteracao.novosSkus.map((s) => ({
            modeloId,
            pedra: s.pedra,
            tamanho: s.tamanho,
            codigo: montarCodigo({
              tipo,
              sequencial: modelo.sequencial,
              pedra: s.pedra,
              tamanho: s.tamanho,
            }),
          })),
        )
        .returning({ id: variacoes.id, pedra: variacoes.pedra, tamanho: variacoes.tamanho });

      const entradas = entradasIniciais(inseridas, alteracao.novosSkus);
      if (entradas.length > 0) {
        await tx.insert(movimentacoes).values(
          entradas.map((e) => ({
            variacaoId: e.variacaoId,
            tipoMov: "entrada" as const,
            quantidade: e.quantidade,
            origem: "manual" as const,
            observacao: "Entrada via edição",
            colecaoId: alteracao.colecaoId,
            fornecedorId: alteracao.fornecedorId,
          })),
        );
      }
    }
  });
}
