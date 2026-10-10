import { useEffect } from "react";
import Lenis from "lenis";

let instance: Lenis | null = null;

/** Current Lenis instance (landing page only), or null when native scrolling. */
export const getLenis = (): Lenis | null => instance;

/** Buttery inertial scrolling for the marketing site. */
export function useSmoothScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    instance = lenis;

    let frame = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      if (instance === lenis) instance = null;
    };
  }, [enabled]);
}

/** Smooth-scroll to a section id, using Lenis when it is active. */
export function scrollToId(id: string, offset = -24) {
  const el = document.getElementById(id);
  if (!el) return;
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(el, { offset, duration: 2.2 });
  else el.scrollIntoView({ behavior: "smooth", block: "start" });
}
