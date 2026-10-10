import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

interface CountUpProps {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  /** Count once on mount (default) or every time the value changes. */
  replayOnChange?: boolean;
}

/** Counts a metric up once. Numbers stay readable — no repeated animation. */
export function CountUp({
  value,
  duration = 900,
  decimals = 0,
  suffix = "",
  prefix = "",
  className,
  replayOnChange = false,
}: CountUpProps) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);
  const frame = useRef<number | null>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    if (!firstRun.current && !replayOnChange) {
      setDisplay(value);
      return;
    }
    firstRun.current = false;

    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setDisplay(from + (value - from) * easeOutCubic(t));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value, duration, reduced, replayOnChange]);

  const formatted = display.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
