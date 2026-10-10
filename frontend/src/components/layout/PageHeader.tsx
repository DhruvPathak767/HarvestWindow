import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { IMAGES_3D } from "@/data/mock/renders";
import { cn } from "@/utils/cn";

export interface HeaderMeta {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  meta,
  actions,
  aside,
  className,
  variant = "default",
  heroImage = IMAGES_3D.island,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: HeaderMeta[];
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
  variant?: "default" | "hero";
  heroImage?: string;
}) {
  const reduced = useReducedMotion();

  if (variant === "hero") {
    return (
      <header
        className={cn(
          "relative isolate overflow-hidden rounded-[28px] bg-night-3 px-6 py-7 text-cream shadow-[0_40px_90px_-50px_rgba(6,20,13,0.95)] sm:px-8 sm:py-9",
          className
        )}
      >
        <div aria-hidden className="hw-grain-light pointer-events-none absolute inset-0 -z-10 opacity-60" />
        <div
          aria-hidden
          className="hw-drift pointer-events-none absolute -top-32 -right-10 -z-10 h-[420px] w-[420px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(232,182,74,0.3), transparent 66%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 left-1/4 -z-10 h-[360px] w-[360px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(91,140,69,0.35), transparent 66%)" }}
        />

        {/* floating 3D render */}
        <motion.div
          aria-hidden
          initial={reduced ? false : { opacity: 0, scale: 0.85, rotate: -4 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.1 }}
          className="pointer-events-none absolute top-1/2 right-[-6%] -z-10 hidden aspect-square w-[46%] max-w-[440px] -translate-y-1/2 md:block lg:right-[-2%]"
        >
          <div className="hw-spin-slow absolute inset-[2%] rounded-full border border-dashed border-white/15" />
          <img
            src={heroImage}
            alt=""
            className="hw-float-slow hw-mask-soft absolute inset-[6%] h-[88%] w-[88%] rounded-full object-cover"
          />
        </motion.div>

        <div className="relative max-w-2xl">
          {eyebrow && (
            <motion.p
              initial={reduced ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="hw-eyebrow font-semibold text-gold"
            >
              {eyebrow}
            </motion.p>
          )}
          <motion.h1
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.05 }}
            className="mt-3 font-display text-[clamp(30px,3.8vw,48px)] leading-[1.02] font-extrabold tracking-[-0.04em] text-cream"
          >
            {title}
          </motion.h1>
          {subtitle && (
            <motion.p
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="mt-3 max-w-xl text-[14px] leading-relaxed text-sage/80"
            >
              {subtitle}
            </motion.p>
          )}

          {meta && meta.length > 0 && (
            <motion.dl
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 flex flex-wrap items-center gap-2"
            >
              {meta.map((m) => (
                <div
                  key={m.label}
                  className="hw-hud flex items-center gap-2 rounded-full py-1.5 pr-3.5 pl-3"
                >
                  {m.icon && <span className="text-gold">{m.icon}</span>}
                  <dt className="text-[10.5px] tracking-wide text-sage/70 uppercase">{m.label}</dt>
                  <dd className="font-display text-[12.5px] font-semibold text-cream">{m.value}</dd>
                </div>
              ))}
            </motion.dl>
          )}

          {(actions || aside) && (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28 }}
              className="mt-6 flex flex-wrap items-center gap-3"
            >
              {actions}
              {aside}
            </motion.div>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="hw-eyebrow mb-2 font-semibold text-living"
            >
              {eyebrow}
            </motion.p>
          )}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.04 }}
            className="font-display text-[26px] leading-[1.1] font-extrabold tracking-[-0.03em] text-forest-deep sm:text-[30px]"
          >
            {title}
          </motion.h1>
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted"
            >
              {subtitle}
            </motion.p>
          )}
        </div>
        {(actions || aside) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.12 }}
            className="flex shrink-0 flex-wrap items-center gap-2"
          >
            {actions}
            {aside}
          </motion.div>
        )}
      </div>

      {meta && meta.length > 0 && (
        <motion.dl
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.16 }}
          className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3"
        >
          {meta.map((m) => (
            <div key={m.label} className="flex items-center gap-2">
              {m.icon && <span className="text-muted">{m.icon}</span>}
              <dt className="text-[11.5px] tracking-wide text-muted uppercase">{m.label}</dt>
              <dd className="font-display text-[12.5px] font-semibold text-forest-deep">{m.value}</dd>
            </div>
          ))}
        </motion.dl>
      )}
    </header>
  );
}
