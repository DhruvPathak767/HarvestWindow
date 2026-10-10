import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  CloudRain,
  ListChecks,
  PlusCircle,
  RefreshCw,
  SlidersHorizontal,
  Tractor,
  Trash2,
  User,
} from "lucide-react";
import type { ActivityEvent } from "@/types";
import { relativeTime } from "@/utils/date";
import { EmptyState } from "@/components/common/ui";
import { cn } from "@/utils/cn";

const DEFAULT_META = { icon: RefreshCw, tone: "bg-soft text-forest" };

const ICONS: Record<string, { icon: typeof RefreshCw; tone: string }> = {
  "crop-added": { icon: PlusCircle, tone: "bg-soft text-forest" },
  "crop-planted": { icon: PlusCircle, tone: "bg-soft text-forest" },
  "crop-updated": { icon: SlidersHorizontal, tone: "bg-soft text-forest" },
  "crop-deleted": { icon: Trash2, tone: "bg-[#faeceb] text-danger" },
  "farm-added": { icon: Tractor, tone: "bg-[#f2e9e2] text-earth" },
  "farm-created": { icon: Tractor, tone: "bg-[#f2e9e2] text-earth" },
  "farm-updated": { icon: SlidersHorizontal, tone: "bg-[#f2e9e2] text-earth" },
  "farm-deleted": { icon: Trash2, tone: "bg-[#faeceb] text-danger" },
  "forecast-refreshed": { icon: RefreshCw, tone: "bg-[#e6eef4] text-info" },
  "window-changed": { icon: SlidersHorizontal, tone: "bg-gold-soft/70 text-[#8a6415]" },
  "recommendation-generated": { icon: ListChecks, tone: "bg-soft text-forest" },
  "recommendation-completed": { icon: CheckCircle2, tone: "bg-[#eaf1e2] text-living" },
  "recommendation-dismissed": { icon: CheckCircle2, tone: "bg-[#f3f4f6] text-muted" },
  "weather-alert": { icon: CloudRain, tone: "bg-[#e6eef4] text-info" },
  "profile-updated": { icon: User, tone: "bg-soft text-forest" },
};

export function ActivityFeed({
  events,
  limit = 6,
  className,
}: {
  events: ActivityEvent[];
  limit?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const visible = events.slice(0, limit);

  if (visible.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Adding a farm or a crop, refreshing an estimate or completing a recommendation will show up here."
      />
    );
  }

  return (
    <ol className={cn("flex flex-col", className)}>
      {visible.map((event, i) => {
        const meta = ICONS[event.type] ?? DEFAULT_META;
        const Icon = meta.icon;
        const timeStr = event.at || (event as any).timestamp;
        return (
          <motion.li
            key={event.id}
            initial={reduced ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: reduced ? 0 : i * 0.05 }}
            className="relative flex gap-3 border-b border-line/70 py-3 last:border-0"
          >
            <span
              className={cn(
                "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full",
                meta.tone
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-snug text-ink">{event.message}</p>
              <p className="mt-1 font-mono text-[10.5px] tracking-wide text-muted uppercase">
                {timeStr ? relativeTime(timeStr) : "recently"}
              </p>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
