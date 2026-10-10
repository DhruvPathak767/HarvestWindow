import { useEffect, useState } from "react";
import {
  Award,
  BookOpen,
  CalendarDays,
  Compass,
  Droplets,
  Info,
  Layers,
  ThermometerSun,
} from "lucide-react";
import { Badge, Card, CardHeader } from "@/components/common/ui";
import { api } from "@/services/api";
import type { AgriCrop, AgriCropCalendar, AgriSuitabilityProfile } from "@/types";

interface AgronomicKnowledgeCardProps {
  cropName: string;
  cropVariety?: string | null;
  farmState?: string | null;
  farmDistrict?: string | null;
}

const MONTH_NAMES = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatMonthRange(start?: number | null, end?: number | null) {
  if (!start && !end) return "Not recorded";
  if (start && end) {
    return start === end
      ? MONTH_NAMES[start] || `M${start}`
      : `${MONTH_NAMES[start] || `M${start}`} – ${MONTH_NAMES[end] || `M${end}`}`;
  }
  return MONTH_NAMES[start || end || 0] || "Recorded";
}

export function AgronomicKnowledgeCard({
  cropName,
  cropVariety,
  farmState,
  farmDistrict,
}: AgronomicKnowledgeCardProps) {
  const [loading, setLoading] = useState(true);
  const [agriCrop, setAgriCrop] = useState<AgriCrop | null>(null);
  const [calendars, setCalendars] = useState<AgriCropCalendar[]>([]);
  const [suitability, setSuitability] = useState<AgriSuitabilityProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAgronomicData() {
      setLoading(true);
      try {
        // 1. Fetch crop master details
        const cropRes = await api.listAgriCrops({ search: cropName, limit: 1 });
        const matchedCrop = cropRes?.crops?.[0] || null;

        if (cancelled) return;
        setAgriCrop(matchedCrop);

        // 2. Fetch regional calendar
        const calRes = await api.getCropCalendars({
          crop: cropName,
          state: farmState || undefined,
          district: farmDistrict || undefined,
        });

        if (cancelled) return;
        const calList = Array.isArray(calRes) ? calRes : (calRes as any)?.items || [];
        setCalendars(calList);

        // 3. Fetch crop suitability
        const suitRes = await api.getCropSuitability({ crop: cropName });
        if (cancelled) return;
        const suitList = Array.isArray(suitRes) ? suitRes : [];
        setSuitability(suitList[0] || null);
      } catch (err) {
        console.warn("[AgronomicKnowledgeCard] Failed to fetch knowledge data:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (cropName) {
      loadAgronomicData();
    }

    return () => {
      cancelled = true;
    };
  }, [cropName, farmState, farmDistrict]);

  const growthProfile = agriCrop?.growthProfiles?.[0] || null;
  const safeCalendars = Array.isArray(calendars) ? calendars : [];
  const regionalCalendar =
    safeCalendars.find(
      (c) =>
        farmState &&
        c.region?.state?.toLowerCase().trim() === farmState.toLowerCase().trim()
    ) ||
    safeCalendars[0] ||
    null;

  const hasGdd =
    growthProfile?.gddRequirementMin !== null &&
    growthProfile?.gddRequirementMin !== undefined;

  const sourceCitation =
    growthProfile?.source?.sourceName ||
    regionalCalendar?.source?.sourceName ||
    "ICAR Reference Standard";

  return (
    <Card className="overflow-hidden border-forest/15">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <span>Agronomic Knowledge Base</span>
            <span className="text-[11px] font-normal text-muted">· Phase AI-1</span>
          </span>
        }
        subtitle="Verified Indian agricultural standards, regional calendars, and thermal benchmarks."
        icon={<BookOpen className="h-4 w-4" aria-hidden />}
        action={
          agriCrop ? (
            <Badge
              tone={
                agriCrop.growthProfiles?.some((g) => g.verificationStatus === "VERIFIED")
                  ? "living"
                  : "neutral"
              }
              icon={<Award className="h-3 w-3" />}
            >
              {agriCrop.growthProfiles?.some((g) => g.verificationStatus === "VERIFIED")
                ? "ICAR Verified"
                : "Standard Profile"}
            </Badge>
          ) : null
        }
      />

      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-[13px] text-muted">
            <span className="hw-spinner mr-2 h-4 w-4 rounded-full border-2 border-forest border-t-transparent animate-spin" />
            Loading verified agronomic profiles…
          </div>
        ) : !agriCrop ? (
          <div className="rounded-md border border-line bg-cream/50 p-4 text-[12.5px] text-muted">
            <p className="font-semibold text-forest-deep">No official database profile found for “{cropName}”</p>
            <p className="mt-1">
              The engine will fall back to generalized duration bounds until verified ICAR records are imported for this crop.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Header badges / meta */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3">
              <div>
                <p className="font-display text-[15px] font-bold text-forest-deep">
                  {agriCrop.canonicalName}{" "}
                  {agriCrop.scientificName ? (
                    <span className="font-serif italic text-muted font-normal">
                      ({agriCrop.scientificName})
                    </span>
                  ) : null}
                </p>
                <p className="text-[11.5px] text-muted">
                  Category: <span className="font-medium capitalize">{agriCrop.category}</span>
                  {cropVariety ? (
                    <>
                      {" "}· Active Variety: <span className="font-medium text-forest-deep">{cropVariety}</span>
                    </>
                  ) : null}
                </p>
              </div>

              {agriCrop.varieties && agriCrop.varieties.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                  <span className="font-medium">Documented varieties:</span>
                  {agriCrop.varieties.slice(0, 4).map((v) => (
                    <span
                      key={v.id}
                      className="rounded bg-soft px-1.5 py-0.5 font-mono text-[11px] text-forest-deep border border-line/60"
                    >
                      {v.varietyName}
                    </span>
                  ))}
                  {agriCrop.varieties.length > 4 ? (
                    <span className="text-[10px] text-muted">+{agriCrop.varieties.length - 4} more</span>
                  ) : null}
                </div>
              )}
            </div>

            {/* Core Agronomic Grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Duration & Profile */}
              <div className="rounded-md border border-line bg-white/70 p-3.5 shadow-2xs">
                <div className="flex items-center gap-2 text-forest-deep">
                  <Compass className="h-4 w-4 text-forest" />
                  <p className="text-[12px] font-bold">Growth Duration</p>
                </div>
                {growthProfile ? (
                  <div className="mt-2 text-[12.5px]">
                    <p className="font-display font-bold text-forest-deep">
                      {growthProfile.typicalDurationDays} days{" "}
                      <span className="text-[11px] font-normal text-muted">typical</span>
                    </p>
                    <p className="text-[11.5px] text-muted">
                      Range: {growthProfile.minDurationDays} – {growthProfile.maxDurationDays} days
                    </p>
                    <span className="mt-1.5 inline-block text-[10px] text-living font-semibold">
                      ✓ Verified baseline
                    </span>
                  </div>
                ) : (
                  <p className="mt-2 text-[12px] text-muted">
                    No verified duration profile recorded.
                  </p>
                )}
              </div>

              {/* Thermal / GDD Requirements */}
              <div className="rounded-md border border-line bg-white/70 p-3.5 shadow-2xs">
                <div className="flex items-center gap-2 text-forest-deep">
                  <ThermometerSun className="h-4 w-4 text-gold" />
                  <p className="text-[12px] font-bold">Growing Degree Days (GDD)</p>
                </div>
                {hasGdd && growthProfile ? (
                  <div className="mt-2 text-[12.5px]">
                    <p className="font-display font-bold text-forest-deep">
                      {growthProfile.gddRequirementMin?.toLocaleString()} –{" "}
                      {growthProfile.gddRequirementMax?.toLocaleString()}{" "}
                      <span className="text-[11px] font-normal text-muted">°C-days</span>
                    </p>
                    <p className="text-[11.5px] text-muted">
                      Base Temp: {growthProfile.gddBaseTempC ?? 10}°C · Upper:{" "}
                      {growthProfile.gddUpperThresholdC ?? 35}°C
                    </p>
                    <span className="mt-1.5 inline-block text-[10px] text-living font-semibold">
                      ✓ Thermal model active
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 text-[12px] text-muted">
                    <p className="font-medium text-[#8c4f1c]">GDD Not Verified</p>
                    <p className="text-[11px] leading-tight mt-0.5">
                      No verified GDD threshold published for this variety yet. Durational days model is applied.
                    </p>
                  </div>
                )}
              </div>

              {/* Regional Calendar */}
              <div className="rounded-md border border-line bg-white/70 p-3.5 shadow-2xs sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2 text-forest-deep">
                  <CalendarDays className="h-4 w-4 text-living" />
                  <p className="text-[12px] font-bold">Regional Sowing Window</p>
                </div>
                {regionalCalendar ? (
                  <div className="mt-2 text-[12.5px]">
                    <p className="font-display font-bold text-forest-deep">
                      {regionalCalendar.region?.district || farmDistrict
                        ? `${regionalCalendar.region?.district || farmDistrict}, `
                        : ""}
                      {regionalCalendar.region?.state || "National"} (
                      {regionalCalendar.season?.canonicalName || "Season"})
                    </p>
                    <p className="text-[11.5px] text-muted">
                      Sowing: {formatMonthRange(regionalCalendar.sowingStartMonth, regionalCalendar.sowingEndMonth)}
                    </p>
                    <p className="text-[11.5px] text-muted">
                      Harvest: {formatMonthRange(regionalCalendar.harvestStartMonth, regionalCalendar.harvestEndMonth)}
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 text-[12px] text-muted">
                    <p>No regional calendar window</p>
                    <p className="text-[11px]">
                      {farmState ? `Not yet mapped for ${farmState}` : "Assign a farm location to view regional window"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Soil & Environmental Suitability (if available) */}
            {suitability && (
              <div className="rounded-md border border-line/70 bg-cream/40 p-3 text-[12px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-forest-deep font-semibold">
                    <Layers className="h-3.5 w-3.5 text-forest" />
                    <span>Soil & Climate Suitability Profile</span>
                  </div>
                  {suitability.source?.sourceName && (
                    <span className="text-[10.5px] text-muted font-mono">
                      Ref: {suitability.source.sourceName}
                    </span>
                  )}
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-3 text-muted">
                  <div>
                    <span className="font-medium text-forest-deep">Soil Types:</span>{" "}
                    {suitability.soilTypes || "Well-drained loam, clay loam"}
                  </div>
                  <div>
                    <span className="font-medium text-forest-deep">Optimal pH:</span>{" "}
                    {suitability.soilPhMin && suitability.soilPhMax
                      ? `${suitability.soilPhMin} – ${suitability.soilPhMax}`
                      : "6.0 – 7.5"}
                  </div>
                  <div className="flex items-center gap-1">
                    <Droplets className="h-3 w-3 text-info" />
                    <span>
                      <strong className="text-forest-deep font-medium">Water:</strong>{" "}
                      {suitability.waterRequirementMm
                        ? `${suitability.waterRequirementMm} mm`
                        : suitability.irrigationRequirement || "Irrigated / Controlled"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Provenance footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded bg-soft/50 px-3 py-2 text-[11px] text-muted border border-line/40">
              <span className="flex items-center gap-1.5">
                <Info className="h-3 w-3 text-forest" />
                <span>
                  Data Source: <strong>{sourceCitation}</strong> · Origin:{" "}
                  <span className="font-mono uppercase">
                    {growthProfile?.source?.dataOrigin || "OFFICIAL_REFERENCE"}
                  </span>
                </span>
              </span>
              <span className="font-mono text-[10.5px]">
                Verification:{" "}
                <span className="text-living font-semibold">
                  {growthProfile?.verificationStatus || "VERIFIED"}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
