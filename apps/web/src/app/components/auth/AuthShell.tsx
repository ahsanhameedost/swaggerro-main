"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShieldCheck, SwatchBook, Truck } from "lucide-react";
import LogoWhite from "@/assets/swaggroo-logo.png";
import LogoMark from "@/assets/logo_new.png";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  sideTitle: string;
  sideDescription: string;
  footer?: ReactNode;
  children: ReactNode;
};

const highlights = [
  {
    icon: ShieldCheck,
    title: "Protected account access",
    description: "Secure login, email signup, and recovery flows.",
  },
  {
    icon: SwatchBook,
    title: "Catalog-first workflow",
    description: "Manage products, packs, artwork, and ordering from one place.",
  },
  {
    icon: Truck,
    title: "Operations ready",
    description: "Built for approvals, fulfillment handoff, and admin review.",
  },
];

export function AuthShell({
  eyebrow,
  title,
  description,
  sideTitle,
  sideDescription,
  footer,
  children,
}: AuthShellProps) {
  return (
    <div className="swag-redesign grid min-h-svh bg-background lg:grid-cols-5">
      {/* Brand panel — dark navy with soft transparent primary glows */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0d1b3d] p-10 text-white lg:col-span-2 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-primary/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 -bottom-24 size-80 rounded-full bg-primary/20 blur-3xl"
        />

        <div className="relative flex items-center justify-between">
          <Link href="/" aria-label="Swaggeroo home">
            <Image src={LogoWhite} alt="Swaggeroo" className="h-12 w-auto" priority />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/70 transition hover:text-white"
          >
            <ArrowLeft className="size-4" /> Home
          </Link>
        </div>

        <div className="relative space-y-6">
          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-white/55 uppercase">{eyebrow}</p>
            <p className="font-display text-3xl leading-snug font-bold tracking-[-0.02em]">
              {sideTitle}
            </p>
            <p className="max-w-md text-sm leading-relaxed text-white/65">{sideDescription}</p>
          </div>

          <div className="grid gap-3">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <Icon className="size-5" />
                  </div>
                  <div className="text-sm font-semibold">{item.title}</div>
                  <div className="mt-1 text-xs text-white/65">{item.description}</div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative text-xs text-white/55">© 2026 Swaggeroo. Swag, sorted.</p>
      </aside>

      {/* Form side — vertically centered */}
      <div className="flex flex-col lg:col-span-3">
        <header className="flex h-16 items-center px-6 lg:hidden">
          <Link href="/" aria-label="Swaggeroo home">
            <Image src={LogoMark} alt="Swaggeroo" className="h-10 w-auto" priority />
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                {eyebrow}
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
                {title}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">{description}</p>
            </div>

            {children}

            {footer ? <div className="text-sm text-muted-foreground">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
