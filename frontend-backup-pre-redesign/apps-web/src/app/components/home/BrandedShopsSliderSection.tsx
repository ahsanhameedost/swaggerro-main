"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@heroui/react";
import { MoveLeft, MoveRight } from "lucide-react";
import discounts from "@/assets/shops/discounts.png";
import shop from "@/assets/shops/shop.png";
import redeem from "@/assets/shops/redeem.png";
import expert from "@/assets/shops/expert.png";
import Image, { StaticImageData } from "next/image";
import { cx } from "@/lib/helpers";

type ImageSrc = string | StaticImageData;

type SlideCard = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  disabledCta?: boolean;
  illustration: ImageSrc;
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out.length ? out : [[]];
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, [query]);

  return matches;
}

function CardShell({ card }: { card: SlideCard }) {
  return (
    <div
      className={cx(
        // ✅ mobile: auto height (no squeeze). desktop: match screenshot height.
        "w-full overflow-hidden rounded-[14px] border border-black/10 bg-white",
        "shadow-[0_12px_28px_rgba(0,0,0,0.06)]",
        "h-auto md:h-[321px]"
      )}
    >
      {/* ✅ mobile = stacked (image band on top), md+ = 2-column like desktop design */}
      <div className="flex h-full flex-col md:grid md:grid-cols-[320px_1fr]">
        {/* Illustration area */}
        <div
          className={cx(
            "relative overflow-hidden",
            // ✅ fixed band height on mobile, full height on desktop
            "h-[160px] sm:h-[180px] md:h-full",
            "bg-[radial-gradient(circle_at_30%_45%,rgba(232,33,37,0.14),rgba(255,255,255,0)_64%)]"
          )}
        >
          <div className="relative h-full w-full p-6 sm:p-8 md:p-12">
            <Image
              src={card.illustration}
              alt={card.title.replaceAll("\n", " ")}
              fill
              sizes="(max-width: 768px) 100vw, 320px"
              className="object-contain"
              priority={false}
            />
          </div>
        </div>

        {/* Copy area */}
        <div className="flex flex-1 flex-col justify-center px-6 py-6 sm:px-8 sm:py-8 md:px-10 md:py-0">
          <h5 className="whitespace-pre-line text-black">{card.title}</h5>

          <div className="mt-3 max-w-[420px] text2">{card.description}</div>

          <div className="mt-4">
            <Link
              href={card.ctaHref}
              className="text2 text-black underline underline-offset-4 hover:text-black/75"
              aria-disabled={card.disabledCta ? "true" : undefined}
              tabIndex={card.disabledCta ? -1 : undefined}
              onClick={(e) => {
                if (card.disabledCta) e.preventDefault();
              }}
            >
              {card.ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_CARDS: SlideCard[] = [
  {
    title: "Get Discounts\n& Perks",
    description: "Take advantage of our membership offerings to save & earn rewards!",
    ctaLabel: "See Membership Benefits",
    ctaHref: "#",
    illustration: discounts,
  },
  {
    title: "Start A Swag\nShop!",
    description: "Launch Your Own branded merch store while Swaggeroo manages production, inventory, and worldwide shipping.",
    ctaLabel: "Explore Shop",
    ctaHref: "#",
    disabledCta: true,
    illustration: shop,
  },
  {
    title: "Branded Redeem\nPages",
    description: "Collect sizes and shipping details through a fully branded redemption experience by Swaggeroo.",
    ctaLabel: "Learn About Redeem Pages",
    ctaHref: "#",
    illustration: redeem,
  },
  {
    title: "Talk To A Swaggeroo Expert",
    description: "Schedule a quick demo and see how Swaggeroo makes swag easy.",
    ctaLabel: "Schedule a Demo",
    ctaHref: "#",
    illustration: expert,
  },
];

export default function BrandedShopsSliderSection({
  cards = DEFAULT_CARDS,
}: {
  cards?: SlideCard[];
}) {
  // ✅ mobile: 1 card per page, md+: 2 cards per page
  const isMdUp = useMediaQuery("(min-width: 768px)");
  const perPage = isMdUp ? 2 : 1;

  const pages = React.useMemo(() => chunk(cards, perPage), [cards, perPage]);
  const totalPages = Math.max(1, pages.length);
  const [page, setPage] = React.useState(0);

  React.useEffect(() => {
    setPage((p) => Math.min(p, totalPages - 1));
  }, [totalPages]);

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <section className="container">
      <div className="padding-section-md">
        {/* header */}
        <div className="grid gap-6 md:grid-cols-2 md:items-start">
          <h3 className="text-black">
            Branded Shops, Global Scale,
            <br />
            Total Control
          </h3>

          <p className="max-w-[520px] text1 md:justify-self-end">
            We&rsquo;re more than a vendor—we&rsquo;re your end-to-end merchandise partner. Explore
            our suite of tools designed to simplify your swag workflow.
          </p>
        </div>

        {/* slider */}
        <div className="relative mt-10">
          <div className="overflow-hidden">
            <div
              className="flex w-full transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${page * 100}%)` }}
            >
              {pages.map((pageCards, idx) => (
                <div key={idx} className="w-full flex-none">
                  {/* ✅ mobile: one card per page, md+: 2 columns */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {pageCards.map((c, i) => (
                      <CardShell key={`${idx}-${i}-${c.title}`} card={c} />
                    ))}
                    {/* keep 2 cols stable only on md+ */}
                    {isMdUp && pageCards.length < 2 && <div className="hidden md:block" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* arrows (show on mobile too) */}
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between">
            <Button
              isIconOnly
              radius="full"
              variant="flat"
              isDisabled={!canPrev}
              onPress={() => setPage((p) => Math.max(0, p - 1))}
              className={cx(
                "pointer-events-auto -ml-3 h-10 w-10 bg-white",
                "border border-black/10 shadow-sm",
                canPrev ? "opacity-100" : "opacity-40"
              )}
              aria-label="Previous"
            >
              <MoveLeft className="h-5 w-5 text-black/70" />
            </Button>

            <Button
              isIconOnly
              radius="full"
              variant="flat"
              isDisabled={!canNext}
              onPress={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className={cx(
                "pointer-events-auto -mr-3 h-10 w-10 bg-white",
                "border border-black/10 shadow-sm",
                canNext ? "opacity-100" : "opacity-40"
              )}
              aria-label="Next"
            >
              <MoveRight className="h-5 w-5 text-black/70" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}