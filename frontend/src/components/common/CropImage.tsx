import { useState } from "react";
import { cn } from "@/utils/cn";

const FALLBACK_TONES = [
  "from-[#2c5b3c] to-[#5B8C45]",
  "from-[#3f6b34] to-[#B8CBA7]",
  "from-[#8B6548] to-[#E8B64A]",
  "from-[#1f4a33] to-[#7ba05b]",
];

function toneFor(name: string) {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return FALLBACK_TONES[sum % FALLBACK_TONES.length];
}

/**
 * Photography with a graceful, on-brand fallback: if a remote image fails
 * (or none exists for the crop) a botanical gradient plate is shown instead,
 * so no layout ever depends on a single image host.
 */
export function CropImage({
  src,
  alt,
  cropName,
  className,
  imgClassName,
  priority = false,
}: {
  src?: string | null;
  alt: string;
  cropName: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
}) {
  const [state, setState] = useState<"loading" | "ready" | "error">(
    src ? "loading" : "error"
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-soft",
        `bg-gradient-to-br ${toneFor(cropName)}`,
        className
      )}
    >
      {src && state !== "error" && (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setState("ready")}
          onError={() => setState("error")}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-500",
            state === "ready" ? "opacity-100" : "opacity-0",
            imgClassName
          )}
        />
      )}

      {state === "error" && (
        <FallbackPlate name={cropName} />
      )}

      {state === "loading" && <div className="absolute inset-0 hw-shimmer" aria-hidden />}
    </div>
  );
}

function FallbackPlate({ name }: { name: string }) {
  const initials = name
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="absolute inset-0 grid place-items-center" aria-hidden>
      <svg viewBox="0 0 120 80" className="h-full w-full opacity-25" preserveAspectRatio="none">
        <path
          d="M0 62 C 20 50, 40 70, 60 58 S 100 46, 120 56"
          stroke="#F7F5EC"
          strokeWidth="1.2"
          fill="none"
        />
        <path
          d="M0 70 C 24 60, 44 78, 66 66 S 104 56, 120 64"
          stroke="#F7F5EC"
          strokeWidth="1.2"
          fill="none"
        />
      </svg>
      <span className="relative font-display text-lg font-extrabold tracking-tight text-cream/90">
        {initials}
      </span>
      <span className="sr-only">{name}</span>
    </div>
  );
}
