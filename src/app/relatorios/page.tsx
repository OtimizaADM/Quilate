/** Hub de relatórios (seção 7.4). */

const RELATORIOS = [
  { href: "/posicao-estoque", titulo: "Posição de estoque", desc: "Quantidade, custo e venda por produto, com totais." },
  { href: "/relatorios/saldo-por-categoria", titulo: "Saldo por categoria", desc: "Saldo e valores agrupados por tipo de produto." },
  { href: "/relatorios/movimentacoes", titulo: "Movimentações por período", desc: "Entradas e saídas entre duas datas." },
  { href: "/relatorios/zerados", titulo: "Itens com saldo zerado", desc: "SKUs ativos com estoque em zero." },
];

export default function PaginaRelatorios() {
  return (
    <section className="quilates-workspace space-y-6">
      <div className="quilates-page-heading">
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <p className="text-sm text-gray-500">Consulte o estoque, os valores e o histórico operacional.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {RELATORIOS.map((r) => (
          <a
            key={r.href}
            href={r.href}
            className="quilates-section-card group hover:-translate-y-0.5 hover:border-petroleo-400"
          >
            <h2 className="font-semibold text-petroleo-900 group-hover:text-petroleo-700 dark:text-petroleo-100 dark:group-hover:text-petroleo-300">
              {r.titulo} →
            </h2>
            <p className="mt-1 text-sm text-gray-500">{r.desc}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
