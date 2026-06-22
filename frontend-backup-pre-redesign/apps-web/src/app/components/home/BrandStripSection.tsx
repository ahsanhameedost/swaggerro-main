"use client";

const BRANDS = ["Netflix", "Adobe", "Google", "Wise", "Hopetech", "Shopify", "CSA EAST"] as const;

function DoubleLine() {
  return (
    <div className="flex-1 md:block hidden">
      <div className="h-px bg-black/15" />
      <div className="mt-1 h-px bg-black/10" />
    </div>
  );
}

export default function BrandStripSection() {
  return (
    <section className="container">
      <div className="padding-section-md">
        {/* Title with side lines */}
        <div className="flex items-center gap-6">
          <DoubleLine />
          <span className="md:whitespace-nowrap text-center text1 font-normal text-black">
            The Brand Behind the World&rsquo;s Best Brands
          </span>
          <DoubleLine />
        </div>

        {/* Brand names row */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-16 gap-y-8 xl:flex-nowrap xl:justify-between">
          {BRANDS.map((b) => (
            <h4
              key={b}
              className="select-none tracking-tight text-black/60 font-geist"
            >
              {b}
            </h4>
          ))}
        </div>
      </div>
    </section>
  );
}