# Integração WhatsApp — Evolution API + N8N (Parte B)

Stack que conecta o WhatsApp ao Quilate via N8N. A lógica de estoque continua no
Quilate (`/api/integracao/*`, autenticado por token Bearer); aqui ficam só o
transporte (Evolution API) e a orquestração/IA (N8N).

> ⚠️ A Evolution API é **não-oficial** (conecta como WhatsApp Web). Risco de
> banimento do número pela Meta — use um **chip dedicado** e descartável.

## Subir o stack

```bash
cd integracao
cp .env.example .env     # preencha os segredos (openssl rand -hex 24 / -hex 12)
docker compose up -d
```

- Evolution API: http://localhost:8080 (header `apikey: <EVOLUTION_API_KEY>`)
- N8N: http://localhost:5678 (crie o usuário "owner" no primeiro acesso)

O Quilate precisa estar acessível para o N8N. Em dev, rode `npm run dev` no host
(porta 3000); os containers o alcançam por `host.docker.internal:3000`
(já configurado em `QUILATE_BASE_URL`).

## Parear o chip (criar a instância)

1. Criar a instância na Evolution:
   ```bash
   curl -X POST http://localhost:8080/instance/create \
     -H "apikey: $EVOLUTION_API_KEY" -H "Content-Type: application/json" \
     -d '{"instanceName":"quilate","integration":"WHATSAPP-BAILEYS","qrcode":true}'
   ```
2. Pegar o QR e escaneá-lo com o **chip dedicado** (WhatsApp do celular →
   Aparelhos conectados → Conectar):
   ```bash
   curl http://localhost:8080/instance/connect/quilate -H "apikey: $EVOLUTION_API_KEY"
   ```
   (devolve o QR em base64; abra no navegador ou use o Manager em
   http://localhost:8080/manager)
3. Conferir status: deve ficar `open`:
   ```bash
   curl http://localhost:8080/instance/connectionState/quilate -H "apikey: $EVOLUTION_API_KEY"
   ```

## Apontar o webhook da Evolution para o N8N

Depois de criar o workflow no N8N (Parte C) e copiar a URL do nó Webhook:

```bash
curl -X POST http://localhost:8080/webhook/set/quilate \
  -H "apikey: $EVOLUTION_API_KEY" -H "Content-Type: application/json" \
  -d '{"webhook":{"enabled":true,"url":"http://host.docker.internal:5678/webhook/quilate-wpp","events":["MESSAGES_UPSERT"]}}'
```

> N8N e Evolution estão em redes/containers diferentes neste compose; no mesmo
> compose elas se enxergam pelos nomes de serviço. Se o webhook do N8N for
> chamado pela Evolution, use `http://n8n:5678/...` (se estiverem na mesma rede)
> ou a URL pública do N8N. Ajuste conforme o deploy.

## Segurança

- **Não exponha** a Evolution API publicamente sem proteção — a `apikey` dá
  controle total. Na VPS, deixe atrás de proxy/HTTPS e/ou restrinja por IP.
- N8N: ative HTTPS atrás de proxy e use `N8N_SECURE_COOKIE=true` em produção.
- O token do Quilate (`INTEGRACAO_API_TOKEN`) entra como **credencial** no N8N
  (não em arquivo), e o allowlist de números do operador é checado no fluxo.

## VPS (deploy, seção 8)

Este compose é a base. No deploy, junte ao stack do Quilate, ajuste
`QUILATE_BASE_URL` para a URL interna do app, exponha só o necessário atrás do
proxy, e inclua os volumes (`evolution_pgdata`, `evolution_instances`,
`evolution_redis`, `n8n_data`) na rotina de backup.

## Comandos úteis

```bash
docker compose ps
docker compose logs -f evolution-api
docker compose logs -f n8n
docker compose down           # para (mantém volumes/dados)
docker compose down -v        # apaga TUDO (instância perde o pareamento)
```
