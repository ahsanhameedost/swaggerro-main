"use client";

import * as React from "react";
import {
  ArrowUpRight,
  Palette,
  PackageOpen,
  Warehouse,
  Globe,
  BadgeCheck,
  Boxes,
} from "lucide-react";
import { cx } from "@/lib/helpers";

type CardId = 1 | 2 | 3 | 4 | 5 | 6;

type FeatureCard = {
  id: CardId;
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  href?: string;
};

const CARDS: FeatureCard[] = [
  {
    id: 1,
    title: "Expert Design,\nOn the House",
    description:
      "No designer? No problem. Our team handles the visual details so your brand always looks premium.",
    Icon: Palette,
    href: "#",
  },
  {
    id: 2,
    title: "Masterful Kitting\n& Unboxing",
    description:
      "Curated kits and unboxing experiences that feel thoughtful and memorable.",
    Icon: PackageOpen,
    href: "#",
  },
  {
    id: 3,
    title: "Warehouse &\nInventory\nManagement",
    description:
      "Store, manage, and ship without juggling multiple vendors.",
    Icon: Warehouse,
    href: "#",
  },
  {
    id: 4,
    title: "The Global\nPowerhouse",
    description:
      "Customs, duties, logistics, we manage the work so you don't have to.",
    Icon: Globe,
    href: "#",
  },
  {
    id: 5,
    title: "Integrate Your\nOwn Assets",
    description:
      "Bring your existing items and vendors into one unified swag workflow.",
    Icon: Boxes,
    href: "#",
  },
  {
    id: 6,
    title: "Your Personal\nBrand Strategist",
    description:
      "With Swaggeroo You’re Never on your own-Real People are here to help you at every step.",
    Icon: BadgeCheck,
    href: "#",
  },
];

const TOP_IDS: CardId[] = [1, 2, 3];
const BOTTOM_IDS: CardId[] = [4, 5, 6];

function isTop(id: CardId) {
  return TOP_IDS.includes(id);
}

function isBottom(id: CardId) {
  return BOTTOM_IDS.includes(id);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function rowVars(activeId: CardId, ids: CardId[]) {
  const cols = ids.map((id) => (id === activeId ? "2fr" : "1fr"));
  return {
    ["--c1" as any]: cols[0],
    ["--c2" as any]: cols[1],
    ["--c3" as any]: cols[2],
  } as React.CSSProperties;
}

function Card({
  data,
  expanded,
  onEnter,
}: {
  data: FeatureCard;
  expanded: boolean;
  onEnter: () => void;
}) {
  const Icon = data.Icon;

  return (
    <div className="min-w-0">
      <a
        href={data.href ?? "#"}
        onMouseEnter={onEnter}
        onFocus={onEnter}
        className={cx(
          "group block h-[400px] w-full rounded-[14px] border bg-white p-8",
          "transition-[border-color,box-shadow,transform] duration-300 ease-out",
          expanded
            ? "border-[var(--primary)] shadow-[0_28px_55px_rgba(0,0,0,0.12)]"
            : "border-black/10 shadow-none hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]"
        )}
        aria-label={data.title.replaceAll("\n", " ")}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between">
            <Icon
              strokeWidth={1}
              className={cx(
                "h-14 w-14 transition-colors duration-300",
                expanded ? "text-(--primary)" : "text-black"
              )}
            />
          </div>

          <div
            className={cx(
              "mt-12 transition-[max-width] duration-500 ease-out",
              expanded ? "max-w-[520px]" : "max-w-[220px]"
            )}
          >
            <h5 className="whitespace-pre-line text-black">{data.title}</h5>

            <div
              className={cx(
                "mt-4 max-w-[520px] text2 overflow-hidden",
                "transition-[max-height,opacity,transform] duration-500 ease-out",
                expanded ? "max-h-40 opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-1"
              )}
              aria-hidden={!expanded}
            >
              {data.description}
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between">
            <div
              className={cx(
                "text-[20px] font-semibold transition-colors duration-300",
                expanded ? "text-[var(--primary)]" : "text-black"
              )}
            >
              {pad2(data.id)}
            </div>

            <span
              className={cx(
                "inline-flex h-14 w-14 items-center justify-center rounded-full transition-colors duration-300",
                expanded
                  ? "bg-[var(--primary)] text-white shadow-[0_10px_18px_rgba(232,33,37,0.25)]"
                  : "bg-white text-black/55 ring-1 ring-black/15"
              )}
            >
              <ArrowUpRight className="h-6 w-6" />
            </span>
          </div>
        </div>
      </a>
    </div>
  );
}

export default function StrategicAssetSection() {
  const [topHover, setTopHover] = React.useState<CardId | null>(null);
  const [bottomHover, setBottomHover] = React.useState<CardId | null>(null);

  const topActive = (topHover ?? 1) as CardId;
  const bottomActive = (bottomHover ?? 6) as CardId;

  function expandedFor(id: CardId) {
    if (isTop(id)) return topActive === id;
    return bottomActive === id;
  }

  function onEnter(id: CardId) {
    if (isTop(id)) setTopHover(id);
    if (isBottom(id)) setBottomHover(id);
  }

  const topCards = CARDS.filter((c) => isTop(c.id));
  const bottomCards = CARDS.filter((c) => isBottom(c.id));

  return (
    <section className="container">
      <div className="padding-section-md">
        <div className="grid gap-6 md:grid-cols-[520px_1fr] md:items-start">
          <h3 className="text-black">
            Elevating Swag Into a
            <br />
            Strategic Asset
          </h3>

          <p className="max-w-[520px] text1 md:justify-self-end">
            We&rsquo;re more than a vendor—we&rsquo;re your end-to-end merchandise partner. Explore
            our suite of tools designed to simplify your swag workflow.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-12 gap-6">
          {/* Top row (1–3) */}
          <div
            className="soaswag-expand-row col-span-12"
            style={rowVars(topActive, topCards.map((c) => c.id))}
            onMouseLeave={() => setTopHover(null)}
          >
            {topCards.map((c) => (
              <Card key={c.id} data={c} expanded={expandedFor(c.id)} onEnter={() => onEnter(c.id)} />
            ))}
          </div>

          {/* Bottom row (4–6) */}
          <div
            className="soaswag-expand-row col-span-12 mt-2"
            style={rowVars(bottomActive, bottomCards.map((c) => c.id))}
            onMouseLeave={() => setBottomHover(null)}
          >
            {bottomCards.map((c) => (
              <Card key={c.id} data={c} expanded={expandedFor(c.id)} onEnter={() => onEnter(c.id)} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}