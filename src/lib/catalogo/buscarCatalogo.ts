/** Catálogo consolidado: um card por modelo, com todas as variações e saldos. */

import { and, asc, eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { modelos, saldos, variacoes } from "@/db/schema";
import { montarCodigoBase } from "@/lib/codigo/codigo";
import type { TipoCodigo } from "@/lib/codigo/referencia";
import { corresponde } from "@/lib/texto/buscaProduto";

export interface FiltroCatalogo {
  tipo?: TipoCodigo;
  pedra?: string;
  busca?: string;
}

export interface VariacaoCatalogo {
  codigo: string;
  pedra: string | null;
  tamanho: string | null;
  saldo: number;
}

export interface ModeloCatalogo {
  id: string;
  tipo: TipoCodigo;
  sequencial: string;
  codigoBase: string;
  descricao: string | null;
  imagemPath: string | null;
  precoVenda: number | null;
  saldoTotal: number;
  variacoes: VariacaoCatalogo[];
}

export interface LinhaCatalogo {
  modeloId: string;
  tipo: number;
  sequencial: string;
  descricao: string | null;
  imagemPath: string | null;
  precoVenda: string | null;
  codigo: string;
  pedra: string | null;
  tamanho: string | null;
  saldo: number | null;
}

export function agruparCatalogo(linhas: readonly LinhaCatalogo[]): ModeloCatalogo[] {
  const porModelo = new Map<string, ModeloCatalogo>();

  for (const linha of linhas) {
    const tipo = linha.tipo as TipoCodigo;
    const modelo = porModelo.get(linha.modeloId) ?? {
      id: linha.modeloId,
      tipo,
      sequencial: linha.sequencial,
      codigoBase: montarCodigoBase(tipo, linha.sequencial),
      descricao: linha.descricao,
      imagemPath: linha.imagemPath,
      precoVenda: linha.precoVenda === null ? null : Number(linha.precoVenda),
      saldoTotal: 0,
      variacoes: [],
    };
    const saldo = Number(linha.saldo ?? 0);
    modelo.variacoes.push({
      codigo: linha.codigo,
      pedra: linha.pedra,
      tamanho: linha.tamanho,
      saldo,
    });
    modelo.saldoTotal += saldo;
    porModelo.set(linha.modeloId, modelo);
  }

  return [...porModelo.values()];
}

export function filtrarCatalogo(
  modelosCatalogo: readonly ModeloCatalogo[],
  filtro: FiltroCatalogo,
): ModeloCatalogo[] {
  const termo = filtro.busca?.trim();
  return modelosCatalogo.filter((modelo) => {
    if (filtro.tipo !== undefined && modelo.tipo !== filtro.tipo) return false;
    if (filtro.pedra && !modelo.variacoes.some((variacao) => variacao.pedra === filtro.pedra)) {
      return false;
    }
    if (
      termo &&
      !corresponde(termo, {
        codigo: [modelo.codigoBase, ...modelo.variacoes.map((variacao) => variacao.codigo)].join(" "),
        descricao: modelo.descricao,
      })
    ) {
      return false;
    }
    return true;
  });
}

export async function buscarCatalogo(
  db: Database,
  filtro: FiltroCatalogo,
): Promise<ModeloCatalogo[]> {
  const linhas = await db
    .select({
      modeloId: modelos.id,
      tipo: modelos.tipo,
      sequencial: modelos.sequencial,
      descricao: modelos.descricao,
      imagemPath: modelos.imagemPath,
      precoVenda: modelos.precoVenda,
      codigo: variacoes.codigo,
      pedra: variacoes.pedra,
      tamanho: variacoes.tamanho,
      saldo: saldos.saldo,
    })
    .from(variacoes)
    .innerJoin(modelos, eq(modelos.id, variacoes.modeloId))
    .leftJoin(saldos, eq(saldos.variacaoId, variacoes.id))
    .where(and(eq(variacoes.ativo, true), eq(modelos.ativo, true)))
    .orderBy(asc(modelos.tipo), asc(modelos.sequencial), asc(variacoes.codigo));

  return filtrarCatalogo(agruparCatalogo(linhas), filtro);
}
