/** Página de cadastro de Fornecedores. */

import { GerenciarFornecedores } from "@/components/GerenciarFornecedores";

export default function PaginaFornecedores() {
  return (
    <section className="quilates-workspace space-y-6">
      <div className="quilates-page-heading">
        <h1 className="text-2xl font-semibold">Fornecedores</h1>
        <p className="text-sm text-gray-500">
          Cadastre os fornecedores usados nas entradas de mercadoria.
        </p>
      </div>
      <div className="quilates-section-card">
        <GerenciarFornecedores />
      </div>
    </section>
  );
}
