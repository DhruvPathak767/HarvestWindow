import { useEffect, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

/**
 * Gold cursor follower (fine pointers only). The native cursor stays visible;
 * the ring trails with spring physics and expands over interactive elements.
 */
export function CursorFollower() {
  const reduced = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 260, damping: 26, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 260, damping: 26, mass: 0.6 });

  useEffect(() => {
    if (reduced) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    setEnabled(true);
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
      const target = e.target as Element | null;
      setHover(
        !!target?.closest?.(
          "a, button, [role='button'], [role='tab'], input, select, textarea, [data-cursor='hover']"
        )
      );
    };
    const leave = () => setVisible(false);
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [reduced, x, y]);

  if (!enabled) return null;

  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[260] h-1.5 w-1.5 rounded-full bg-gold"
        style={{ x, y, translateX: "-50%", translateY: "-50%" }}
        animate={{ opacity: visible ? 1 : 0, scale: hover ? 0 : 1 }}
        transition={{ duration: 0.15 }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[259] rounded-full border border-gold/70"
        style={{ x: ringX, y: ringY, translateX: "-50%", translateY: "-50%" }}
        animate={{
          width: hover ? 58 : 30,
          height: hover ? 58 : 30,
          opacity: visible ? 1 : 0,
          backgroundColor: hover ? "rgba(232,182,74,0.14)" : "rgba(232,182,74,0)",
        }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      />
    </>
  );
}
