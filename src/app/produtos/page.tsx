/** Tela de Produtos: visão consolidada de todos os modelos, com inativar/excluir. */

import { ListaProdutos } from "@/components/ListaProdutos";

export default function PaginaProdutos() {
  return (
    <section className="quilates-workspace space-y-6">
      <div className="quilates-page-heading">
        <h1 className="text-2xl font-semibold">Produtos</h1>
        <p className="text-sm text-gray-500">
          Todos os produtos cadastrados, com filtros e consolidação por categoria. Inativar oculta
          das telas de uso mantendo o histórico; excluir só é permitido se nunca houve movimentação.
        </p>
      </div>
      <ListaProdutos />
    </section>
  );
}
