"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { buscarPedra, buscarTipo } from "@/lib/codigo/referencia";
import { formatarReais } from "@/lib/format";
import type { ModeloCatalogo } from "@/lib/catalogo/buscarCatalogo";

export function CatalogoInterativo({ modelos }: { modelos: readonly ModeloCatalogo[] }) {
  const [selecionado, setSelecionado] = useState<ModeloCatalogo | null>(null);

  useEffect(() => {
    if (!selecionado) return;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const fecharComEsc = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setSelecionado(null);
    };
    window.addEventListener("keydown", fecharComEsc);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", fecharComEsc);
    };
  }, [selecionado]);

  return (
    <>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {modelos.map((modelo) => {
          const categoria = buscarTipo(modelo.tipo)?.descricao ?? `Tipo ${modelo.tipo}`;
          const titulo = modelo.descricao ?? `${categoria} ${modelo.codigoBase}`;
          const primeiroSku = modelo.variacoes[0]?.codigo ?? modelo.codigoBase;
          const outrosSkus = modelo.variacoes.length - 1;
          return (
            <li
              key={modelo.id}
              className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
            >
              <button
                type="button"
                onClick={() => setSelecionado(modelo)}
                aria-label={`Ampliar e ver detalhes de ${titulo}`}
                className="group block w-full cursor-zoom-in text-left"
              >
                <ImagemModelo modelo={modelo} className="transition-transform group-hover:scale-[1.02]" />
              </button>
              <div className="space-y-2 p-3 text-sm">
                <p className="line-clamp-2 min-h-10 font-medium">{titulo}</p>
                <p className="font-semibold">Venda: {formatarReais(modelo.precoVenda)}</p>
                <p className="font-mono text-xs text-gray-500">
                  SKU: {primeiroSku}
                  {outrosSkus > 0 ? ` + ${outrosSkus} variações` : ""}
                </p>
                <p className="text-gray-500">Estoque: {modelo.saldoTotal}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {selecionado && (
        <ModalDetalhes modelo={selecionado} aoFechar={() => setSelecionado(null)} />
      )}
    </>
  );
}

function ImagemModelo({ modelo, className = "" }: { modelo: ModeloCatalogo; className?: string }) {
  const categoria = buscarTipo(modelo.tipo)?.descricao ?? `Tipo ${modelo.tipo}`;
  const alt = modelo.descricao ?? `${categoria} ${modelo.codigoBase}`;
  return modelo.imagemPath ? (
    // eslint-disable-next-line @next/next/no-img-element -- servida pela rota /uploads
    <img
      src={`/${modelo.imagemPath}`}
      alt={alt}
      className={`aspect-square w-full object-cover ${className}`}
    />
  ) : (
    <div
      className={`flex aspect-square w-full items-center justify-center bg-gray-100 text-xs text-gray-400 dark:bg-gray-800 ${className}`}
    >
      sem imagem
    </div>
  );
}

function ModalDetalhes({ modelo, aoFechar }: { modelo: ModeloCatalogo; aoFechar: () => void }) {
  const categoria = buscarTipo(modelo.tipo)?.descricao ?? `Tipo ${modelo.tipo}`;
  const titulo = modelo.descricao ?? `${categoria} ${modelo.codigoBase}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) aoFechar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-detalhe-catalogo"
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-900"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-4 dark:border-gray-700">
          <div>
            <p className="font-mono text-xs text-gray-500">{modelo.codigoBase}</p>
            <h2 id="titulo-detalhe-catalogo" className="text-xl font-semibold">
              {titulo}
            </h2>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar detalhes"
            className="rounded px-3 py-1 text-2xl leading-none text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="grid gap-6 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:p-6">
          <div>
            <ImagemAmpliada modelo={modelo} />
          </div>

          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-3">
              <Dado rotulo="Categoria" valor={categoria} />
              <Dado rotulo="Preço de venda" valor={formatarReais(modelo.precoVenda)} />
              <Dado rotulo="SKUs" valor={String(modelo.variacoes.length)} />
              <Dado rotulo="Estoque total" valor={String(modelo.saldoTotal)} destaque />
            </dl>

            <div>
              <h3 className="font-semibold">Descrição</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {modelo.descricao ?? "Descrição ainda não informada."}
              </p>
            </div>

            <div>
              <h3 className="font-semibold">Estoque por variação</h3>
              <div className="mt-2 overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 font-medium">SKU</th>
                      <th className="px-3 py-2 font-medium">Pedra</th>
                      <th className="px-3 py-2 font-medium">Tamanho</th>
                      <th className="px-3 py-2 text-right font-medium">Estoque</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {modelo.variacoes.map((variacao) => (
                      <tr key={variacao.codigo}>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                          {variacao.codigo}
                        </td>
                        <td className="px-3 py-2">
                          {variacao.pedra
                            ? (buscarPedra(variacao.pedra)?.descricao ?? variacao.pedra)
                            : "—"}
                        </td>
                        <td className="px-3 py-2">{variacao.tamanho ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-semibold">{variacao.saldo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImagemAmpliada({ modelo }: { modelo: ModeloCatalogo }) {
  const [zoom, setZoom] = useState({ ativo: false, x: 50, y: 50 });
  const categoria = buscarTipo(modelo.tipo)?.descricao ?? `Tipo ${modelo.tipo}`;
  const alt = modelo.descricao ?? `${categoria} ${modelo.codigoBase}`;

  if (!modelo.imagemPath) {
    return <ImagemModelo modelo={modelo} className="rounded-lg" />;
  }

  function moverZoom(evento: MouseEvent<HTMLDivElement>) {
    const area = evento.currentTarget.getBoundingClientRect();
    const x = ((evento.clientX - area.left) / area.width) * 100;
    const y = ((evento.clientY - area.top) / area.height) * 100;
    setZoom({ ativo: true, x, y });
  }

  return (
    <div
      className="group relative cursor-zoom-in overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
      onMouseEnter={() => setZoom((anterior) => ({ ...anterior, ativo: true }))}
      onMouseMove={moverZoom}
      onMouseLeave={() => setZoom({ ativo: false, x: 50, y: 50 })}
      aria-label="Imagem ampliável pelo movimento do mouse"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- servida pela rota /uploads */}
      <img
        src={`/${modelo.imagemPath}`}
        alt={alt}
        className={`aspect-square w-full object-cover ${zoom.ativo ? "" : "transition-transform duration-200"}`}
        style={{
          transform: zoom.ativo ? "scale(2.25)" : "scale(1)",
          transformOrigin: `${zoom.x}% ${zoom.y}%`,
        }}
      />
      <div
        className={`pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white transition-opacity ${zoom.ativo ? "opacity-0" : "opacity-100"}`}
      >
        🔍 Passe o mouse para ampliar
      </div>
    </div>
  );
}

function Dado({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="rounded border border-gray-200 p-3 dark:border-gray-700">
      <dt className="text-xs text-gray-500">{rotulo}</dt>
      <dd className={destaque ? "text-lg font-bold text-orange-600" : "font-semibold"}>{valor}</dd>
    </div>
  );
}
