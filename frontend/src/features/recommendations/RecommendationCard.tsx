import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  CalendarClock,
  Check,
  CloudRain,
  Eye,
  RotateCcw,
  Truck,
  X,
} from "lucide-react";
import type { Crop, Farm, Priority, Recommendation } from "@/types";
import { Badge } from "@/components/common/ui";
import { formatDate, relativeTime } from "@/utils/date";
import { cn } from "@/utils/cn";

const CATEGORY_ICON = {
  weather: CloudRain,
  timing: CalendarClock,
  logistics: Truck,
  monitoring: Eye,
} as const;

const PRIORITY_TONE: Record<Priority, "caution" | "gold" | "neutral"> = {
  high: "caution",
  medium: "gold",
  low: "neutral",
};

export function RecommendationCard({
  recommendation,
  crop,
  farm,
  onStatus,
  delay = 0,
  dense = false,
}: {
  recommendation: Recommendation;
  crop?: Crop | null;
  farm?: Farm | null;
  onStatus: (status: Recommendation["status"]) => void;
  delay?: number;
  dense?: boolean;
}) {
  const reduced = useReducedMotion();
  const Icon = CATEGORY_ICON[recommendation.category];
  const done = recommendation.status === "completed";
  const dismissed = recommendation.status === "dismissed";

  return (
    <motion.article
      layout={!reduced}
      initial={reduced ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: reduced ? 0 : delay }}
      className={cn(
        "hw-card hw-card-hover relative overflow-hidden p-5",
        (done || dismissed) && "opacity-70"
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-[3px]",
          recommendation.priority === "high"
            ? "bg-caution"
            : recommendation.priority === "medium"
              ? "bg-gold"
              : "bg-line"
        )}
        aria-hidden
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-soft text-forest">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <Badge tone={PRIORITY_TONE[recommendation.priority]}>
          {recommendation.priority} priority
        </Badge>
        {done && <Badge tone="living" icon={<Check className="h-3 w-3" aria-hidden />}>Completed</Badge>}
        {dismissed && <Badge tone="neutral">Dismissed</Badge>}
        <span className="ml-auto font-mono text-[10.5px] tracking-wide text-muted uppercase">
          {relativeTime(recommendation.createdAt)}
        </span>
      </div>

      <h3
        className={cn(
          "mt-3 font-display text-[15.5px] leading-snug font-bold text-forest-deep",
          done && "line-through decoration-living/60"
        )}
      >
        {recommendation.title}
      </h3>

      <p className="mt-2 text-[13px] leading-relaxed text-muted">{recommendation.reason}</p>

      <div className="mt-3 rounded-md border border-line bg-cream/70 px-3.5 py-3">
        <p className="hw-eyebrow font-semibold text-living">Suggested next step</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-forest-deep">
          {recommendation.suggestedAction}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-[12px] text-muted">
        {crop && (
          <Link
            to={`/app/crops/${crop.id}`}
            className="inline-flex items-center gap-1 font-semibold text-forest transition-colors hover:text-living"
          >
            {crop.name}
            {crop.variety ? ` · ${crop.variety}` : ""}
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          </Link>
        )}
        {farm && <span>{farm.name}</span>}
        {recommendation.relevantDate && (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            Relevant {formatDate(recommendation.relevantDate)}
          </span>
        )}
      </div>

      {!dense && (
        <div className="mt-4 flex flex-wrap gap-2">
          {recommendation.status === "open" ? (
            <>
              <button
                type="button"
                onClick={() => onStatus("completed")}
                className="inline-flex items-center gap-1.5 rounded-sm bg-forest-deep px-3 py-1.5 text-[12.5px] font-semibold text-cream transition-colors hover:bg-forest active:scale-[0.98]"
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                Mark complete
              </button>
              <button
                type="button"
                onClick={() => onStatus("dismissed")}
                className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-white px-3 py-1.5 text-[12.5px] font-semibold text-muted transition-colors hover:border-caution/50 hover:text-caution"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Dismiss
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onStatus("open")}
              className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-white px-3 py-1.5 text-[12.5px] font-semibold text-forest-deep transition-colors hover:border-living"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reopen
            </button>
          )}
        </div>
      )}
    </motion.article>
  );
}
