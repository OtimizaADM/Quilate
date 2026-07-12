"use client";

/**
 * Formulário de cadastro de modelo (tela 7.1).
 * Coleta atributos + seleção de pedras/tamanhos + quantidade por SKU e, ao
 * submeter, abre o modal de confirmação. O POST só ocorre após confirmar.
 */

import { useMemo, useRef, useState } from "react";
import { decodificarLegivel } from "@/lib/codigo/codigo";
import type { Pedra, Tipo } from "@/lib/codigo/referencia";
import { combinarTamanhos } from "@/lib/modelos/tamanhos";
import {
  GradeSkusQuantidade,
  chaveSku,
  montarSkus,
} from "@/components/GradeSkusQuantidade";
import {
  ModalConfirmacaoCadastro,
  type ResumoCadastro,
} from "@/components/ModalConfirmacaoCadastro";

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
  const formRef = useRef<HTMLFormElement>(null);
  const [tipo, setTipo] = useState<number>(tipos[0]?.codigo ?? 1);
  const [pedrasSel, setPedrasSel] = useState<string[]>([]);
  const [tamanhosSel, setTamanhosSel] = useState<string[]>([]);
  const [outrosTamanhos, setOutrosTamanhos] = useState<string[]>([]);
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<RespostaSucesso | null>(null);
  const [previewImagem, setPreviewImagem] = useState<string | null>(null);
  const [resumo, setResumo] = useState<ResumoCadastro | null>(null);

  const tipoSelecionado = tipos.find((t) => t.codigo === tipo);
  const temTamanho = Boolean(tipoSelecionado?.temTamanho);
  const tamanhosDoTipo = useMemo(() => tamanhosPorTipo[tipo] ?? [], [tamanhosPorTipo, tipo]);
  const tamanhos = useMemo(
    () => combinarTamanhos(tamanhosSel, outrosTamanhos),
    [tamanhosSel, outrosTamanhos],
  );

  function aoEscolherImagem(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0] ?? null;
    setPreviewImagem((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return arquivo ? URL.createObjectURL(arquivo) : null;
    });
  }

  function alternar(lista: string[], valor: string): string[] {
    return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
  }

  function abrirConfirmacao(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const form = evento.currentTarget;
    const dados = new FormData(form);
    const nomeColecao = colecoes.find((c) => c.id === dados.get("colecaoId"))?.nome ?? "";
    const nomeFornecedor = fornecedores.find((f) => f.id === dados.get("fornecedorId"))?.nome ?? "";
    const skus = montarSkus(pedrasSel, tamanhos, temTamanho, pedras).map((k) => ({
      rotulo: k.rotulo,
      quantidade: quantidades[chaveSku(k.pedra, k.tamanho)] ?? 0,
    }));
    setResumo({
      tipoNome: tipoSelecionado?.descricao ?? String(tipo),
      descricao: String(dados.get("descricao") ?? ""),
      modeloFornecedor: (String(dados.get("modeloFornecedor") ?? "").trim() || null),
      precoCusto: String(dados.get("precoCusto") ?? ""),
      precoVenda: String(dados.get("precoVenda") ?? ""),
      colecaoNome: nomeColecao,
      fornecedorNome: nomeFornecedor,
      imagemPreview: previewImagem,
      skus,
    });
  }

  function quantidadesSelecionadas() {
    const skus = montarSkus(pedrasSel, tamanhos, temTamanho, pedras);
    return skus.map((k) => ({
      pedra: k.pedra,
      tamanho: k.tamanho,
      quantidade: quantidades[chaveSku(k.pedra, k.tamanho)] ?? 0,
    }));
  }

  async function confirmar() {
    if (!formRef.current) return;
    setEnviando(true);
    setErro(null);
    const dados = new FormData(formRef.current);
    pedrasSel.forEach((p) => dados.append("pedras", p));
    tamanhos.forEach((t) => dados.append("tamanhos", t));
    dados.set("quantidades", JSON.stringify(quantidadesSelecionadas()));

    const resposta = await fetch("/api/modelos", { method: "POST", body: dados });
    const corpo = await resposta.json();
    setEnviando(false);
    setResumo(null);
    if (!resposta.ok) {
      setErro(corpo.erro ?? "Falha ao cadastrar.");
      return;
    }
    setSucesso(corpo as RespostaSucesso);
    formRef.current.reset();
    setPedrasSel([]);
    setTamanhosSel([]);
    setOutrosTamanhos([]);
    setQuantidades({});
    setPreviewImagem((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return null;
    });
  }

  return (
    <div className="space-y-6">
      <form ref={formRef} onSubmit={abrirConfirmacao} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Tipo</span>
            <select
              name="tipo"
              value={tipo}
              onChange={(e) => {
                setTipo(Number(e.target.value));
                setTamanhosSel([]);
                setOutrosTamanhos([]);
                setQuantidades({});
              }}
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
            <span className="font-medium">Modelo do fornecedor</span>
            <input
              name="modeloFornecedor"
              type="text"
              maxLength={200}
              placeholder="Referência do fornecedor (opcional)"
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
              // eslint-disable-next-line @next/next/no-img-element -- preview local (blob)
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
                <input
                  type="checkbox"
                  checked={pedrasSel.includes(p.codigo)}
                  onChange={() => setPedrasSel((atual) => alternar(atual, p.codigo))}
                />
                <span>
                  {p.codigo} · {p.descricao}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {temTamanho ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Tamanhos (cm)</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {tamanhosDoTipo.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={tamanhosSel.includes(t)}
                    onChange={() => setTamanhosSel((atual) => alternar(atual, t))}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <p className="text-sm text-gray-500">{tipoSelecionado?.descricao} não tem tamanho.</p>
        )}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Quantidades por SKU</legend>
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
        </fieldset>

        <button
          type="submit"
          className="rounded bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Revisar e cadastrar
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
