/** Relatório: saldo por categoria (tipo). */

import { db } from "@/db/client";
import { formatarReais } from "@/lib/format";
import { saldoPorCategoria } from "@/lib/relatorios/saldoPorCategoria";

export const dynamic = "force-dynamic";

export default async function PaginaSaldoPorCategoria() {
  const linhas = await saldoPorCategoria(db);
  const totalSaldo = linhas.reduce((s, l) => s + l.saldo, 0);
  const totalCusto = linhas.reduce((s, l) => s + l.valorCusto, 0);
  const totalVenda = linhas.reduce((s, l) => s + l.valorVenda, 0);

  return (
    <section className="quilates-workspace space-y-6">
      <div className="quilates-page-heading">
        <h1 className="text-2xl font-semibold">Saldo por categoria</h1>
        <p className="text-sm text-gray-500">Compare quantidade e valor consolidado por tipo de produto.</p>
      </div>

      {linhas.length === 0 ? (
        <p className="text-sm text-gray-500">Sem dados.</p>
      ) : (
        <div className="quilates-table-page overflow-x-auto rounded border border-gray-200 dark:border-gray-800">
          <table className="quilates-table w-full text-sm">
            <thead className="bg-gray-50 text-left dark:bg-gray-900">
              <tr>
                <th className="px-3 py-2 font-medium">Categoria</th>
                <th className="px-3 py-2 text-right font-medium">SKUs</th>
                <th className="px-3 py-2 text-right font-medium">Saldo</th>
                <th className="px-3 py-2 text-right font-medium">Valor custo</th>
                <th className="px-3 py-2 text-right font-medium">Valor venda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {linhas.map((l) => (
                <tr key={l.tipo}>
                  <td className="px-3 py-2">{l.categoria}</td>
                  <td className="px-3 py-2 text-right">{l.skus}</td>
                  <td className="px-3 py-2 text-right">{l.saldo}</td>
                  <td className="px-3 py-2 text-right">{formatarReais(l.valorCusto)}</td>
                  <td className="px-3 py-2 text-right">{formatarReais(l.valorVenda)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-300 bg-gray-50 font-semibold dark:border-gray-700 dark:bg-gray-900">
              <tr>
                <td className="px-3 py-2">Totais</td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-right">{totalSaldo}</td>
                <td className="px-3 py-2 text-right">{formatarReais(totalCusto)}</td>
                <td className="px-3 py-2 text-right">{formatarReais(totalVenda)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
