# SOASWAG Starter (Prisma v6 + NestJS Fastify + Next.js)

This repo uses **Prisma v6** (stable) to avoid Prisma v7 generator/config issues.

## Windows CMD setup

```bat
pnpm install

docker compose up -d
docker compose ps

pnpm db:push
pnpm db:seed

pnpm dev
```

Web: http://localhost:3000  
API: http://localhost:3001/api  
Health: http://localhost:3001/api/health  

Admin login:
- admin@soaswag.local
- Admin123456!

## TablePlus
Postgres:
- Host: 127.0.0.1
- Port: 5432
- User: postgres
- Pass: postgres
- DB: soaswag

Redis:
- Host: 127.0.0.1
- Port: 6379
