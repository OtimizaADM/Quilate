"use client";

/** Filtro de período (de/até) que navega por querystring. */

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FiltroPeriodo({ de, ate }: { de: string; ate: string }) {
  const router = useRouter();
  const [novoDe, setNovoDe] = useState(de);
  const [novoAte, setNovoAte] = useState(ate);

  function aplicar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    router.push(`/relatorios/movimentacoes?de=${novoDe}&ate=${novoAte}`);
  }

  return (
    <form onSubmit={aplicar} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">De</span>
        <input
          type="date"
          value={novoDe}
          onChange={(e) => setNovoDe(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Até</span>
        <input
          type="date"
          value={novoAte}
          onChange={(e) => setNovoAte(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
        />
      </label>
      <button
        type="submit"
        className="rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-700"
      >
        Aplicar
      </button>
    </form>
  );
}
