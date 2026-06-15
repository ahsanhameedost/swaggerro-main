# apps/api/Dockerfile
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm@9.15.4

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/prisma ./apps/api/prisma

RUN pnpm install --frozen-lockfile

COPY apps/api ./apps/api

EXPOSE 3001

# Ensure database schema is pushed and seeded before starting the dev server
CMD ["sh", "-c", "pnpm --filter @soaswag/api db:push && pnpm --filter @soaswag/api db:seed && pnpm --filter @soaswag/api dev"]
