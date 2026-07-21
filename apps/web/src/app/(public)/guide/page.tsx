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
  type LucideIcon,
} from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { Section, SectionHeading } from "@/components/marketing/section";
import { CtaBand } from "@/components/marketing/cta-band";
import { cn } from "@/lib/utils";
import { SellerEarningsVisual } from "./SellerEarningsVisual";
import { FlowVisual } from "./FlowVisual";

export const metadata: Metadata = {
  title: "Platform guide — how Swaggeroo works",
  description:
    "A step-by-step technical guide to every Swaggeroo flow: buying, bulk & swag-pack orders, the design workflow, shipping, selling on the marketplace, and the admin dashboard.",
};

// ── Flow model ───────────────────────────────────────────────────────────────
type Step = {
  title: string;
  body: string;
  routes?: string[];
  note?: string;
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
      "The fastest path. For small quantities (5 or fewer) you check out and pay immediately — no quote, no waiting on a proof. Volume price breaks still apply, but there's no minimum order.",
    steps: [
      {
        title: "Browse the shop",
        routes: ["/shop"],
        body: "Search, filter and sort the catalog. Open any product to see pricing, colors and options.",
      },
      {
        title: "Pick options & quantity",
        routes: ["/shop/[slug]"],
        body: "Choose your variant and quantity. At 5 or fewer, the button reads “Add to Cart · Buy now” and the order skips the design workflow entirely.",
        note: "Logo preview and imprint/decoration unlock at 6+ items — below that you'll see “Add 6+ to preview your logo.”",
      },
      {
        title: "Add to cart → checkout",
        routes: ["/checkout"],
        body: "Adding opens a drawer with a Checkout button. Checkout requires you to be signed in, then collects your name, email and phone (pre-filled if you're logged in).",
      },
      {
        title: "Pay with card",
        body: "We create the order and a Stripe payment. Confirm your card and the order is marked paid — a receipt is emailed and the team is notified. Items are ready to produce right away.",
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
        routes: ["/shop/[slug]", "/swag-pack"],
        body: "Add bulk items (6+) from a product page, and/or build a Swag Pack in Pack Studio (below). Everything collects in one cart.",
      },
      {
        title: "Pack Studio wizard (optional)",
        routes: ["/swag-pack"],
        body: "Build a curated kit in four steps — Pick products → set Quantities (minimum 5 per pack) → add Branding (upload your logo + choose packaging) → Review totals → add the pack to your cart.",
      },
      {
        title: "Submit your project",
        routes: ["/cart", "/project-submission"],
        body: "From the cart you sign in and submit project details: contact info, needed-by date, notes and your logo. This creates a project and an order marked “Pending review.”",
      },
      {
        title: "Design & approve",
        routes: ["/dashboard/designs"],
        body: "Our team uploads mockups; you review and approve (or request revisions) — see the Design & proofing flow below. When every item is approved, the order flips to “Approved / ready for production.”",
      },
      {
        title: "Pay once approved",
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
        routes: ["/dashboard/designs"],
        body: "A designer (optionally assigned to your order) uploads a mockup with your logo placed on the product, plus any notes.",
      },
      {
        title: "Review the mockup",
        body: "You're notified by email and in-app. Open the design to review it: approve it, or request a revision with your comments (which sends it back to the designer).",
      },
      {
        title: "Revisions (if needed)",
        body: "A revision request opens a thread and returns the item to the designer. Repeat until you're happy. A proof round is also supported when an order calls for one.",
      },
      {
        title: "Ready to order",
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
        routes: ["/dashboard/recipients"],
        body: "Keep an address book of people and places. Each order can ship to one address or be split across many recipients.",
      },
      {
        title: "Plan shipments",
        routes: ["/dashboard/orders/[id]/shipping"],
        body: "Create a shipment per recipient with a service level (standard/express). Shipping can be included in the order total or paid separately.",
      },
      {
        title: "Store & release (optional)",
        routes: ["/dashboard/inventory"],
        body: "Warehouse bulk stock with us. An append-only inventory ledger tracks every receipt and allocation, so you can ship on demand later.",
      },
      {
        title: "Track it",
        routes: ["/track"],
        body: "Follow an order with its number + email, or a magic tracking link from our status emails — no account needed.",
      },
    ],
  },
  {
    id: "sell",
    icon: Store,
    audience: "For sellers & partners",
    title: "Sell on Swaggeroo (white-label store)",
    intro:
      "Launch your own branded storefront on Swaggeroo. We handle the catalog, printing and fulfillment; you curate products, add your logo and set your prices — and earn on every sale.",
    steps: [
      {
        title: "Apply to become a seller",
        routes: ["/become-a-seller"],
        body: "A two-step application: your business details (a business email is required), then your desired store URL (checked live for availability), logo, and acceptance of the seller agreement.",
      },
      {
        title: "Get approved",
        routes: ["/dashboard/partners"],
        body: "Our team reviews applications. On approval we create your seller account and your store, and email you a secure account-setup link.",
      },
      {
        title: "Set up your account",
        routes: ["/account-setup"],
        body: "Open the link, choose a username and password, and you're logged into your seller dashboard.",
      },
      {
        title: "Build your store",
        routes: ["/seller"],
        body: "In the store editor: curate products, place your logo on each, set your own price (never below our base), pick your brand colors, hero copy and CTA. Your storefront lives at /store/your-slug.",
      },
      {
        title: "Customers buy from your store",
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
      "The dashboard is permission-filtered — each person only sees what their role allows. The main areas:",
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
function RouteChip({ path }: { path: string }) {
  return (
    <code className="inline-block rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.78em] font-medium text-primary">
      {path}
    </code>
  );
}

function FlowSection({ flow }: { flow: Flow }) {
  return (
    <section id={flow.id} className="scroll-mt-24">
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:gap-12">
        {/* Left — heading, intro, steps */}
        <div>
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-primary">
              <flow.icon className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{flow.audience}</p>
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
                    <span className="z-10 flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-brand-soft text-sm font-bold text-primary tabular-nums">
                      {i + 1}
                    </span>
                    {!last ? <span aria-hidden className="w-px flex-1 bg-border" /> : null}
                  </div>
                  {/* content */}
                  <div className={cn("pb-8", last && "pb-0")}>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                      {step.routes?.map((r) => <RouteChip key={r} path={r} />)}
                    </div>
                    <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                    {step.note ? (
                      <p className="mt-2 flex max-w-xl items-start gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
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
        <div className="lg:sticky lg:top-24 lg:self-start">
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
        eyebrow="Platform guide"
        title="How Swaggeroo works, end to end"
        subtitle="A step-by-step walkthrough of every flow — from buying a single item to running your own branded store — with the exact page you land on at each step."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Platform guide", href: "/guide" },
        ]}
      >
        <Link
          href="#buy"
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-brand transition hover:bg-primary/90"
        >
          Start reading <ArrowRight className="size-4" />
        </Link>
      </PageHero>

      {/* Pick your path */}
      <Section>
        <SectionHeading
          eyebrow="Pick your path"
          title="What are you trying to do?"
          subtitle="Jump straight to the flow that matches you — or read them all top to bottom."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PATHS.map((p) => (
            <a
              key={p.id}
              href={`#${p.id}`}
              className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-primary">
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

      {/* Flows */}
      <Section muted>
        <div className="space-y-16 lg:space-y-20">
          {FLOWS.map((flow) => (
            <FlowSection key={flow.id} flow={flow} />
          ))}
        </div>
      </Section>

      {/* How sellers earn — both models + animated visual */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">How sellers earn</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.02em] text-foreground">
              Two ways to earn on every sale
            </h2>
            <p className="mt-4 max-w-lg leading-relaxed text-muted-foreground">
              Each product has a catalog <strong>base price</strong> Swaggeroo always keeps. On top of that, a
              seller's cut can be set up one of two ways — and it works the same whether you sell one item or a
              full bulk run, it just multiplies by quantity.
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
                  You keep a <strong>share of your markup</strong> — the amount you price above the base. Example:
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
                  <strong className="text-amber-600 dark:text-amber-400">$3</strong> per item — so 50 items earns
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

      {/* Roles */}
      <Section muted>
        <SectionHeading
          eyebrow="Access & roles"
          title="Who can see what"
          subtitle="The dashboard adapts to each person's role — everyone sees only the tools they need."
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

      <CtaBand
        title="That's the whole map."
        subtitle="Start wherever you are — build a pack, browse the shop, or launch your store."
        primary={{ label: "Open Pack Studio", href: "/swag-pack" }}
        secondary={{ label: "Become a Seller", href: "/become-a-seller" }}
      />
    </>
  );
}
