import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Flag } from "lucide-react";
import type { Crop, Forecast } from "@/types";
import { READINESS_META } from "@/types";
import { addDays, daysBetween, formatDate, formatShortDate, startOfToday, toISODate } from "@/utils/date";
import { cn } from "@/utils/cn";
import { StatusBadge } from "@/components/common/ui";

interface TimelineProps {
  forecast: Forecast;
  crop: Crop;
  farmName?: string;
  /** Show the pre-window season track with stage ticks. */
  detailed?: boolean;
  className?: string;
}

/**
 * The signature HarvestWindow visual: a season track with the estimated
 * harvest window drawn as a range (never a single "exact" date) and a
 * live today-marker showing where the crop sits relative to that range.
 */
export function HarvestTimeline({
  forecast,
  crop,
  farmName,
  detailed = false,
  className,
}: TimelineProps) {
  const reduced = useReducedMotion();
  const today = startOfToday();

  const leadIn = detailed ? 120 : 45;
  const spanStart = addDays(forecast.estimatedWindowStart, -leadIn);
  const spanEnd = addDays(forecast.estimatedWindowEnd, 28);
  const totalDays = Math.max(daysBetween(spanStart, spanEnd), 1);

  const pos = (date: string | Date) =>
    Math.max(
      0,
      Math.min(100, (daysBetween(spanStart, date) / totalDays) * 100)
    );

  const windowStartPos = pos(forecast.estimatedWindowStart);
  const windowEndPos = pos(forecast.estimatedWindowEnd);
  const todayPos = pos(today);
  const windowWidth = Math.max(windowEndPos - windowStartPos, 1.5);
  const seasonWidth = Math.max(todayPos, 0.8);
  const meta = READINESS_META[forecast.readinessStatus];

  const monthTicks = buildMonthTicks(spanStart, spanEnd);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="font-display text-[15px] leading-tight font-bold text-forest-deep">
            {crop.name}
            {crop.variety ? <span className="font-medium text-muted"> · {crop.variety}</span> : null}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            {farmName ? `${farmName} · ` : ""}Sown {formatDate(crop.plantingDate)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={forecast.readinessStatus} full />
          {typeof forecast.confidence === "number" && (
            <span className="rounded-full border border-line bg-cream px-2.5 py-1 text-[11.5px] font-semibold text-muted">
              Input completeness {forecast.confidence}%
            </span>
          )}
        </div>
      </div>

      {/* Track */}
      <div className="relative mt-7 pb-1">
        <div className="relative h-11 w-full overflow-visible">
          {/* base season track */}
          <div className="absolute top-4 right-0 left-0 h-3 rounded-full bg-soft ring-1 ring-line ring-inset" />

          {/* season elapsed */}
          <motion.div
            className="absolute top-4 left-0 h-3 rounded-l-full bg-living/45"
            initial={{ width: 0 }}
            animate={{ width: `${seasonWidth}%` }}
            transition={{ duration: reduced ? 0 : 0.8, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* estimated window */}
          <motion.div
            className="absolute top-[7px] h-[26px] rounded-md border border-gold/70 bg-gold/35"
            style={{
              left: `${windowStartPos}%`,
              backgroundImage:
                "repeating-linear-gradient(115deg, rgba(232,182,74,0.55) 0 6px, rgba(232,182,74,0.28) 6px 12px)",
            }}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: `${windowWidth}%`, opacity: 1 }}
            transition={{ duration: reduced ? 0 : 0.75, ease: [0.22, 1, 0.36, 1], delay: reduced ? 0 : 0.15 }}
            title={`Estimated harvest window: ${formatDate(forecast.estimatedWindowStart)} to ${formatDate(forecast.estimatedWindowEnd)}`}
          />

          {/* stage ticks (detailed view) */}
          {detailed &&
            forecast.stagePlan
              .filter((s) => s.stage !== "Estimated harvest window")
              .map((stage) => (
                <span
                  key={stage.stage}
                  className="absolute top-3 h-5 w-px bg-forest-deep/15"
                  style={{ left: `${pos(stage.startDate)}%` }}
                  aria-hidden
                >
                  <span className="absolute top-6 left-1 hidden -translate-x-1/2 text-[10px] whitespace-nowrap text-muted lg:block">
                    {stage.stage.split(" ")[0]}
                  </span>
                </span>
              ))}

          {/* window boundary flags */}
          <span
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${windowStartPos}%` }}
            aria-hidden
          >
            <Flag className="h-3.5 w-3.5 text-[#8a6415]" />
            <span className="mt-[26px] text-[11px] font-semibold whitespace-nowrap text-[#8a6415]">
              {formatShortDate(forecast.estimatedWindowStart)}
            </span>
          </span>
          <span
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${windowEndPos}%` }}
            aria-hidden
          >
            <Flag className="h-3.5 w-3.5 rotate-y-180 text-[#8a6415]" />
            <span className="mt-[26px] text-[11px] font-semibold whitespace-nowrap text-[#8a6415]">
              {formatShortDate(forecast.estimatedWindowEnd)}
            </span>
          </span>

          {/* today marker */}
          <motion.span
            className="absolute top-[-6px] z-10 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${todayPos}%` }}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.5 }}
          >
            <span className="rounded-full bg-forest-deep px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-cream whitespace-nowrap uppercase">
              Today
            </span>
            <span className="mt-1 h-8 w-[2px] rounded-full bg-forest-deep" />
            <motion.span
              className="absolute top-[13px] h-3 w-3 rounded-full border-2 border-forest-deep bg-cream"
              animate={reduced ? undefined : { scale: [1, 1.25, 1] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.span>
        </div>

        {/* month scale */}
        <div className="relative mt-7 h-4">
          {monthTicks.map((tick) => (
            <span
              key={tick.key}
              className="absolute top-0 -translate-x-1/2 font-mono text-[10px] tracking-wide text-muted/80 uppercase"
              style={{ left: `${tick.pos}%` }}
            >
              {tick.label}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
        <span className="font-semibold text-forest-deep">{meta.short}.</span>{" "}
        {meta.description}
      </p>

      <span className="sr-only">
        {`Estimated harvest window for ${crop.name}: ${formatDate(
          forecast.estimatedWindowStart
        )} to ${formatDate(forecast.estimatedWindowEnd)}. Status: ${meta.label}.`}
      </span>
    </div>
  );
}

function buildMonthTicks(spanStart: Date, spanEnd: Date) {
  const ticks: { key: string; label: string; pos: number }[] = [];
  const total = Math.max(daysBetween(spanStart, spanEnd), 1);
  const cursor = new Date(spanStart.getFullYear(), spanStart.getMonth() + 1, 1);
  while (cursor <= spanEnd) {
    const p = (daysBetween(spanStart, cursor) / total) * 100;
    if (p > 3 && p < 97) {
      ticks.push({
        key: toISODate(cursor),
        label: cursor.toLocaleDateString("en-IN", { month: "short" }),
        pos: p,
      });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return ticks;
}

/** Compact timeline used inside crop cards. */
export function MiniTimeline({
  forecast,
  className,
}: {
  forecast: Forecast;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const leadIn = 60;
  const spanStart = addDays(forecast.estimatedWindowStart, -leadIn);
  const spanEnd = addDays(forecast.estimatedWindowEnd, 20);
  const total = Math.max(daysBetween(spanStart, spanEnd), 1);
  const pos = (d: string | Date) =>
    Math.max(0, Math.min(100, (daysBetween(spanStart, d) / total) * 100));

  const s = pos(forecast.estimatedWindowStart);
  const e = pos(forecast.estimatedWindowEnd);
  const t = pos(startOfToday());

  return (
    <div className={cn("relative h-4 w-full", className)} aria-hidden>
      <div className="absolute top-1/2 right-0 left-0 h-1.5 -translate-y-1/2 rounded-full bg-soft ring-1 ring-line ring-inset" />
      <motion.div
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gold"
        style={{ left: `${s}%` }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(e - s, 2)}%` }}
        transition={{ duration: reduced ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
      <span
        className="absolute top-1/2 h-3.5 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-forest-deep"
        style={{ left: `${t}%` }}
      />
    </div>
  );
}
