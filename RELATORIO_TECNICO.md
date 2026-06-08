# Relatório Técnico — Quilate (by Otimiza)

Sistema de controle de estoque para joalherias, com automação de movimentações
por WhatsApp via agente de IA. Cliente piloto: **Brasilerie**. Arquitetura
single-tenant (uma instalação, um usuário operador).

> Documento de referência técnica. **Não contém segredos** (tokens/senhas estão
> descritos, não impressos) — esses ficam apenas no `.env` da VPS.

---

## 1. Links de acesso

| Recurso | URL | Acesso |
|---|---|---|
| **App Quilate** | https://quilate.otmzai.com.br | Login: usuário `admin` + senha (definida no deploy) |
| **N8N** (automação) | https://n8n.otmzai.com.br | Conta owner criada no deploy (e-mail + senha) |
| **Evolution API** | https://evo.otmzai.com.br | API Key Global (no `.env`); painel em `/manager` |
| **Repositório** | https://github.com/OtimizaADM/Quilate | GitHub (org OtimizaADM) |
| **Bot WhatsApp** | número do chip dedicado (instância `vps`) | Operador conversa por mensagem |

---

## 2. Stack e componentes

- **Aplicação:** Next.js 16 (App Router) — frontend + API no mesmo projeto.
- **Banco:** PostgreSQL 16. ORM **Drizzle** (schema versionado + migrations).
- **Autenticação:** Auth.js (NextAuth v5), usuário único via env.
- **Automação WhatsApp:** **Evolution API** (transporte, não-oficial) + **N8N**
  (orquestração) + **agente de IA** (Groq `openai/gpt-oss-120b`).
- **Infra:** VPS Ubuntu, tudo em **Docker** atrás de **nginx** (HTTPS) e
  **Cloudflare** (proxy/CDN).

### Diagrama geral

```
                                   Internet (Cloudflare proxy)
                                            │
                              ┌─────────────┼──────────────┐
                              ▼             ▼              ▼
                    quilate.otmzai   n8n.otmzai     evo.otmzai
                              │             │              │
                       nginx (host) + sslh(443→4443) + certbot
                              │             │              │
   ── rede Docker "quilate-prod" (127.0.0.1) ───────────────────────────
        │                     │             │              │
   quilate:3000          n8n:5678   evolution-api:8080  (Postgres x2)
        │                                                  
   quilate-postgres ◄── migrations + seed + saldos(view)   
```

---

## 3. Modelo de dados (regras estruturais)

- **Código do produto:** `tipo(1) + sequencial(5) + pedra(2) + tamanho(2)`.
  - Brinco(2)/Pingente(4): **8 dígitos** (sem tamanho). Demais: **10 dígitos**.
  - O sequencial é **gerado pelo sistema**, por tipo (o usuário nunca digita).
- **Modelo → Variações (SKUs):** cada modelo gera as combinações de pedra×tamanho.
  Pedra/tamanho fazem parte da **identidade do SKU** (saldo separado por SKU).
- **Saldo é uma VIEW** derivada das `movimentacoes` (entradas − saídas) —
  **nunca** uma coluna editável. O histórico é a fonte da verdade.
- **Modelo híbrido:** `pedra`/`tamanho`/preços aceitam NULL no banco (para futura
  importação de legados); obrigatórios apenas no cadastro pela tela.
- **Coleção e Fornecedor:** entidades próprias, vinculadas tanto ao **modelo**
  (lançamento) quanto a cada **entrada de mercadoria** (compra/reposição).

### Tabelas
`tipos`, `pedras`, `tamanhos_validos` (referência/seed) · `modelos` · `variacoes`
· `movimentacoes` · `colecoes` · `fornecedores` · **view** `saldos`.

---

## 4. Regras de negócio (inegociáveis)

1. **Cadastro por modelo gera variações** (SKUs) automaticamente.
2. **Saída nunca permite saldo negativo** — confere saldo antes de gravar; recusa
   se insuficiente (HTTP 409). Vale para a tela e para o WhatsApp.
3. **Excluir = desativar** (`ativo=false`); o histórico sobrevive. Deleção física
   só se o produto **nunca** teve movimentação.
4. **Entrada exige coleção e fornecedor.**
5. **Confirmação obrigatória** antes de qualquer movimentação pelo bot.

---

## 5. Telas da aplicação

- **Cadastro de modelo** — tipo, descrição, preços, imagem, pedras/tamanhos;
  gera o sequencial e os SKUs. Imagem, descrição, preços, coleção e fornecedor
  são **obrigatórios**.
- **Movimentação** — busca por código/descrição, entrada/saída, bloqueio de saldo
  negativo; entrada pede coleção/fornecedor.
- **Catálogo** — grade com imagem, código decodificado, preço e saldo; filtros.
- **Produtos** — lista consolidada por categoria; **inativar/reativar/excluir**.
- **Posição de estoque** — código, produto, qtd, custo, venda e totais (só itens
  com saldo).
- **Relatórios** — saldo por categoria, movimentações por período, itens zerados.
- **Coleções** e **Fornecedores** — cadastro/listagem.
- **Login** (Auth.js) protege todas as rotas via middleware.

---

## 6. API de integração (consumida pelo N8N)

Namespace **`/api/integracao/*`**, autenticado por **token Bearer**
(`INTEGRACAO_API_TOKEN`), separado da sessão de navegador. Reusa os mesmos
serviços das telas (mesma validação).

| Método | Rota | Função |
|---|---|---|
| GET | `/variacoes?q=` | Buscar/desambiguar produto por código ou descrição |
| GET | `/produtos/:codigo` | Detalhe (nome, preço, saldo, imagem) |
| GET | `/posicao-estoque` | Resumo + totais |
| GET | `/colecoes` · `/fornecedores` | Listar |
| POST | `/colecoes` · `/fornecedores` | Criar (com 409 em duplicado) |
| POST | `/movimentacoes` | Registrar (origem `whatsapp`); 404/409/422 |
| GET | `/imagens/:arquivo` | Servir imagem (com token, p/ o bot reenviar) |

Toda movimentação pelo bot fica com `origem='whatsapp'` → auditável no relatório
de movimentações por período.

---

## 7. Automação WhatsApp (como funciona)

### Fluxo ponta a ponta
```
Operador (WhatsApp)
   │  mensagem
   ▼
Evolution API (instância "vps", chip pareado)  ── webhook MESSAGES_UPSERT ──▶  N8N
                                                                               │
   N8N: 1) Webhook  2) Code "Extrair e filtrar" (allowlist + extrai texto)
        3) Agente IA (Groq gpt-oss-120b) + memória por número + 8 tools
        4) Responder WhatsApp (Evolution sendText)
                                   │
   Tools do agente ──► /api/integracao/* do Quilate ──► PostgreSQL
```

### O agente
- **Modelo:** `openai/gpt-oss-120b` via **Groq** (free tier). Escolhido porque
  faz **tool calling nativo** confiável (os Llama do Groq emitem formato errado).
- **Memória** por número (janela de 12 mensagens) → conversa multi-turno.
- **Allowlist:** só processa mensagens dos números do operador (no nó *Extrair e
  filtrar*). Inclui a forma com e sem o 9º dígito.
- **8 tools** (HTTP → `/api/integracao`): `buscar_produto`, `consultar_produto`,
  `posicao_estoque`, `listar_colecoes`, `listar_fornecedores`,
  `registrar_movimentacao`, `criar_colecao`, `criar_fornecedor`.

### Regras do agente (system prompt)
- **Nunca adivinha.** Movimentação só com **código exato + quantidade + operação**;
  termo genérico ("anéis") → busca e pede o código.
- **Confirma antes de gravar** (só registra após "sim").
- **Saída ≤ saldo**; entrada exige coleção/fornecedor (oferece criar se faltar).
- Respostas curtas, padronizadas, em português.

### Componentes da automação
- **Evolution API** (`evoapicloud/evolution-api`, v2.3.x) — conecta o chip via
  WhatsApp Web (QR). ⚠️ É **não-oficial**: risco de banimento do número (decisão
  aceita; mitigação: chip dedicado descartável). Migração futura possível para a
  **WhatsApp Business Cloud API** (oficial) — muda só o transporte no N8N.
- **N8N** — workflow `Quilate — Agente WhatsApp` (fonte versionada em
  `integracao/n8n/quilate-agente.json`). Mudanças no fluxo só valem após **Publish**.

---

## 8. Infraestrutura e deploy

- **VPS:** Ubuntu, 1 vCPU, ~4 GB RAM (+2 GB swap para o build), Docker Engine.
- **Stack de produção:** `docker-compose.prod.yml` (projeto `quilate-prod`):
  `quilate` (app), `quilate-postgres`, `evolution-api`, `evolution-postgres`, `n8n`.
  Os serviços escutam **só em 127.0.0.1** (não expostos publicamente).
- **Proxy/HTTPS:** **nginx do host** (já existente) + **sslh** (compartilha a 443
  com SSH) + **certbot** (Let's Encrypt). Cada subdomínio é um vhost
  `proxy_pass` para a porta local: `quilate→3002`, `n8n→5678`, `evo→8080`.
- **Cloudflare:** DNS + proxy (laranja) na frente, com SSL "Full".
- **Build:** o app builda no deploy (`Dockerfile`) e, no start, roda **migrations
  + seed** (idempotentes) e sobe o Next.

### Atualizar (nova versão)
```bash
cd ~/Quilate && git pull && docker compose -f docker-compose.prod.yml up -d --build
```

### Backup (crítico)
`pg_dump` diário do Postgres via cron (3h), retenção 14 dias, em `~/backups/`.

---

## 9. Segurança

- Segredos só no `.env` da VPS (gerados novos no deploy; nada commitado).
- `/api/integracao/*` exige token Bearer (comparação em tempo constante).
- Bot: **allowlist** de números + **confirmação** antes de gravar.
- Firewall: público só **SSH + 80/443**; bancos/n8n/evo só em localhost.
- Auth.js protege todas as rotas do app.

---

## 10. Pendências e evoluções conhecidas

- **Renovação de certificado:** como os subdomínios estão atrás da Cloudflare
  (proxied), a renovação automática do Let's Encrypt (HTTP-01) falha. Migrar para
  **Cloudflare Origin Certificate** (15 anos) ou **DNS-01** antes do vencimento.
- **Áudio/imagem no bot:** previsto — áudio via **Groq Whisper** (transcrição),
  imagem via modelo de visão (ler etiqueta) e envio de foto do produto
  (`sendMedia`). Não muda o app, só acrescenta passos no N8N.
- **Transporte oficial:** trocar a Evolution pela **WhatsApp Business Cloud API**
  quando a confiabilidade exigir (sem risco de ban).
- **Importação da planilha legada** e **DE/PARA dos anéis** (seção 9 da spec) —
  pendentes de decisão.
- **Multi-tenant** — fora de escopo; refatoração planejada se virar produto.

---

## 11. Comandos úteis (VPS, em `~/Quilate`)

```bash
# Status / logs
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=50 quilate
docker compose -f docker-compose.prod.yml logs --tail=50 n8n

# Reiniciar um serviço
docker compose -f docker-compose.prod.yml restart quilate

# Acesso ao banco
docker compose -f docker-compose.prod.yml exec quilate-postgres psql -U quilate quilate

# Evolution: estado da instância / (re)pareamento
curl -s https://evo.otmzai.com.br/instance/connectionState/vps -H "apikey: <EVOLUTION_API_KEY>"
```

---

*Gerado para a Otimiza • produto Quilate • cliente piloto Brasilerie.*
