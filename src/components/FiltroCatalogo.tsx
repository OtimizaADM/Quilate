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
    <div className="quilates-panel flex flex-wrap items-end gap-4 rounded-2xl p-4 sm:p-5 dark:bg-petroleo-900">
      <form onSubmit={buscar} className="flex min-w-[16rem] flex-1 items-end gap-2">
        <label className="flex flex-1 flex-col gap-1.5 text-sm">
          <span className="font-semibold text-petroleo-900 dark:text-petroleo-50">Buscar</span>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Código ou descrição"
            className="w-full rounded-xl border border-[#cbd9d4] bg-[#f9fbfa] px-4 py-2.5 text-petroleo-950 placeholder:text-[#93a19e] focus:border-petroleo-500 dark:border-petroleo-700 dark:bg-petroleo-950 dark:text-white"
          />
        </label>
        <button
          type="submit"
          className="rounded-xl bg-petroleo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-petroleo-800"
        >
          Buscar
        </button>
      </form>

      <label className="flex min-w-36 flex-col gap-1.5 text-sm">
        <span className="font-semibold text-petroleo-900 dark:text-petroleo-50">Tipo</span>
        <select
          value={tipoAtual}
          onChange={(e) => aplicar("tipo", e.target.value)}
          className="rounded-xl border border-[#cbd9d4] bg-[#f9fbfa] px-4 py-2.5 text-petroleo-950 focus:border-petroleo-500 dark:border-petroleo-700 dark:bg-petroleo-950 dark:text-white"
        >
          <option value="">Todos</option>
          {tipos.map((t) => (
            <option key={t.codigo} value={String(t.codigo)}>
              {t.descricao}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-44 flex-col gap-1.5 text-sm">
        <span className="font-semibold text-petroleo-900 dark:text-petroleo-50">Pedra</span>
        <select
          value={pedraAtual}
          onChange={(e) => aplicar("pedra", e.target.value)}
          className="rounded-xl border border-[#cbd9d4] bg-[#f9fbfa] px-4 py-2.5 text-petroleo-950 focus:border-petroleo-500 dark:border-petroleo-700 dark:bg-petroleo-950 dark:text-white"
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
