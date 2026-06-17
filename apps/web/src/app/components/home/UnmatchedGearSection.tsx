"use client";

import * as React from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { MoveLeft, MoveRight } from "lucide-react";
import packwise from "@/assets/gear/packwise.png";
import willow from "@/assets/gear/willow.png";
import spotify from "@/assets/gear/spotify.png";
import airbase from "@/assets/gear/airbase.png";
import PrimaryButton from "../PrimaryButton";
import { cx } from "@/lib/helpers";

type ImageSrc = string | StaticImageData;

type GearCard = {
  title: string;
  image: ImageSrc;
};

type TabKey =
  | "Onboarding"
  | "Client Gifts"
  | "Events"
  | "Birthdays"
  | "Anniversaries"
  | "In The Wild"

type TabDef = {
  key: TabKey;
  label: string;
  tintClass: string;
};

const TABS: TabDef[] = [
  { key: "Onboarding", label: "Onboarding", tintClass: "bg-[#F3EDE7]" },
  { key: "Client Gifts", label: "Client Gifts", tintClass: "bg-[#EAF3FF]" },
  { key: "Events", label: "Events", tintClass: "bg-[#E6F6EF]" },
  { key: "Birthdays", label: "Birthdays", tintClass: "bg-[#F8E7E7]" },
  { key: "Anniversaries", label: "Anniversaries", tintClass: "bg-[#F3E6F2]" },
  { key: "In The Wild", label: "In The Wild", tintClass: "bg-[#EDECFB]" },
];

const DATA: Record<TabKey, GearCard[]> = {
  Onboarding: [
    { title: "Packwise", image: packwise },
    { title: "Willow", image: willow },
    { title: "Spotify", image: spotify },
    { title: "Airbase", image: airbase },
    { title: "Notion", image: packwise },
    { title: "Slack", image: willow },
    { title: "Figma", image: spotify },
  ],
  "Client Gifts": [
    { title: "Canva", image: packwise },
    { title: "Google", image: willow },
    { title: "Shopify", image: spotify },
    { title: "Netflix", image: airbase },
    { title: "Notion", image: packwise },
    { title: "Slack", image: willow },
  ],
  Events: [
    { title: "Figma", image: packwise },
    { title: "Packwise", image: willow },
    { title: "Duolingo", image: spotify },
    { title: "Fresh Books", image: airbase },
    { title: "Google", image: packwise },
    { title: "Canva", image: willow },
  ],
  "Birthdays": [
    { title: "Duolingo", image: packwise },
    { title: "Fresh Books", image: willow },
    { title: "Packwise", image: spotify },
    { title: "Shopify", image: airbase },
    { title: "Notion", image: packwise },
    { title: "Slack", image: willow },
  ],
  Anniversaries: [
    { title: "Fresh Books", image: packwise },
    { title: "Packwise", image: willow },
    { title: "Duolingo", image: spotify },
    { title: "Notion", image: airbase },
    { title: "Figma", image: packwise },
    { title: "Google", image: willow },
  ],
  "In The Wild": [
    { title: "Packwise", image: packwise },
    { title: "Duolingo", image: willow },
    { title: "Fresh Books", image: spotify },
    { title: "Slack", image: airbase },
    { title: "Figma", image: packwise },
    { title: "Shopify", image: willow },
  ],
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out.length ? out : [[]];
}

function useMediaQuery(query: string) {
  return React.useSyncExternalStore(
    (onStoreChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

function CardTile({ card }: { card: GearCard }) {
  return (
    <div
      className={cx(
        "group relative overflow-hidden rounded-[18px]",
        "bg-black/5 shadow-[0_12px_30px_rgba(0,0,0,0.08)]"
      )}
    >
      <div className="relative aspect-[4/5] w-full">
        <Image
          src={card.image}
          alt={card.title}
          fill
          className={cx(
            "object-cover",
            "transition-transform duration-300 ease-out",
            "group-hover:scale-[1.04]"
          )}
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={false}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-5 bottom-5">
        <div
          className={cx(
            "h-10 rounded-full px-5",
            "flex items-center justify-center",
            "bg-white/65 text-black/85",
            "backdrop-blur-sm",
            "transition-all duration-300",
            "group-hover:bg-white/100"
          )}
        >
          <span className="text1">{card.title}</span>
        </div>
      </div>
    </div>
  );
}

export default function UnmatchedGearSection({
  initialTab = "Onboarding",
  perPage = 3,
}: {
  initialTab?: TabKey;
  perPage?: number;
}) {
  const [activeTab, setActiveTab] = React.useState<TabKey>(initialTab);

  const [pageByTab, setPageByTab] = React.useState<Record<TabKey, number>>(() => {
    const init = {} as Record<TabKey, number>;
    for (const t of TABS) init[t.key] = 0;
    return init;
  });

  const isMdUp = useMediaQuery("(min-width: 768px)");
  const perPageEffective = isMdUp ? perPage : 1;

  const items = DATA[activeTab] ?? [];
  const pages = React.useMemo(
    () => chunk(items, perPageEffective),
    [items, perPageEffective]
  );
  const totalPages = Math.max(1, pages.length);

  const page = clamp(pageByTab[activeTab] ?? 0, 0, totalPages - 1);

  React.useEffect(() => {
    if ((pageByTab[activeTab] ?? 0) !== page) {
      setPageByTab((p) => ({ ...p, [activeTab]: page }));
    }
  }, [activeTab, totalPages, perPageEffective, page, pageByTab]);

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  function goPrev() {
    setPageByTab((prev) => ({
      ...prev,
      [activeTab]: clamp(page - 1, 0, totalPages - 1),
    }));
  }

  function goNext() {
    setPageByTab((prev) => ({
      ...prev,
      [activeTab]: clamp(page + 1, 0, totalPages - 1),
    }));
  }

  return (
    <section className="container">
      <div className="padding-section-md">
        {/* Header row */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-[520px]">
            <h3 className="text-black">
              Unmatched Gear for
              <br />
              Every Milestone
            </h3>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            {TABS.map((t) => {
              const active = t.key === activeTab;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={cx(
                    "h-9 rounded-full px-4 text2 transition-colors",
                    active ? "bg-black text-white" : cx(t.tintClass, "text-black/85"),
                    "hover:bg-black hover:text-white"
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Slider */}
        <div className="relative mt-12">
          <div className="overflow-hidden">
            <div
              className={cx("flex w-full", "transition-transform duration-500 ease-out")}
              style={{ transform: `translateX(-${page * 100}%)` }}
            >
              {pages.map((pageCards, idx) => (
                <div key={idx} className="w-full flex-none">
                  <div className={cx("grid gap-5", isMdUp ? "md:grid-cols-3" : "grid-cols-1")}>
                    {pageCards.map((c, i) => (
                      <CardTile key={`${c.title}-${idx}-${i}`} card={c} />
                    ))}

                    {/* keep 3-card layout stable only on md+ */}
                    {isMdUp &&
                      pageCards.length < 3 &&
                      Array.from({ length: 3 - pageCards.length }).map((_, j) => (
                        <div key={`spacer-${idx}-${j}`} className="hidden md:block" />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls (✅ show on mobile too) */}
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between">
            <button
              type="button"
              onClick={goPrev}
              disabled={!canPrev}
              className={cx(
                "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm",
                "-ml-3 md:-ml-6",
                "transition-opacity hover:opacity-100",
                canPrev ? "opacity-95" : "opacity-40"
              )}
              aria-label="Previous"
            >
              <MoveLeft className="h-5 w-5 text-black/70" />
            </button>

            <button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              className={cx(
                "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm",
                "-mr-3 md:-mr-6",
                "transition-opacity hover:opacity-100",
                canNext ? "opacity-95" : "opacity-40"
              )}
              aria-label="Next"
            >
              <MoveRight className="h-5 w-5 text-black/70" />
            </button>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <PrimaryButton href="/contact" className="h-12 px-7" text="Get Free Sample Pack" />

          <Link
            href="#"
            className={cx(
              "inline-flex h-12 items-center justify-center rounded-full px-7",
              "border border-black/15 bg-white text-[16px] font-semibold text-black/80",
              "hover:bg-black hover:text-white transition-colors"
            )}
          >
            Shop Now
          </Link>
        </div>
      </div>
    </section>
  );
}