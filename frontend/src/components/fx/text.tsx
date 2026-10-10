import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type Variants,
} from "framer-motion";
import { cn } from "@/utils/cn";

const EASE = [0.22, 1, 0.36, 1] as const;

const charVariants = (delay: number, step: number): Variants => ({
  hidden: { opacity: 0, y: "0.55em", rotateX: -88 },
  show: (i: number) => ({
    opacity: 1,
    y: "0em",
    rotateX: 0,
    transition: { duration: 0.9, ease: EASE, delay: delay + i * step },
  }),
});

/**
 * 3D split-text reveal: every character (or word) flips up from behind a
 * perspective plane. Screen readers get the plain string.
 */
export function SplitText({
  text,
  className,
  charClassName,
  mode = "chars",
  delay = 0,
  stagger,
  play = true,
  inView = false,
}: {
  text: string;
  className?: string;
  charClassName?: string;
  mode?: "chars" | "words";
  delay?: number;
  stagger?: number;
  play?: boolean;
  inView?: boolean;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <span className={className}>{text}</span>;

  const words = text.split(" ");
  const step = stagger ?? (mode === "chars" ? 0.026 : 0.09);
  const variants = charVariants(delay, step);
  let index = 0;

  const trigger = inView
    ? { initial: "hidden", whileInView: "show", viewport: { once: true, margin: "-10% 0px" } }
    : { initial: "hidden", animate: play ? "show" : "hidden" };

  return (
    <motion.span className={cn("inline-block", className)} {...trigger}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, wi) => (
          <span
            key={`${word}-${wi}`}
            className="inline-block whitespace-nowrap"
            style={{ perspective: 900 }}
          >
            {mode === "words" ? (
              <motion.span
                className={cn("inline-block will-change-transform", charClassName)}
                custom={index++}
                variants={variants}
                style={{ transformOrigin: "50% 100%" }}
              >
                {word}
              </motion.span>
            ) : (
              Array.from(word).map((ch, ci) => (
                <motion.span
                  key={`${ch}-${ci}`}
                  className={cn("inline-block will-change-transform", charClassName)}
                  custom={index++}
                  variants={variants}
                  style={{ transformOrigin: "50% 100%" }}
                >
                  {ch}
                </motion.span>
              ))
            )}
            {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
          </span>
        ))}
      </span>
    </motion.span>
  );
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>*+#";

/** Decoding / scramble effect for mono eyebrows and labels. */
export function ScrambleText({
  text,
  play = true,
  className,
  duration = 950,
}: {
  text: string;
  play?: boolean;
  className?: string;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (reduced || !play) {
      setDisplay(text);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const revealed = Math.floor(t * text.length);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        out += ch === " " || i < revealed ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setDisplay(out);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, play, reduced, duration]);

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>{display}</span>
    </span>
  );
}

const wrap = (min: number, max: number, v: number) => {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
};

/** Infinite marquee whose speed and direction react to scroll velocity. */
export function VelocityMarquee({
  children,
  baseVelocity = -2,
  className,
}: {
  children: ReactNode;
  baseVelocity?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 4], { clamp: false });
  const x = useTransform(baseX, (v) => `${wrap(-25, -50, v)}%`);
  const direction = useRef(1);

  useAnimationFrame((_, delta) => {
    if (reduced) return;
    let moveBy = direction.current * baseVelocity * (delta / 1000);
    const vf = velocityFactor.get();
    if (vf < 0) direction.current = -1;
    else if (vf > 0) direction.current = 1;
    moveBy += direction.current * moveBy * vf;
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div className={cn("flex overflow-hidden whitespace-nowrap", className)}>
      <motion.div className="flex whitespace-nowrap" style={{ x }}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="flex shrink-0 items-center">
            {children}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
