import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import type { Crop, Forecast } from "@/types";
import { READINESS_META } from "@/types";
import {
  addDays,
  daysBetween,
  formatMonth,
  formatShortDate,
  startOfToday,
  toISODate,
} from "@/utils/date";
import { cn } from "@/utils/cn";
import { StatusBadge } from "@/components/common/ui";

export interface GanttRow {
  crop: Crop;
  forecast: Forecast;
  farmName: string;
}

interface Props {
  rows: GanttRow[];
  className?: string;
  /** Number of days shown either side of the earliest/latest window. */
  padding?: number;
}

/**
 * Side-by-side harvest windows: one row per crop, a shared "today" rule,
 * and gold bands for the estimated ranges.
 */
export function WindowGantt({ rows, className, padding = 30 }: Props) {
  const reduced = useReducedMotion();
  const today = startOfToday();

  if (rows.length === 0) return null;

  const starts = rows.map((r) => r.forecast.estimatedWindowStart);
  const ends = rows.map((r) => r.forecast.estimatedWindowEnd);
  const earliest = starts.reduce((a, b) => (a < b ? a : b));
  const latest = ends.reduce((a, b) => (a > b ? a : b));

  const spanStart = addDays(earliest, -padding);
  const spanEnd = addDays(latest, padding);
  const total = Math.max(daysBetween(spanStart, spanEnd), 1);
  const pos = (d: string | Date) =>
    Math.max(0, Math.min(100, (daysBetween(spanStart, d) / total) * 100));

  const todayPos = pos(today);

  const ticks: { key: string; label: string; pos: number }[] = [];
  const cursor = new Date(spanStart.getFullYear(), spanStart.getMonth(), 1);
  while (cursor <= spanEnd) {
    const p = (daysBetween(spanStart, cursor) / total) * 100;
    if (p >= 0 && p <= 100) {
      ticks.push({ key: toISODate(cursor), label: formatMonth(cursor), pos: p });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        {/* shared "today" rule, aligned to the track column */}
        <div
          className="pointer-events-none absolute inset-x-0 top-8 bottom-10 z-20 hidden grid-cols-[42%_1fr] gap-3 sm:grid sm:grid-cols-[240px_1fr]"
          aria-hidden
        >
          <span />
          <span className="relative">
            <span
              className="absolute top-0 bottom-0 w-px bg-forest-deep/60"
              style={{ left: `${todayPos}%` }}
            >
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-forest-deep px-1.5 py-0.5 font-mono text-[9.5px] font-semibold tracking-wide text-cream uppercase">
                Today
              </span>
            </span>
          </span>
        </div>

        {/* month scale */}
        <div className="relative mb-2 flex">
          <div className="w-[42%] shrink-0 sm:w-[240px]" aria-hidden />
          <div className="relative h-4 flex-1">
            {ticks.map((t) => (
              <span
                key={t.key}
                className="absolute -translate-x-1/2 font-mono text-[10px] tracking-wide text-muted uppercase"
                style={{ left: `${t.pos}%` }}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>

        <ul className="flex flex-col gap-1.5">
          {rows.map((row, i) => {
            const s = pos(row.forecast.estimatedWindowStart);
            const e = pos(row.forecast.estimatedWindowEnd);
            const meta = READINESS_META[row.forecast.readinessStatus];
            return (
              <motion.li
                key={row.crop.id}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: reduced ? 0 : i * 0.05 }}
                className="group grid grid-cols-[42%_1fr] items-center gap-3 rounded-md border border-transparent px-1 py-2 transition-colors hover:border-line hover:bg-white sm:grid-cols-[240px_1fr]"
              >
                <div className="min-w-0 pr-2">
                  <Link
                    to={`/app/crops/${row.crop.id}`}
                    className="block truncate font-display text-[13px] font-bold text-forest-deep transition-colors group-hover:text-forest"
                  >
                    {row.crop.name}
                    {row.crop.variety ? (
                      <span className="font-medium text-muted"> · {row.crop.variety}</span>
                    ) : null}
                  </Link>
                  <p className="truncate text-[11.5px] text-muted">{row.farmName}</p>
                </div>

                <div className="relative h-9">
                  <div className="absolute top-1/2 right-0 left-0 h-2 -translate-y-1/2 rounded-full bg-soft ring-1 ring-line ring-inset" />
                  <motion.div
                    className="absolute top-1/2 h-5 -translate-y-1/2 rounded-[5px] border border-gold/70"
                    style={{
                      left: `${s}%`,
                      backgroundImage:
                        "repeating-linear-gradient(115deg, rgba(232,182,74,0.6) 0 5px, rgba(232,182,74,0.3) 5px 10px)",
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(e - s, 1.5)}%` }}
                    transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : i * 0.05 }}
                  />
                  <span
                    className="absolute top-1/2 h-6 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-forest-deep sm:hidden"
                    style={{ left: `${todayPos}%` }}
                    aria-hidden
                  />
                  <span className="absolute -bottom-0.5 left-0 font-mono text-[10px] text-muted">
                    {formatShortDate(row.forecast.estimatedWindowStart)} –{" "}
                    {formatShortDate(row.forecast.estimatedWindowEnd)}
                  </span>
                  <span className="absolute right-0 -bottom-0.5 text-[10.5px] font-semibold text-muted">
                    {row.forecast.daysToWindowStart >= 0
                      ? `in ${row.forecast.daysToWindowStart}d`
                      : row.forecast.daysToWindowEnd >= 0
                        ? "open now"
                        : `closed ${Math.abs(row.forecast.daysToWindowEnd)}d ago`}
                  </span>
                  <span className="sr-only">{meta.label}</span>
                </div>
              </motion.li>
            );
          })}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <span className="text-[11.5px] text-muted">Row status:</span>
          {rows.slice(0, 4).map((r) => (
            <StatusBadge key={r.crop.id} status={r.forecast.readinessStatus} />
          ))}
          {rows.length > 4 && (
            <span className="text-[11.5px] text-muted">+{rows.length - 4} more</span>
          )}
        </div>
      </div>
    </div>
  );
}
