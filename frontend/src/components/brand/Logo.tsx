import { cn } from "@/utils/cn";

interface MarkProps {
  className?: string;
}

/**
 * HarvestWindow mark: a window arch holding two leaves above a gold sill —
 * "the window in which the harvest happens".
 */
export function LogoMark({ className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-8 w-8 shrink-0", className)}
      role="img"
      aria-label="HarvestWindow"
    >
      <rect width="32" height="32" rx="9" fill="#163D2B" />
      <path
        d="M8.6 24V15.6a7.4 7.4 0 0 1 14.8 0V24"
        stroke="#B8CBA7"
        strokeOpacity="0.5"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M16 22.6c-4.3-1.3-6.6-4.7-6.3-9 3.8 1.2 6 4.3 6.3 9z"
        fill="#5B8C45"
      />
      <path
        d="M16.4 22.6c.5-4.2 2.8-7.1 6.6-8.2.2 4.1-2.2 7.3-6.6 8.2z"
        fill="#B8CBA7"
      />
      <path d="M16.2 22.4v3.2" stroke="#E8B64A" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8.4 26.6h15.2" stroke="#E8B64A" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="24.2" cy="8.4" r="2" fill="#E8B64A" fillOpacity="0.9" />
    </svg>
  );
}

export function Logo({
  className,
  onDark = false,
  compact = false,
}: {
  className?: string;
  onDark?: boolean;
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span
          className={cn(
            "font-display text-[17px] leading-none font-extrabold tracking-[-0.03em]",
            onDark ? "text-cream" : "text-forest-deep"
          )}
        >
          Harvest
          <span
            className={cn(
              "font-semibold",
              onDark ? "text-sage" : "text-living"
            )}
          >
            Window
          </span>
        </span>
      )}
    </span>
  );
}
