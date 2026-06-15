"use client";

import * as React from "react";
import Image, { type StaticImageData } from "next/image";
import PrimaryButton from "../PrimaryButton";
import { cx } from "@/lib/helpers";

type ImageSrc = string | StaticImageData;

type Step = {
    title: string;
    description: string;
};

const DEFAULT_STEPS: Step[] = [
    {
        title: "Get Started",
        description:
            "Tell us what you need: event merch, onboarding kits, or custom apparel. We'll guide you from there.",
    },
    {
        title: "Approve Your Look",
        description: "We create clean mockups based on your brand. You review, suggest changes, and approve when it feels right.",
    },
    {
        title: "Pack It Your Way",
        description:
            "Choose individual items or curated kits. We handle packaging so everything looks premium and well put together.",
    },
    {
        title: "Manage It All",
        description:
            "Track orders, manage quantities, and reorder anytime without starting from scratch.",
    },
    {
        title: "Ship Anywhere",
        description:
            "We handle production and delivery locally or internationally.",
    },
    {
        title: "Earn Perks",
        description:
            "As you grow with us, you unlock better pricing and exclusive benefits.",
    },
];


function StepRow({
    index,
    step,
    active,
    onActivate,
}: {
    index: number;
    step: Step;
    active: boolean;
    onActivate: () => void;
}) {
    const num = String(index + 1).padStart(2, "0");

    return (
        <button
            type="button"
            onClick={onActivate}
            onMouseEnter={onActivate}
            className={cx(
                "group flex w-full items-start gap-5 text-left",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
                "rounded-2xl"
            )}
            aria-current={active ? "step" : undefined}
        >
            <h5
                className={cx(
                    "mt-1 grid h-12 w-12 shrink-0 place-items-center rounded-xl border",
                    active
                        ? "border-transparent bg-[var(--primary)] text-white"
                        : "border-[var(--primary)] bg-white text-black/60"
                )}
            >
                {num}
            </h5>

            <div className="min-w-0">
                <h4
                    className={cx(
                        active ? "text-black" : "text-black/55"
                    )}
                >
                    {step.title}
                </h4>

                <h5 className="mt-2 max-w-[420px] text-black/60">
                    {step.description}
                </h5>
            </div>
        </button>
    );
}

export default function HowItWorksSection({
    steps = DEFAULT_STEPS,
    imageSrc,
    imageAlt = "Swag preview",
}: {
    steps?: Step[];
    imageSrc: ImageSrc;
    imageAlt?: string;
}) {
    const [activeIdx, setActiveIdx] = React.useState(0);

    return (
        <section className="container">
            <div className="padding-section-md">
                <div className="grid gap-12 lg:grid-cols-[520px_1fr] lg:items-start">
                    {/* Left */}
                    <div>
                        <h3 className="text-black">How Swaggeroo works</h3>

                        <div className="mt-10 space-y-8">
                            {steps.map((s, i) => (
                                <StepRow
                                    key={`${s.title}-${i}`}
                                    index={i}
                                    step={s}
                                    active={i === activeIdx}
                                    onActivate={() => setActiveIdx(i)}
                                />
                            ))}
                        </div>

                        <div className="mt-10">
                            <PrimaryButton className="h-12 px-8" text="Book Demo" />
                        </div>
                    </div>

                    {/* Right */}
                    <div className="relative flex h-full min-h-[520px] items-center justify-center lg:min-h-[640px]">
                        <div className={cx("relative mx-auto w-full max-w-[620px]", "rounded-[28px]")}>
                            <div className="relative aspect-[1/1] w-full">
                                <Image
                                    src={imageSrc}
                                    alt={imageAlt}
                                    fill
                                    priority
                                    className="object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.10)]"
                                    sizes="(max-width: 1024px) 100vw, 620px"
                                />
                            </div>
                        </div>
                    </div>

                    {/* tiny center marker like screenshot */}
                    {/* <div className="mt-8 flex justify-center">
                            <div className="h-[2px] w-4 bg-fuchsia-500/70" />
                        </div> */}
                </div>
            </div>
        </section>
    );
}