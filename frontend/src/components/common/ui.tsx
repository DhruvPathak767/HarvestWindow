import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CloudRain,
  Inbox,
  Sprout,
  Timer,
} from "lucide-react";
import type { ReadinessStatus } from "@/types";
import { READINESS_META } from "@/types";
import { cn } from "@/utils/cn";

/* --------------------------------------------------------------- Button */

type Variant = "primary" | "secondary" | "ghost" | "gold" | "inverse" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-forest-deep text-cream hover:bg-forest border border-forest-deep hover:border-forest shadow-[0_10px_24px_-16px_rgba(22,61,43,0.9)]",
  secondary:
    "bg-white text-forest-deep border border-line hover:border-living hover:text-forest",
  ghost: "bg-transparent text-forest-deep hover:bg-soft border border-transparent",
  gold: "bg-gold text-forest-deep border border-gold hover:bg-gold-soft",
  inverse: "bg-cream text-forest-deep border border-cream hover:bg-white",
  danger: "bg-white text-danger border border-danger/35 hover:bg-danger/5",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[12.5px] gap-1.5 rounded-sm",
  md: "h-10 px-4 text-[13.5px] gap-2 rounded-md",
  lg: "h-12 px-6 text-[15px] gap-2.5 rounded-md",
};

export function buttonStyles(
  variant: Variant = "primary",
  size: Size = "md",
  className?: string
) {
  return cn(
    "inline-flex items-center justify-center font-display font-semibold tracking-[-0.01em]",
    "transition-[transform,background-color,border-color,box-shadow,color] duration-200",
    "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-55",
    VARIANTS[variant],
    SIZES[size],
    className
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconRight?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  iconRight,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={buttonStyles(variant, size, className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
          aria-hidden
        />
      )}
      {children}
      {!loading && iconRight}
    </button>
  );
}

export function ButtonLink({
  to,
  variant = "primary",
  size = "md",
  className,
  children,
  iconRight,
  href,
  ...rest
}: {
  to?: string;
  href?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  iconRight?: ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const cls = buttonStyles(variant, size, className);
  const content = (
    <>
      {children}
      {iconRight}
    </>
  );
  if (href) {
    return (
      <a href={href} className={cls} {...rest}>
        {content}
      </a>
    );
  }
  return (
    <Link to={to ?? "#"} className={cls} {...(rest as object)}>
      {content}
    </Link>
  );
}

/* ----------------------------------------------------------------- Card */

export function Card({
  children,
  className,
  hover = false,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  as?: "div" | "article" | "li" | "section";
}) {
  const Tag = as;
  return (
    <Tag className={cn("hw-card", hover && "hw-card-hover", className)}>{children}</Tag>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-line px-5 py-4",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-soft text-forest">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="font-display text-[15px] leading-tight font-bold text-forest-deep">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- Badge */

export function Badge({
  children,
  tone = "neutral",
  icon,
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "forest" | "gold" | "living" | "caution" | "danger" | "earth" | "info";
  icon?: ReactNode;
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-soft text-forest-deep border-line",
    forest: "bg-forest-deep text-cream border-forest-deep",
    gold: "bg-gold-soft text-[#7a5a12] border-gold/50",
    living: "bg-[#eaf1e2] text-[#3c6428] border-living/30",
    caution: "bg-[#fbeedd] text-[#8c4f1c] border-caution/35",
    danger: "bg-[#f9e6e1] text-danger border-danger/30",
    earth: "bg-[#f2e9e2] text-earth border-earth/30",
    info: "bg-[#e6eef4] text-info border-info/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap",
        tones[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<ReadinessStatus, BadgeProps> = {
  growing: { tone: "living", icon: <Sprout className="h-3.5 w-3.5" aria-hidden /> },
  approaching: { tone: "gold", icon: <Timer className="h-3.5 w-3.5" aria-hidden /> },
  "in-window": {
    tone: "forest",
    icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />,
  },
  caution: { tone: "caution", icon: <CloudRain className="h-3.5 w-3.5" aria-hidden /> },
  passed: { tone: "earth", icon: <CalendarClock className="h-3.5 w-3.5" aria-hidden /> },
};

interface BadgeProps {
  tone?: "neutral" | "forest" | "gold" | "living" | "caution" | "danger" | "earth" | "info";
  icon?: ReactNode;
}

export function StatusBadge({
  status,
  className,
  full = false,
}: {
  status: ReadinessStatus;
  className?: string;
  full?: boolean;
}) {
  const meta = READINESS_META[status];
  const tone = STATUS_TONE[status];
  return (
    <Badge tone={tone.tone} icon={tone.icon} className={className}>
      {full ? meta.label : meta.short}
    </Badge>
  );
}

/* ------------------------------------------------------------- Progress */

export function Progress({
  value,
  className,
  tone = "forest",
  marker,
  label,
}: {
  value: number;
  className?: string;
  tone?: "forest" | "gold" | "living";
  marker?: number;
  label?: string;
}) {
  const tones = {
    forest: "bg-forest",
    gold: "bg-gold",
    living: "bg-living",
  } as const;
  const pct = Math.max(0, Math.min(1, value)) * 100;

  return (
    <div
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-soft", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
    >
      <motion.div
        className={cn("h-full rounded-full", tones[tone])}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
      {typeof marker === "number" && (
        <span
          className="absolute top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-forest-deep"
          style={{ left: `${Math.max(0, Math.min(1, marker)) * 100}%` }}
          aria-hidden
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Feedback */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("hw-shimmer rounded-sm", className)} aria-hidden />;
}

export function EmptyState({
  title,
  description,
  action,
  icon = <Inbox className="h-5 w-5" aria-hidden />,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-md border border-dashed border-line bg-white/70 p-6 text-left sm:items-center sm:text-center",
        className
      )}
    >
      <span className="grid h-11 w-11 place-items-center rounded-full bg-soft text-forest">
        {icon}
      </span>
      <div className="max-w-md">
        <p className="font-display text-[15px] font-bold text-forest-deep">{title}</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-md border border-danger/30 bg-[#fdf3f0] p-5 sm:flex-row sm:items-center"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-danger" aria-hidden />
      <div className="flex-1">
        <p className="font-display text-sm font-bold text-forest-deep">{title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- Tooltip */

export function Tooltip({
  label,
  children,
  side = "top",
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom";
}) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 w-max max-w-[220px] -translate-x-1/2 scale-95 rounded-sm bg-forest-deep px-2.5 py-1.5 text-[11.5px] leading-snug font-medium text-cream opacity-0 shadow-lg transition-all duration-150",
          "group-hover/tt:scale-100 group-hover/tt:opacity-100 group-focus-within/tt:scale-100 group-focus-within/tt:opacity-100",
          side === "top" ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]"
        )}
      >
        {label}
      </span>
    </span>
  );
}

/* -------------------------------------------------------------- Section */

export function SectionLabel({
  children,
  className,
  tone = "forest",
}: {
  children: ReactNode;
  className?: string;
  tone?: "forest" | "cream";
}) {
  return (
    <span
      className={cn(
        "hw-eyebrow inline-flex items-center gap-2 font-semibold",
        tone === "forest" ? "text-living" : "text-sage",
        className
      )}
    >
      <span
        className={cn(
          "h-px w-6",
          tone === "forest" ? "bg-living/60" : "bg-sage/60"
        )}
        aria-hidden
      />
      {children}
    </span>
  );
}

export function ArrowLink({
  to,
  children,
  className,
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group inline-flex items-center gap-1.5 text-[13px] font-semibold text-forest transition-colors hover:text-living",
        className
      )}
    >
      {children}
      <ArrowRight
        className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}


