/** Home — painel de atalhos operacionais. */

import Link from "next/link";

const ATALHOS = [
  {
    href: "/cadastro",
    numero: "01",
    titulo: "Cadastrar joia",
    descricao: "Crie modelos, variações e códigos com segurança.",
  },
  {
    href: "/movimentacao",
    numero: "02",
    titulo: "Movimentar estoque",
    descricao: "Registre entradas e saídas com histórico completo.",
  },
  {
    href: "/catalogo",
    numero: "03",
    titulo: "Explorar catálogo",
    descricao: "Visualize fotos, preços, pedras, tamanhos e saldos.",
  },
  {
    href: "/produtos",
    numero: "04",
    titulo: "Gerenciar produtos",
    descricao: "Edite informações e organize os modelos cadastrados.",
  },
  {
    href: "/posicao-estoque",
    numero: "05",
    titulo: "Posição de estoque",
    descricao: "Acompanhe quantidades, custos e valor de venda.",
  },
  {
    href: "/relatorios",
    numero: "06",
    titulo: "Analisar relatórios",
    descricao: "Consulte movimentações, categorias e itens zerados.",
  },
] as const;

export default function Home() {
  return (
    <section className="space-y-8">
      <div className="relative overflow-hidden rounded-[2rem] bg-petroleo-800 px-6 py-10 text-white shadow-2xl shadow-petroleo-950/15 sm:px-10 sm:py-14 lg:px-14">
        <div className="absolute -right-20 -top-32 size-80 rounded-full border border-white/10" />
        <div className="absolute -right-6 -top-16 size-56 rounded-full border border-ouro-300/30" />
        <div className="absolute bottom-0 right-16 h-40 w-28 translate-y-20 rotate-45 rounded-[2.5rem] bg-gradient-to-br from-white/20 to-petroleo-600/20" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-ouro-200">
            Gestão inteligente de joias
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Quilates</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-petroleo-100 sm:text-lg">
            Visibilidade para cada peça, precisão em cada movimento e uma operação mais elegante
            do cadastro ao relatório.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/catalogo"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-petroleo-800 hover:-translate-y-0.5 hover:bg-petroleo-50"
            >
              Ver catálogo
            </Link>
            <Link
              href="/movimentacao"
              className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-white/10"
            >
              Nova movimentação
            </Link>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="quilates-eyebrow">Acesso rápido</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-petroleo-950 dark:text-white">
              O que você deseja fazer?
            </h2>
          </div>
          <p className="text-sm text-[#687977] dark:text-petroleo-200">Operação centralizada</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ATALHOS.map((atalho) => (
            <Link
              key={atalho.href}
              href={atalho.href}
              className="quilates-panel group rounded-2xl p-5 hover:-translate-y-1 hover:border-petroleo-300 hover:shadow-xl dark:bg-petroleo-900"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs font-bold tracking-[0.14em] text-ouro-600 dark:text-ouro-300">
                  {atalho.numero}
                </span>
                <span className="flex size-8 items-center justify-center rounded-full bg-petroleo-50 text-petroleo-700 group-hover:bg-petroleo-700 group-hover:text-white dark:bg-petroleo-800 dark:text-petroleo-100">
                  →
                </span>
              </div>
              <h3 className="mt-8 font-semibold text-petroleo-950 dark:text-white">{atalho.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#687977] dark:text-petroleo-200">
                {atalho.descricao}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
