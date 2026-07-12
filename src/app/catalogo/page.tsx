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
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Catálogo</h1>
        <p className="text-sm text-gray-500">{itens.length} modelo(s)</p>
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
