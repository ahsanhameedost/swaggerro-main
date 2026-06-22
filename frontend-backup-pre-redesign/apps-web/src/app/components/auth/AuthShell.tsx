"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Card, CardBody, Chip } from "@heroui/react";
import { ArrowLeft, ShieldCheck, Sparkles, SwatchBook, Truck } from "lucide-react";

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
    description: "Secure login, business email signup, and recovery flows."
  },
  {
    icon: SwatchBook,
    title: "Catalog-first workflow",
    description: "Manage products, packs, artwork, and ordering from one place."
  },
  {
    icon: Truck,
    title: "Operations ready",
    description: "Built for approvals, fulfillment handoff, and admin review."
  }
];

export function AuthShell({
  eyebrow,
  title,
  description,
  sideTitle,
  sideDescription,
  footer,
  children
}: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fafafa]">
      <div className="absolute inset-0">
        <div className="absolute left-[-90px] top-[-90px] h-64 w-64 rounded-full bg-danger/10 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-120px] h-72 w-72 rounded-full bg-danger/10 blur-3xl" />
      </div>

      <div className="container relative flex min-h-screen items-center py-8">
        <div className="grid w-full items-stretch gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="border border-danger/10 bg-[#111111] text-white shadow-2xl">
            <CardBody className="flex h-full flex-col justify-between gap-8 p-8 md:p-10">
              <div className="space-y-5">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm text-white/80 transition hover:text-white"
                >
                  <ArrowLeft className="size-4" />
                  Back to home
                </Link>

                {/* <Chip
                  variant="flat"
                  classNames={{
                    base: "border border-white/10 bg-white/10 text-white"
                  }}
                  startContent={<Sparkles className="ml-1 size-3.5" />}
                >
                  {eyebrow}
                </Chip> */}

                <div className="space-y-4">
                  <h1 className="max-w-xl text-4xl font-bold leading-tight md:text-5xl">{sideTitle}</h1>
                  <p className="max-w-xl text-base text-white/70 md:text-lg">{sideDescription}</p>
                </div>
              </div>

              <div className="grid gap-3">
                {highlights.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                    >
                      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                        <Icon className="size-5" />
                      </div>
                      <div className="text-base font-semibold">{item.title}</div>
                      <div className="mt-1 text-sm text-white/65">{item.description}</div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Card className="border border-divider bg-white shadow-xl">
            <CardBody className="flex justify-center p-6 md:p-10">
              <div className="w-full max-w-lg space-y-6">
                <div className="space-y-2">
                  <Chip
                    variant="flat"
                    classNames={{
                      base: "border border-danger/10 bg-danger/5 text-danger"
                    }}
                  >
                    {title}
                  </Chip>
                  <h2 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
                  <p className="text-sm leading-6 text-foreground/60">{description}</p>
                </div>

                {children}

                {footer ? <div className="text-sm text-foreground/65">{footer}</div> : null}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </main>
  );
}
