import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Section, SectionHeading } from "@/components/marketing/section";

type CollectionCard = {
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  count: number;
};

export function OccasionCollections({ collections }: { collections: CollectionCard[] }) {
  if (!collections.length) return null;

  return (
    <Section muted>
      <SectionHeading
        eyebrow="Shop by occasion"
        title="The right swag for the moment"
        subtitle="Onboarding a new hire, running a booth, or sending a thank-you? Start from a curated collection instead of a blank page."
      />

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {collections.map((c) => (
          <Link
            key={c.slug}
            href={`/shop?collection=${c.slug}`}
            className="group relative overflow-hidden rounded-3xl bg-navy ring-1 ring-border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="relative aspect-[4/5]">
              {c.imageUrl ? (
                <Image
                  src={c.imageUrl}
                  alt=""
                  fill
                  sizes="(min-width:1024px) 24vw, (min-width:640px) 45vw, 90vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/45 to-navy/5" />

              {/* count chip */}
              <span className="absolute top-4 right-4 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white tabular-nums ring-1 ring-white/20 backdrop-blur">
                {c.count} items
              </span>

              <div className="absolute inset-x-0 bottom-0 p-5">
                <h3 className="font-display text-xl font-bold tracking-[-0.01em] text-white">{c.name}</h3>
                {c.description ? (
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-white/75">
                    {c.description}
                  </p>
                ) : null}
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white transition-transform duration-300 group-hover:gap-2.5">
                  Shop the collection <ArrowRight className="size-4" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}
