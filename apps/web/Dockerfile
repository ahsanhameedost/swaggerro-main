# apps/web/Dockerfile
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm@9.15.4

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --frozen-lockfile

COPY apps/web ./apps/web

EXPOSE 3000

CMD ["pnpm", "--filter", "@soaswag/web", "dev"]
