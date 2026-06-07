"use client";

/** Filtros do catálogo (tipo e pedra). Submete via GET, navegando por querystring. */

import { useRouter } from "next/navigation";
import type { Pedra, Tipo } from "@/lib/codigo/referencia";

interface Props {
  tipos: readonly Tipo[];
  pedras: readonly Pedra[];
  tipoAtual: string;
  pedraAtual: string;
}

export function FiltroCatalogo({ tipos, pedras, tipoAtual, pedraAtual }: Props) {
  const router = useRouter();

  function aplicar(parametro: "tipo" | "pedra", valor: string) {
    const params = new URLSearchParams();
    const proximo = { tipo: tipoAtual, pedra: pedraAtual, [parametro]: valor };
    if (proximo.tipo) params.set("tipo", proximo.tipo);
    if (proximo.pedra) params.set("pedra", proximo.pedra);
    const query = params.toString();
    router.push(query ? `/catalogo?${query}` : "/catalogo");
  }

  return (
    <div className="flex flex-wrap gap-4">
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
