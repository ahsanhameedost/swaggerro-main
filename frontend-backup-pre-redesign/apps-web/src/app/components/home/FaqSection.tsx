"use client";

import * as React from "react";
import Image, { type StaticImageData } from "next/image";
import { Accordion, AccordionItem, Button } from "@heroui/react";
import { Minus, Plus } from "lucide-react";
import { cx } from "@/lib/helpers";
import PrimaryButton from "../PrimaryButton";

type ImgSrc = string | StaticImageData;

type FaqItem = {
  key: string;
  question: string;
  answer: string;
};

const DEFAULT_FAQS: FaqItem[] = [
  {
    key: "q1",
    question: "Can you work with our existing brand guidelines?",
    answer:
      "Absolutely. Design should enrich every touchpoint. We specialize in working within your established brand ID and logo guidelines to create premium swag. While we respect your current identity, we’re always happy to offer subtle, high-impact recommendations to ensure your brand shines on every product.",
  },
  {
    key: "q2",
    question: "Do you offer custom solutions for my specific brand needs?",
    answer:
      "Yes. We tailor packs, product mixes, and distribution workflows to your goals, audience, and budget—without compromising quality.",
  },
  {
    key: "q3",
    question: "What are your minimum order quantities?",
    answer:
      "Retail orders of 5 units or fewer ship at our published price. For larger runs we build a custom Swag Pack quote (minimum 25 packs) and return pricing within 24–48 hours.",
  },
  {
    key: "q4",
    question: "How long does production and shipping take?",
    answer:
      "Once your design is approved, most orders are produced and ready to ship within 2–3 weeks. Timelines vary by product mix, quantity, and destination—your account team confirms exact dates on every quote.",
  },
  {
    key: "q5",
    question: "Can you store inventory and ship on demand?",
    answer:
      "Yes. We warehouse your branded items and fulfill to individual recipients or in bulk whenever you need them, with inventory tracked in your dashboard.",
  },
];

export default function FaqSection({
  faqs = DEFAULT_FAQS,
  imageSrc,
  imageAlt = "Support agent",
  badgeText = "Any Questions",
}: {
  faqs?: FaqItem[];
  imageSrc: ImgSrc;
  imageAlt?: string;
  badgeText?: string;
}) {
  const [expandedKeys, setExpandedKeys] = React.useState<Set<string>>(new Set(["q1"]));

  return (
    <section className="container">
      <div className="padding-section-md">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.6fr]">
          {/* Left panel */}
          <div
            className={cx(
              "rounded-[18px] border border-black/5 bg-[#eff6ff]",
              "shadow-[0_18px_50px_rgba(0,0,0,0.06)]"
            )}
          >
            <div className="px-4 py-8 sm:px-14 sm:py-16">
              <h3 className="text-black">
                Frequently Asked
                <br />
                Questions
              </h3>

              <div className="mt-8 rounded-[14px] bg-[#eff6ff] p-4 sm:p-5">
                <Accordion
                  selectedKeys={expandedKeys}
                  onSelectionChange={(keys) => {
                    const next = new Set(Array.from(keys as Set<string>));
                    setExpandedKeys(next);
                  }}
                  selectionMode="multiple"
                  variant="splitted"
                  className="gap-3"
                  itemClasses={{
                    base: "rounded-[12px] border border-black/6 bg-white shadow-none",
                    title: "text1 text-black",
                    content: "pb-4 pt-0 text2",
                    trigger: "py-3",
                    indicator: "text-black/70",
                  }}
                >
                  {faqs.map((f) => (
                    <AccordionItem
                      key={f.key}
                      aria-label={f.question}
                      title={f.question}
                      indicator={({ isOpen }) =>
                        isOpen ? <Minus className="h-4 w-4 rotate-90" /> : <Plus className="h-4 w-4" />
                      }
                    >
                      {f.answer}
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </div>

          {/* Right image */}
          <div
            className={cx(
              "relative overflow-hidden rounded-[18px] border border-black/5 bg-white",
              "shadow-[0_18px_50px_rgba(0,0,0,0.06)]"
            )}
          >
            <div className="relative h-full min-h-[520px] w-full">
              <Image
                src={imageSrc}
                alt={imageAlt}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 420px"
              />

              <div
                className={cx(
                  "absolute right-4 top-4 h-9 px-4"
                )}
              >
                <PrimaryButton href="/contact" className="h-9 px-4" text={badgeText} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}