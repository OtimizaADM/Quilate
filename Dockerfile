# Imagem de produção do app Quilate (Next.js).
# Mantém as deps (incl. drizzle-kit/tsx) para rodar migrations + seed no start.
FROM node:22-alpine

WORKDIR /app

# Dependências (todas — build precisa das devDependencies)
COPY package.json package-lock.json ./
RUN npm ci

# Código + build
COPY . .
# Envs "de mentira" só para o build não falhar em checagens de import.
# Em runtime, o docker-compose injeta os valores reais.
ENV DATABASE_URL="postgresql://build:build@build:5432/build"
ENV AUTH_SECRET="build-placeholder-not-used-at-runtime"
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# No start: aplica migrations e seed (idempotentes), depois sobe o Next.
CMD ["sh", "-c", "npx drizzle-kit migrate && npm run db:seed && npm run start -- -H 0.0.0.0 -p 3000"]
