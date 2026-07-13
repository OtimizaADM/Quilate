/** Página de cadastro de Coleções. */

import { GerenciarColecoes } from "@/components/GerenciarColecoes";

export default function PaginaColecoes() {
  return (
    <section className="quilates-workspace space-y-6">
      <div className="quilates-page-heading">
        <h1 className="text-2xl font-semibold">Coleções</h1>
        <p className="text-sm text-gray-500">
          Cadastre as coleções (nome e data) usadas nas entradas de mercadoria.
        </p>
      </div>
      <div className="quilates-section-card">
        <GerenciarColecoes />
      </div>
    </section>
  );
}
