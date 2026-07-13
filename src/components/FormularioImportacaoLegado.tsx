"use client";

import Link from "next/link";
import { useState } from "react";

interface Correcao {
  linha: number;
  codigoLegado: string;
  codigo: string;
  motivo: string;
}

interface Analise {
  totalLinhas: number;
  totalModelos: number;
  totalSkus: number;
  modelosNovos: number;
  modelosExistentes: number;
  skusNovos: number;
  skusExistentes: number;
  conflitos: string[];
  correcoes: Correcao[];
  aplicado?: true;
}

interface RespostaErro {
  erro?: string;
  detalhes?: string[];
}

export function FormularioImportacaoLegado() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [detalhes, setDetalhes] = useState<string[]>([]);

  async function enviar(acao: "analisar" | "importar") {
    if (!arquivo) return;
    setProcessando(true);
    setErro(null);
    setDetalhes([]);

    try {
      const dados = new FormData();
      dados.set("arquivo", arquivo);
      dados.set("acao", acao);
      const resposta = await fetch("/api/modelos/importar-legado", {
        method: "POST",
        body: dados,
      });
      const corpo = (await resposta.json()) as Analise & RespostaErro;
      if (!resposta.ok) {
        setErro(corpo.erro ?? "Falha ao processar a tabela.");
        setDetalhes(corpo.detalhes ?? []);
        return;
      }
      setAnalise(corpo);
    } catch {
      setErro("Não foi possível comunicar com o servidor.");
    } finally {
      setProcessando(false);
    }
  }

  const podeImportar =
    analise !== null &&
    !analise.aplicado &&
    analise.conflitos.length === 0 &&
    analise.skusNovos > 0;

  return (
    <div className="quilates-section-card">
      <h2 className="text-lg font-semibold">Importar tabela legada</h2>
      <p className="mt-1 text-sm text-gray-500">
        Converte tamanho/pedra para o formato atual e cadastra somente itens ausentes, todos com
        saldo zero. Analise a prévia antes de confirmar.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Arquivo TSV ou TXT</span>
          <input
            type="file"
            accept=".tsv,.txt,text/plain,text/tab-separated-values"
            onChange={(evento) => {
              setArquivo(evento.target.files?.[0] ?? null);
              setAnalise(null);
              setErro(null);
              setDetalhes([]);
            }}
            className="rounded-xl border border-[#cbd9d4] bg-white px-3 py-2.5 text-petroleo-950 focus:border-petroleo-500 dark:border-petroleo-700 dark:bg-petroleo-950 dark:text-white"
          />
        </label>
        <button
          type="button"
          disabled={!arquivo || processando}
          onClick={() => enviar("analisar")}
          className="rounded bg-gray-700 px-5 py-2 font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {processando ? "Processando…" : "Analisar tabela"}
        </button>
      </div>

      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
      {detalhes.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-600">
          {detalhes.map((detalhe) => (
            <li key={detalhe}>{detalhe}</li>
          ))}
        </ul>
      )}

      {analise && (
        <div className="mt-5 space-y-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Resumo rotulo="Arquivo" valor={`${analise.totalModelos} modelos · ${analise.totalSkus} SKUs`} />
            <Resumo rotulo="Modelos novos" valor={String(analise.modelosNovos)} />
            <Resumo rotulo="SKUs novos" valor={String(analise.skusNovos)} />
            <Resumo rotulo="SKUs já existentes" valor={String(analise.skusExistentes)} />
          </div>

          {analise.correcoes.length > 0 && (
            <div className="rounded border border-ouro-300 bg-ouro-50 p-3 text-ouro-900 dark:bg-ouro-950 dark:text-ouro-100">
              <p className="font-medium">Correções conhecidas aplicadas</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {analise.correcoes.map((correcao) => (
                  <li key={correcao.codigoLegado}>
                    Linha {correcao.linha}: {correcao.codigoLegado} → {correcao.codigo}. {correcao.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analise.conflitos.length > 0 && (
            <div className="rounded border border-red-300 bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-200">
              <p className="font-medium">Importação bloqueada por conflitos</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {analise.conflitos.map((conflito) => (
                  <li key={conflito}>{conflito}</li>
                ))}
              </ul>
            </div>
          )}

          {analise.aplicado ? (
            <div className="rounded border border-green-300 bg-green-50 p-3 text-green-800 dark:bg-green-950 dark:text-green-200">
              <p>Importação concluída. Nenhuma movimentação de estoque foi criada.</p>
              <Link href="/produtos" className="font-medium underline">
                Ver Produtos
              </Link>
            </div>
          ) : (
            <button
              type="button"
              disabled={!podeImportar || processando}
              onClick={() => enviar("importar")}
              className="rounded bg-petroleo-700 px-5 py-2 font-medium text-white hover:bg-petroleo-800 disabled:opacity-50"
            >
              Confirmar importação com saldo zero
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Resumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded border border-gray-200 p-3 dark:border-gray-700">
      <p className="text-gray-500">{rotulo}</p>
      <p className="font-medium">{valor}</p>
    </div>
  );
}
