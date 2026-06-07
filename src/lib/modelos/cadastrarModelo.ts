/**
 * Serviço de cadastro de modelo (regras 1 e 5; telas 7.1).
 *
 * Orquestra, dentro de UMA transação:
 *  1. geração do próximo sequencial do tipo (maior existente + 1);
 *  2. inserção do modelo;
 *  3. geração e inserção de todas as variações (SKUs) selecionadas.
 *
 * A transação garante que o sequencial não colida sob concorrência: o UNIQUE
 * (tipo, sequencial) no banco é a rede de segurança final caso isso ocorra.
 */

import { sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { modelos, variacoes } from "@/db/schema";
import { proximoSequencial } from "@/lib/codigo/codigo";
import type { TipoCodigo } from "@/lib/codigo/referencia";
import { gerarVariacoes } from "./gerarVariacoes";

export interface EntradaCadastroModelo {
  tipo: TipoCodigo;
  descricao: string | null;
  precoCusto: string | null; // string p/ casar com numeric do Postgres
  precoVenda: string | null;
  imagemPath: string | null;
  colecaoId: string | null;
  fornecedorId: string | null;
  pedras: readonly string[];
  tamanhos: readonly string[];
}

export interface ResultadoCadastroModelo {
  modeloId: string;
  sequencial: string;
  codigos: string[];
}

type Transacao = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Lê o maior sequencial já usado no tipo (NULL → nenhum modelo ainda). */
async function maiorSequencial(tx: Transacao, tipo: TipoCodigo): Promise<number | null> {
  const [linha] = await tx
    .select({ maior: sql<number | null>`max(${modelos.sequencial}::int)` })
    .from(modelos)
    .where(sql`${modelos.tipo} = ${tipo}`);
  return linha?.maior ?? null;
}

export async function cadastrarModelo(
  db: Database,
  entrada: EntradaCadastroModelo,
): Promise<ResultadoCadastroModelo> {
  return db.transaction(async (tx) => {
    const sequencial = proximoSequencial(await maiorSequencial(tx, entrada.tipo));

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
        precoCusto: entrada.precoCusto,
        precoVenda: entrada.precoVenda,
        imagemPath: entrada.imagemPath,
        colecaoId: entrada.colecaoId,
        fornecedorId: entrada.fornecedorId,
      })
      .returning({ id: modelos.id });

    await tx.insert(variacoes).values(
      variacoesGeradas.map((v) => ({
        modeloId: modelo.id,
        pedra: v.pedra,
        tamanho: v.tamanho,
        codigo: v.codigo,
      })),
    );

    return {
      modeloId: modelo.id,
      sequencial,
      codigos: variacoesGeradas.map((v) => v.codigo),
    };
  });
}
