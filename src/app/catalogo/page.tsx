/** Catálogo (tela 7.3): grade de SKUs com imagem, código decodificado, preço e saldo. */

import { db } from "@/db/client";
import { FiltroCatalogo } from "@/components/FiltroCatalogo";
import { decodificarLegivel } from "@/lib/codigo/codigo";
import { PEDRAS, TIPOS, type TipoCodigo } from "@/lib/codigo/referencia";
import { buscarCatalogo } from "@/lib/catalogo/buscarCatalogo";
import { formatarReais } from "@/lib/format";

export const dynamic = "force-dynamic";

const CODIGOS_TIPO = new Set(TIPOS.map((t) => t.codigo));

function tipoValido(valor: string | undefined): TipoCodigo | undefined {
  const n = Number(valor);
  return valor && CODIGOS_TIPO.has(n as TipoCodigo) ? (n as TipoCodigo) : undefined;
}

export default async function PaginaCatalogo({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; pedra?: string }>;
}) {
  const { tipo, pedra } = await searchParams;
  const itens = await buscarCatalogo(db, { tipo: tipoValido(tipo), pedra: pedra || undefined });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Catálogo</h1>
        <p className="text-sm text-gray-500">{itens.length} variação(ões)</p>
      </div>

      <FiltroCatalogo tipos={TIPOS} pedras={PEDRAS} tipoAtual={tipo ?? ""} pedraAtual={pedra ?? ""} />

      {itens.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum produto encontrado com esses filtros.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {itens.map((item) => (
            <li
              key={item.codigo}
              className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
            >
              {item.imagemPath ? (
                // eslint-disable-next-line @next/next/no-img-element -- servida pela rota /uploads
                <img
                  src={`/${item.imagemPath}`}
                  alt={decodificarLegivel(item.codigo)}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-gray-100 text-xs text-gray-400 dark:bg-gray-800">
                  sem imagem
                </div>
              )}
              <div className="space-y-1 p-3 text-sm">
                <p className="font-mono text-xs text-gray-500">{item.codigo}</p>
                <p>{decodificarLegivel(item.codigo)}</p>
                <div className="flex justify-between pt-1">
                  <span className="font-semibold">{formatarReais(item.precoVenda)}</span>
                  <span className="text-gray-500">saldo {item.saldo}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
