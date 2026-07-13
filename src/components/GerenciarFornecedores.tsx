"use client";

/** Cadastro e listagem de Fornecedores (nome). */

import { useEffect, useState } from "react";

interface Fornecedor {
  id: string;
  nome: string;
}

export function GerenciarFornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch("/api/fornecedores")
      .then((r) => r.json())
      .then((f) => setFornecedores(f.fornecedores ?? []));
  }, []);

  async function criar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);
    const resposta = await fetch("/api/fornecedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    const corpo = await resposta.json();
    setEnviando(false);
    if (!resposta.ok) {
      setErro(corpo.erro ?? "Falha ao criar fornecedor.");
      return;
    }
    setFornecedores((atual) =>
      [...atual, corpo as Fornecedor].sort((a, b) => a.nome.localeCompare(b.nome)),
    );
    setNome("");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={criar} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Nome do fornecedor *</span>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            maxLength={120}
            className="rounded-xl border border-[#cbd9d4] bg-white px-3 py-2.5 text-petroleo-950 focus:border-petroleo-500 dark:border-petroleo-700 dark:bg-petroleo-950 dark:text-white"
          />
        </label>
        <button
          type="submit"
          disabled={enviando}
          className="rounded bg-petroleo-700 px-4 py-2 font-medium text-white hover:bg-petroleo-800 disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>

      {erro && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {erro}
        </div>
      )}

      {fornecedores.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum fornecedor cadastrado ainda.</p>
      ) : (
        <ul className="quilates-list divide-y divide-gray-100 overflow-hidden rounded border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {fornecedores.map((f) => (
            <li key={f.id} className="px-4 py-2 text-sm">
              {f.nome}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
