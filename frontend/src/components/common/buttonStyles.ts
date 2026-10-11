import { cn } from "@/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "gold" | "inverse" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-forest-deep text-cream hover:bg-forest border border-forest-deep hover:border-forest shadow-[0_10px_24px_-16px_rgba(22,61,43,0.9)]",
  secondary:
    "bg-white text-forest-deep border border-line hover:border-living hover:text-forest",
  ghost: "bg-transparent text-forest-deep hover:bg-soft border border-transparent",
  gold: "bg-gold text-forest-deep border border-gold hover:bg-gold-soft",
  inverse: "bg-cream text-forest-deep border border-cream hover:bg-white",
  danger: "bg-white text-danger border border-danger/35 hover:bg-danger/5",
};

export const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[12.5px] gap-1.5 rounded-sm",
  md: "h-10 px-4 text-[13.5px] gap-2 rounded-md",
  lg: "h-12 px-6 text-[15px] gap-2.5 rounded-md",
};

export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string
) {
  return cn(
    "inline-flex items-center justify-center font-display font-semibold tracking-[-0.01em]",
    "transition-[transform,background-color,border-color,box-shadow,color] duration-200",
    "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-55",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className
  );
}
