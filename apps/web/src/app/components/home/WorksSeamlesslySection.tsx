"use client";

import * as React from "react";
import Image, { type StaticImageData } from "next/image";
import PrimaryButton from "../PrimaryButton";
import { cx } from "@/lib/helpers";

type ImgSrc = string | StaticImageData;

type OrbitLogo = {
  src: ImgSrc;
  alt: string;
  angleDeg: number;
};

function useElementSize<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [width, setWidth] = React.useState<number>(0);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}

function OrbitItem({ logo }: { logo: OrbitLogo }) {
  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={
        {
          width: "var(--logo-size)",
          height: "var(--logo-size)",
          transformOrigin: "0 0",
          transform: `rotate(${logo.angleDeg}deg) translateX(calc((var(--orbit-size) / 2) - var(--orbit-pad))) translate(-50%, -50%)`,
        } as React.CSSProperties
      }
      aria-label={logo.alt}
    >
      <div style={{ transform: `rotate(${-logo.angleDeg}deg)` }}>
        <div className="soaswag-orbit-upright">
          <div
            className={cx(
              "grid place-items-center rounded-full bg-white",
              "border border-black/5 shadow-[0_10px_28px_rgba(0,0,0,0.08)]"
            )}
            style={{ width: "var(--logo-size)", height: "var(--logo-size)" }}
          >
            <div
              className="relative"
              style={{
                width: "calc(var(--logo-size) * 0.62)",
                height: "calc(var(--logo-size) * 0.62)",
              }}
            >
              <Image src={logo.src} alt={logo.alt} fill className="object-contain" sizes="64px" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorksSeamlesslySection({
  title = "Works Seamlessly\nWhere You Do",
  description = "Swaggeroo fits right into your workflow, making brand management simple and seamless.",
  ctaLabel = "Learn More",
  ctaHref = "#",
  personImage,
  circleImage,
  personAlt = "Swaggeroo integration",
  orbitDurationSeconds = 18,
  logos = [],
}: {
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  personImage: ImgSrc;
  circleImage: ImgSrc;
  personAlt?: string;
  orbitDurationSeconds?: number;
  logos: OrbitLogo[];
}) {
  const titleLines = title.split("\n");
  const descLines = description.split("\n");

  // IMPORTANT: measure the INNER "orbit area" (inside the safe padding frame)
  const { ref: orbitAreaRef, width: orbitAreaSize } = useElementSize<HTMLDivElement>();

  return (
    <section>

      <div className="container">
        <div className="padding-section-md">
          <div className="grid items-center gap-14 lg:grid-cols-[520px_1fr]">
            {/* Left copy */}
            <div>
              <h3 className="whitespace-pre-line text-black">
                {titleLines.map((l, i) => (
                  <span key={i} className="block">
                    {l}
                  </span>
                ))}
              </h3>

              <p className="mt-6 max-w-[520px] whitespace-pre-line text1">
                {descLines.map((l, i) => (
                  <span key={i} className="block">
                    {l}
                  </span>
                ))}
              </p>

              <div className="mt-10">
                <PrimaryButton className="h-11 px-10" text={ctaLabel} href={ctaHref} />
              </div>
            </div>

            {/* Right orbit */}
            <div
              className={cx(
                "relative mx-auto w-full lg:justify-self-end",
                // smaller box on mobile, same desktop
                "max-w-[320px] sm:max-w-[420px] lg:max-w-[560px]",
                "[--logo-size:clamp(30px,9vw,38px)] sm:[--logo-size:clamp(40px,5.5vw,52px)] lg:[--logo-size:clamp(48px,4.2vw,56px)]",
                "[--orbit-pad:clamp(10px,3vw,16px)] sm:[--orbit-pad:clamp(14px,2.6vw,24px)] lg:[--orbit-pad:clamp(18px,2.2vw,58px)]",
                "[--center-size:clamp(150px,42vw,190px)] sm:[--center-size:clamp(210px,30vw,250px)] lg:[--center-size:clamp(230px,26vw,270px)]",
                "[--person-size:clamp(190px,52vw,230px)] sm:[--person-size:clamp(260px,40vw,290px)] lg:[--person-size:clamp(280px,34vw,300px)]"
              )}
              style={
                {
                  ["--orbit-duration" as any]: `${orbitDurationSeconds}s`,
                  // safe frame so logos never overflow (uses logo-size, so it stays responsive)
                  ["--orbit-safe" as any]: "calc((var(--logo-size) / 2) + 10px)",
                  // measured INNER orbit area size (after safe padding)
                  ["--orbit-size" as any]: `${orbitAreaSize || 0}px`,
                } as React.CSSProperties
              }
            >
              {/* SAFE FRAME: shrinks the orbit area on mobile so bubbles fit inside */}
              <div className="relative aspect-square w-full p-[var(--orbit-safe)]">
                {/* ORBIT AREA (this is what we measure) */}
                <div ref={orbitAreaRef} className="relative h-full w-full overflow-hidden rounded-full">
                  {/* ring line */}
                  <div className="pointer-events-none absolute inset-[var(--orbit-pad)] rounded-full border border-black/15" />

                  {/* ring image overlay (kept aligned with ring inset) */}
                  <div className="pointer-events-none absolute inset-[var(--orbit-pad)]">
                    <Image
                      src={circleImage}
                      alt=""
                      fill
                      className="object-contain opacity-50"
                      sizes="(max-width: 1024px) 100vw, 560px"
                      priority={false}
                    />
                  </div>

                  {/* orbiting logos (can extend into safe padding, but not outside overall square) */}
                  <div className="soaswag-orbit-spin absolute inset-0 overflow-visible">
                    {logos.map((logo) => (
                      <OrbitItem key={`${logo.alt}-${logo.angleDeg}`} logo={logo} />
                    ))}
                  </div>

                  {/* center soft circle */}
                  <div
                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F7EDEF]"
                    style={{
                      width: "var(--center-size)",
                      height: "var(--center-size)",
                    }}
                  />

                  {/* person image */}
                  <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{
                      width: "var(--person-size)",
                      height: "var(--person-size)",
                    }}
                  >
                    <Image
                      src={personImage}
                      alt={personAlt}
                      fill
                      priority
                      className="object-contain"
                      sizes="(max-width: 1024px) 100vw, 560px"
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* end orbit */}
          </div>
        </div>
      </div>
    </section>
  );
}