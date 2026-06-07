/** Consolida a lista de produtos por categoria (tipo), para o resumo da tela. */

import type { Produto } from "./listarProdutos";

export interface ResumoCategoria {
  tipo: number;
  categoria: string;
  qtdProdutos: number;
  saldoTotal: number;
}

export function consolidarPorCategoria(produtos: readonly Produto[]): ResumoCategoria[] {
  const porTipo = new Map<number, ResumoCategoria>();
  for (const p of produtos) {
    const atual = porTipo.get(p.tipo) ?? {
      tipo: p.tipo,
      categoria: p.categoria,
      qtdProdutos: 0,
      saldoTotal: 0,
    };
    atual.qtdProdutos += 1;
    atual.saldoTotal += p.saldoTotal;
    porTipo.set(p.tipo, atual);
  }
  return [...porTipo.values()].sort((a, b) => a.tipo - b.tipo);
}
