import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import type { Crop, Farm, Forecast } from "@/types";
import { READINESS_META } from "@/types";
import { CROP_IMAGES } from "@/data/mock/cropCatalog";
import { CropImage } from "@/components/common/CropImage";
import { StatusBadge } from "@/components/common/ui";
import { MiniTimeline } from "@/components/charts/HarvestTimeline";
import { daysLabel, formatDateRange } from "@/utils/date";
import { cn } from "@/utils/cn";

export function CropCard({
  crop,
  farm,
  forecast,
  delay = 0,
  compact = false,
}: {
  crop: Crop;
  farm?: Farm | null;
  forecast: Forecast;
  delay?: number;
  compact?: boolean;
}) {
  const reduced = useReducedMotion();
  const meta = READINESS_META[forecast.readinessStatus];

  return (
    <motion.article
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: reduced ? 0 : delay }}
      className="hw-card hw-card-hover group flex h-full flex-col overflow-hidden"
    >
      <div className="relative">
        <CropImage
          src={CROP_IMAGES[crop.name]}
          alt={`${crop.name}${crop.variety ? ` ${crop.variety}` : ""} in the field`}
          cropName={crop.name}
          className={cn("w-full", compact ? "h-24" : "h-32 sm:h-36")}
          imgClassName="transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-forest-deep/55 via-transparent to-transparent"
          aria-hidden
        />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <StatusBadge status={forecast.readinessStatus} />
          {typeof forecast.confidence === "number" && (
            <span className="rounded-full bg-white/92 px-2 py-0.5 font-mono text-[10px] font-semibold text-forest-deep">
              {forecast.confidence}% inputs
            </span>
          )}
        </div>
        <div className="absolute inset-x-3 bottom-2.5 flex items-end justify-between gap-2">
          <p className="truncate font-display text-[15px] leading-tight font-bold text-cream drop-shadow">
            {crop.name}
            {crop.variety ? (
              <span className="font-medium text-cream/80"> · {crop.variety}</span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-[12px]">
          <div className="min-w-0">
            <dt className="flex items-center gap-1 text-muted">
              <MapPin className="h-3 w-3" aria-hidden />
              Farm
            </dt>
            <dd className="mt-0.5 truncate font-semibold text-forest-deep">
              {farm?.name ?? "Unassigned"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="flex items-center gap-1 text-muted">
              <CalendarDays className="h-3 w-3" aria-hidden />
              Sown
            </dt>
            <dd className="mt-0.5 truncate font-mono text-[11.5px] font-medium text-forest-deep">
              {crop.plantingDate}
            </dd>
          </div>
          <div className="col-span-2 min-w-0">
            <dt className="text-muted">Estimated harvest window</dt>
            <dd className="hw-num mt-0.5 text-[14px] font-bold text-forest-deep">
              {formatDateRange(forecast.estimatedWindowStart, forecast.estimatedWindowEnd)}
            </dd>
          </div>
        </dl>

        <MiniTimeline forecast={forecast} className="mt-4" />

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[11.5px] text-muted">
            {forecast.daysToWindowStart > 0
              ? `Window opens in ${daysLabel(forecast.daysToWindowStart)}`
              : forecast.daysToWindowEnd >= 0
                ? "Window open now"
                : `Closed ${daysLabel(forecast.daysToWindowEnd)}`}
          </p>
          <span className="truncate text-[11.5px] font-semibold text-forest">
            {meta.short}
          </span>
        </div>

        <Link
          to={`/app/crops/${crop.id}`}
          className="mt-4 inline-flex items-center justify-between gap-2 rounded-sm border border-line bg-cream/60 px-3 py-2 font-display text-[12.5px] font-semibold text-forest-deep transition-colors group-hover:border-living group-hover:bg-soft"
        >
          View crop intelligence
          <ArrowUpRight
            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </motion.article>
  );
}
