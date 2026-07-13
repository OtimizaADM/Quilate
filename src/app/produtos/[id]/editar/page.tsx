/**
 * Página de edição de modelo (tela Produtos → Editar).
 * Server component: carrega o modelo, coleções e fornecedores e delega ao form.
 */

import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { FormularioEdicaoModelo } from "@/components/FormularioEdicaoModelo";
import { PEDRAS, TAMANHOS_VALIDOS, buscarTipo } from "@/lib/codigo/referencia";
import { listarColecoes } from "@/lib/colecoes/colecoes";
import { listarFornecedores } from "@/lib/fornecedores/fornecedores";
import { buscarModeloParaEdicao } from "@/lib/modelos/buscarModeloParaEdicao";

export const dynamic = "force-dynamic";

export default async function PaginaEdicao({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [modelo, colecoes, fornecedores] = await Promise.all([
    buscarModeloParaEdicao(db, id),
    listarColecoes(db),
    listarFornecedores(db),
  ]);
  if (!modelo) notFound();

  const tipo = buscarTipo(modelo.tipo);
  return (
    <section className="quilates-workspace space-y-6">
      <div className="quilates-page-heading">
        <h1 className="text-2xl font-semibold">
          Editar {tipo?.descricao ?? "modelo"} {modelo.codigoBase}
        </h1>
        <p className="text-sm text-gray-500">
          Tipo e código são fixos. Saldo de SKUs existentes muda só pela Movimentação.
        </p>
      </div>
      <div className="quilates-section-card">
        <FormularioEdicaoModelo
          modelo={modelo}
          pedras={PEDRAS}
          tamanhosPorTipo={TAMANHOS_VALIDOS}
          colecoes={colecoes}
          fornecedores={fornecedores}
        />
      </div>
    </section>
  );
}
