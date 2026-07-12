"use client";

/**
 * Grade de SKUs (pedra × tamanho) com quantidade por linha, para o cadastro.
 * Deriva as linhas das pedras/tamanhos selecionados + "outro tamanho" digitado.
 * Quantidade 0 é permitida (o SKU é criado sem movimentação).
 */

import { useState } from "react";
import type { Pedra } from "@/lib/codigo/referencia";
import { parseOutrosTamanhos } from "@/lib/modelos/tamanhos";

export interface SkuLinha {
  pedra: string;
  tamanho: string | null;
  rotulo: string;
}

export function chaveSku(pedra: string, tamanho: string | null): string {
  return `${pedra}|${tamanho ?? ""}`;
}

export function montarSkus(
  pedras: readonly string[],
  tamanhos: readonly string[],
  temTamanho: boolean,
  pedrasRef: readonly Pedra[],
): SkuLinha[] {
  const nomePedra = (c: string) => pedrasRef.find((p) => p.codigo === c)?.descricao ?? c;
  if (!temTamanho) {
    return pedras.map((pedra) => ({
      pedra,
      tamanho: null,
      rotulo: nomePedra(pedra),
    }));
  }
  return pedras.flatMap((pedra) =>
    tamanhos.map((tamanho) => ({
      pedra,
      tamanho,
      rotulo: `${nomePedra(pedra)} · ${tamanho}cm`,
    })),
  );
}

interface Props {
  pedras: readonly string[];
  tamanhos: readonly string[]; // já combinados (marcados + outros)
  temTamanho: boolean;
  pedrasRef: readonly Pedra[];
  quantidades: Record<string, number>;
  onChangeQuantidade: (chave: string, valor: number) => void;
  onAdicionarOutrosTamanhos: (tamanhos: string[]) => void;
}

export function GradeSkusQuantidade({
  pedras,
  tamanhos,
  temTamanho,
  pedrasRef,
  quantidades,
  onChangeQuantidade,
  onAdicionarOutrosTamanhos,
}: Props) {
  const [outro, setOutro] = useState("");
  const [erroOutro, setErroOutro] = useState<string | null>(null);
  const skus = montarSkus(pedras, tamanhos, temTamanho, pedrasRef);

  function adicionarOutro() {
    setErroOutro(null);
    try {
      const novos = parseOutrosTamanhos(outro);
      if (novos.length > 0) onAdicionarOutrosTamanhos(novos);
      setOutro("");
    } catch (e) {
      setErroOutro(e instanceof Error ? e.message : "Tamanho inválido.");
    }
  }

  const totalPecas = skus.reduce((s, k) => s + (quantidades[chaveSku(k.pedra, k.tamanho)] ?? 0), 0);

  return (
    <div className="space-y-3">
      {temTamanho && (
        <div className="flex flex-wrap items-end gap-2 text-sm">
          <label className="flex flex-col gap-1">
            <span className="font-medium">Outro tamanho</span>
            <input
              type="text"
              value={outro}
              onChange={(e) => setOutro(e.target.value)}
              placeholder="Ex.: 26 ou 26, 28"
              className="rounded-xl border border-[#cbd9d4] bg-white px-3 py-2.5 text-petroleo-950 focus:border-petroleo-500 dark:border-petroleo-700 dark:bg-petroleo-950 dark:text-white"
            />
          </label>
          <button
            type="button"
            onClick={adicionarOutro}
            className="rounded border border-ouro-500 px-4 py-2 font-medium text-ouro-700 hover:bg-petroleo-50 dark:text-ouro-300 dark:hover:bg-petroleo-950"
          >
            Adicionar tamanho
          </button>
          {erroOutro && <span className="text-red-600">{erroOutro}</span>}
        </div>
      )}

      {skus.length === 0 ? (
        <p className="text-sm text-gray-500">
          Selecione ao menos uma pedra{temTamanho ? " e um tamanho" : ""} para informar quantidades.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left dark:bg-gray-900">
              <tr>
                <th className="px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 text-right font-medium">Quantidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {skus.map((k) => {
                const chave = chaveSku(k.pedra, k.tamanho);
                return (
                  <tr key={chave}>
                    <td className="px-3 py-2">{k.rotulo}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={quantidades[chave] ?? 0}
                        onChange={(e) =>
                          onChangeQuantidade(chave, Math.max(0, Math.floor(Number(e.target.value) || 0)))
                        }
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-right dark:border-gray-700 dark:bg-gray-800"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 font-medium dark:border-gray-800">
                <td className="px-3 py-2">{skus.length} SKU(s)</td>
                <td className="px-3 py-2 text-right">{totalPecas} peça(s)</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
