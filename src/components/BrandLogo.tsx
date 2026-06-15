import Image from "next/image";

interface BrandLogoProps {
  src: string;
  alt: string;
  size?: "sm" | "md" | "lg";
  /** Wide horizontal logos (e.g. Pomegranate wordmark). */
  wide?: boolean;
  /** Black backdrop for logos designed on dark backgrounds. */
  darkBg?: boolean;
  className?: string;
}

const SIZES = { sm: 48, md: 72, lg: 96 } as const;
const WIDE_WIDTHS = { sm: 128, md: 168, lg: 200 } as const;

export function BrandLogo({
  src,
  alt,
  size = "md",
  wide = false,
  darkBg = false,
  className = "",
}: BrandLogoProps) {
  const height = SIZES[size];
  const width = wide ? WIDE_WIDTHS[size] : height;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg ${darkBg ? "bg-black" : ""} ${className}`}
      style={{ width, height }}
    >
      <Image src={src} alt={alt} fill className="object-contain" sizes={`${width}px`} />
    </div>
  );
}
