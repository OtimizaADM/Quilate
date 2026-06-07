/** Hub de relatórios (seção 7.4). */

const RELATORIOS = [
  { href: "/posicao-estoque", titulo: "Posição de estoque", desc: "Quantidade, custo e venda por produto, com totais." },
  { href: "/relatorios/saldo-por-categoria", titulo: "Saldo por categoria", desc: "Saldo e valores agrupados por tipo de produto." },
  { href: "/relatorios/movimentacoes", titulo: "Movimentações por período", desc: "Entradas e saídas entre duas datas." },
  { href: "/relatorios/zerados", titulo: "Itens com saldo zerado", desc: "SKUs ativos com estoque em zero." },
];

export default function PaginaRelatorios() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Relatórios</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {RELATORIOS.map((r) => (
          <a
            key={r.href}
            href={r.href}
            className="rounded-lg border border-gray-200 p-5 hover:border-amber-500 dark:border-gray-800"
          >
            <h2 className="font-medium">{r.titulo} →</h2>
            <p className="text-sm text-gray-500">{r.desc}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
