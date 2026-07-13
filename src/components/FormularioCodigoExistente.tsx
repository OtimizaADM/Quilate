"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FormularioCodigoExistente() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function cadastrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);

    try {
      const resposta = await fetch("/api/modelos/codigo-existente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      const corpo = (await resposta.json()) as { erro?: string };
      if (!resposta.ok) {
        setErro(corpo.erro ?? "Falha ao cadastrar o código.");
        return;
      }
      router.push("/produtos");
    } catch {
      setErro("Não foi possível comunicar com o servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="quilates-section-card">
      <h2 className="text-lg font-semibold">Cadastrar código existente</h2>
      <p className="mt-1 text-sm text-gray-500">
        Use para um SKU antigo que ainda não existe no sistema. O saldo continua sendo
        lançado na tela de movimentação.
      </p>

      <form onSubmit={cadastrar} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Código completo</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value.replace(/\D/g, ""))}
            placeholder="Ex.: 1001230618"
            required
            maxLength={10}
            className="rounded-xl border border-[#cbd9d4] bg-white px-3 py-2.5 text-petroleo-950 focus:border-petroleo-500 dark:border-petroleo-700 dark:bg-petroleo-950 dark:text-white"
          />
        </label>
        <button
          type="submit"
          disabled={enviando}
          className="rounded bg-petroleo-700 px-5 py-2 font-medium text-white hover:bg-petroleo-800 disabled:opacity-50"
        >
          {enviando ? "Cadastrando…" : "Cadastrar código"}
        </button>
      </form>

      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
    </div>
  );
}
