"use client";

import Image, { StaticImageData } from "next/image";
import React, { CSSProperties, useMemo } from "react";

type ImageSrc = string | StaticImageData;

export type HeroSliderImage = {
  src: ImageSrc;
  alt: string;
};

type HeroCurvedSliderProps = {
  images: HeroSliderImage[];
  durationSeconds?: number;
  hideCurveOnMobile?: boolean;
  className?: string;
};

export default function HeroCurvedSlider({
  images,
  durationSeconds = 110,
  hideCurveOnMobile = true,
  className,
}: HeroCurvedSliderProps) {

  const duplicated = useMemo(() => {
    if (!images?.length) return [];
    return [...images, ...images];
  }, [images]);

  const marqueeStyle = {
    ["--duration" as any]: `${durationSeconds}s`,
  } satisfies CSSProperties;

  if (!images?.length) return null;

  return (
    <>
      <div
        className={[
          "relative left-1/2 w-screen -translate-x-1/2 overflow-hidden",
          "overflow-x-clip",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="relative h-[240px] sm:h-[280px] md:h-[650px] w-full overflow-hidden mt-10 md:mt-[80px]">
          <div className="soaswag-marquee h-full w-full" style={marqueeStyle}>
            <div className="soaswag-marquee-track h-full">
              {duplicated.map((img, idx) => (
                <button
                  key={`${img.src}-${idx}`}
                  type="button"
                  className={[
                    "soaswag-tile relative h-full flex-none select-none p-0",
                    "border-0 bg-transparent",
                    // responsive widths: 5 tiles on large screens (20vw each)
                    "w-[70vw] sm:w-[45vw] md:w-[30vw] lg:w-[20vw]",
                  ].join(" ")}
                  aria-label={`${img.alt}`}
                >
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    sizes="(max-width: 640px) 70vw, (max-width: 1024px) 30vw, 20vw"
                    className="block object-cover"
                    priority={idx < images.length}
                  />
                </button>
              ))}
            </div>
          </div>

          <CurveOverlay
            className={[
              "pointer-events-none absolute inset-x-0 top-0 z-10",
              hideCurveOnMobile ? "hidden md:block" : "block",
            ].join(" ")}
          />
        </div>
      </div>
    </>
  );
}

function CurveOverlay({ className }: { className?: string }) {
  return (
    <svg
      className={["w-full h-[160px] md:h-[360px]", className].filter(Boolean).join(" ")}
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* Bigger/taller curve than before */}
      <path d="M0 0H1440V165C1120 330 320 330 0 165V0Z" fill="white" />
    </svg>
  );
}