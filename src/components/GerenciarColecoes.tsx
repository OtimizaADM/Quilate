"use client";

/** Cadastro e listagem de Coleções (nome + data). */

import { useEffect, useState } from "react";

interface Colecao {
  id: string;
  nome: string;
  data: string; // AAAA-MM-DD
}

function dataBr(iso: string): string {
  return iso.split("-").reverse().join("/");
}

export function GerenciarColecoes() {
  const [colecoes, setColecoes] = useState<Colecao[]>([]);
  const [nome, setNome] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch("/api/colecoes")
      .then((r) => r.json())
      .then((c) => setColecoes(c.colecoes ?? []));
  }, []);

  async function criar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);
    const resposta = await fetch("/api/colecoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, data }),
    });
    const corpo = await resposta.json();
    setEnviando(false);
    if (!resposta.ok) {
      setErro(corpo.erro ?? "Falha ao criar coleção.");
      return;
    }
    setColecoes((atual) => [corpo as Colecao, ...atual]);
    setNome("");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={criar} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Nome da coleção *</span>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            maxLength={120}
            className="rounded-xl border border-[#cbd9d4] bg-white px-3 py-2.5 text-petroleo-950 focus:border-petroleo-500 dark:border-petroleo-700 dark:bg-petroleo-950 dark:text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Data *</span>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
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

      {colecoes.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma coleção cadastrada ainda.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {colecoes.map((c) => (
            <li key={c.id} className="flex justify-between px-4 py-2 text-sm">
              <span>{c.nome}</span>
              <span className="text-gray-500">{dataBr(c.data)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
