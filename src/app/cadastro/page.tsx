/**
 * Página de cadastro de modelo (tela 7.1).
 *
 * Server component: fornece os dados de referência (fonte de verdade em
 * src/lib/codigo/referencia.ts) e as coleções/fornecedores ao formulário.
 */

import { db } from "@/db/client";
import { FormularioCadastroModelo } from "@/components/FormularioCadastroModelo";
import { PEDRAS, TAMANHOS_VALIDOS, TIPOS } from "@/lib/codigo/referencia";
import { listarColecoes } from "@/lib/colecoes/colecoes";
import { listarFornecedores } from "@/lib/fornecedores/fornecedores";

export const dynamic = "force-dynamic"; // reflete coleções/fornecedores recém-criados

export default async function PaginaCadastro() {
  const [colecoes, fornecedores] = await Promise.all([
    listarColecoes(db),
    listarFornecedores(db),
  ]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cadastro de modelo</h1>
        <p className="text-sm text-gray-500">
          O sistema gera o sequencial e cria as variações (SKUs) automaticamente.
        </p>
      </div>
      <FormularioCadastroModelo
        tipos={TIPOS}
        pedras={PEDRAS}
        tamanhosPorTipo={TAMANHOS_VALIDOS}
        colecoes={colecoes}
        fornecedores={fornecedores}
      />
    </section>
  );
}
