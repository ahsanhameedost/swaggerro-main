"use client";

import Image, { type StaticImageData } from "next/image";
import PrimaryButton from "../PrimaryButton";

type ImageSrc = string | StaticImageData;

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function UltimateSolutionSection({
  imageSrc,
  imageAlt = "Swaggeroo merchandise mockups",
  ctaHref = "#",
}: {
  imageSrc: ImageSrc;
  imageAlt?: string;
  ctaHref?: string;
}) {
  return (
    <section className="relative overflow-hidden">
      {/* soft left-to-right tint like screenshot */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(224, 222, 247, 0.7) 0%, rgba(255, 255, 255, 0.6) 36%, rgba(255,255,255,1) 60%)",
        }}
      />

      <div className="relative container padding-section-md">
        <div className="grid items-center gap-12 lg:grid-cols-[520px_1fr]">
          {/* Left copy */}
          <div>
            <h3 className="text-balance text-black">
              Ready to scale your
              <br />
              culture with swag from <span>Swaggeroo</span>.
            </h3>

            <p className="mt-6 max-w-[520px] text1">
              Let&apos;s create something your team actually wants to wear.
            </p>

            <div className="mt-6">
                <PrimaryButton className="h-12 px-7" text="Take Our Free Quiz" />
            </div>
          </div>

          {/* Right image */}
          <div className="relative flex min-h-[220px] items-center justify-center lg:min-h-[520px]">
            <div className="relative w-full max-w-[880px]">
              <div className="relative aspect-[16/9] w-full">
                <Image
                  src={imageSrc}
                  alt={imageAlt}
                  fill
                  priority
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 880px"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}