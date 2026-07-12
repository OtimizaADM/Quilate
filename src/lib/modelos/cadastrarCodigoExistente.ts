/** Cadastro de um SKU histórico informado pelo código completo. */

import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { modelos, variacoes } from "@/db/schema";
import { parseCodigo } from "@/lib/codigo/codigo";

export class CodigoJaCadastradoError extends Error {
  constructor(codigo: string) {
    super(`O código ${codigo} já está cadastrado.`);
    this.name = "CodigoJaCadastradoError";
  }
}

export interface ResultadoCadastroCodigoExistente {
  codigo: string;
  modeloId: string;
  variacaoId: string;
  modeloCriado: boolean;
}

export async function cadastrarCodigoExistente(
  db: Database,
  codigoInformado: string,
): Promise<ResultadoCadastroCodigoExistente> {
  const codigo = codigoInformado.trim();
  const partes = parseCodigo(codigo);

  try {
    return await db.transaction(async (tx) => {
      // Serializa cadastros do mesmo tipo+sequencial. Assim dois SKUs diferentes
      // do mesmo modelo podem ser incluídos ao mesmo tempo sem disputar o modelo.
      await tx.execute(
        sql`select pg_advisory_xact_lock(${partes.tipo}, ${Number(partes.sequencial)})`,
      );

      const [duplicado] = await tx
        .select({ id: variacoes.id })
        .from(variacoes)
        .where(eq(variacoes.codigo, codigo));
      if (duplicado) throw new CodigoJaCadastradoError(codigo);

      const [existente] = await tx
        .select({ id: modelos.id })
        .from(modelos)
        .where(
          and(eq(modelos.tipo, partes.tipo), eq(modelos.sequencial, partes.sequencial)),
        );

      let modeloId = existente?.id;
      let modeloCriado = false;
      if (!modeloId) {
        const [novoModelo] = await tx
          .insert(modelos)
          .values({
            tipo: partes.tipo,
            sequencial: partes.sequencial,
            origemCodigo: "existente",
          })
          .returning({ id: modelos.id });
        modeloId = novoModelo.id;
        modeloCriado = true;
      }

      const [variacao] = await tx
        .insert(variacoes)
        .values({
          modeloId,
          pedra: partes.pedra,
          tamanho: partes.tamanho,
          codigo,
        })
        .returning({ id: variacoes.id });

      return { codigo, modeloId, variacaoId: variacao.id, modeloCriado };
    });
  } catch (erro) {
    if (erro instanceof CodigoJaCadastradoError) throw erro;
    if (ehConflitoDeSku(erro)) throw new CodigoJaCadastradoError(codigo);
    throw erro;
  }
}

function ehConflitoDeSku(erro: unknown): boolean {
  if (!erro || typeof erro !== "object") return false;
  const candidato = erro as { code?: unknown; constraint?: unknown; cause?: unknown };
  const restricoesSku = new Set([
    "variacoes_codigo_unique",
    "variacoes_modelo_pedra_tamanho",
  ]);
  return (
    (candidato.code === "23505" && restricoesSku.has(String(candidato.constraint))) ||
    ehConflitoDeSku(candidato.cause)
  );
}
