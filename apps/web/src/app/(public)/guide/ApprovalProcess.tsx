import {
  Inbox,
  Palette,
  Eye,
  RefreshCw,
  BadgeCheck,
  CreditCard,
  Send,
  ShieldCheck,
  Store,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Plain-language explainer for the two "approval" moments on Swaggeroo:
 *  1. Order approval — the design proof on quote-first (bulk / swag-pack) orders.
 *  2. Seller approval — the become-a-seller application review.
 * Written so a first-time customer knows exactly what each status means and,
 * crucially, which steps need an action from THEM vs. which we handle.
 */

type Actor = "you" | "we";
type Tone = "amber" | "slate" | "primary" | "purple" | "green";

const TONE: Record<Tone, string> = {
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  primary: "bg-brand-soft text-primary",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  green: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
};

type Stage = {
  icon: LucideIcon;
  status: string; // the exact badge a customer sees on their order
  tone: Tone;
  actor: Actor;
  meaning: string;
};

const ORDER_STAGES: Stage[] = [
  {
    icon: Inbox,
    status: "Pending review",
    tone: "amber",
    actor: "we",
    meaning:
      "You submitted your project. We've received it and queued it for our design team. Nothing for you to do yet.",
  },
  {
    icon: Palette,
    status: "In design",
    tone: "slate",
    actor: "we",
    meaning:
      "Our designers place your logo and build a mockup for each item, so you can see exactly what you're getting.",
  },
  {
    icon: Eye,
    status: "Needs your approval",
    tone: "primary",
    actor: "you",
    meaning:
      "We email you when the mockup is ready. Open it, check the design, then either Approve it or Request a revision with your notes.",
  },
  {
    icon: RefreshCw,
    status: "Revision requested",
    tone: "purple",
    actor: "we",
    meaning:
      "If you asked for changes, your notes go straight back to the designer, who sends an updated mockup. This repeats until you're happy; there's no limit.",
  },
  {
    icon: BadgeCheck,
    status: "Approved · ready for production",
    tone: "green",
    actor: "you",
    meaning:
      "Once you've approved every item, the order locks in and payment unlocks. Nothing prints before this point.",
  },
  {
    icon: CreditCard,
    status: "Paid → in production → shipped",
    tone: "green",
    actor: "you",
    meaning:
      "You pay securely by card, we print your order and ship it, and you can follow it any time from the tracking page.",
  },
];

const SELLER_STAGES: { icon: LucideIcon; title: string; actor: Actor; body: string }[] = [
  {
    icon: Send,
    title: "You apply",
    actor: "you",
    body: "Submit your business details, pick your store's web address, upload your logo and accept the seller agreement.",
  },
  {
    icon: ShieldCheck,
    title: "We review",
    actor: "we",
    body: "Our team checks your application to keep the marketplace trustworthy. You'll hear back by email either way.",
  },
  {
    icon: BadgeCheck,
    title: "You're approved",
    actor: "we",
    body: "We create your seller account and store, then email you a secure link to finish setting up, so there's no password to remember up front.",
  },
  {
    icon: Store,
    title: "You go live",
    actor: "you",
    body: "Open the link, set your password, add products and your branding, and your storefront is live for customers.",
  },
];

function ActorBadge({ actor }: { actor: Actor }) {
  return actor === "you" ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary ring-1 ring-primary/20">
      Your turn
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
      We handle it
    </span>
  );
}

export function ApprovalProcess() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
      {/* ── Order (design proof) approval ─────────────────────────────── */}
      <div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-foreground">
            The short version: you&apos;re only asked to do two things.
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Approve your proof</strong>, then{" "}
            <strong className="text-foreground">pay</strong>. We handle everything in between, and nothing
            ever prints until you&apos;ve said yes.
          </p>
        </div>

        <ol className="mt-6 space-y-3">
          {ORDER_STAGES.map((s, i) => {
            const action = s.actor === "you";
            const Icon = s.icon;
            return (
              <li
                key={s.status}
                className={cn(
                  "rounded-2xl border bg-card p-4 shadow-sm",
                  action ? "border-primary/40 ring-1 ring-primary/15" : "border-border",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
                      TONE[s.tone],
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Step {i + 1}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
                        TONE[s.tone],
                      )}
                    >
                      {s.status}
                    </span>
                  </span>
                  <span className="ml-auto">
                    <ActorBadge actor={s.actor} />
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.meaning}</p>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ── Seller application approval ───────────────────────────────── */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-foreground">
              <Store className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Selling on Swaggeroo
              </p>
              <h3 className="font-display text-lg font-bold text-foreground">
                How seller approval works
              </h3>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Want your own branded store? Every seller is reviewed first. Here's the whole path from
            applying to your first sale.
          </p>

          <ol className="mt-5 space-y-0">
            {SELLER_STAGES.map((s, i) => {
              const last = i === SELLER_STAGES.length - 1;
              const Icon = s.icon;
              return (
                <li key={s.title} className="grid grid-cols-[2rem_1fr] gap-x-3">
                  <div className="flex flex-col items-center">
                    <span className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                      <Icon className="size-4" />
                    </span>
                    {!last ? <span aria-hidden className="w-px flex-1 bg-border" /> : null}
                  </div>
                  <div className={cn("pb-5", last && "pb-0")}>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">{s.title}</h4>
                      <ActorBadge actor={s.actor} />
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
