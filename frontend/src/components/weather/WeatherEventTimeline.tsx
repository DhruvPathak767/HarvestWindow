import { Calendar, AlertCircle, Clock, ShieldCheck } from "lucide-react";
import type { RiskItem } from "@/types";
import { formatDate } from "@/utils/date";
import { cn } from "@/utils/cn";

interface Props {
  risks: RiskItem[];
  harvestWindow?: { start: string; end: string } | null;
  forecastCoverage?: { start: string; end: string } | null;
}

export function WeatherEventTimeline({ risks, harvestWindow, forecastCoverage }: Props) {
  const activeEvents = risks.filter((r) => r.score >= 25 && r.eventStart);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[12px] text-muted">
        <span className="flex items-center gap-1.5 font-medium text-forest-deep">
          <Calendar className="w-3.5 h-3.5" />
          Forecast Window Coverage:
        </span>
        <span>
          {forecastCoverage?.start ? formatDate(forecastCoverage.start) : "Today"} —{" "}
          {forecastCoverage?.end ? formatDate(forecastCoverage.end) : "10 days out"}
        </span>
      </div>

      {harvestWindow && (
        <div className="p-2.5 rounded-md bg-forest-deep/5 border border-forest-deep/15 flex items-center justify-between text-[12.5px]">
          <span className="text-forest-deep font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-forest" />
            Target Harvest Window:
          </span>
          <span className="font-semibold text-forest-deep">
            {formatDate(harvestWindow.start)} to {formatDate(harvestWindow.end)}
          </span>
        </div>
      )}

      {activeEvents.length === 0 ? (
        <div className="p-3.5 rounded-lg border border-emerald-200/80 bg-emerald-50/50 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-[12.5px] text-emerald-900 leading-snug">
            No disruptive meteorological events (heavy rain, severe wind, or heat spikes) forecast across the next 10 days. Field operations are expected to proceed normally.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeEvents.map((ev, i) => (
            <div
              key={i}
              className={cn(
                "p-3 rounded-lg border text-[12.5px] flex items-start gap-3 transition-colors",
                ev.severity === "HIGH" || ev.severity === "CRITICAL"
                  ? "bg-red-50/60 border-red-200/90 text-red-950"
                  : "bg-amber-50/60 border-amber-200/90 text-amber-950"
              )}
            >
              <AlertCircle
                className={cn(
                  "w-4 h-4 mt-0.5 shrink-0",
                  ev.severity === "HIGH" || ev.severity === "CRITICAL" ? "text-red-600" : "text-amber-600"
                )}
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold tracking-wide text-[11.5px] uppercase">
                    {ev.category.replace("_", " ")}
                  </span>
                  {ev.eventStart && (
                    <span className="text-muted text-[11px]">
                      • {formatDate(ev.eventStart)}
                    </span>
                  )}
                </div>
                <p className="text-forest-deep/90 leading-relaxed">
                  {ev.explanation[0] || "Adverse weather forecast during this interval."}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
