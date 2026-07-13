/** Relatório: movimentações por período (entre datas). */

import { db } from "@/db/client";
import { FiltroPeriodo } from "@/components/FiltroPeriodo";
import { decodificarLegivel } from "@/lib/codigo/codigo";
import { movimentacoesPorPeriodo } from "@/lib/relatorios/movimentacoesPorPeriodo";

export const dynamic = "force-dynamic";

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function inicioDoMes(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function dataHora(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default async function PaginaMovimentacoes({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const sp = await searchParams;
  const de = sp.de ?? inicioDoMes();
  const ate = sp.ate ?? hoje();
  const relatorio = await movimentacoesPorPeriodo(db, de, ate);

  return (
    <section className="quilates-workspace space-y-6">
      <div className="quilates-page-heading">
        <h1 className="text-2xl font-semibold">Movimentações por período</h1>
        <p className="text-sm text-gray-500">Acompanhe entradas e saídas dentro do intervalo selecionado.</p>
      </div>

      <FiltroPeriodo de={de} ate={ate} />

      <p className="text-sm text-gray-500">
        {relatorio.itens.length} movimentação(ões) · entradas {relatorio.totalEntradas} · saídas{" "}
        {relatorio.totalSaidas}
      </p>

      {relatorio.itens.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma movimentação no período.</p>
      ) : (
        <div className="quilates-table-page overflow-x-auto rounded border border-gray-200 dark:border-gray-800">
          <table className="quilates-table w-full text-sm">
            <thead className="bg-gray-50 text-left dark:bg-gray-900">
              <tr>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Operação</th>
                <th className="px-3 py-2 text-right font-medium">Qtd.</th>
                <th className="px-3 py-2 font-medium">Coleção</th>
                <th className="px-3 py-2 font-medium">Fornecedor</th>
                <th className="px-3 py-2 font-medium">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {relatorio.itens.map((m, i) => (
                <tr key={`${m.codigo}-${m.data}-${i}`}>
                  <td className="px-3 py-2 whitespace-nowrap">{dataHora(m.data)}</td>
                  <td className="px-3 py-2 font-mono" title={decodificarLegivel(m.codigo)}>
                    {m.codigo}
                  </td>
                  <td className="px-3 py-2">{m.tipoMov === "entrada" ? "Entrada" : "Saída"}</td>
                  <td className="px-3 py-2 text-right">{m.quantidade}</td>
                  <td className="px-3 py-2">{m.colecao ?? "—"}</td>
                  <td className="px-3 py-2">{m.fornecedor ?? "—"}</td>
                  <td className="px-3 py-2">{m.observacao ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
