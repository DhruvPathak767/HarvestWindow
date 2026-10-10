import { motion, useReducedMotion } from "framer-motion";
import { CalendarRange, CircleDot, Eye, Telescope } from "lucide-react";
import type { Forecast } from "@/types";
import { daysBetween, formatShortDate, startOfToday } from "@/utils/date";
import { cn } from "@/utils/cn";

/**
 * Growth-stage progression.
 * Past stages are drawn from the recorded planting date (labelled "derived"),
 * future stages are clearly marked as estimates — the two are never blended.
 */
export function StageLadder({ forecast, className }: { forecast: Forecast; className?: string }) {
  const reduced = useReducedMotion();
  const today = startOfToday();

  const currentIndex = forecast.stagePlan.findIndex(
    (s) =>
      daysBetween(s.startDate, today) >= 0 && daysBetween(today, s.endDate) >= 0
  );

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5 text-forest" aria-hidden />
          Derived from recorded dates
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Telescope className="h-3.5 w-3.5 text-earth" aria-hidden />
          Estimated ahead
        </span>
      </div>

      <ol className="relative flex flex-col">
        {forecast.stagePlan.map((stage, i) => {
          const isWindow = stage.stage === "Estimated harvest window";
          const isCurrent = i === currentIndex;
          const done = stage.observed && !isCurrent;

          return (
            <motion.li
              key={stage.stage}
              initial={reduced ? false : { opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: reduced ? 0 : i * 0.05 }}
              className="relative flex gap-4 pb-4 last:pb-0"
            >
              <div className="relative flex w-5 shrink-0 flex-col items-center">
                <span
                  className={cn(
                    "z-10 mt-0.5 grid h-5 w-5 place-items-center rounded-full border-2 bg-white",
                    isWindow
                      ? "border-gold"
                      : isCurrent
                        ? "border-forest"
                        : done
                          ? "border-living"
                          : "border-line"
                  )}
                >
                  {isWindow ? (
                    <CalendarRange className="h-2.5 w-2.5 text-[#8a6415]" aria-hidden />
                  ) : isCurrent ? (
                    <CircleDot className="h-2.5 w-2.5 text-forest" aria-hidden />
                  ) : done ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-living" aria-hidden />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-line" aria-hidden />
                  )}
                </span>
                {i < forecast.stagePlan.length - 1 && (
                  <span
                    className={cn(
                      "absolute top-5 bottom-0 w-px",
                      done || isCurrent ? "bg-living/50" : "bg-line",
                      !stage.observed && !isWindow && "border-l border-dashed border-line bg-transparent"
                    )}
                    aria-hidden
                  />
                )}
              </div>

              <div
                className={cn(
                  "min-w-0 flex-1 rounded-md border px-3.5 py-2.5 transition-colors",
                  isWindow
                    ? "border-gold/60 bg-gold-soft/40"
                    : isCurrent
                      ? "border-living/50 bg-soft"
                      : "border-line bg-white"
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p
                    className={cn(
                      "font-display text-[13.5px] font-semibold",
                      isWindow ? "text-[#7a5a12]" : "text-forest-deep"
                    )}
                  >
                    {stage.stage}
                  </p>
                  <p className="font-mono text-[11px] text-muted">
                    {formatShortDate(stage.startDate)} → {formatShortDate(stage.endDate)}
                  </p>
                </div>
                <p className="mt-1 text-[11.5px] font-medium text-muted">
                  {isWindow
                    ? "Estimated range — plan within it rather than on a single day."
                    : stage.observed
                      ? "Derived from the recorded planting date."
                      : "Estimated ahead from reference durations."}
                </p>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
