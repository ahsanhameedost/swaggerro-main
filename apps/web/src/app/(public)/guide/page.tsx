import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ShoppingBag,
  Package,
  Palette,
  Truck,
  Store,
  LayoutDashboard,
  UserCircle,
  Sparkles,
  ShieldCheck,
  Percent,
  Coins,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { Section, SectionHeading } from "@/components/marketing/section";
import { CtaBand } from "@/components/marketing/cta-band";
import { cn } from "@/lib/utils";
import { SellerEarningsVisual } from "./SellerEarningsVisual";
import { FlowVisual } from "./FlowVisual";
import { ApprovalProcess } from "./ApprovalProcess";
import { GuideToc } from "./GuideToc";

// Slim, scannable labels for the sticky side table of contents (kept shorter
// than the PATHS card labels so the rail stays narrow).
const TOC_ITEMS: { id: string; label: string }[] = [
  { id: "buy", label: "Buy a few items" },
  { id: "bulk", label: "Bulk & swag packs" },
  { id: "design", label: "Design & proofing" },
  { id: "approval", label: "How approval works" },
  { id: "shipping", label: "Shipping & tracking" },
  { id: "sell", label: "Sell on Swaggeroo" },
  { id: "admin", label: "Run the platform" },
];

export const metadata: Metadata = {
  title: "How Swaggeroo works: a simple, step-by-step guide",
  description:
    "A plain-language walkthrough of every step on Swaggeroo: buying a few items, bulk & swag-pack orders, how design approval works, shipping & tracking, and selling on the marketplace.",
};

// ── Flow model ───────────────────────────────────────────────────────────────
// `actor` tells the reader at a glance whose move each step is — the biggest
// source of confusion for first-time customers is not knowing when THEY have to
// act vs. when we're handling it.
type Actor = "you" | "we" | "auto";
type Step = {
  title: string;
  body: string;
  routes?: string[];
  note?: string;
  actor?: Actor;
};
type Flow = {
  id: string;
  icon: LucideIcon;
  audience: string;
  title: string;
  intro: string;
  steps: Step[];
};

const PATHS: { id: string; icon: LucideIcon; label: string; blurb: string }[] = [
  { id: "buy", icon: ShoppingBag, label: "Buy a few items", blurb: "Pay-now checkout for small quantities." },
  { id: "bulk", icon: Package, label: "Order in bulk / a swag pack", blurb: "Quote-first, with proofs before print." },
  { id: "design", icon: Palette, label: "Design & proofing", blurb: "How mockups get approved." },
  { id: "approval", icon: ShieldCheck, label: "How approval works", blurb: "Every status, and what you do." },
  { id: "shipping", icon: Truck, label: "Shipping & tracking", blurb: "Recipients, storage, delivery." },
  { id: "sell", icon: Store, label: "Sell on Swaggeroo", blurb: "Launch your own branded store." },
  { id: "admin", icon: LayoutDashboard, label: "Run the platform", blurb: "The admin & team dashboard." },
];

const FLOWS: Flow[] = [
  {
    id: "buy",
    icon: ShoppingBag,
    audience: "For shoppers",
    title: "Buy a few items (pay-now)",
    intro:
      "The fastest path. For small quantities (5 or fewer) you check out and pay immediately. There's no quote and no proof to wait on. Volume price breaks still apply, but there's no minimum order.",
    steps: [
      {
        title: "Browse the shop",
        actor: "you",
        routes: ["/shop"],
        body: "Search, filter and sort the catalog. Open any product to see pricing, colors and options.",
      },
      {
        title: "Pick options & quantity",
        actor: "you",
        routes: ["/shop/[slug]"],
        body: "Choose your variant and quantity. At 5 or fewer, the button reads “Add to Cart · Buy now” and the order skips the design workflow entirely.",
        note: "Logo preview and imprint/decoration unlock at 6+ items. Below that you'll see “Add 6+ to preview your logo.”",
      },
      {
        title: "Add to cart → checkout",
        actor: "you",
        routes: ["/checkout"],
        body: "Adding opens a drawer with a Checkout button. Checkout requires you to be signed in, then collects your name, email and phone (pre-filled if you're logged in).",
      },
      {
        title: "Pay with card",
        actor: "you",
        body: "Confirm your card and the order is marked paid. A receipt lands in your inbox and our team is notified. For small quantities there's no proof to wait on, so we start producing right away.",
      },
    ],
  },
  {
    id: "bulk",
    icon: Package,
    audience: "For teams & events",
    title: "Bulk orders & Swag Packs (quote-first)",
    intro:
      "Larger runs and custom swag packs go through a quote first, so we can proof your branding before anything prints. You approve the design, then pay.",
    steps: [
      {
        title: "Build your cart",
        actor: "you",
        routes: ["/shop/[slug]", "/swag-pack"],
        body: "Add bulk items (6+) from a product page, and/or build a Swag Pack in Pack Studio (below). Everything collects in one cart.",
      },
      {
        title: "Pack Studio wizard (optional)",
        actor: "you",
        routes: ["/swag-pack"],
        body: "Build a curated kit in four steps: Pick products → set Quantities (minimum 5 per pack) → add Branding (upload your logo + choose packaging) → Review totals → add the pack to your cart.",
      },
      {
        title: "Submit your project",
        actor: "you",
        routes: ["/cart", "/project-submission"],
        body: "From the cart you sign in and submit project details: contact info, needed-by date, notes and your logo. This creates a project and an order marked “Pending review.”",
      },
      {
        title: "Design & approve",
        actor: "you",
        routes: ["/dashboard/designs"],
        body: "Our team uploads mockups; you review and approve (or request revisions). This is the one place your input is needed. See “How approval works” below for exactly what to expect. When every item is approved, the order flips to “Approved / ready for production.”",
      },
      {
        title: "Pay once approved",
        actor: "you",
        routes: ["/dashboard/orders/[id]/checkout"],
        body: "Payment unlocks only after all items are approved. Pay by card (Stripe); any shipping included in the order is settled at the same time.",
      },
    ],
  },
  {
    id: "design",
    icon: Palette,
    audience: "For customers & designers",
    title: "The design & proofing workflow",
    intro:
      "Every quote-first item moves through a design workflow so you sign off on the branding before production. It lives in the dashboard and serves both the design team and the customer.",
    steps: [
      {
        title: "Mockup in progress",
        actor: "we",
        routes: ["/dashboard/designs"],
        body: "A designer (optionally assigned to your order) uploads a mockup with your logo placed on the product, plus any notes.",
      },
      {
        title: "Review the mockup",
        actor: "you",
        body: "You're notified by email and in-app. Open the design to review it: approve it, or request a revision with your comments (which sends it back to the designer).",
      },
      {
        title: "Revisions (if needed)",
        actor: "we",
        body: "A revision request opens a thread and returns the item to the designer. Repeat until you're happy; there's no limit. A proof round is also supported when an order calls for one.",
      },
      {
        title: "Ready to order",
        actor: "you",
        body: "Approving marks the item ready. Once all items are ready, the whole order becomes “Approved,” production unlocks, and you're pointed to checkout.",
      },
    ],
  },
  {
    id: "shipping",
    icon: Truck,
    audience: "For everyone",
    title: "Shipping, recipients & tracking",
    intro:
      "Ship the whole run to one address, send to many recipients, or store stock with us and release it on demand.",
    steps: [
      {
        title: "Save recipients",
        actor: "you",
        routes: ["/dashboard/recipients"],
        body: "Keep an address book of people and places. Each order can ship to one address or be split across many recipients.",
      },
      {
        title: "Plan shipments",
        actor: "you",
        routes: ["/dashboard/orders/[id]/shipping"],
        body: "Create a shipment per recipient with a service level (standard/express). Shipping can be included in the order total or paid separately.",
      },
      {
        title: "Store & release (optional)",
        actor: "we",
        routes: ["/dashboard/inventory"],
        body: "Warehouse bulk stock with us. An append-only inventory ledger tracks every receipt and allocation, so you can ship on demand later.",
      },
      {
        title: "Track it",
        actor: "you",
        routes: ["/track"],
        body: "Follow an order with its number + email, or a magic tracking link from our status emails. No account needed.",
      },
    ],
  },
  {
    id: "sell",
    icon: Store,
    audience: "For sellers & partners",
    title: "Sell on Swaggeroo (white-label store)",
    intro:
      "Launch your own branded storefront on Swaggeroo. We handle the catalog, printing and fulfillment; you curate products, add your logo and set your prices, and earn on every sale.",
    steps: [
      {
        title: "Apply to become a seller",
        actor: "you",
        routes: ["/become-a-seller"],
        body: "A two-step application: your business details (a business email is required), then your desired store URL (checked live for availability), logo, and acceptance of the seller agreement.",
      },
      {
        title: "Get approved",
        actor: "we",
        routes: ["/dashboard/partners"],
        body: "Our team reviews applications. On approval we create your seller account and your store, and email you a secure account-setup link.",
      },
      {
        title: "Set up your account",
        actor: "you",
        routes: ["/account-setup"],
        body: "Open the link, choose a username and password, and you're logged into your seller dashboard.",
      },
      {
        title: "Build your store",
        actor: "you",
        routes: ["/seller"],
        body: "In the store editor: curate products, place your logo on each, set your own price (never below our base), pick your brand colors, hero copy and CTA. Your storefront lives at /store/your-slug.",
      },
      {
        title: "Customers buy from your store",
        actor: "auto",
        routes: ["/store/[slug]", "/store/[slug]/checkout"],
        body: "Shoppers browse your branded store and check out with card (pay-now). Each paid sale records your earnings and emails a store-branded receipt; you and our team are both notified.",
      },
    ],
  },
  {
    id: "admin",
    icon: LayoutDashboard,
    audience: "For staff & operators",
    title: "Run the platform (admin dashboard)",
    intro:
      "The dashboard is permission-filtered, so each person only sees what their role allows. The main areas:",
    steps: [
      {
        title: "Catalog & orders",
        routes: ["/dashboard/catalog/products", "/dashboard/orders"],
        body: "Manage categories, collections and products; work orders through review, design, production and shipping.",
      },
      {
        title: "Fulfillment",
        routes: ["/dashboard/inventory", "/dashboard/shipments", "/dashboard/shipping"],
        body: "Track warehouse stock, per-recipient shipments, and configure shipping zones, rates and package profiles.",
      },
      {
        title: "Sellers & finance",
        routes: ["/dashboard/partners", "/dashboard/stores", "/dashboard/payouts", "/dashboard/finance"],
        body: "Approve sellers, manage white-label stores, run payouts, and review revenue, cost and profit reports.",
      },
      {
        title: "People & settings",
        routes: ["/dashboard/users", "/dashboard/permissions", "/dashboard/settings"],
        body: "Manage users and employees, edit roles & permissions, and flip platform toggles (like the logo-preview gate).",
      },
    ],
  },
];

const ROLES: { name: string; scope: string }[] = [
  { name: "Super admin", scope: "Full access to everything." },
  { name: "Customer", scope: "Their own orders, recipients, shipments and tracking." },
  { name: "Seller", scope: "Their store and its products, plus their profile." },
  { name: "Manager", scope: "Broad catalog, orders, inventory and shipping." },
  { name: "Designer", scope: "The design workflow and catalog (read)." },
  { name: "Support", scope: "Read access across the platform + contact messages." },
];

// ── Small presentational pieces ──────────────────────────────────────────────
// Show the real page you land on, but hide the developer-y dynamic segments
// (`[slug]`, `[id]`) behind a friendly "…" so it reads like a URL, not code.
function RouteChip({ path }: { path: string }) {
  const pretty = path.replace(/\[[^\]]+\]/g, "…");
  return (
    <code className="inline-block rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.78em] font-medium text-muted-foreground">
      {pretty}
    </code>
  );
}

// A glanceable "whose move is this?" tag — the single biggest clarity win for a
// first-time reader trying to understand what they'll actually have to do.
function ActorTag({ actor }: { actor: Actor }) {
  const map: Record<Actor, { label: string; className: string }> = {
    you: { label: "You do this", className: "bg-primary/10 text-primary ring-1 ring-primary/20" },
    we: { label: "We do this", className: "bg-muted text-muted-foreground ring-1 ring-border" },
    auto: { label: "Automatic", className: "bg-muted text-muted-foreground ring-1 ring-border" },
  };
  const { label, className } = map[actor];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        className,
      )}
    >
      {label}
    </span>
  );
}

function FlowSection({ flow }: { flow: Flow }) {
  return (
    <section id={flow.id} className="scroll-mt-24">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-12">
        {/* Left — heading, intro, steps */}
        <div>
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-muted text-foreground">
              <flow.icon className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {flow.audience}
              </p>
              <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-foreground sm:text-3xl">
                {flow.title}
              </h2>
            </div>
          </div>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">{flow.intro}</p>

          {/* Vertical stepper */}
          <ol className="mt-8 space-y-0">
            {flow.steps.map((step, i) => {
              const last = i === flow.steps.length - 1;
              return (
                <li key={step.title} className="relative grid grid-cols-[2.25rem_1fr] gap-x-4">
                  {/* number + connector */}
                  <div className="flex flex-col items-center">
                    <span className="z-10 flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-bold text-foreground tabular-nums">
                      {i + 1}
                    </span>
                    {!last ? <span aria-hidden className="w-px flex-1 bg-border" /> : null}
                  </div>
                  {/* content */}
                  <div className={cn("pb-8", last && "pb-0")}>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                      {step.actor ? <ActorTag actor={step.actor} /> : null}
                      {step.routes?.map((r) => <RouteChip key={r} path={r} />)}
                    </div>
                    <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                    {step.note ? (
                      <p className="mt-2 flex max-w-xl items-start gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        <span>{step.note}</span>
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Right — animated illustration (fills the space, no reading required) */}
        <div className="xl:sticky xl:top-24 xl:self-start">
          <FlowVisual variant={flow.id} />
        </div>
      </div>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function GuidePage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title="Your simple, step-by-step guide"
        subtitle="Everything on Swaggeroo, from ordering a few items to running your own store, explained in plain language. Each step tells you exactly what happens and whether it's your move or ours."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "How it works", href: "/guide" },
        ]}
      >
        <div className="flex flex-col items-center gap-3">
          <Link
            href="#buy"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-brand transition hover:bg-primary/90"
          >
            Start reading <ArrowRight className="size-4" />
          </Link>
          <span className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-primary/60" /> “You do this” = your action
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-muted-foreground/40" /> “We do this” = we handle it
            </span>
          </span>
        </div>
      </PageHero>

      {/* Pick your path */}
      <Section>
        <SectionHeading
          eyebrow="Pick your path"
          title="What are you trying to do?"
          subtitle="Jump straight to the flow that matches you, or read them all top to bottom."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PATHS.map((p) => (
            <a
              key={p.id}
              href={`#${p.id}`}
              className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                <p.icon className="size-5" />
              </span>
              <span>
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  {p.label}
                  <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{p.blurb}</span>
              </span>
            </a>
          ))}
        </div>
      </Section>

      {/* Flows + approval — sticky table of contents on the left, content on the
          right. Content is rendered in the same order as TOC_ITEMS so the
          scrollspy and anchor jumps line up (approval sits right after design). */}
      <Section muted>
        <div className="grid gap-y-16 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-x-14">
          <aside className="hidden lg:block">
            <GuideToc items={TOC_ITEMS} />
          </aside>

          <div className="space-y-16 lg:space-y-24">
            {FLOWS.slice(0, 3).map((flow) => (
              <FlowSection key={flow.id} flow={flow} />
            ))}

            {/* Approval deep-dive — the part customers ask about most */}
            <section id="approval" className="scroll-mt-24">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-muted text-foreground">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    How approval works
                  </p>
                  <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-foreground sm:text-3xl">
                    What “approval” actually means
                  </h2>
                </div>
              </div>
              <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
                On bulk and swag-pack orders we always show you a design proof before anything prints, so
                there are no surprises. Here&apos;s every status you&apos;ll see and exactly what to do at each
                one.
              </p>
              <div className="mt-8">
                <ApprovalProcess />
              </div>
              <p className="mt-8 flex max-w-2xl items-start gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                Buying just a few items (5 or fewer)? There&apos;s no proof step, so you pay and we produce right
                away.
              </p>
            </section>

            {FLOWS.slice(3).map((flow) => (
              <FlowSection key={flow.id} flow={flow} />
            ))}
          </div>
        </div>
      </Section>

      {/* How sellers earn — both models + animated visual.
          HIDDEN for now (2026-07-21): flip `false` → `true` to show it again. */}
      {false && (
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">How sellers earn</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.02em] text-foreground">
              Two ways to earn on every sale
            </h2>
            <p className="mt-4 max-w-lg leading-relaxed text-muted-foreground">
              Each product has a catalog <strong>base price</strong> Swaggeroo always keeps. On top of that, a
              seller's cut can be set up one of two ways, and it works the same whether you sell one item or a
              full bulk run; it just multiplies by quantity.
            </p>

            {/* Two model cards */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-primary">
                    <Percent className="size-4" />
                  </span>
                  <h3 className="font-display text-base font-bold text-foreground">Percentage</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  You keep a <strong>share of your markup</strong>, the amount you price above the base. Example:
                  base $10, you sell at $20 → $10 markup → you earn <strong className="text-primary">$5</strong>
                  {" "}(50%), Swaggeroo keeps $15.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/15">
                    <Coins className="size-4" />
                  </span>
                  <h3 className="font-display text-base font-bold text-foreground">Flat rate</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  You earn a <strong>fixed amount per item</strong>, set on the product. Example:{" "}
                  <strong className="text-amber-600 dark:text-amber-400">$3</strong> per item, so 50 items earns
                  you $150, no matter the price.
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm text-muted-foreground">
              Sellers see their exact earnings live while pricing each product in the store editor.
            </p>
          </div>

          {/* Animated, self-explanatory earnings visual */}
          <SellerEarningsVisual />
        </div>
      </Section>
      )}

      {/* Roles — "Who can see what".
          HIDDEN for now (2026-07-21): flip `false` → `true` to show it again. */}
      {false && (
      <Section muted>
        <SectionHeading
          eyebrow="Access & roles"
          title="Who can see what"
          subtitle="The dashboard adapts to each person's role, so everyone sees only the tools they need."
        />
        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r) => (
            <div key={r.name} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-primary">
                  <UserCircle className="size-5" />
                </span>
                <h3 className="font-display text-lg font-bold leading-tight text-foreground">{r.name}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.scope}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 flex max-w-2xl items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          Sign-in uses a secure cookie. Employees and sellers must use a business email; customers can sign up with any email.
        </p>
      </Section>
      )}

      <CtaBand
        title="That's the whole map."
        subtitle="Start wherever you are: build a pack, browse the shop, or launch your store."
        primary={{ label: "Open Pack Studio", href: "/swag-pack" }}
        secondary={{ label: "Become a Seller", href: "/become-a-seller" }}
      />
    </>
  );
}
