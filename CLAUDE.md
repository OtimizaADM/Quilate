@AGENTS.md
@CODE.md

# Quilate

Sistema de controle de estoque para joalherias (by Otimiza). Cliente piloto: Brasilerie. Single-tenant, usuário único.

Stack: Next.js 16 (App Router) + PostgreSQL + Drizzle ORM. Banco local via Docker Compose.

Regras estruturais inegociáveis (ver ESPECIFICACAO_Quilate.md):
- Saldo é uma VIEW derivada de `movimentacoes` — nunca uma coluna editável.
- Código do produto: `tipo(1) + sequencial(5) + pedra(2) + tamanho(2)`. Brinco(2)/Pingente(4) não têm tamanho (código de 8 dígitos); demais têm 10.
- `pedra`/`tamanho` são opcionais (modelo híbrido, para acomodar dados legados).
- Sequencial é gerado pelo sistema, por tipo. Usuário nunca digita.
- Excluir = desativar (`ativo = false`). Deleção física só se nunca houve movimentação.
- Saída nunca permite saldo negativo.

NÃO implementar (seção 9 da spec, pendente de decisão do usuário): migração da planilha, DE/PARA de anéis, WhatsApp/N8N, multi-tenant.

Comandos: `npm run db:up` (sobe Postgres), `npm run db:migrate`, `npm run db:seed`, `npm run dev`, `npm test`.
