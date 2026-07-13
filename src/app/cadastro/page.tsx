/**
 * Página de cadastro de modelo (tela 7.1).
 *
 * Server component: fornece os dados de referência (fonte de verdade em
 * src/lib/codigo/referencia.ts) e as coleções/fornecedores ao formulário.
 */

import { db } from "@/db/client";
import { FormularioCadastroModelo } from "@/components/FormularioCadastroModelo";
import { FormularioCodigoExistente } from "@/components/FormularioCodigoExistente";
import { FormularioImportacaoLegado } from "@/components/FormularioImportacaoLegado";
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
    <section className="quilates-workspace space-y-6">
      <div className="quilates-page-heading">
        <h1 className="text-2xl font-semibold">Cadastro de modelo</h1>
        <p className="text-sm text-gray-500">
          O sistema gera o sequencial e cria as variações (SKUs) automaticamente.
        </p>
      </div>
      <FormularioCodigoExistente />
      <FormularioImportacaoLegado />
      <div className="quilates-section-card space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Cadastrar novo modelo sequencial</h2>
          <p className="text-sm text-gray-500">
            Para produtos novos, mantenha o cadastro completo abaixo.
          </p>
        </div>
        <FormularioCadastroModelo
          tipos={TIPOS}
          pedras={PEDRAS}
          tamanhosPorTipo={TAMANHOS_VALIDOS}
          colecoes={colecoes}
          fornecedores={fornecedores}
        />
      </div>
    </section>
  );
}
