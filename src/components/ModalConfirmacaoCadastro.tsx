"use client";

/**
 * Popup de confirmação: revisa todos os dados antes de gravar (cadastro/edição).
 * Nada é enviado ao servidor até o usuário confirmar. Esc = "voltar e corrigir".
 */

import { useEffect } from "react";

export interface ResumoSku {
  rotulo: string;
  quantidade: number;
}

export interface ResumoCadastro {
  tipoNome: string;
  descricao: string;
  modeloFornecedor: string | null;
  precoCusto: string;
  precoVenda: string;
  colecaoNome: string;
  fornecedorNome: string;
  imagemPreview: string | null;
  skus: ResumoSku[];
}

interface Props {
  resumo: ResumoCadastro;
  enviando: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}

export function ModalConfirmacaoCadastro({ resumo, enviando, aoConfirmar, aoCancelar }: Props) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !enviando) aoCancelar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoCancelar, enviando]);

  const totalPecas = resumo.skus.reduce((s, k) => s + k.quantidade, 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar cadastro"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
        <h2 className="text-lg font-semibold">Confirme os dados</h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500">Tipo</dt>
          <dd>{resumo.tipoNome}</dd>
          <dt className="text-gray-500">Descrição</dt>
          <dd>{resumo.descricao}</dd>
          <dt className="text-gray-500">Modelo do fornecedor</dt>
          <dd>{resumo.modeloFornecedor ?? "—"}</dd>
          <dt className="text-gray-500">Preço de custo</dt>
          <dd>{resumo.precoCusto}</dd>
          <dt className="text-gray-500">Preço de venda</dt>
          <dd>{resumo.precoVenda}</dd>
          <dt className="text-gray-500">Coleção</dt>
          <dd>{resumo.colecaoNome}</dd>
          <dt className="text-gray-500">Fornecedor</dt>
          <dd>{resumo.fornecedorNome}</dd>
        </dl>

        {resumo.imagemPreview && (
          // eslint-disable-next-line @next/next/no-img-element -- preview local (blob) ou caminho relativo
          <img
            src={resumo.imagemPreview}
            alt="Imagem do modelo"
            className="mt-4 h-20 w-20 rounded border border-gray-300 object-cover dark:border-gray-700"
          />
        )}

        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="py-1 font-medium">SKU</th>
              <th className="py-1 text-right font-medium">Qtd</th>
            </tr>
          </thead>
          <tbody>
            {resumo.skus.map((k) => (
              <tr key={k.rotulo}>
                <td className="py-1">{k.rotulo}</td>
                <td className="py-1 text-right">{k.quantidade}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 font-medium dark:border-gray-700">
              <td className="py-1">{resumo.skus.length} SKU(s)</td>
              <td className="py-1 text-right">{totalPecas} peça(s)</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={aoCancelar}
            disabled={enviando}
            className="rounded border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Voltar e corrigir
          </button>
          <button
            type="button"
            onClick={aoConfirmar}
            disabled={enviando}
            className="rounded bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {enviando ? "Gravando..." : "Confirmar e gravar"}
          </button>
        </div>
      </div>
    </div>
  );
}
