"use client";

/**
 * Tela de movimentação de balcão (7.2).
 *
 * Busca por código ou descrição, seleciona um SKU, registra entrada/saída e
 * mostra o saldo resultante. Saída sem saldo é recusada pela API (regra 2) e a
 * mensagem é exibida — nada é gravado.
 */

import { useEffect, useState } from "react";
import { decodificarLegivel } from "@/lib/codigo/codigo";

interface VariacaoEncontrada {
  codigo: string;
  descricao: string | null;
  saldo: number;
}

interface Colecao {
  id: string;
  nome: string;
  data: string;
}

interface Fornecedor {
  id: string;
  nome: string;
}

interface ResultadoMov {
  codigo: string;
  tipoMov: "entrada" | "saida";
  quantidade: number;
  saldo: number;
}

export function FormularioMovimentacao() {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<VariacaoEncontrada[]>([]);
  const [selecionada, setSelecionada] = useState<VariacaoEncontrada | null>(null);
  const [tipoMov, setTipoMov] = useState<"entrada" | "saida">("entrada");
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<ResultadoMov | null>(null);
  const [colecoes, setColecoes] = useState<Colecao[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [colecaoId, setColecaoId] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");

  // Coleções e fornecedores são necessários só na entrada; carregamos uma vez.
  useEffect(() => {
    fetch("/api/colecoes").then((r) => r.json()).then((c) => setColecoes(c.colecoes ?? []));
    fetch("/api/fornecedores").then((r) => r.json()).then((f) => setFornecedores(f.fornecedores ?? []));
  }, []);

  async function buscar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const resposta = await fetch(`/api/variacoes?q=${encodeURIComponent(termo)}`);
    const corpo = await resposta.json();
    setResultados(corpo.resultados ?? []);
  }

  function selecionar(v: VariacaoEncontrada) {
    setSelecionada(v);
    setResultados([]);
    setTermo(v.codigo);
    setSucesso(null);
    setErro(null);
  }

  async function registrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!selecionada) return;
    setEnviando(true);
    setErro(null);
    setSucesso(null);

    const resposta = await fetch("/api/movimentacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codigo: selecionada.codigo,
        tipoMov,
        quantidade,
        observacao: observacao || null,
        colecaoId: tipoMov === "entrada" ? colecaoId || null : null,
        fornecedorId: tipoMov === "entrada" ? fornecedorId || null : null,
      }),
    });
    const corpo = await resposta.json();
    setEnviando(false);

    if (!resposta.ok) {
      setErro(corpo.erro ?? "Falha ao registrar movimentação.");
      return;
    }
    const resultado = corpo as ResultadoMov;
    setSucesso(resultado);
    setSelecionada({ ...selecionada, saldo: resultado.saldo });
    setQuantidade(1);
    setObservacao("");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={buscar} className="flex gap-2">
        <input
          type="text"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Buscar por código ou descrição"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
        <button
          type="submit"
          className="rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-700"
        >
          Buscar
        </button>
      </form>

      {resultados.length > 0 && (
        <ul className="divide-y divide-gray-200 rounded border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {resultados.map((v) => (
            <li key={v.codigo}>
              <button
                type="button"
                onClick={() => selecionar(v)}
                className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-amber-50 dark:hover:bg-amber-950"
              >
                <span>
                  <span className="font-mono">{v.codigo}</span>
                  <span className="text-gray-500"> — {decodificarLegivel(v.codigo)}</span>
                </span>
                <span className="text-gray-500">saldo {v.saldo}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selecionada && (
        <form
          onSubmit={registrar}
          className="space-y-4 rounded border border-gray-200 p-4 dark:border-gray-800"
        >
          <div>
            <p className="font-mono text-sm">{selecionada.codigo}</p>
            <p className="text-sm text-gray-500">{decodificarLegivel(selecionada.codigo)}</p>
            <p className="mt-1 text-sm">
              Saldo atual: <span className="font-semibold">{selecionada.saldo}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Operação</span>
              <select
                value={tipoMov}
                onChange={(e) => setTipoMov(e.target.value as "entrada" | "saida")}
                className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Quantidade</span>
              <input
                type="number"
                min={1}
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
                className="w-28 rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              />
            </label>

            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="font-medium">Observação (opcional)</span>
              <input
                type="text"
                value={observacao}
                maxLength={500}
                onChange={(e) => setObservacao(e.target.value)}
                className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              />
            </label>
          </div>

          {tipoMov === "entrada" && (
            <div className="flex flex-wrap items-end gap-4 rounded bg-amber-50/50 p-3 dark:bg-amber-950/30">
              <label className="flex flex-1 flex-col gap-1 text-sm">
                <span className="font-medium">
                  Coleção <span className="text-red-600">*</span>
                </span>
                <select
                  value={colecaoId}
                  onChange={(e) => setColecaoId(e.target.value)}
                  required
                  className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="">Selecione…</option>
                  {colecoes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.data.split("-").reverse().join("/")})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-1 flex-col gap-1 text-sm">
                <span className="font-medium">
                  Fornecedor <span className="text-red-600">*</span>
                </span>
                <select
                  value={fornecedorId}
                  onChange={(e) => setFornecedorId(e.target.value)}
                  required
                  className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="">Selecione…</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </label>

              {(colecoes.length === 0 || fornecedores.length === 0) && (
                <p className="w-full text-xs text-gray-500">
                  Cadastre em{" "}
                  <a href="/colecoes" className="underline">
                    Coleções
                  </a>{" "}
                  e{" "}
                  <a href="/fornecedores" className="underline">
                    Fornecedores
                  </a>
                  .
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="rounded bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {enviando ? "Registrando..." : "Registrar movimentação"}
          </button>
        </form>
      )}

      {erro && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {erro}
        </div>
      )}

      {sucesso && (
        <div className="rounded border border-green-300 bg-green-50 px-4 py-3 text-sm dark:bg-green-950">
          {sucesso.tipoMov === "entrada" ? "Entrada" : "Saída"} de {sucesso.quantidade} registrada.
          Novo saldo: <span className="font-semibold">{sucesso.saldo}</span>
        </div>
      )}
    </div>
  );
}
