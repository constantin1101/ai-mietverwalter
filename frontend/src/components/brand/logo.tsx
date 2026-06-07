import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** Show only the house icon, no wordmark */
  iconOnly?: boolean;
  /** Height of the icon in px (width scales proportionally) */
  size?: number;
  className?: string;
}

/**
 * Heimio logo — uses the official PNG (1254×1254, square).
 *
 * iconOnly=true  → crops to just the house icon (top ~58% of the image)
 * iconOnly=false → full square logo with icon + "Heimio" wordmark
 */
export function Logo({ iconOnly = false, size = 32, className }: LogoProps) {
  if (iconOnly) {
    // Clip to the house icon area: show top 58% of the square image
    // Container is square at `size`; the image is scaled up so only the icon is visible.
    return (
      <div
        className={cn("relative shrink-0 select-none overflow-hidden rounded-sm", className)}
        style={{ width: size, height: size }}
      >
        <Image
          src="/heimio-logo.png"
          alt="Heimio"
          fill
          sizes={`${size}px`}
          className="object-cover object-top"
          style={{ transform: "scale(1.72) translateY(-12%)" }}
          priority
        />
      </div>
    );
  }

  // Full logo (icon + wordmark) — 1:1 square
  return (
    <Image
      src="/heimio-logo.png"
      alt="Heimio"
      width={size}
      height={size}
      className={cn("select-none shrink-0", className)}
      priority
    />
  );
}
