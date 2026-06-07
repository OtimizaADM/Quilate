"use client";

/**
 * Formulário de cadastro de modelo (tela 7.1).
 *
 * Recebe os dados de referência por props (vêm do server component, que é a
 * fonte de verdade). Os tamanhos só aparecem para tipos que têm tamanho.
 * Ao salvar, mostra os SKUs gerados já decodificados em texto legível.
 */

import { useMemo, useState } from "react";
import { decodificarLegivel } from "@/lib/codigo/codigo";
import type { Pedra, Tipo } from "@/lib/codigo/referencia";

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
  tipos: readonly Tipo[];
  pedras: readonly Pedra[];
  tamanhosPorTipo: Record<number, readonly string[]>;
  colecoes: readonly Colecao[];
  fornecedores: readonly Fornecedor[];
}

interface RespostaSucesso {
  modeloId: string;
  sequencial: string;
  codigos: string[];
}

export function FormularioCadastroModelo({
  tipos,
  pedras,
  tamanhosPorTipo,
  colecoes,
  fornecedores,
}: Props) {
  const [tipo, setTipo] = useState<number>(tipos[0]?.codigo ?? 1);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<RespostaSucesso | null>(null);
  const [previewImagem, setPreviewImagem] = useState<string | null>(null);

  function aoEscolherImagem(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0] ?? null;
    setPreviewImagem((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return arquivo ? URL.createObjectURL(arquivo) : null;
    });
  }

  const tipoSelecionado = tipos.find((t) => t.codigo === tipo);
  const tamanhosDoTipo = useMemo(() => tamanhosPorTipo[tipo] ?? [], [tamanhosPorTipo, tipo]);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);
    setSucesso(null);

    const dados = new FormData(evento.currentTarget);
    const resposta = await fetch("/api/modelos", { method: "POST", body: dados });
    const corpo = await resposta.json();

    setEnviando(false);
    if (!resposta.ok) {
      setErro(corpo.erro ?? "Falha ao cadastrar.");
      return;
    }
    setSucesso(corpo as RespostaSucesso);
    evento.currentTarget.reset();
    setPreviewImagem((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return null;
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={enviar} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Tipo</span>
            <select
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(Number(e.target.value))}
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            >
              {tipos.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.descricao}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">
              Descrição <span className="text-red-600">*</span>
            </span>
            <input
              name="descricao"
              type="text"
              maxLength={500}
              required
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">
              Preço de custo <span className="text-red-600">*</span>
            </span>
            <input
              name="precoCusto"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              required
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">
              Preço de venda <span className="text-red-600">*</span>
            </span>
            <input
              name="precoVenda"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              required
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">
              Coleção <span className="text-red-600">*</span>
            </span>
            <select
              name="colecaoId"
              required
              defaultValue=""
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="" disabled>
                Selecione…
              </option>
              {colecoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.data.split("-").reverse().join("/")})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">
              Fornecedor <span className="text-red-600">*</span>
            </span>
            <select
              name="fornecedorId"
              required
              defaultValue=""
              className="rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="" disabled>
                Selecione…
              </option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        {(colecoes.length === 0 || fornecedores.length === 0) && (
          <p className="text-xs text-gray-500">
            Cadastre antes em{" "}
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

        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium">
            Imagem do modelo <span className="text-red-600">*</span>
          </span>
          <div className="flex items-center gap-4">
            {previewImagem ? (
              // eslint-disable-next-line @next/next/no-img-element -- preview local (blob), não passa por otimização do Next
              <img
                src={previewImagem}
                alt="Pré-visualização da imagem do modelo"
                className="h-20 w-20 rounded border border-gray-300 object-cover dark:border-gray-700"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400 dark:border-gray-700">
                sem imagem
              </div>
            )}
            <label className="cursor-pointer rounded border border-amber-600 px-4 py-2 font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950">
              {previewImagem ? "Trocar imagem" : "Selecionar imagem"}
              <input
                name="imagem"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
                onChange={aoEscolherImagem}
                className="sr-only"
              />
            </label>
          </div>
          <span className="text-xs text-gray-500">JPG, PNG ou WEBP, até 5 MB.</span>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Pedras</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {pedras.map((p) => (
              <label key={p.codigo} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="pedras" value={p.codigo} />
                <span>
                  {p.codigo} · {p.descricao}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {tipoSelecionado?.temTamanho ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Tamanhos (cm)</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {tamanhosDoTipo.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="tamanhos" value={t} />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <p className="text-sm text-gray-500">
            {tipoSelecionado?.descricao} não tem tamanho.
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="rounded bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {enviando ? "Salvando..." : "Cadastrar modelo"}
        </button>
      </form>

      {erro && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {erro}
        </div>
      )}

      {sucesso && (
        <div className="space-y-2 rounded border border-green-300 bg-green-50 px-4 py-3 text-sm dark:bg-green-950">
          <p className="font-medium">
            Modelo cadastrado · sequencial {sucesso.sequencial} · {sucesso.codigos.length} variação(ões):
          </p>
          <ul className="space-y-1">
            {sucesso.codigos.map((codigo) => (
              <li key={codigo} className="font-mono">
                {codigo} — {decodificarLegivel(codigo)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
