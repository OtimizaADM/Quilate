/** Home — atalhos para as telas. Por ora, só o Cadastro está implementado. */

export default function Home() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Quilate</h1>
        <p className="text-gray-500">Controle de estoque para joalherias · by Otimiza</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href="/cadastro"
          className="rounded-lg border border-gray-200 p-5 hover:border-amber-500 dark:border-gray-800"
        >
          <h2 className="font-medium">Cadastro de modelo →</h2>
          <p className="text-sm text-gray-500">
            Cadastre um modelo e gere as variações (SKUs) automaticamente.
          </p>
        </a>
        <a
          href="/movimentacao"
          className="rounded-lg border border-gray-200 p-5 hover:border-amber-500 dark:border-gray-800"
        >
          <h2 className="font-medium">Movimentação →</h2>
          <p className="text-sm text-gray-500">
            Registre entradas e saídas. Saída sem saldo é recusada.
          </p>
        </a>
        <a
          href="/catalogo"
          className="rounded-lg border border-gray-200 p-5 hover:border-amber-500 dark:border-gray-800"
        >
          <h2 className="font-medium">Catálogo →</h2>
          <p className="text-sm text-gray-500">
            Grade com imagem, código, preço e saldo, com filtros.
          </p>
        </a>
        <a
          href="/produtos"
          className="rounded-lg border border-gray-200 p-5 hover:border-amber-500 dark:border-gray-800"
        >
          <h2 className="font-medium">Produtos →</h2>
          <p className="text-sm text-gray-500">
            Todos os produtos, consolidado por categoria, inativar/excluir.
          </p>
        </a>
        <a
          href="/posicao-estoque"
          className="rounded-lg border border-gray-200 p-5 hover:border-amber-500 dark:border-gray-800"
        >
          <h2 className="font-medium">Posição de estoque →</h2>
          <p className="text-sm text-gray-500">
            Quantidade, custo e venda por produto, com totais.
          </p>
        </a>
        <a
          href="/relatorios"
          className="rounded-lg border border-gray-200 p-5 hover:border-amber-500 dark:border-gray-800"
        >
          <h2 className="font-medium">Relatórios →</h2>
          <p className="text-sm text-gray-500">
            Saldo por categoria, movimentações por período, itens zerados.
          </p>
        </a>
      </div>
    </section>
  );
}
