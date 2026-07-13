/** Página de movimentação de balcão (tela 7.2). */

import { FormularioMovimentacao } from "@/components/FormularioMovimentacao";

export default function PaginaMovimentacao() {
  return (
    <section className="quilates-workspace space-y-6">
      <div className="quilates-page-heading">
        <h1 className="text-2xl font-semibold">Movimentação</h1>
        <p className="text-sm text-gray-500">
          Busque um produto e registre entrada ou saída. Saída sem saldo é recusada.
        </p>
      </div>
      <div className="quilates-section-card">
        <FormularioMovimentacao />
      </div>
    </section>
  );
}
