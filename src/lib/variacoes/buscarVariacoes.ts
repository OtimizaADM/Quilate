/**
 * Busca de variações por código ou descrição do modelo (tela 7.2 / catálogo / bot).
 *
 * Tolerante a ACENTO e a MÚLTIPLAS palavras: "zirconia" acha "Zircônia",
 * "anel de zirconia" acha anéis com zircônia. O catálogo é pequeno, então
 * trazemos as variações ativas e filtramos em memória (mais simples e robusto
 * que depender da extensão unaccent no Postgres). Limite de 20 resultados.
 */

import { eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { modelos, saldos, variacoes } from "@/db/schema";

const LIMITE_BUSCA = 20;

/** minúsculas + sem acento, para comparação tolerante. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export interface VariacaoEncontrada {
  codigo: string;
  descricao: string | null;
  saldo: number;
}

/**
 * @example buscarVariacoes(db, "anel de zirconia") // acha "Anel ... Zircônia ..."
 */
export async function buscarVariacoes(db: Database, termo: string): Promise<VariacaoEncontrada[]> {
  const limpo = termo.trim();
  if (!limpo) return [];

  const linhas = await db
    .select({
      codigo: variacoes.codigo,
      descricao: modelos.descricao,
      saldo: saldos.saldo,
    })
    .from(variacoes)
    .innerJoin(modelos, eq(modelos.id, variacoes.modeloId))
    .leftJoin(saldos, eq(saldos.variacaoId, variacoes.id))
    .where(eq(variacoes.ativo, true));

  const termoNorm = normalizar(limpo);
  const palavras = termoNorm.split(/\W+/).filter((p) => p.length > 2);
  const soDigitos = limpo.replace(/\D/g, "");

  const casa = (codigo: string, descricao: string | null): boolean => {
    if (soDigitos.length >= 3 && codigo.includes(soDigitos)) return true;
    const desc = normalizar(descricao ?? "");
    if (palavras.length === 0) return desc.includes(termoNorm);
    return palavras.every((p) => desc.includes(p));
  };

  return linhas
    .filter((l) => casa(l.codigo, l.descricao))
    .slice(0, LIMITE_BUSCA)
    .map((l) => ({ codigo: l.codigo, descricao: l.descricao, saldo: Number(l.saldo ?? 0) }));
}
