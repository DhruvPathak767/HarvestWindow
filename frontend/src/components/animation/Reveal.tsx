import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

/** Shared timing scale — micro 120–220ms, entrances 250–450ms, hero 500–900ms. */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  /** Reveal once, or every time the element enters the viewport. */
  once?: boolean;
  as?: "div" | "section" | "li" | "article" | "header";
}

export function Reveal({
  children,
  className,
  delay = 0,
  y = 18,
  once = true,
  as = "div",
}: RevealProps) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as];

  if (reduced) {
    return <MotionTag className={className}>{children}</MotionTag>;
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-70px" }}
      transition={{ duration: 0.5, ease: EASE, delay }}
    >
      {children}
    </MotionTag>
  );
}

/** Clip-path mask reveal used for photography and hero panels. */
export function MaskReveal({
  children,
  className,
  delay = 0,
  duration = 0.9,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={cn("overflow-hidden", className)}
      initial={{ clipPath: "inset(0 0 100% 0)" }}
      whileInView={{ clipPath: "inset(0 0 0% 0)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

export function useMotionSafe(): boolean {
  return !useReducedMotion();
}
