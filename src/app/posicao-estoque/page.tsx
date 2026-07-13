/** Relatório de posição de estoque (seção 7.4). */

import { db } from "@/db/client";
import { formatarReais } from "@/lib/format";
import { posicaoEstoque } from "@/lib/relatorios/posicaoEstoque";

export const dynamic = "force-dynamic"; // sempre reflete o saldo atual

export default async function PaginaPosicaoEstoque() {
  const posicao = await posicaoEstoque(db);

  return (
    <section className="quilates-workspace space-y-6">
      <div className="quilates-page-heading">
        <h1 className="text-2xl font-semibold">Posição de estoque</h1>
        <p className="text-sm text-gray-500">
          {posicao.itens.length} SKU(s) · quantidade total {posicao.totalQuantidade}
        </p>
      </div>

      {posicao.itens.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum produto cadastrado ainda.</p>
      ) : (
        <div className="quilates-table-page overflow-x-auto rounded border border-gray-200 dark:border-gray-800">
          <table className="quilates-table w-full text-sm">
            <thead className="bg-gray-50 text-left dark:bg-gray-900">
              <tr>
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Produto</th>
                <th className="px-3 py-2 text-right font-medium">Qtd.</th>
                <th className="px-3 py-2 text-right font-medium">Custo</th>
                <th className="px-3 py-2 text-right font-medium">Venda</th>
                <th className="px-3 py-2 text-right font-medium">Total custo</th>
                <th className="px-3 py-2 text-right font-medium">Total venda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {posicao.itens.map((item) => (
                <tr key={item.codigo}>
                  <td className="px-3 py-2 font-mono">{item.codigo}</td>
                  <td className="px-3 py-2">{item.produto}</td>
                  <td className="px-3 py-2 text-right">{item.quantidade}</td>
                  <td className="px-3 py-2 text-right">{formatarReais(item.custo)}</td>
                  <td className="px-3 py-2 text-right">{formatarReais(item.venda)}</td>
                  <td className="px-3 py-2 text-right">{formatarReais(item.totalCusto)}</td>
                  <td className="px-3 py-2 text-right">{formatarReais(item.totalVenda)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-300 bg-gray-50 font-semibold dark:border-gray-700 dark:bg-gray-900">
              <tr>
                <td className="px-3 py-2" colSpan={2}>
                  Totais
                </td>
                <td className="px-3 py-2 text-right">{posicao.totalQuantidade}</td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-right">{formatarReais(posicao.totalCusto)}</td>
                <td className="px-3 py-2 text-right">{formatarReais(posicao.totalVenda)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
