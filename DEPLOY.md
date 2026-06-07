# Deploy do Quilate na VPS (Docker + Caddy/HTTPS)

Sobe tudo em Docker atrás do Caddy (HTTPS automático via Let's Encrypt):
**app.\<DOMINIO\>** (Quilate), **n8n.\<DOMINIO\>**, **evo.\<DOMINIO\>** (Evolution).

## Pré-requisitos
- VPS Ubuntu com acesso SSH e `sudo`.
- Domínio com **registros DNS A** dos 3 subdomínios apontando para o IP da VPS.
- Portas **80** e **443** liberadas.

## 1. Docker
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker   # usar docker sem sudo
docker --version && docker compose version
```

## 2. Clonar o projeto
```bash
git clone https://github.com/OtimizaADM/Quilate.git
cd Quilate
```

## 3. DNS
Crie 3 registros A → IP da VPS: `app`, `n8n`, `evo`. Confira:
```bash
dig +short app.<DOMINIO>   # deve retornar o IP da VPS
```

## 4. Variáveis e segredos
```bash
cp .env.prod.example .env
# Gere segredos novos:
openssl rand -base64 32   # AUTH_SECRET, N8N_ENCRYPTION_KEY
openssl rand -hex 32      # INTEGRACAO_API_TOKEN, EVOLUTION_API_KEY
openssl rand -hex 16      # QUILATE_DB_PASSWORD, EVOLUTION_DB_PASSWORD
```
Edite o `.env` preenchendo tudo. Para o hash da senha de login:
```bash
docker compose -f docker-compose.prod.yml run --rm quilate npm run auth:hash -- "SUA_SENHA"
```
⚠️ No `.env`, **dobre cada `$`** do hash (`$` → `$$`).

## 5. Subir
```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```
O Caddy emite os certificados sozinho (precisa do DNS já propagado + 80/443 abertas).
- Quilate: https://app.\<DOMINIO\>  (login: AUTH_USERNAME / sua senha)
- N8N: https://n8n.\<DOMINIO\>
- Evolution: https://evo.\<DOMINIO\>

## 6. Agente WhatsApp (N8N + Evolution)
1. Evolution: crie a instância e **pareie o chip** (QR via `https://evo.<DOMINIO>/manager`, apikey = `EVOLUTION_API_KEY`).
2. N8N: importe `integracao/n8n/quilate-agente.json` (ou cole), crie as credenciais
   (LLM, **Quilate Bearer** = `Authorization: Bearer <INTEGRACAO_API_TOKEN>`, **Evolution apikey**),
   ajuste a allowlist, a instância na URL de envio, e **Publique**.
   - URLs internas (mesma rede Docker): Quilate = `http://quilate:3000`, Evolution = `http://evolution-api:8080`, webhook N8N = `http://n8n:5678/webhook/quilate-wpp`.
3. Webhook da Evolution → N8N:
   ```bash
   curl -X POST https://evo.<DOMINIO>/webhook/set/<instancia> \
     -H "apikey: <EVOLUTION_API_KEY>" -H "Content-Type: application/json" \
     -d '{"webhook":{"enabled":true,"url":"http://n8n:5678/webhook/quilate-wpp","events":["MESSAGES_UPSERT"]}}'
   ```

## 7. Backup automático do Postgres (pg_dump) — CRÍTICO
```bash
mkdir -p ~/backups
# cron diário às 3h (dump do banco do Quilate, retém 14 dias)
( crontab -l 2>/dev/null; echo '0 3 * * * cd ~/Quilate && docker compose -f docker-compose.prod.yml exec -T quilate-postgres pg_dump -U quilate quilate | gzip > ~/backups/quilate-$(date +\%F).sql.gz && find ~/backups -name "quilate-*.sql.gz" -mtime +14 -delete' ) | crontab -
```

## 8. Firewall
```bash
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```
> Os bancos, Evolution e N8N **não** expõem portas no host — só o Caddy (80/443). N8N/Evolution
> ficam acessíveis só pelos subdomínios HTTPS.

## Atualizar (deploy de nova versão)
```bash
cd ~/Quilate && git pull && docker compose -f docker-compose.prod.yml up -d --build
```
