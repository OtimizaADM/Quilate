/**
 * Catálogo (tela 7.3): SKUs ativos com imagem, preço e saldo, com filtros
 * opcionais por tipo e por pedra.
 */

import { and, asc, eq, type SQL } from "drizzle-orm";
import type { Database } from "@/db/client";
import { modelos, saldos, variacoes } from "@/db/schema";
import type { TipoCodigo } from "@/lib/codigo/referencia";

export interface FiltroCatalogo {
  tipo?: TipoCodigo;
  pedra?: string;
}

export interface ItemCatalogo {
  codigo: string;
  imagemPath: string | null;
  precoVenda: number | null;
  saldo: number;
}

export async function buscarCatalogo(
  db: Database,
  filtro: FiltroCatalogo,
): Promise<ItemCatalogo[]> {
  const condicoes: SQL[] = [eq(variacoes.ativo, true), eq(modelos.ativo, true)];
  if (filtro.tipo !== undefined) condicoes.push(eq(modelos.tipo, filtro.tipo));
  if (filtro.pedra) condicoes.push(eq(variacoes.pedra, filtro.pedra));

  const linhas = await db
    .select({
      codigo: variacoes.codigo,
      imagemPath: modelos.imagemPath,
      precoVenda: modelos.precoVenda,
      saldo: saldos.saldo,
    })
    .from(variacoes)
    .innerJoin(modelos, eq(modelos.id, variacoes.modeloId))
    .leftJoin(saldos, eq(saldos.variacaoId, variacoes.id))
    .where(and(...condicoes))
    .orderBy(asc(modelos.tipo), asc(modelos.sequencial), asc(variacoes.codigo));

  return linhas.map((l) => ({
    codigo: l.codigo,
    imagemPath: l.imagemPath,
    precoVenda: l.precoVenda === null ? null : Number(l.precoVenda),
    saldo: Number(l.saldo ?? 0),
  }));
}
