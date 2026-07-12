/** Catálogo (tela 7.3): modelos consolidados com detalhes de SKUs em modal. */

import { db } from "@/db/client";
import { CatalogoInterativo } from "@/components/CatalogoInterativo";
import { FiltroCatalogo } from "@/components/FiltroCatalogo";
import { PEDRAS, TIPOS, type TipoCodigo } from "@/lib/codigo/referencia";
import { buscarCatalogo } from "@/lib/catalogo/buscarCatalogo";

export const dynamic = "force-dynamic";

const CODIGOS_TIPO = new Set(TIPOS.map((t) => t.codigo));

function tipoValido(valor: string | undefined): TipoCodigo | undefined {
  const n = Number(valor);
  return valor && CODIGOS_TIPO.has(n as TipoCodigo) ? (n as TipoCodigo) : undefined;
}

export default async function PaginaCatalogo({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; pedra?: string; busca?: string }>;
}) {
  const { tipo, pedra, busca } = await searchParams;
  const itens = await buscarCatalogo(db, {
    tipo: tipoValido(tipo),
    pedra: pedra || undefined,
    busca: busca || undefined,
  });

  return (
    <section className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="quilates-eyebrow">Vitrine do estoque</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-petroleo-950 dark:text-white sm:text-4xl">
            Catálogo de joias
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#687977] dark:text-petroleo-200">
            Explore modelos, amplie as fotos e consulte todas as variações disponíveis.
          </p>
        </div>
        <span className="rounded-full bg-petroleo-100 px-4 py-2 text-sm font-semibold text-petroleo-800 dark:bg-petroleo-900 dark:text-petroleo-100">
          {itens.length} modelo(s)
        </span>
      </div>

      <FiltroCatalogo
        tipos={TIPOS}
        pedras={PEDRAS}
        tipoAtual={tipo ?? ""}
        pedraAtual={pedra ?? ""}
        buscaAtual={busca ?? ""}
      />

      {itens.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum produto encontrado com esses filtros.</p>
      ) : (
        <CatalogoInterativo modelos={itens} />
      )}
    </section>
  );
}
