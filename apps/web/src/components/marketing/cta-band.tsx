import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Section } from "@/components/marketing/section";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CtaLink = { label: string; href: string };

// Tilted, overlapping product cards that fan across the right side of the band.
const CARDS = [
  { src: "/products/premium-hoodie.webp", alt: "Fleece hoodie", className: "left-[2%] top-[14%] w-36 -rotate-6 sm:w-44", z: "z-20" },
  { src: "/products/insulated-tumbler.webp", alt: "Insulated tumbler", className: "right-[20%] -top-[6%] w-24 rotate-6 sm:w-28", z: "z-30" },
  { src: "/products/canvas-tote.webp", alt: "Canvas tote", className: "left-[34%] bottom-[2%] w-32 rotate-3 sm:w-36", z: "z-10" },
  { src: "/products/bluetooth-speaker.webp", alt: "Bluetooth speaker", className: "right-[2%] bottom-[10%] w-28 -rotate-3 sm:w-32", z: "z-20" },
] as const;

/** Royal-blue call-to-action band with a fanned product-photo collage. */
export function CtaBand({
  title = "Ready to send swag people actually keep?",
  subtitle = "Build your first pack in minutes. No contracts, no setup calls, no nonsense.",
  primary = { label: "Build a Pack", href: "/swag-pack" },
  secondary = { label: "Create an account", href: "/signup" },
}: {
  title?: string;
  subtitle?: string;
  primary?: CtaLink;
  secondary?: CtaLink | null;
}) {
  return (
    <Section>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[color-mix(in_oklch,var(--primary),#0d1b3d_35%)] px-6 py-12 text-primary-foreground sm:px-10 sm:py-14">
        {/* top glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_80%_at_25%_0%,rgba(255,255,255,0.18),transparent)]"
        />
        {/* faint dotted texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.4)_1px,transparent_1px)] opacity-[0.06] [background-size:18px_18px]"
        />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_0.82fr]">
          {/* copy */}
          <div className="text-center lg:text-left">
            <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-balance sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/85">{subtitle}</p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start lg:items-center justify-center">
              <Link
                href={primary.href}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 gap-2 bg-background px-6 text-base text-foreground hover:bg-background/90",
                )}
              >
                {primary.label} <ArrowRight className="size-4" />
              </Link>
              {secondary ? (
                <Link
                  href={secondary.href}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-12 border-primary-foreground/30 bg-transparent px-6 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
                  )}
                >
                  {secondary.label}
                </Link>
              ) : null}
            </div>
          </div>

          {/* product collage */}
          <div
            aria-hidden
            className="relative mx-auto h-56 w-full max-w-sm sm:h-64 lg:h-72 lg:max-w-none"
          >
            {CARDS.map((c) => (
              <div
                key={c.src}
                className={cn(
                  "absolute aspect-square overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl ring-1 ring-black/5",
                  c.className,
                  c.z,
                )}
              >
                <Image src={c.src} alt={c.alt} fill sizes="180px" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
