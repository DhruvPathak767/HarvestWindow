import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;
const WORD = "HarvestWindow";

/**
 * Cinematic intro: the window mark draws itself, the wordmark rises,
 * a counter fills, then the curtain lifts to reveal the 3D field.
 * Shown once per session; skipped entirely for reduced motion.
 */
export function Preloader({
  onReveal,
  onDone,
}: {
  onReveal: () => void;
  onDone: () => void;
}) {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    let raf = 0;
    let timeout = 0;
    const start = performance.now();
    const duration = 1350;
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setCount(Math.round(eased * 100));
      if (t < 1) raf = requestAnimationFrame(step);
      else
        timeout = window.setTimeout(() => {
          root.style.overflow = prev;
          setVisible(false);
          onReveal();
        }, 160);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
      root.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          key="preloader"
          role="status"
          aria-live="polite"
          aria-label="Loading HarvestWindow"
          initial={{ clipPath: "inset(0 0 0% 0)" }}
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[300] flex flex-col overflow-hidden bg-night text-cream"
        >
          <div
            aria-hidden
            className="absolute top-1/2 left-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px]"
            style={{ background: "radial-gradient(circle, rgba(232,182,74,0.28), transparent 65%)" }}
          />
          <div className="hw-noise pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />

          <div className="relative flex flex-1 flex-col items-center justify-center gap-7">
            <svg viewBox="0 0 64 64" className="h-20 w-20" aria-hidden>
              <motion.path
                d="M17 50V31a15 15 0 0 1 30 0v19"
                fill="none"
                stroke="#E8B64A"
                strokeWidth="2.2"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.1, ease: EASE }}
              />
              <motion.path
                d="M32 46c-8.6-2.6-13.2-9.4-12.6-18 7.6 2.4 12 8.6 12.6 18z"
                fill="#5B8C45"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ transformOrigin: "32px 46px" }}
                transition={{ delay: 0.55, duration: 0.6, ease: EASE }}
              />
              <motion.path
                d="M32.8 46c1-8.4 5.6-14.2 13.2-16.4.4 8.2-4.4 14.6-13.2 16.4z"
                fill="#B8CBA7"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ transformOrigin: "32px 46px" }}
                transition={{ delay: 0.7, duration: 0.6, ease: EASE }}
              />
              <motion.path
                d="M15 54h34"
                stroke="#E8B64A"
                strokeWidth="2.2"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.35, duration: 0.8, ease: EASE }}
              />
            </svg>

            <p className="flex overflow-hidden font-display text-[30px] font-extrabold tracking-[-0.04em] sm:text-[40px]">
              {Array.from(WORD).map((ch, i) => (
                <motion.span
                  key={`${ch}-${i}`}
                  initial={{ y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{ delay: 0.25 + i * 0.035, duration: 0.7, ease: EASE }}
                  className={i >= 7 ? "text-sage" : "text-cream"}
                >
                  {ch}
                </motion.span>
              ))}
            </p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="hw-eyebrow text-sage/70"
            >
              Reading the field
            </motion.p>
          </div>

          <div className="relative flex items-end justify-between gap-6 px-6 pb-7 sm:px-10 sm:pb-9">
            <span className="hw-eyebrow text-sage/60">Agricultural intelligence</span>
            <span className="hw-num font-display text-[44px] leading-none font-extrabold text-cream sm:text-[64px]">
              {String(count).padStart(3, "0")}
            </span>
          </div>
          <div className="relative h-[2px] w-full bg-white/10">
            <div
              className="h-full origin-left bg-gold"
              style={{ transform: `scaleX(${count / 100})` }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
