# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

SOASWAG (package name `soaswag`) is a branded-swag e-commerce and fulfillment platform — a pnpm monorepo with two apps:

- `apps/web` — Next.js 16 (App Router) + React 19, HeroUI + Tailwind v4, TanStack Query, Zustand. Public marketing/shop site plus an authenticated `/dashboard` admin.
- `apps/api` — NestJS 11 on the **Fastify** adapter, Prisma v6 over PostgreSQL, BullMQ (Redis) for background jobs.

Infra (Postgres 17, Redis 7, MailHog) runs via `docker-compose.yml`. Prisma is pinned to **v6** intentionally to avoid v7 generator/config issues — do not upgrade it.

## Commands

Run from the repo root unless noted. Requires Node >=20.9 and pnpm 9.

```bash
pnpm install
pnpm docker:up          # start postgres + redis + mailhog (docker compose up -d)
pnpm db:push            # prisma db push (apply schema to DB, no migrations)
pnpm db:seed            # seed permissions, roles, admin user
pnpm dev                # run web (:3000) and api (:3001) concurrently
pnpm build              # build all packages (pnpm -r build)
pnpm lint               # lint all packages
pnpm format             # prettier -w .
pnpm db:studio          # prisma studio
pnpm docker:down        # stop infra AND delete volumes (-v) — destroys DB data
```

Per-app (run inside `apps/api` or `apps/web`, or with `pnpm --filter @soaswag/api ...`):

- API: `pnpm dev` (nest start --watch), `pnpm build` (nest build), `pnpm start` (node dist/main.js), `pnpm lint`, `pnpm prisma:generate`, `pnpm seed:testing` (richer fixtures than `db:seed`).
- Web: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint` (next lint).

There is **no test runner configured** in this repo.

Local URLs: web `http://localhost:3000`, API `http://localhost:3001/api`, health `http://localhost:3001/api/health`, MailHog UI `http://localhost:8025`. Seeded admin: `admin@soaswag.local` / `Admin123456!`.

Each app reads its own env file via `dotenv`: `apps/api/.env` and `apps/web/.env.local` (see the `.example` files). The API validates all env vars through a Zod schema in `apps/api/src/env.ts` and will refuse to boot if any are missing/invalid — add new env vars there.

## API architecture (`apps/api`)

NestJS feature modules are registered in `src/app.module.ts`: `auth`, `users`, `email`, `rbac`, `contact`, `storage`, `catalog`, `shipping`, `recipients`, `inventory`. The global prefix is `api` (set in `main.ts`), so every route is `/api/...`.

Cross-cutting conventions to follow when adding endpoints:

- **Validation**: controllers accept `@Body()`/`@Query()` as `unknown` and validate with Zod schemas (in each module's `dto/`). Use the `parseOrThrow(schema.safeParse(input), "message")` helper (`src/catalog/common/parse-or-throw.ts`), or `schema.parse(body)` directly as auth does. DTOs are Zod schemas + inferred types, **not** class-validator classes.
- **Auth**: cookie-based JWT. Login/signup set an httpOnly cookie named by `COOKIE_NAME` (default `soaswag_at`). `AuthGuard` (`src/common/guards/auth.guard.ts`) verifies the JWT, then **re-loads the user's role + permissions from the DB** on every request and attaches `req.user: { sub, email, role, permissions[] }`.
- **Authorization (RBAC)**: guard routes with `@UseGuards(AuthGuard, PermissionsGuard)` and declare required permission keys via `@RequirePermissions("catalog.products.write")` (all-of) or the any-of variant. Permission keys are dot-namespaced strings, seeded in `apps/api/prisma/seed.js` (the canonical list lives in the `PERMISSIONS` array there). Scoping suffixes encode access breadth — e.g. `*.read` (all), `*.assigned.read`, `*.self.read`. Roles: `SUPER_ADMIN` (all perms) and `USER` (self-scoped). When adding a feature, add its permission keys to the seed and grant them to the appropriate role.
- **Background work**: side effects like email send go through BullMQ queues (`@InjectQueue`), not inline. The email queue is consumed by `src/email/email.processor.ts`. SMTP points at MailHog locally.
- **Storage**: S3 uploads use presigned URLs issued by `StorageModule` — clients request an upload URL, then PUT directly to S3.
- **Payments**: Square (sandbox by default; `SQUARE_*` env vars). Stripe and Shippo deps are also present.

## Data model (`apps/api/prisma/schema.prisma`)

Single ~800-line schema, all tables snake_cased via `@@map`. The core flow is **Catalog → Project → Order → Shipment**, with inventory tracked by an append-only ledger:

- **Catalog**: `CatalogProduct` (with `CatalogCategory`, `CatalogCollection`, `CatalogImage`). Variants are two-layer — `Variant`/`VariantOption` define axes (e.g. color/size), and `CatalogVariant` is a concrete purchasable combination (price/stock) linking selected options. Tiered pricing lives in `CatalogPricingOption` (qty ranges, attachable to a product or a specific variant).
- **Orders**: a `Project` (quote/cart, type BULK/SWAG_PACK/COMBINED) converts to a `CatalogOrder` with `CatalogOrderItem`s. Order items carry a **design workflow** (`designPhase`: mockup → review → revision → proof → ready) and `CatalogOrderItemRevision` threads.
- **Shipping**: `ShippingProfile` (per product, package/hazmat attributes), `ShippingZone`/`ShippingRate` (zone + service-level + weight pricing), and `ShippingShipment`/`ShippingShipmentItem` (per-recipient fulfillment). `Recipient` is an address book per user.
- **Inventory**: `CatalogOrderItem.inventoryStatus` plus `InventoryLedgerEntry` (WAREHOUSE_RECEIPT / SHIPMENT_ALLOCATION / releases / manual adjustments) — treat the ledger as the source of truth for stock movements rather than mutating counters directly.

Monetary values use Prisma `Decimal` (`@db.Decimal(10,2)`); use the web `src/lib/money.ts` helpers for display.

Schema changes use `prisma db push` (no migration files in this repo). After editing the schema run `pnpm db:push` then re-seed if needed.

## Web architecture (`apps/web`)

Next.js App Router under `src/app`. Route groups: `(public)/*` (marketing + shop), `dashboard/*` (admin, gated). `middleware.ts` redirects unauthenticated users away from `/dashboard/*` by checking for the auth cookie (the real authorization still happens server-side in the API per-request).

Data access is layered — keep the layers separate when adding features:

1. `src/modules/<feature>/{api,types}.ts` — typed fetch functions + TypeScript types, one folder per API feature (auth, catalog/*, inventory, rbac, recipients, shipping, users). All HTTP goes through `src/lib/api.ts` `apiFetch()`, which sends `credentials: "include"` (cookie auth) and normalizes errors.
2. `src/queries/<feature>.ts` — TanStack Query hooks (`useProducts`, `useCreateProduct`, …) wrapping the module api functions, with query-key conventions and cache invalidation.
3. Components/pages — UI in `src/app/components/**` (notably `dashboard/` and `home/`), consuming the query hooks.

Other notable libs in `src/lib`: `permissions.ts` (client-side permission checks mirroring the API keys), `cart-store.ts`/`ui-store.ts` (Zustand), `catalog-pricing.ts` (tier pricing math), `square.ts` (payment SDK). Import alias `@/*` maps to `src/*`. The API base URL comes from `NEXT_PUBLIC_API_URL` (default `http://localhost:3001/api`).

## Deployment

`.github/workflows/docker-image.yml` builds both `apps/*/Dockerfile` images on push to `main`/`devops`, pushes to AWS ECR (us-east-2), and forces an ECS redeploy of `soaswag-api` and `soaswag-web`.
