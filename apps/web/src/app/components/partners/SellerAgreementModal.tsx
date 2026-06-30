"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, X } from "lucide-react";
import {
  SELLER_AGREEMENT_EFFECTIVE_DATE,
  SELLER_AGREEMENT_INTRO,
  SELLER_AGREEMENT_SECTIONS,
  SELLER_AGREEMENT_VERSION,
} from "@/lib/seller-agreement";

export function SellerAgreementModal({
  open,
  onClose,
  onAccept,
}: {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Require the seller to scroll to the bottom before they can accept — a light
  // nudge that the contract was actually read.
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  useEffect(() => {
    if (open) setScrolledToEnd(false);
  }, [open]);

  if (!open) return null;

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 48) {
      setScrolledToEnd(true);
    }
  };

  return (
    <div className="swag-redesign fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-primary">
              <FileText className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">Swaggeroo Seller Agreement</h2>
              <p className="text-xs text-muted-foreground">
                Version {SELLER_AGREEMENT_VERSION} · Effective {SELLER_AGREEMENT_EFFECTIVE_DATE}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>

        <div ref={scrollRef} onScroll={handleScroll} className="space-y-5 overflow-y-auto px-6 py-5">
          <p className="text-sm leading-relaxed text-muted-foreground">{SELLER_AGREEMENT_INTRO}</p>
          {SELLER_AGREEMENT_SECTIONS.map((section) => (
            <div key={section.heading}>
              <h3 className="text-sm font-semibold text-foreground">{section.heading}</h3>
              <div className="mt-1.5 space-y-1.5">
                {section.body.map((para, i) => (
                  <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground/80">
            By clicking “I agree” you confirm you have read and accept this Agreement.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <span className="text-xs text-muted-foreground">
            {scrolledToEnd ? "Thanks for reading." : "Scroll to the end to continue."}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={!scrolledToEnd}
              className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-brand transition hover:bg-primary/90 disabled:opacity-50"
            >
              I agree
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
