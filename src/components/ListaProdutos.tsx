"use client";

/**
 * Tela de Produtos: lista de modelos com filtros, resumo consolidado por
 * categoria e ações de inativar/reativar/excluir (regra 3).
 */

import { useCallback, useEffect, useState } from "react";
import { TIPOS } from "@/lib/codigo/referencia";
import { formatarReais } from "@/lib/format";
import { consolidarPorCategoria } from "@/lib/produtos/consolidarPorCategoria";
import type { Produto, StatusFiltro } from "@/lib/produtos/listarProdutos";

interface Colecao {
  id: string;
  nome: string;
}
interface Fornecedor {
  id: string;
  nome: string;
}

export function ListaProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [colecoes, setColecoes] = useState<Colecao[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [tipo, setTipo] = useState("");
  const [colecaoId, setColecaoId] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");
  const [status, setStatus] = useState<StatusFiltro>("ativos");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/colecoes").then((r) => r.json()).then((c) => setColecoes(c.colecoes ?? []));
    fetch("/api/fornecedores").then((r) => r.json()).then((f) => setFornecedores(f.fornecedores ?? []));
  }, []);

  const carregar = useCallback(async () => {
    const params = new URLSearchParams({ status });
    if (tipo) params.set("tipo", tipo);
    if (colecaoId) params.set("colecaoId", colecaoId);
    if (fornecedorId) params.set("fornecedorId", fornecedorId);
    const resposta = await fetch(`/api/produtos?${params}`);
    const corpo = await resposta.json();
    setProdutos(corpo.produtos ?? []);
  }, [status, tipo, colecaoId, fornecedorId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function alterarAtivo(p: Produto, ativo: boolean) {
    setErro(null);
    const r = await fetch(`/api/produtos/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo }),
    });
    if (!r.ok) setErro((await r.json()).erro ?? "Falha ao alterar produto.");
    await carregar();
  }

  async function excluir(p: Produto) {
    if (!confirm(`Excluir definitivamente "${p.descricao ?? p.codigoBase}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setErro(null);
    const r = await fetch(`/api/produtos/${p.id}`, { method: "DELETE" });
    if (!r.ok) setErro((await r.json()).erro ?? "Falha ao excluir produto.");
    await carregar();
  }

  const resumo = consolidarPorCategoria(produtos);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Select rotulo="Tipo" valor={tipo} aoMudar={setTipo} opcaoTodos="Todos">
          {TIPOS.map((t) => (
            <option key={t.codigo} value={String(t.codigo)}>
              {t.descricao}
            </option>
          ))}
        </Select>
        <Select rotulo="Coleção" valor={colecaoId} aoMudar={setColecaoId} opcaoTodos="Todas">
          {colecoes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>
        <Select rotulo="Fornecedor" valor={fornecedorId} aoMudar={setFornecedorId} opcaoTodos="Todos">
          {fornecedores.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </Select>
        <Select rotulo="Status" valor={status} aoMudar={(v) => setStatus(v as StatusFiltro)}>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
          <option value="todos">Todos</option>
        </Select>
      </div>

      {resumo.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {resumo.map((r) => (
            <div
              key={r.tipo}
              className="rounded border border-gray-200 px-4 py-2 text-sm dark:border-gray-800"
            >
              <span className="font-medium">{r.categoria}</span>
              <span className="text-gray-500">
                {" "}
                · {r.qtdProdutos} produto(s) · saldo {r.saldoTotal}
              </span>
            </div>
          ))}
        </div>
      )}

      {erro && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {erro}
        </div>
      )}

      {produtos.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum produto encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left dark:bg-gray-900">
              <tr>
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Produto</th>
                <th className="px-3 py-2 font-medium">Coleção</th>
                <th className="px-3 py-2 font-medium">Fornecedor</th>
                <th className="px-3 py-2 text-right font-medium">SKUs</th>
                <th className="px-3 py-2 text-right font-medium">Saldo</th>
                <th className="px-3 py-2 text-right font-medium">Venda</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {produtos.map((p) => (
                <tr key={p.id} className={p.ativo ? "" : "text-gray-400"}>
                  <td className="px-3 py-2 font-mono">{p.codigoBase}</td>
                  <td className="px-3 py-2">{p.descricao ?? p.categoria}</td>
                  <td className="px-3 py-2">{p.colecao ?? "—"}</td>
                  <td className="px-3 py-2">{p.fornecedor ?? "—"}</td>
                  <td className="px-3 py-2 text-right">{p.qtdVariacoes}</td>
                  <td className="px-3 py-2 text-right">{p.saldoTotal}</td>
                  <td className="px-3 py-2 text-right">{formatarReais(p.precoVenda)}</td>
                  <td className="px-3 py-2">{p.ativo ? "Ativo" : "Inativo"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      {p.ativo ? (
                        <button
                          type="button"
                          onClick={() => alterarAtivo(p, false)}
                          className="text-amber-700 hover:underline dark:text-amber-400"
                        >
                          Inativar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => alterarAtivo(p, true)}
                          className="text-green-700 hover:underline dark:text-green-400"
                        >
                          Reativar
                        </button>
                      )}
                      {!p.teveMovimentacao && (
                        <button
                          type="button"
                          onClick={() => excluir(p)}
                          className="text-red-700 hover:underline dark:text-red-400"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Select({
  rotulo,
  valor,
  aoMudar,
  opcaoTodos,
  children,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  opcaoTodos?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{rotulo}</span>
      <select
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
      >
        {opcaoTodos !== undefined && <option value="">{opcaoTodos}</option>}
        {children}
      </select>
    </label>
  );
}
