/**
 * Serviço de registro de movimentação (tela 7.2; regra 2).
 *
 * Numa única transação: localiza a variação ativa pelo código, trava a linha
 * (FOR UPDATE) p/ serializar movimentações concorrentes do mesmo SKU, recalcula
 * o saldo a partir do histórico, valida a saída e grava. Saída sem saldo é
 * recusada (erro) e nada é gravado.
 *
 * A lógica fica aqui, não no route handler, para a futura origem 'whatsapp'
 * (N8N) reaproveitar exatamente a mesma validação.
 */

import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { movimentacoes, variacoes } from "@/db/schema";
import { saldoResultante, type TipoMovimento } from "./regrasSaldo";

export type OrigemMovimentacao = "manual" | "whatsapp" | "importacao";

export interface EntradaMovimentacao {
  codigo: string;
  tipoMov: TipoMovimento;
  quantidade: number;
  observacao: string | null;
  origem?: OrigemMovimentacao;
  colecaoId?: string | null;
  fornecedorId?: string | null;
}

export interface ResultadoMovimentacao {
  codigo: string;
  tipoMov: TipoMovimento;
  quantidade: number;
  saldo: number;
}

type Transacao = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function travarVariacaoAtiva(tx: Transacao, codigo: string): Promise<{ id: string }> {
  const [variacao] = await tx
    .select({ id: variacoes.id })
    .from(variacoes)
    .where(and(eq(variacoes.codigo, codigo), eq(variacoes.ativo, true)))
    .for("update");
  if (!variacao) {
    throw new Error(`Código não encontrado ou inativo: "${codigo}".`);
  }
  return variacao;
}

async function saldoAtual(tx: Transacao, variacaoId: string): Promise<number> {
  const [linha] = await tx
    .select({
      saldo: sql<number>`coalesce(sum(case when ${movimentacoes.tipoMov} = 'entrada' then ${movimentacoes.quantidade}
                                          when ${movimentacoes.tipoMov} = 'saida'   then -${movimentacoes.quantidade} end), 0)`,
    })
    .from(movimentacoes)
    .where(eq(movimentacoes.variacaoId, variacaoId));
  return Number(linha?.saldo ?? 0);
}

export async function registrarMovimentacao(
  db: Database,
  entrada: EntradaMovimentacao,
): Promise<ResultadoMovimentacao> {
  return db.transaction(async (tx) => {
    const variacao = await travarVariacaoAtiva(tx, entrada.codigo);
    const atual = await saldoAtual(tx, variacao.id);
    const novoSaldo = saldoResultante(atual, entrada.tipoMov, entrada.quantidade);

    // Coleção/fornecedor só fazem sentido na entrada (compra); saída ignora.
    const ehEntrada = entrada.tipoMov === "entrada";

    await tx.insert(movimentacoes).values({
      variacaoId: variacao.id,
      tipoMov: entrada.tipoMov,
      quantidade: entrada.quantidade,
      origem: entrada.origem ?? "manual",
      observacao: entrada.observacao,
      colecaoId: ehEntrada ? (entrada.colecaoId ?? null) : null,
      fornecedorId: ehEntrada ? (entrada.fornecedorId ?? null) : null,
    });

    return {
      codigo: entrada.codigo,
      tipoMov: entrada.tipoMov,
      quantidade: entrada.quantidade,
      saldo: novoSaldo,
    };
  });
}
