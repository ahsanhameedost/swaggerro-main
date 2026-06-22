"use client";

import * as React from "react";
import Image, { type StaticImageData } from "next/image";
import PrimaryButton from "../PrimaryButton";
import { cx } from "@/lib/helpers";

type ImageSrc = string | StaticImageData;

function toEmbedUrl(url: string) {
  try {
    const u = new URL(url);

    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    }

    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    }

    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}?autoplay=1`;
    }

    return url;
  } catch {
    return url;
  }
}

function VideoModal({
  open,
  videoUrl,
  onClose,
}: {
  open: boolean;
  videoUrl?: string;
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !videoUrl) return null;

  const isMp4 = videoUrl.toLowerCase().endsWith(".mp4");
  const embedUrl = isMp4 ? "" : toEmbedUrl(videoUrl);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Video"
      onMouseDown={onClose}
    >
      <div
        className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-black"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-black hover:bg-white"
        >
          Close
        </button>

        <div className="relative aspect-video w-full">
          {isMp4 ? (
            <video className="h-full w-full" src={videoUrl} controls autoPlay />
          ) : (
            <iframe
              className="h-full w-full"
              src={embedUrl}
              title="Video player"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PlayButton({
  onClick,
  ariaLabel = "Play video",
}: {
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cx(
        "group relative grid place-items-center",
        "h-16 w-16 rounded-full",
        "bg-white/85 backdrop-blur-sm",
        "shadow-[0_10px_30px_rgba(0,0,0,0.18)]",
        "hover:bg-white",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
      )}
    >
      {/* pulse rings */}
      <span className="pointer-events-none absolute inset-0 rounded-full bg-white/60 animate-playPulse" />
      <span
        className="pointer-events-none absolute inset-0 rounded-full bg-white/50 animate-playPulse"
        style={{ animationDelay: "0.9s" }}
      />

      {/* inner ring */}
      <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-black/10" />

      {/* play icon */}
      <span
        className="relative ml-[2px] block h-0 w-0"
        style={{
          borderTop: "8px solid transparent",
          borderBottom: "8px solid transparent",
          borderLeft: "12px solid var(--primary)",
        }}
      />
    </button>
  );
}

export default function VideoShowcaseSection({
  title = "Branded Gear Your People Will\nActually Keep",
  imageSrc,
  imageAlt = "Branded gear video preview",
  videoUrl,
}: {
  title?: string;
  imageSrc: ImageSrc;
  imageAlt?: string;
  ctaLabel?: string;
  videoUrl?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const titleLines = title.split("\n");

  return (
    <section className="padding-section-md">
      <div>
        <h3 className="text-center text-black">
          {titleLines.map((line, idx) => (
            <span key={idx} className="block">
              {line}
            </span>
          ))}
        </h3>

        {/* media */}
        <div className="mt-10">
          <div className="relative w-full overflow-hidden bg-black/5">
            {/* matches screenshot: wide crop */}
            <div className="relative aspect-[10/6] w-full sm:aspect-[16/6.2]">
              <Image
                src={imageSrc}
                alt={imageAlt}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 1200px"
              />

              {videoUrl ? (
                <div className="absolute inset-0 grid place-items-center">
                  <PlayButton onClick={() => setOpen(true)} />
                </div>
              ) : null}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 flex justify-center">
           <PrimaryButton href="/shop" className="h-10 px-12" text="Get Started" />
          </div>
        </div>
      </div>

      <VideoModal open={open} videoUrl={videoUrl} onClose={() => setOpen(false)} />
    </section>
  );
}