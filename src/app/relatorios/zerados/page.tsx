/** Relatório: itens com saldo zerado. */

import { db } from "@/db/client";
import { decodificarLegivel } from "@/lib/codigo/codigo";
import { itensZerados } from "@/lib/relatorios/itensZerados";

export const dynamic = "force-dynamic";

export default async function PaginaItensZerados() {
  const itens = await itensZerados(db);

  return (
    <section className="quilates-workspace space-y-6">
      <div className="quilates-page-heading">
        <h1 className="text-2xl font-semibold">Itens com saldo zerado</h1>
        <p className="text-sm text-gray-500">{itens.length} SKU(s) com estoque em zero.</p>
      </div>

      {itens.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum item zerado.</p>
      ) : (
        <ul className="quilates-list divide-y divide-gray-100 overflow-hidden rounded border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {itens.map((i) => (
            <li key={i.codigo} className="px-4 py-2 text-sm">
              <span className="font-mono">{i.codigo}</span>
              <span className="text-gray-500"> — {i.descricao ?? decodificarLegivel(i.codigo)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
