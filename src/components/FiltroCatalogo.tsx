"use client";

/** Filtros do catálogo (busca, tipo e pedra). Submete via GET, navegando por querystring. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Pedra, Tipo } from "@/lib/codigo/referencia";

interface Props {
  tipos: readonly Tipo[];
  pedras: readonly Pedra[];
  tipoAtual: string;
  pedraAtual: string;
  buscaAtual: string;
}

export function FiltroCatalogo({ tipos, pedras, tipoAtual, pedraAtual, buscaAtual }: Props) {
  const router = useRouter();
  const [busca, setBusca] = useState(buscaAtual);

  function navegar(proximo: { tipo: string; pedra: string; busca: string }) {
    const params = new URLSearchParams();
    if (proximo.busca) params.set("busca", proximo.busca);
    if (proximo.tipo) params.set("tipo", proximo.tipo);
    if (proximo.pedra) params.set("pedra", proximo.pedra);
    const query = params.toString();
    router.push(query ? `/catalogo?${query}` : "/catalogo");
  }

  function aplicar(parametro: "tipo" | "pedra", valor: string) {
    navegar({ tipo: tipoAtual, pedra: pedraAtual, busca, [parametro]: valor });
  }

  function buscar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    navegar({ tipo: tipoAtual, pedra: pedraAtual, busca: busca.trim() });
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <form onSubmit={buscar} className="flex items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Buscar</span>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Código ou descrição"
            className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
          />
        </label>
        <button
          type="submit"
          className="rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-700"
        >
          Buscar
        </button>
      </form>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Tipo</span>
        <select
          value={tipoAtual}
          onChange={(e) => aplicar("tipo", e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="">Todos</option>
          {tipos.map((t) => (
            <option key={t.codigo} value={String(t.codigo)}>
              {t.descricao}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Pedra</span>
        <select
          value={pedraAtual}
          onChange={(e) => aplicar("pedra", e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="">Todas</option>
          {pedras.map((p) => (
            <option key={p.codigo} value={p.codigo}>
              {p.codigo} · {p.descricao}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
