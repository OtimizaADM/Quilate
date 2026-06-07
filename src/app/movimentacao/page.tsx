/** Página de movimentação de balcão (tela 7.2). */

import { FormularioMovimentacao } from "@/components/FormularioMovimentacao";

export default function PaginaMovimentacao() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Movimentação</h1>
        <p className="text-sm text-gray-500">
          Busque um produto e registre entrada ou saída. Saída sem saldo é recusada.
        </p>
      </div>
      <FormularioMovimentacao />
    </section>
  );
}
