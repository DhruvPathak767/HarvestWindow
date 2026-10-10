import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CountUp } from "@/components/common/CountUp";
import { cn } from "@/utils/cn";

export type MetricTone = "forest" | "gold" | "caution" | "info" | "earth" | "living";

const TONES: Record<MetricTone, { ring: string; icon: string; value: string; bar: string }> = {
  forest: {
    ring: "bg-soft text-forest",
    icon: "text-forest",
    value: "text-forest-deep",
    bar: "bg-living",
  },
  living: {
    ring: "bg-living/15 text-living",
    icon: "text-living",
    value: "text-forest-deep",
    bar: "bg-living",
  },
  gold: {
    ring: "bg-gold-soft/60 text-[#8a6415]",
    icon: "text-[#8a6415]",
    value: "text-[#7a5a12]",
    bar: "bg-gold",
  },
  caution: {
    ring: "bg-[#fbeedd] text-caution",
    icon: "text-caution",
    value: "text-[#8c4f1c]",
    bar: "bg-caution",
  },
  info: {
    ring: "bg-[#e6eef4] text-info",
    icon: "text-info",
    value: "text-info",
    bar: "bg-info",
  },
  earth: {
    ring: "bg-[#f2e9e2] text-earth",
    icon: "text-earth",
    value: "text-earth",
    bar: "bg-earth",
  },
};

export function MetricPanel({
  label,
  value,
  unit,
  icon,
  context,
  tone = "forest",
  delay = 0,
  onClick,
  decimals = 0,
  footer,
}: {
  label: string;
  value: number | string;
  unit?: string;
  icon: ReactNode;
  context?: ReactNode;
  tone?: MetricTone;
  delay?: number;
  onClick?: () => void;
  decimals?: number;
  footer?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const styles = TONES[tone] ?? TONES.forest;
  const Wrapper = onClick ? motion.button : motion.div;

  return (
    <Wrapper
      {...(onClick ? { type: "button" as const, onClick } : {})}
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: reduced ? 0 : delay }}
      className={cn(
        "hw-card group relative flex h-full flex-col overflow-hidden p-5 text-left",
        onClick && "hw-card-hover cursor-pointer"
      )}
    >
      <span
        className={cn(
          "absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100",
          styles.bar
        )}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <p className="hw-eyebrow font-semibold text-muted">{label}</p>
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-md", styles.ring)}>
          {icon}
        </span>
      </div>

      <p className={cn("hw-num mt-4 text-[34px] leading-none font-extrabold", styles.value)}>
        {typeof value === "number" ? (
          <CountUp value={value} decimals={decimals} duration={850} suffix={unit ? ` ${unit}` : ""} />
        ) : (
          <span className="text-[22px]">{value}</span>
        )}
      </p>

      {context && <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted">{context}</p>}
      {footer && <div className="mt-auto pt-3">{footer}</div>}
    </Wrapper>
  );
}
