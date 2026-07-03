// Page-wide ambient backdrop: the hero's blue + accent-yellow wash, fixed so it
// spans the whole landing page, with a subtle film grain laid over everything.

const GRADIENT =
  "radial-gradient(48% 60% at 50% -6%, rgba(33,150,255,0.26), transparent 72%)," +
  "radial-gradient(36% 44% at 84% 6%, rgba(255,196,40,0.18), transparent 70%)," +
  "radial-gradient(42% 55% at 10% 20%, rgba(33,150,255,0.14), transparent 72%)," +
  "radial-gradient(38% 48% at 88% 62%, rgba(255,196,40,0.12), transparent 72%)," +
  "radial-gradient(44% 52% at 18% 88%, rgba(33,150,255,0.13), transparent 72%)," +
  "radial-gradient(32% 42% at 70% 96%, rgba(255,196,40,0.09), transparent 72%)";

// fractal-noise grain as an inline SVG data URI (no asset needed)
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function AmbientBackdrop() {
  return (
    <>
      {/* colour wash — behind all content */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 blur-[64px]"
        style={{ backgroundImage: GRADIENT }}
      />
      {/* film grain — above content, very subtle, clicks pass through */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-30 opacity-[0.04] mix-blend-soft-light"
        style={{ backgroundImage: GRAIN, backgroundSize: "220px 220px" }}
      />
    </>
  );
}
