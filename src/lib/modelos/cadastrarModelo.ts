/**
 * Serviço de cadastro de modelo (regras 1 e 5; telas 7.1).
 *
 * Orquestra, dentro de UMA transação:
 *  1. geração do próximo sequencial do tipo (maior existente + 1);
 *  2. inserção do modelo;
 *  3. geração e inserção de todas as variações (SKUs) selecionadas;
 *  4. inserção de uma movimentação de entrada para cada SKU com quantidade > 0
 *     (origem "manual", observação "Cadastro inicial" — ver entradasIniciais).
 *
 * A transação garante que o sequencial não colida sob concorrência: o UNIQUE
 * (tipo, sequencial) no banco é a rede de segurança final caso isso ocorra.
 */

import { sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { modelos, movimentacoes, variacoes } from "@/db/schema";
import { proximoSequencialLivre } from "@/lib/codigo/codigo";
import type { TipoCodigo } from "@/lib/codigo/referencia";
import { entradasIniciais, type QuantidadeSku } from "./entradasIniciais";
import { gerarVariacoes } from "./gerarVariacoes";

export interface EntradaCadastroModelo {
  tipo: TipoCodigo;
  descricao: string | null;
  modeloFornecedor: string | null;
  precoCusto: string | null; // string p/ casar com numeric do Postgres
  precoVenda: string | null;
  imagemPath: string | null;
  colecaoId: string | null;
  fornecedorId: string | null;
  pedras: readonly string[];
  tamanhos: readonly string[];
  quantidades: readonly QuantidadeSku[];
}

export interface ResultadoCadastroModelo {
  modeloId: string;
  sequencial: string;
  codigos: string[];
}

type Transacao = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Calcula o próximo número automático sem deixar códigos históricos criarem saltos. */
async function proximoSequencialAutomatico(
  tx: Transacao,
  tipo: TipoCodigo,
): Promise<string> {
  const linhas = await tx
    .select({ sequencial: modelos.sequencial, origemCodigo: modelos.origemCodigo })
    .from(modelos)
    .where(sql`${modelos.tipo} = ${tipo}`);

  const automaticos = linhas
    .filter((linha) => linha.origemCodigo === "automatico")
    .map((linha) => Number(linha.sequencial));
  const maiorAutomatico = automaticos.length > 0 ? Math.max(...automaticos) : null;
  const ocupados = new Set(linhas.map((linha) => Number(linha.sequencial)));
  return proximoSequencialLivre(maiorAutomatico, ocupados);
}

export async function cadastrarModelo(
  db: Database,
  entrada: EntradaCadastroModelo,
): Promise<ResultadoCadastroModelo> {
  return db.transaction(async (tx) => {
    const sequencial = await proximoSequencialAutomatico(tx, entrada.tipo);

    const variacoesGeradas = gerarVariacoes({
      tipo: entrada.tipo,
      sequencial,
      pedras: entrada.pedras,
      tamanhos: entrada.tamanhos,
    });

    const [modelo] = await tx
      .insert(modelos)
      .values({
        tipo: entrada.tipo,
        sequencial,
        descricao: entrada.descricao,
        modeloFornecedor: entrada.modeloFornecedor,
        precoCusto: entrada.precoCusto,
        precoVenda: entrada.precoVenda,
        imagemPath: entrada.imagemPath,
        colecaoId: entrada.colecaoId,
        fornecedorId: entrada.fornecedorId,
        origemCodigo: "automatico",
      })
      .returning({ id: modelos.id });

    const variacoesInseridas = await tx
      .insert(variacoes)
      .values(
        variacoesGeradas.map((v) => ({
          modeloId: modelo.id,
          pedra: v.pedra,
          tamanho: v.tamanho,
          codigo: v.codigo,
        })),
      )
      .returning({ id: variacoes.id, pedra: variacoes.pedra, tamanho: variacoes.tamanho });

    const entradas = entradasIniciais(variacoesInseridas, entrada.quantidades);
    if (entradas.length > 0) {
      await tx.insert(movimentacoes).values(
        entradas.map((e) => ({
          variacaoId: e.variacaoId,
          tipoMov: "entrada" as const,
          quantidade: e.quantidade,
          origem: "manual" as const,
          observacao: "Cadastro inicial",
          colecaoId: entrada.colecaoId,
          fornecedorId: entrada.fornecedorId,
        })),
      );
    }

    return {
      modeloId: modelo.id,
      sequencial,
      codigos: variacoesGeradas.map((v) => v.codigo),
    };
  });
}
