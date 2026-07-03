import Form from "next/form";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Search,
  Shirt,
  Coffee,
  Backpack,
  Headphones,
  NotebookPen,
  GlassWater,
  LayoutGrid,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Section, SectionHeading } from "@/components/marketing/section";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; slug: string; description: string | null };

/** Icon per category slug; unknown slugs fall back to a neutral mark. */
const ICONS: Record<string, LucideIcon> = {
  apparel: Shirt,
  drinkware: Coffee,
  bags: Backpack,
  tech: Headphones,
  notebooks: NotebookPen,
  drinkbottles: GlassWater,
};

/** Hero photo per category slug for the feature banners. */
const BANNER_IMAGES: Record<string, string> = {
  apparel: "/banner/category-apparel.webp",
  drinkware: "/banner/category-drinkware.webp",
  bags: "/banner/category-bags.webp",
  tech: "/banner/category-tech.webp",
  notebooks: "/products/hardcover-notebook.webp",
  drinkbottles: "/products/stainless-water-bottle.webp",
};

export function CategoryBar({ categories }: { categories: Category[] }) {
  return (
    <Section>
      <SectionHeading
        align="left"
        eyebrow="Shop the catalog"
        title="Find your people's next favorite thing"
        subtitle="Search the whole catalog, or jump straight to a category."
      />

      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
        {/* search — connected square unit matching the category grid */}
        <Form
          action="/shop"
          role="search"
          className="relative flex h-14 w-full shrink-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40 lg:w-80"
        >
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            placeholder="Search products, brands & more…"
            aria-label="Search products"
            className="h-full w-full bg-transparent pr-3 pl-12 text-sm outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          <button
            type="submit"
            aria-label="Search"
            className="flex h-full w-14 shrink-0 items-center justify-center border-l border-border bg-primary text-primary-foreground transition-colors hover:bg-brand focus-visible:relative focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Search className="size-5" aria-hidden />
          </button>
        </Form>

        {/* category cells — one connected, single-row grid: flush square cells
            with divider lines, equal-width on desktop, scrollable on mobile */}
        <div className="overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-card shadow-sm lg:flex-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max divide-x divide-border lg:w-full">
            {categories.map((c) => (
              <Cell key={c.id} href={`/shop?category=${c.slug}`} icon={ICONS[c.slug] ?? Sparkles}>
                {c.name}
              </Cell>
            ))}
            <Cell href="/shop" icon={LayoutGrid}>
              All categories
            </Cell>
          </div>
        </div>
      </div>

      {/* feature banners — text left, product photo bleeding in from the right */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {categories.slice(0, 4).map((c) => (
          <Banner
            key={c.id}
            href={`/shop?category=${c.slug}`}
            title={c.name}
            description={c.description}
            image={BANNER_IMAGES[c.slug] ?? "/products/canvas-tote.webp"}
          />
        ))}
      </div>
    </Section>
  );
}

function Banner({
  href,
  title,
  description,
  image,
}: {
  href: string;
  title: string;
  description: string | null;
  image: string;
}) {
  return (
    <Link
      href={href}
      className="relative flex min-h-52 overflow-hidden rounded-2xl bg-card shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:min-h-56"
    >
      {/* product photo bleeding from the right, faded into the card */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-3/5">
        <Image
          src={image}
          alt=""
          fill
          sizes="(min-width: 640px) 40vw, 60vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-card via-card/50 via-[30%] to-transparent to-[58%]" />
      </div>

      {/* copy */}
      <div className="relative z-10 flex max-w-[64%] flex-col justify-center p-6 sm:p-7">
        <h3 className="font-display text-2xl font-bold tracking-tight text-foreground uppercase">
          {title}
        </h3>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          Shop
          <ArrowRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}

function Cell({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex h-14 shrink-0 items-center justify-center gap-2 px-5 text-sm font-medium text-foreground transition-colors lg:flex-1",
        "hover:bg-muted hover:text-primary",
        "focus-visible:relative focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 focus-visible:outline-none",
      )}
    >
      <Icon
        className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
        strokeWidth={2}
        aria-hidden
      />
      <span className="whitespace-nowrap">{children}</span>
    </Link>
  );
}
