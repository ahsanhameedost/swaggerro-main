import Image from "next/image";
import { Check, TrendingDown } from "lucide-react";

type Tile = { src: string; label: string; aspect: string };

// Real catalog photography (served from /public/products) arranged as a
// staggered bento — product-forward, not abstract dashboard art.
const LEFT: Tile[] = [
  { src: "/products/premium-hoodie.webp", label: "Fleece Hoodie", aspect: "aspect-[4/5]" },
  { src: "/products/canvas-tote.webp", label: "Canvas Tote", aspect: "aspect-square" },
];
const RIGHT: Tile[] = [
  { src: "/products/insulated-tumbler.webp", label: "Insulated Tumbler", aspect: "aspect-square" },
  { src: "/products/stainless-water-bottle.webp", label: "Water Bottle", aspect: "aspect-[4/5]" },
];

function ProductTile({ src, label, aspect }: Tile) {
  return (
    <figure className="group relative overflow-hidden rounded-[1.25rem] border border-border/70 bg-card shadow-sm transition-shadow duration-300 hover:shadow-md">
      <div className={`relative ${aspect}`}>
        <Image
          src={src}
          alt={label}
          fill
          sizes="(max-width: 1024px) 45vw, 22vw"
          className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.06]"
        />
      </div>
      <figcaption className="absolute inset-x-0 bottom-0 flex items-center bg-gradient-to-t from-black/60 via-black/15 to-transparent p-3 pt-8">
        <span className="text-xs font-semibold tracking-tight text-white">{label}</span>
      </figcaption>
    </figure>
  );
}

export function HeroShowcase() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      {/* ambient cobalt glow behind the cluster */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-[radial-gradient(58%_58%_at_72%_28%,rgba(30,64,175,0.20),transparent)] blur-2xl"
      />

      <div className="flex gap-3 sm:gap-4">
        <div className="flex w-1/2 flex-col gap-3 sm:gap-4">
          {LEFT.map((t) => (
            <ProductTile key={t.src} {...t} />
          ))}
        </div>
        {/* staggered offset breaks the rigid grid */}
        <div className="flex w-1/2 flex-col gap-3 pt-10 sm:gap-4">
          {RIGHT.map((t) => (
            <ProductTile key={t.src} {...t} />
          ))}
        </div>
      </div>

      {/* floating proof chip */}
      <div className="absolute -top-3 left-2 z-10 flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg backdrop-blur">
        <span className="flex size-4 items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="size-3" />
        </span>
        Free proof in 24h
      </div>

      {/* floating volume-price chip */}
      <div className="absolute -bottom-3 right-1 z-10 flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 shadow-[0_18px_40px_-16px_rgba(30,64,175,0.45)]">
        <span className="flex size-8 items-center justify-center rounded-xl bg-success/12 text-success">
          <TrendingDown className="size-4" />
        </span>
        <span className="leading-tight">
          <span className="block text-[0.7rem] text-muted-foreground">Volume pricing</span>
          <span className="block text-sm font-bold text-foreground tabular-nums">from $9.75/ea</span>
        </span>
      </div>
    </div>
  );
}
