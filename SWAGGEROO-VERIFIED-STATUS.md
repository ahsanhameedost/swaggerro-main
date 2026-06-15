# Swaggeroo — Independent Status Verification

**Prepared:** June 15, 2026
**Repo reviewed:** Scott-Holding/Swaggeroo (local working copy)
**Purpose:** Verify the claims in the previous developer's "Project Status Report v1.1" against the actual source code, and produce an accurate completed-vs-remaining accounting.

---

## Bottom line

The previous report is **mostly accurate**, but it overstates a handful of features by listing them as **"✓ SHIPPED / WORKING"** when they **do not exist in the code**. The client's concern is justified: at least one prominently-featured capability (bulk product import) is claimed as complete but is entirely missing.

Every item in the report's own "What's not done" section was checked and is **genuinely not done** — those risks are real. (One of them, the production Dockerfile, is actually *worse* than described.)

| | Count |
|---|---|
| Claims verified as fully **TRUE** | 18 |
| Claims **OVERSTATED / PARTIAL** | 4 |
| Claims **FALSE** (feature absent) | 3 |
| "Gap"/risk claims confirmed **real** | 13 |

---

## 1. Claims marked "WORKING / SHIPPED" — verification results

### ✅ Confirmed real and working

| Feature | Verdict | Evidence |
|---|---|---|
| Auth — signup, login, JWT httpOnly cookies, password reset via emailed codes | **TRUE** | `auth.controller.ts`, `auth.service.ts` (6-digit codes, 10-min expiry, queued email) |
| Order lifecycle — 6-stage design workflow | **TRUE** | `schema.prisma` `CatalogOrderDesignPhase` enum has exactly 6 stages |
| Inventory ledger — append-only (receipts, allocations, releases, adjustments) | **TRUE** | `InventoryLedgerEntry` model is create-only, no update/delete |
| Tiered pricing | **TRUE** | `CatalogPricingOption` (qty ranges, per product or variant) |
| Categories, collections, multi-variant products | **TRUE** | `schema.prisma`, catalog module |
| Recipient address book per customer | **TRUE** | `Recipient` model + `recipients` module |
| Contact-form intake with async email | **TRUE** | `contact.service.ts` persists + queues email |
| S3 presigned-URL uploads | **TRUE** | `storage.service.ts` (getSignedUrl, image types only) |
| BullMQ background job queue | **TRUE** | `BullModule` + real `email.processor.ts` worker |
| Payments — Square, sandbox **and** production modes | **TRUE** | `env.ts` `SQUARE_ENVIRONMENT` enum; live `fetch` to Square API |
| Custom roles can be created/edited | **TRUE** | `rbac.service.ts` full CRUD, system roles protected |
| Admin dashboard — all 7 areas (product mgmt w/ drag-drop, order mgmt, inventory, shipping planner, users/employees, RBAC admin, contact viewer) | **TRUE** | All routes exist as real implementations under `dashboard/` |
| Homepage sections (hero, how-it-works, pricing estimator, FAQ, testimonials, newsletter) | **TRUE** | `(public)/page.tsx` + `components/home/` |
| Exactly 4 "Coming Soon" public pages | **TRUE** | company, platform, pricing, resources render `ComingSoonPage` |
| Live public pages (shop, product detail, cart, swag-pack builder, project submission, contact, login/signup/reset) | **TRUE** | All real, data-driven |
| 62 static marketing image assets | **TRUE** | Exact count confirmed |

### ⚠️ Overstated / partially true

| Claim | Reality |
|---|---|
| "RBAC — **39** permissions" | Actually **42** permissions in the seed (more than claimed). |
| "**4** system roles" | Only **2** system roles exist: `SUPER_ADMIN` and `USER`. Not 4. |
| Product catalog "**SKUs**" | **No SKU field exists anywhere** in the schema or code. SKUs are not implemented. |
| Shipping "**Shippo carrier integration**" | The `shippo` package is listed as a dependency but is **never imported or called**. `carrier` is just a free-text string. There is no carrier integration. (Zones, rates, and weight estimation *are* real.) |

### ❌ Claimed as "✓ SHIPPED / WORKING" but DOES NOT EXIST

| Claim | Reality |
|---|---|
| **"Bulk product import — Excel/CSV, multi-variant, SKU auto-gen, async (BullMQ)"** | **Does not exist in the backend.** No import controller, service, or queue processor. No CSV/Excel parsing code. No xlsx/csv parsing dependency. |
| **"Bulk import UI — upload with progress & error reporting"** | **Does not exist in the frontend.** No spreadsheet upload component anywhere. The only uploads in the app are single-image presigned-URL uploads. |
| **Real product images via bulk import (spreadsheet pipe-separated URLs)** | N/A — the importer this depends on does not exist. |

> **This is the most important finding.** Bulk import is featured prominently in the report's "What's built & working" section with a "✓ SHIPPED" marker, and again as a dashboard feature. Neither the backend nor the UI for it is present. This is very likely a large part of why the client believes "so many things are remaining."

---

## 2. Content claims (marketing site)

| Claim | Verdict |
|---|---|
| "Works Seamlessly" brand logos (Google, Shopify, Deel, Slack, Zapier) present | **TRUE** (plus Salesforce) — logos are real images |
| Testimonials | **PLACEHOLDER** — all quotes/names are "Lorem Ipsum" dummy text |
| Homepage video | **PLACEHOLDER** — points at a dummy URL (`youtube.com/watch?v=XXXX`); no real video |

*(The report itself acknowledges testimonials and video as placeholders, so these are consistent with what was disclosed.)*

---

## 3. Risk / "What's not done" claims — all confirmed real

Every gap the report lists was verified to genuinely exist:

| Claimed gap | Verified |
|---|---|
| No automated tests of any kind | **TRUE** — no spec/test files, no jest/vitest config |
| 5 silently swallowed errors in the backend | **TRUE** — exactly 5 empty `catch {}` blocks: `orders.service.ts:222`, `:386`, `:752`; `public.service.ts:403`; `optional-auth.guard.ts:22` |
| Production Dockerfile uses `prisma db push` (destructive on deploy) | **TRUE — and worse.** `apps/api/Dockerfile` runs `db:push && db:seed && dev` on every container start. It re-seeds on each start and runs **dev mode in production**, not a production build. **No migrations folder exists**, so there is no safe migration path. |
| No structured logging or request tracing | **TRUE** — default Nest logger only; no pino/winston/request-id |
| No error tracking (Sentry/equivalent) | **TRUE** — none in code or dependencies |
| No rate limiting on API endpoints | **TRUE** — no throttler/rate-limit middleware |
| No auto-scaling / no infrastructure-as-code | **TRUE** — no Terraform/CloudFormation/ECS task defs in repo |
| Hardcoded account ID in CI/CD | **TRUE** — AWS account `866645635058`, region `us-east-2`, cluster `soaswag-cluster`, service names all hardcoded in `.github/workflows/docker-image.yml` |
| No uptime / health monitoring | **TRUE** — `/api/health` returns a static `{ ok: true }`; it does **not** check the database or Redis |
| Payments live-blocked (sandbox only by default) | **TRUE** — `SQUARE_ENVIRONMENT` defaults to `sandbox` |
| No real product inventory (test data only) | **TRUE** |
| No real carrier shipping rates configured | **TRUE** (and no carrier integration exists at all — see §1) |
| 4 public pages are "Coming Soon" placeholders | **TRUE** |

### Additional issues found (not in the original report)

- **CI/CD deploys the wrong branch.** The GitHub Actions workflow triggers on pushes to `main` *and* `devops`, but the checkout step is pinned to `ref: devops`. A push to `main` will still build and deploy **`devops` branch code** — a real deployment-correctness bug.
- **"No mobile responsiveness audit" is overstated as a gap.** Responsive Tailwind classes are actually used broadly (≈154 `sm:/md:/lg:` usages across ~40 files). A formal QA pass may still be wanted, but the implementation is substantially responsive — this is in better shape than the report implies.

---

## 4. Accurate "completed vs remaining" summary

### Genuinely complete and working
Auth & RBAC engine (custom roles), product catalog (categories/collections/variants/tiered pricing), the 6-stage design/order workflow, inventory ledger, shipping zones/rates/estimation, recipients, contact intake, S3 image uploads, BullMQ jobs, Square payments (sandbox + production code paths), the full admin dashboard (7 areas), the homepage, and the core storefront (shop, product detail, cart, swag-pack builder, project submission, auth pages).

### Claimed complete but actually MISSING (build these before claiming done)
1. **Bulk product import — backend** (CSV/Excel parsing, SKU auto-gen, async job). *Absent.*
2. **Bulk import UI** (spreadsheet upload with progress/errors). *Absent.*
3. **SKU support** (no SKU field in the data model).
4. **Shippo / real carrier integration** (dependency only; never wired up).

### Confirmed remaining (production hardening — all real)
Automated tests; fix the 5 swallowed errors; replace `prisma db push`/`db:seed`/`dev` in the prod Dockerfile with a production build + real migrations; structured logging + request tracing; error tracking; rate limiting; auto-scaling / infrastructure-as-code; real health checks + uptime monitoring; de-hardcode CI/CD values and fix the `ref: devops` branch bug; finalize a live payment processor; load real catalog/images/shipping rates; build the 4 "Coming Soon" pages; replace placeholder testimonials and the placeholder homepage video.

---

*This verification was performed by reading the source directly (backend `apps/api/src`, frontend `apps/web/src`, Prisma schema, seed, Dockerfiles, and CI workflow). Compiled output (`dist`) and `node_modules` were excluded.*
