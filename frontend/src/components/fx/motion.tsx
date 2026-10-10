import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { cn } from "@/utils/cn";

/**
 * 3D tilt card: rotates toward the pointer with spring physics, adds a
 * moving specular glare and keeps `preserve-3d` so children can use
 * translateZ for real depth layering.
 */
export function TiltCard({
  children,
  className,
  wrapperClassName,
  max = 9,
  glare = true,
  style,
}: {
  children: ReactNode;
  className?: string;
  wrapperClassName?: string;
  max?: number;
  glare?: boolean;
  style?: CSSProperties;
}) {
  const reduced = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const srx = useSpring(rx, { stiffness: 170, damping: 18, mass: 0.6 });
  const sry = useSpring(ry, { stiffness: 170, damping: 18, mass: 0.6 });
  const glareBg = useMotionTemplate`radial-gradient(520px circle at ${gx}% ${gy}%, rgba(255,255,255,0.22), transparent 45%)`;

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * max * 2);
    rx.set(-(py - 0.5) * max * 2);
    gx.set(px * 100);
    gy.set(py * 100);
  };

  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <div className={cn("h-full", wrapperClassName)} style={{ perspective: 1200 }}>
      <motion.div
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ rotateX: srx, rotateY: sry, transformStyle: "preserve-3d", ...style }}
        className={cn("group relative h-full will-change-transform", className)}
      >
        {children}
        {glare && !reduced && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{ background: glareBg, mixBlendMode: "soft-light" }}
          />
        )}
      </motion.div>
    </div>
  );
}

/** Magnetic hover: the child drifts toward the pointer and springs back. */
export function Magnetic({
  children,
  strength = 0.32,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 15, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 220, damping: 15, mass: 0.5 });

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };

  return (
    <motion.div
      onPointerMove={onMove}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      style={{ x: sx, y: sy }}
      className={cn("inline-flex", className)}
    >
      {children}
    </motion.div>
  );
}

/** Card with a cursor-following spotlight wash. */
export function Spotlight({
  children,
  className,
  tone = "light",
}: {
  children: ReactNode;
  className?: string;
  tone?: "light" | "dark";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--sx", `${e.clientX - r.left}px`);
    el.style.setProperty("--sy", `${e.clientY - r.top}px`);
  };
  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      className={cn(
        "group relative overflow-hidden rounded-[28px] border transition-[transform,box-shadow] duration-500 hover:-translate-y-1",
        tone === "dark"
          ? "border-white/10 bg-night-3 text-cream hover:shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]"
          : "border-forest-deep/10 bg-white hover:shadow-[0_40px_80px_-46px_rgba(22,61,43,0.55)]",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(460px circle at var(--sx, 50%) var(--sy, 50%), ${
            tone === "dark" ? "rgba(232,182,74,0.16)" : "rgba(91,140,69,0.12)"
          }, transparent 62%)`,
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

/** 3D render with float motion, optional radial mask, glow and fallback. */
export function Render3D({
  src,
  alt,
  className,
  imgClassName,
  float = "normal",
  mask = false,
  glow,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  float?: "normal" | "slow" | false;
  mask?: boolean | "soft";
  glow?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("relative", className)}>
      {glow && (
        <div
          aria-hidden
          className="absolute inset-[14%] rounded-full blur-3xl"
          style={{ background: glow }}
        />
      )}
      {!failed ? (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
          className={cn(
            "relative h-full w-full object-cover",
            mask === true && "hw-mask-radial",
            mask === "soft" && "hw-mask-soft",
            float === "normal" && "hw-float",
            float === "slow" && "hw-float-slow",
            imgClassName
          )}
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="relative h-full w-full rounded-[inherit]"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, rgba(232,182,74,0.45), rgba(16,41,27,0.9) 60%, transparent 75%)",
          }}
        />
      )}
    </div>
  );
}
