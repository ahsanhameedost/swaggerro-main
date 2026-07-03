"use client";

import { useEffect, useRef, type CSSProperties, type MouseEvent } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/site/logo";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "shop",
    links: [
      { label: "All products", href: "/shop" },
      { label: "Pack Studio", href: "/studio" },
      { label: "Mockup Studio", href: "/mockup" },
    ],
  },
  {
    heading: "company",
    links: [
      { label: "About", href: "/about" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Contact", href: "/contact" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    heading: "account",
    links: [
      { label: "Log in", href: "/login" },
      { label: "Sign up", href: "/signup" },
      { label: "Your account", href: "/account" },
    ],
  },
  {
    heading: "legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Shipping & Returns", href: "/shipping-returns" },
    ],
  },
];

const SOCIALS = [
  { label: "Instagram", href: "#" },
  { label: "LinkedIn", href: "#" },
  { label: "X", href: "#" },
  { label: "YouTube", href: "#" },
];

const WORDMARK = "SWAGGEROO".split("");

export function SiteFooter() {
  const root = useRef<HTMLElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = root.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      // Brand block, link columns and credits rise + fade in, staggered.
      gsap.from(el.querySelectorAll("[data-reveal]"), {
        y: 28,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.09,
        scrollTrigger: { trigger: el, start: "top 82%" },
      });

      // Hairline draws in from the left.
      gsap.from(line.current, {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 1,
        ease: "power2.out",
        scrollTrigger: { trigger: line.current, start: "top 94%" },
      });

      // Giant wordmark: letters fade + rise into place, staggered (no clip, so
      // nothing crops at the top).
      gsap.from(el.querySelectorAll(".footer-letter"), {
        yPercent: 40,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.05,
        scrollTrigger: { trigger: mark.current, start: "top 92%" },
      });

      // …and the whole wordmark drifts gently as the footer scrolls past (parallax).
      gsap.fromTo(
        mark.current,
        { yPercent: 6 },
        {
          yPercent: -6,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom bottom",
            scrub: 0.6,
          },
        },
      );
    }, root);

    return () => ctx.revert();
  }, []);

  // Track the cursor over the wordmark so the spotlight mask follows it.
  const onMarkMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = mark.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <footer ref={root} className="relative isolate overflow-hidden bg-navy text-white">
      {/* ambient brand glows */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,196,40,0.16),transparent_70%)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 bottom-10 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(33,150,255,0.18),transparent_70%)]"
      />

      {/* link grid */}
      <div className="relative mx-auto max-w-site px-6 pt-20">
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div data-reveal className="max-w-xs">
            <Logo className="h-9" />
            <p className="mt-5 text-sm leading-relaxed text-white/60">
              Custom swag your crew actually wants — designed, branded, and shipped
              anywhere from one delightfully simple platform.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
              {SOCIALS.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="group relative text-sm font-medium text-white/70 transition-colors duration-200 hover:text-white"
                >
                  {label}
                  <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-highlight transition-transform duration-300 ease-out group-hover:scale-x-100" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.heading} data-reveal aria-label={col.heading}>
              <h3 className="text-xs font-medium tracking-[0.2em] text-white/40 lowercase">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-1 text-sm text-white/70 transition-colors duration-200 hover:text-white"
                    >
                      <span className="relative">
                        {link.label}
                        <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-highlight transition-transform duration-300 ease-out group-hover:scale-x-100" />
                      </span>
                      <ArrowUpRight className="size-3.5 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* giant watermark wordmark + minimal cursor spotlight */}
      <div
        ref={mark}
        aria-hidden
        onMouseMove={onMarkMove}
        style={{ "--mx": "50%", "--my": "50%" } as CSSProperties}
        className="group/mark relative mt-16 w-full select-none will-change-transform sm:mt-20"
      >
        {/* base — faint watermark (letters animate in) */}
        <div className="flex w-full items-end justify-between px-[1.5vw] leading-[0.8]">
          {WORDMARK.map((ch, i) => (
            <span
              key={i}
              className="footer-letter inline-block font-display text-[13.5vw] font-extrabold tracking-tighter text-white/[0.06]"
            >
              {ch}
            </span>
          ))}
        </div>
        {/* spotlight — brighter copy, revealed only in a soft circle under the cursor */}
        <div className="pointer-events-none absolute inset-0 flex w-full items-end justify-between px-[1.5vw] leading-[0.8] opacity-0 transition-opacity duration-500 group-hover/mark:opacity-100 [mask-image:radial-gradient(circle_220px_at_var(--mx)_var(--my),#000_0%,transparent_68%)] [-webkit-mask-image:radial-gradient(circle_220px_at_var(--mx)_var(--my),#000_0%,transparent_68%)]">
          {WORDMARK.map((ch, i) => (
            <span
              key={i}
              className="inline-block font-display text-[13.5vw] font-extrabold tracking-tighter text-white/25"
            >
              {ch}
            </span>
          ))}
        </div>
      </div>

      {/* divider + credits */}
      <div className="relative mx-auto max-w-site px-6 pb-9">
        <div ref={line} className="h-px w-full bg-gradient-to-r from-white/25 via-white/12 to-transparent" />
        <div
          data-reveal
          className="mt-6 flex flex-col-reverse items-center justify-between gap-4 text-sm text-white/50 sm:flex-row"
        >
          <p>© {new Date().getFullYear()} Swaggeroo · All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-success" />
            Carbon-aware shipping on every order
          </p>
        </div>
      </div>
    </footer>
  );
}
