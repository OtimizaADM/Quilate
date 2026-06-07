# Quilate

Sistema de controle de estoque para joalherias — **by Otimiza**. Cliente piloto: Brasilerie.
Single-tenant, usuário único. Stack: Next.js 16 (App Router) + PostgreSQL + Drizzle ORM.

> Especificação completa em `ESPECIFICACAO_Quilate.md`. Diretrizes de código em `CODE.md`.

## Quickstart (desenvolvimento)

```bash
cp .env.example .env        # ajuste se necessário
npm install
npm run db:up               # sobe o PostgreSQL em Docker (porta 5433 no host)
npm run db:migrate          # cria tabelas + a view `saldos`
npm run db:seed             # popula tipos, pedras e tamanhos válidos
npm run dev                 # http://localhost:3000
```

> O container publica na porta **5433** do host para não colidir com um
> PostgreSQL local (ex.: Homebrew) já em uso na 5432.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm test` | Testes (Vitest) |
| `npm run db:up` / `db:down` | Sobe / derruba o Postgres (Docker) |
| `npm run db:generate` | Gera migration a partir do schema |
| `npm run db:migrate` | Aplica migrations |
| `npm run db:seed` | Popula tabelas de referência (idempotente) |
| `npm run db:studio` | Drizzle Studio (inspeção do banco) |

## Estrutura

- `src/db/` — schema (`schema.ts`), conexão (`client.ts`), seed (`seed.ts`).
- `src/lib/codigo/` — montagem/parsing/decodificação do código de produto + dados de referência (fonte da verdade).
- `src/lib/modelos/` — regras de cadastro: geração de variações, validação, serviço transacional.
- `src/lib/imagens/` — persistência de imagem no disco.
- `src/app/` — telas (App Router) e API (`/api/modelos`).

## Implementado nesta fase

- Schema completo (seção 4) com a view `saldos` derivada de `movimentacoes`, `CHECK`s e `UNIQUE`s compostos.
- Biblioteca do código de produto (tipo+seq+pedra+tamanho), com testes.
- Cadastro de modelo: gera o sequencial por tipo e cria as variações (SKUs) automaticamente, com upload de imagem.

## Fora de escopo (ver seção 9 da spec — pendente de decisão)

Migração da planilha legada, regra DE/PARA dos anéis, integração WhatsApp/N8N e multi-tenant.

## Próximas telas

Movimentação (entrada/saída com bloqueio de saldo negativo), Catálogo e Relatórios; autenticação (Auth.js) e documentação de deploy na VPS.
