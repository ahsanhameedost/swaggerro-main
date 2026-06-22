"use client";

import * as React from "react";
import Image, { type StaticImageData } from "next/image";
import { cx } from "@/lib/helpers";

type ImgSrc = string | StaticImageData;

export default function NewsletterSubscribeBanner({
  leftDecor,
  rightDecor,
  title = "Define Your Brand’s Physical Identity",
  subtitle = "Access the 2026 Collection—a masterfully curated selection of premium essentials designed to leave a lasting mark.",
  placeholder = "Your Email Address",
  buttonLabel = "Subscribe",
  onSubmit,
}: {
  leftDecor?: ImgSrc;
  rightDecor?: ImgSrc;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  buttonLabel?: string;
  onSubmit?: (email: string) => void;
}) {
  const [email, setEmail] = React.useState("");

  return (
    <section className="container">
      <div className="padding-section-md">
        <div
          className={cx(
            "relative overflow-hidden rounded-[18px]",
            "border border-black/5 bg-[#eff6ff]",
            "shadow-[0_18px_50px_rgba(0,0,0,0.06)]"
          )}
        >
          {/* corner decor */}
          {leftDecor && (
            <div className="pointer-events-none absolute -bottom-10 -left-12 h-[260px] w-[320px] rotate-[-10deg] opacity-95 sm:-bottom-12 sm:-left-14 sm:h-[300px] sm:w-[360px]">
              <Image
                src={leftDecor}
                alt=""
                fill
                className="object-contain"
                sizes="360px"
                priority={false}
              />
            </div>
          )}

          {/* {rightDecor && (
            <div className="pointer-events-none absolute -right-12 -top-10 h-[240px] w-[340px] rotate-[10deg] opacity-95 sm:-right-16 sm:-top-12 sm:h-[280px] sm:w-[420px]">
              <Image
                src={rightDecor}
                alt=""
                fill
                className="object-contain"
                sizes="420px"
                priority={false}
              />
            </div>
          )} */}

          {/* content */}
          <div className="relative px-6 py-16 sm:px-10 sm:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <h3 className="text-black">
                {title}
              </h3>

              <p className="mx-auto mt-3 max-w-2xl text2">
                {subtitle}
              </p>

              <form
                className="mx-auto mt-8 w-full max-w-[560px]"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = email.trim();
                  if (!v) return;
                  onSubmit?.(v);
                }}
              >
                <div className="flex items-center rounded-full border border-black/10 bg-white p-1.5">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={placeholder}
                    type="email"
                    autoComplete="email"
                    className="h-10 w-full bg-transparent px-4 text2 text-black outline-none placeholder:text-black/40"
                  />

                  <button
                    type="submit"
                    className={cx(
                      "h-10 shrink-0 rounded-full px-6",
                      "bg-[var(--primary)] text-[16px] font-semibold text-white",
                      "shadow-sm hover:brightness-105 active:brightness-95"
                    )}
                  >
                    {buttonLabel}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* subtle inner border like screenshot */}
          <div className="pointer-events-none absolute inset-0 rounded-[18px] ring-1 ring-white/60" />
        </div>
      </div>
    </section>
  );
}