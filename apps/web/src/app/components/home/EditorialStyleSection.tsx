"use client";

import * as React from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { cx } from "@/lib/helpers";

type ImgSrc = string | StaticImageData;

type EditorialImages = {
  heroLeft: ImgSrc;
  capTop: ImgSrc;
  skateTall: ImgSrc;
  toteMid: ImgSrc;
  keysSmall: ImgSrc;
  catalogLeft: ImgSrc;
  kitMid: ImgSrc;
  teamRight: ImgSrc;
  bottleWide: ImgSrc;
};

function srcKey(src: ImgSrc) {
  return typeof src === "string" ? src : src.src;
}

function useShopCursor() {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const cursorRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;
    const cursor = cursorRef.current;
    if (!host || !cursor) return;

    let raf = 0;
    let x = 0;
    let y = 0;

    const setPos = () => {
      raf = 0;
      cursor.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    };

    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = window.requestAnimationFrame(setPos);
    };

    const onEnter = () => {
      host.dataset.hovering = "1";
      cursor.style.opacity = "1";
    };

    const onLeave = () => {
      host.dataset.hovering = "0";
      cursor.style.opacity = "0";
    };

    const onTileEnter = () => onEnter();
    const onTileLeave = () => onLeave();

    host.addEventListener("mousemove", onMove);
    host.addEventListener("mouseleave", onLeave);

    const tiles = Array.from(host.querySelectorAll("[data-editorial-tile]"));
    tiles.forEach((t) => {
      t.addEventListener("mouseenter", onTileEnter);
      t.addEventListener("mouseleave", onTileLeave);
    });

    return () => {
      host.removeEventListener("mousemove", onMove);
      host.removeEventListener("mouseleave", onLeave);
      tiles.forEach((t) => {
        t.removeEventListener("mouseenter", onTileEnter);
        t.removeEventListener("mouseleave", onTileLeave);
      });
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return { hostRef, cursorRef };
}

function Tile({
  src,
  alt,
  className,
  href = "#",
  sizes,
}: {
  src: ImgSrc;
  alt: string;
  className: string;
  href?: string;
  sizes?: string;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "group relative block h-full w-full min-h-0 min-w-0 overflow-hidden",
        "bg-neutral-100 ring-1 ring-black/6 shadow-[0_10px_35px_rgba(0,0,0,0.08)]",
        "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,0,0,0.12)]",
        className
      )}
      data-editorial-tile
      aria-label={`Shop Now - ${alt}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
        sizes={sizes ?? "(max-width: 1024px) 100vw, 33vw"}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/12 via-transparent to-transparent opacity-90" />
    </Link>
  );
}

export default function EditorialStyleSection({
  title = "The Editorial Style",
  subtitle = "A hand-picked collection of high-quality merchandise designed to represent your brand’s elite status.",
  images,
  shopHref = "#",
}: {
  title?: string;
  subtitle?: string;
  images: EditorialImages;
  shopHref?: string;
}) {
  const { hostRef, cursorRef } = useShopCursor();

  const mobileImages: ImgSrc[] = [
    images.heroLeft,
    images.capTop,
    images.skateTall,
    images.toteMid,
    images.keysSmall,
    images.catalogLeft,
    images.kitMid,
    images.teamRight,
    images.bottleWide,
  ];

  return (
    <section>
      <div className="padding-section-md">
        <div className="container flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <h3 className="text-black">{title}</h3>
          <p className="max-w-[560px] text1">{subtitle}</p>
        </div>

        <div
          ref={hostRef}
          className={cx(
            "relative mt-12",
            "cursor-default",
            "[&[data-hovering='1']]:cursor-none"
          )}
        >
          <div
            ref={cursorRef}
            className={cx(
              "pointer-events-none fixed left-0 top-0 z-[80]",
              "opacity-0 transition-opacity duration-150"
            )}
          >
            <div
              className={cx(
                "grid h-[150px] w-[150px] place-items-center rounded-full",
                "border border-black/20 bg-white/80 backdrop-blur-sm shadow-lg"
              )}
            >
              <div className="text-center text-[22px] font-medium leading-tight text-black">
                Shop
                <br />
                Now
              </div>
            </div>
          </div>

          {/* desktop */}
          <div
            className={cx(
              "hidden md:grid",
              "grid-cols-12 gap-2 lg:gap-3"
            )}
            style={{
              gridTemplateRows:
                "clamp(260px,24vw,380px) clamp(180px,15vw,240px) clamp(240px,22vw,340px) clamp(260px,22vw,360px) clamp(220px,18vw,300px)",
            }}
          >
            <Tile
              href={shopHref}
              src={images.heroLeft}
              alt="Editorial hero"
              className="col-start-1 col-end-7 row-start-1 row-end-4"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />

            <Tile
              href={shopHref}
              src={images.capTop}
              alt="Cap flatlay"
              className="col-start-7 col-end-10 row-start-1 row-end-2"
              sizes="(max-width: 1024px) 100vw, 25vw"
            />

            <Tile
              href={shopHref}
              src={images.skateTall}
              alt="Skate"
              className="col-start-10 col-end-13 row-start-1 row-end-3"
              sizes="(max-width: 1024px) 100vw, 25vw"
            />

            <Tile
              href={shopHref}
              src={images.toteMid}
              alt="Tote"
              className="col-start-7 col-end-10 row-start-2 row-end-4"
              sizes="(max-width: 1024px) 100vw, 25vw"
            />

            <Tile
              href={shopHref}
              src={images.keysSmall}
              alt="Keys"
              className="col-start-10 col-end-13 row-start-3 row-end-4"
              sizes="(max-width: 1024px) 100vw, 25vw"
            />

            <Tile
              href={shopHref}
              src={images.catalogLeft}
              alt="Catalog"
              className="col-start-1 col-end-5 row-start-4 row-end-5"
              sizes="(max-width: 1024px) 100vw, 34vw"
            />

            <Tile
              href={shopHref}
              src={images.kitMid}
              alt="Kit"
              className="col-start-5 col-end-9 row-start-4 row-end-5"
              sizes="(max-width: 1024px) 100vw, 34vw"
            />

            <Tile
              href={shopHref}
              src={images.teamRight}
              alt="Team"
              className="col-start-9 col-end-13 row-start-4 row-end-6"
              sizes="(max-width: 1024px) 100vw, 34vw"
            />

            <Tile
              href={shopHref}
              src={images.bottleWide}
              alt="Bottle"
              className="col-start-1 col-end-9 row-start-5 row-end-6"
              sizes="(max-width: 1024px) 100vw, 66vw"
            />
          </div>

          {/* mobile */}
          <div className="grid grid-cols-2 gap-3 md:hidden">
            {mobileImages.map((src, i) => {
              const mobileClass =
                i === 0
                  ? "col-span-2 aspect-[16/11]"
                  : i === 2 || i === 7
                    ? "aspect-[4/5]"
                    : i === 8
                      ? "col-span-2 aspect-[16/10]"
                      : "aspect-[4/3]";

              return (
                <Link
                  key={`${srcKey(src)}-${i}`}
                  href={shopHref}
                  data-editorial-tile
                  className={cx(
                    "group relative overflow-hidden rounded-[22px]",
                    "bg-neutral-100 ring-1 ring-black/6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]",
                    mobileClass
                  )}
                >
                  <Image
                    src={src}
                    alt={`Editorial ${i + 1}`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                    sizes="(max-width: 768px) 50vw, 100vw"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}