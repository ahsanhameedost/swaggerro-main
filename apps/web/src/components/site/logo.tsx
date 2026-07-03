import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Swaggeroo wordmark logo (the real asset, not a text lockup). Links home by
 * default; pass `href={null}` for a bare image. `className` sizes the image
 * (default h-8); `linkClassName` styles the wrapping link.
 */
export function Logo({
  className,
  linkClassName,
  href = "/",
  priority = false,
}: {
  className?: string;
  linkClassName?: string;
  href?: string | null;
  priority?: boolean;
}) {
  const img = (
    <Image
      src="/swaggeroo-logo.png"
      alt="Swaggeroo"
      width={1360}
      height={301}
      priority={priority}
      className={cn("h-8 w-auto", className)}
    />
  );
  if (href === null) return img;
  return (
    <Link href={href} aria-label="Swaggeroo home" className={cn("inline-flex shrink-0", linkClassName)}>
      {img}
    </Link>
  );
}
