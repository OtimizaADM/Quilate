"use client";

/**
 * Edição de modelo: pré-preenche atributos, lista SKUs existentes (saldo, com
 * remoção só se sem movimentação) e permite adicionar novos SKUs com quantidade.
 * Envia via PUT após confirmação no modal.
 */

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Pedra } from "@/lib/codigo/referencia";
import type { ModeloEdicao } from "@/lib/modelos/buscarModeloParaEdicao";
import {
  GradeSkusQuantidade,
  chaveSku,
  montarSkus,
} from "@/components/GradeSkusQuantidade";
import {
  ModalConfirmacaoCadastro,
  type ResumoCadastro,
} from "@/components/ModalConfirmacaoCadastro";
import { combinarTamanhos } from "@/lib/modelos/tamanhos";

interface Colecao {
  id: string;
  nome: string;
  data: string;
}

interface Fornecedor {
  id: string;
  nome: string;
}

interface Props {
  modelo: ModeloEdicao;
  pedras: readonly Pedra[];
  tamanhosPorTipo: Record<number, readonly string[]>;
  colecoes: readonly Colecao[];
  fornecedores: readonly Fornecedor[];
}

function precoParaInput(valor: string | null): string {
  return valor ? valor.replace(".", ",") : "";
}

export function FormularioEdicaoModelo({
  modelo,
  pedras,
  tamanhosPorTipo,
  colecoes,
  fornecedores,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const temTamanho = (tamanhosPorTipo[modelo.tipo] ?? []).length > 0;
  const existentes = useMemo(
    () => new Set(modelo.variacoes.map((v) => chaveSku(v.pedra ?? "", v.tamanho))),
    [modelo.variacoes],
  );
  const [pedrasSel, setPedrasSel] = useState<string[]>([]);
  const [tamanhosSel, setTamanhosSel] = useState<string[]>([]);
  const [outrosTamanhos, setOutrosTamanhos] = useState<string[]>([]);
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [remover, setRemover] = useState<Set<string>>(new Set());
  const [resumo, setResumo] = useState<ResumoCadastro | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const tamanhos = useMemo(
    () => combinarTamanhos(tamanhosSel, outrosTamanhos),
    [tamanhosSel, outrosTamanhos],
  );

  function alternar(lista: string[], valor: string): string[] {
    return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
  }

  function novosSkusSelecionados() {
    return montarSkus(pedrasSel, tamanhos, temTamanho, pedras)
      .filter((k) => !existentes.has(chaveSku(k.pedra, k.tamanho)))
      .map((k) => ({
        pedra: k.pedra,
        tamanho: k.tamanho,
        quantidade: quantidades[chaveSku(k.pedra, k.tamanho)] ?? 0,
      }));
  }

  function abrirConfirmacao(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const dados = new FormData(evento.currentTarget);
    const novos = novosSkusSelecionados();
    setResumo({
      tipoNome: modelo.codigoBase,
      descricao: String(dados.get("descricao") ?? ""),
      modeloFornecedor: String(dados.get("modeloFornecedor") ?? "").trim() || null,
      precoCusto: String(dados.get("precoCusto") ?? ""),
      precoVenda: String(dados.get("precoVenda") ?? ""),
      colecaoNome: colecoes.find((c) => c.id === dados.get("colecaoId"))?.nome ?? "",
      fornecedorNome: fornecedores.find((f) => f.id === dados.get("fornecedorId"))?.nome ?? "",
      imagemPreview: modelo.imagemPath ? `/${modelo.imagemPath}` : null,
      skus: novos.map((s) => ({
        rotulo: `${pedras.find((p) => p.codigo === s.pedra)?.descricao ?? s.pedra}${
          s.tamanho ? ` · ${s.tamanho}cm` : ""
        } (novo)`,
        quantidade: s.quantidade,
      })),
    });
  }

  async function confirmar() {
    if (!formRef.current) return;
    setEnviando(true);
    setErro(null);
    const dados = new FormData(formRef.current);
    dados.set("novosSkus", JSON.stringify(novosSkusSelecionados()));
    dados.set("removerVariacaoIds", JSON.stringify([...remover]));

    const resposta = await fetch(`/api/modelos/${modelo.id}`, { method: "PUT", body: dados });
    const corpo = await resposta.json();
    setEnviando(false);
    setResumo(null);
    if (!resposta.ok) {
      setErro(corpo.erro ?? "Falha ao salvar.");
      return;
    }
    router.push("/produtos");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form ref={formRef} onSubmit={abrirConfirmacao} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Descrição <span className="text-red-600">*</span></span>
            <input
              name="descricao"
              type="text"
              maxLength={500}
              required
              defaultValue={modelo.descricao ?? ""}
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Modelo do fornecedor</span>
            <input
              name="modeloFornecedor"
              type="text"
              maxLength={200}
              defaultValue={modelo.modeloFornecedor ?? ""}
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Preço de custo <span className="text-red-600">*</span></span>
            <input
              name="precoCusto"
              type="text"
              inputMode="decimal"
              required
              defaultValue={precoParaInput(modelo.precoCusto)}
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Preço de venda <span className="text-red-600">*</span></span>
            <input
              name="precoVenda"
              type="text"
              inputMode="decimal"
              required
              defaultValue={precoParaInput(modelo.precoVenda)}
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Coleção <span className="text-red-600">*</span></span>
            <select
              name="colecaoId"
              required
              defaultValue={modelo.colecaoId ?? ""}
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="" disabled>Selecione…</option>
              {colecoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.data.split("-").reverse().join("/")})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Fornecedor <span className="text-red-600">*</span></span>
            <select
              name="fornecedorId"
              required
              defaultValue={modelo.fornecedorId ?? ""}
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="" disabled>Selecione…</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Trocar imagem (opcional)</span>
          <input
            name="imagem"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="text-sm"
          />
          <span className="text-xs text-gray-500">Deixe em branco para manter a imagem atual.</span>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">SKUs existentes</legend>
          <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left dark:bg-gray-900">
                <tr>
                  <th className="px-3 py-2 font-medium">Código</th>
                  <th className="px-3 py-2 text-right font-medium">Saldo</th>
                  <th className="px-3 py-2 font-medium">Remover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {modelo.variacoes.map((v) => (
                  <tr key={v.id}>
                    <td className="px-3 py-2 font-mono">{v.codigo}</td>
                    <td className="px-3 py-2 text-right">{v.saldo}</td>
                    <td className="px-3 py-2">
                      {v.teveMovimentacao ? (
                        <span className="text-xs text-gray-400">tem histórico</span>
                      ) : (
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={remover.has(v.id)}
                            onChange={() =>
                              setRemover((atual) => {
                                const novo = new Set(atual);
                                if (novo.has(v.id)) novo.delete(v.id);
                                else novo.add(v.id);
                                return novo;
                              })
                            }
                          />
                          <span className="text-xs">remover</span>
                        </label>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Adicionar SKUs</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {pedras.map((p) => (
              <label key={p.codigo} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pedrasSel.includes(p.codigo)}
                  onChange={() => setPedrasSel((a) => alternar(a, p.codigo))}
                />
                <span>{p.codigo} · {p.descricao}</span>
              </label>
            ))}
          </div>
          {temTamanho && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {(tamanhosPorTipo[modelo.tipo] ?? []).map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={tamanhosSel.includes(t)}
                    onChange={() => setTamanhosSel((a) => alternar(a, t))}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          )}
          <GradeSkusQuantidade
            pedras={pedrasSel}
            tamanhos={tamanhos}
            temTamanho={temTamanho}
            pedrasRef={pedras}
            quantidades={quantidades}
            onChangeQuantidade={(chave, valor) =>
              setQuantidades((atual) => ({ ...atual, [chave]: valor }))
            }
            onAdicionarOutrosTamanhos={(novos) =>
              setOutrosTamanhos((atual) => [...new Set([...atual, ...novos])])
            }
          />
          <p className="text-xs text-gray-500">
            SKUs que já existem no modelo são ignorados (só entram combinações novas).
          </p>
        </fieldset>

        <button
          type="submit"
          className="rounded bg-petroleo-700 px-4 py-2 font-medium text-white hover:bg-petroleo-800"
        >
          Revisar e salvar
        </button>
      </form>

      {resumo && (
        <ModalConfirmacaoCadastro
          resumo={resumo}
          enviando={enviando}
          aoConfirmar={confirmar}
          aoCancelar={() => setResumo(null)}
        />
      )}

      {erro && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {erro}
        </div>
      )}
    </div>
  );
}
