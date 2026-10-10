import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarRange,
  CloudRain,
  CloudSun,
  Droplets,
  Info,
  MapPin,
  Plug,
  Sprout,
  Sun,
  Thermometer,
  TriangleAlert,
  Wind,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Button, Card, CardHeader, EmptyState } from "@/components/common/ui";
import { WeatherChart } from "@/components/charts/WeatherChart";
import { ALL_FARMS, useStore } from "@/store/AppStore";
import { CONDITION_LABEL } from "@/services/weather/weatherService";
import { formatDate, formatWeekday, relativeTime } from "@/utils/date";
import { cn } from "@/utils/cn";

const CONDITION_ICON: Record<string, typeof Sun> = {
  clear: Sun,
  "partly-cloudy": CloudSun,
  overcast: CloudSun,
  rain: CloudRain,
  storm: TriangleAlert,
};

export default function WeatherPage() {
  const { farms, crops, forecasts, weather, selectedFarmId, selectFarm } = useStore();
  const navigate = useNavigate();

  const activeFarm =
    farms.find((f) => f.id === selectedFarmId) ?? farms[0] ?? null;
  const summary = activeFarm ? weather[activeFarm.id] : null;

  const overlaps = useMemo(() => {
    if (!activeFarm || !summary) return [];
    const wetDates = new Set(
      summary.daily.filter((d) => d.rainfallMm >= 8).map((d) => d.date)
    );
    return crops
      .filter((c) => c.farmId === activeFarm.id)
      .map((crop) => {
        const forecast = forecasts[crop.id];
        if (!forecast) return null;
        const inRange = [...wetDates].filter(
          (date) =>
            date >= forecast.estimatedWindowStart && date <= forecast.estimatedWindowEnd
        );
        const nearRange = [...wetDates].filter((date) => {
          const diff =
            (new Date(date).getTime() -
              new Date(forecast.estimatedWindowEnd).getTime()) /
            86_400_000;
          return diff > 0 && diff <= 7;
        });
        return { crop, forecast, inRange, nearRange };
      })
      .filter((x): x is NonNullable<typeof x> => !!x && (x.inRange.length > 0 || x.nearRange.length > 0));
  }, [activeFarm, summary, crops, forecasts]);

  if (!activeFarm || !summary) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="Weather intelligence" title="Weather context" />
        <EmptyState
          icon={<CloudRain className="h-5 w-5" aria-hidden />}
          title="No farm with a weather dataset"
          description="Add a farm to attach the demo weather dataset, then harvest-related cautions appear here."
          action={
            <Button size="sm" onClick={() => navigate("/app/farms")}>
              Go to farms
            </Button>
          }
        />
      </div>
    );
  }

  const Icon = CONDITION_ICON[summary.condition] ?? CloudSun;
  const totalRain = summary.daily.reduce((s, d) => s + d.rainfallMm, 0);
  const avgMax = Math.round(
    summary.daily.reduce((s, d) => s + d.maxTempC, 0) / summary.daily.length
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Weather intelligence"
        title={`Weather context · ${summary.locationLabel}`}
        subtitle="Read against your harvest windows rather than as a standalone forecast. Wet days that fall inside a window are called out per crop."
        meta={[
          {
            icon: <MapPin className="h-3.5 w-3.5" aria-hidden />,
            label: "Farm",
            value: (
              <select
                aria-label="Select farm for weather"
                value={selectedFarmId === ALL_FARMS ? activeFarm.id : selectedFarmId}
                onChange={(e) => selectFarm(e.target.value)}
                className="rounded-sm border border-line bg-white px-2 py-1 font-display text-[12.5px] font-semibold text-forest-deep outline-none focus:border-forest"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            ),
          },
          { label: "Observed", value: relativeTime(summary.observedAt) },
          { label: "Source", value: summary.sourceLabel },
        ]}
        actions={
          <Badge tone="info" icon={<Info className="h-3 w-3" aria-hidden />}>
            Demo dataset · not a live feed
          </Badge>
        }
      />

      <section aria-label="Current conditions" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Card className="relative overflow-hidden">
          <div className="relative border-b border-line bg-forest-deep px-6 py-7 text-cream">
            <div
              className="hw-drift pointer-events-none absolute -top-20 -right-10 h-52 w-52 rounded-full opacity-40"
              style={{
                background:
                  "radial-gradient(circle, rgba(184,203,167,0.5) 0%, rgba(184,203,167,0) 70%)",
              }}
              aria-hidden
            />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="hw-eyebrow font-semibold text-sage/80">Most recent reading</p>
                <p className="hw-num mt-2 text-[52px] leading-none font-extrabold">
                  {summary.temperatureC}°
                </p>
                <p className="mt-2 font-display text-[14px] font-semibold">
                  {CONDITION_LABEL[summary.condition]} · feels like {summary.feelsLikeC}°
                </p>
              </div>
              <span className="grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-white/10 text-gold">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-4 p-5">
            {[
              { icon: Droplets, label: "Humidity", value: `${summary.humidity}%` },
              { icon: Wind, label: "Wind", value: `${summary.windKph} km/h` },
              { icon: CloudRain, label: "Rain today", value: `${summary.rainfallMm} mm` },
              { icon: Thermometer, label: "10-day avg max", value: `${avgMax}°C` },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-line bg-cream/60 p-3.5">
                <dt className="flex items-center gap-1.5 text-[11.5px] text-muted">
                  <item.icon className="h-3.5 w-3.5" aria-hidden />
                  {item.label}
                </dt>
                <dd className="hw-num mt-1.5 text-[19px] font-bold text-forest-deep">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="px-5 pb-5 text-[12.5px] leading-relaxed text-muted">
            {summary.forecastSummary}
          </p>
        </Card>

        <Card>
          <CardHeader
            title="Ten-day context"
            subtitle={`Indicated rainfall totals ${Math.round(totalRain)} mm across the period.`}
            icon={<CalendarRange className="h-4 w-4" aria-hidden />}
          />
          <div className="p-5">
            <WeatherChart daily={summary.daily} height={240} />
            <div className="hw-scroll-x mt-4 flex gap-2 overflow-x-auto pb-1">
              {summary.daily.map((d) => {
                const DayIcon = CONDITION_ICON[d.condition] ?? CloudSun;
                return (
                  <motion.div
                    key={d.date}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "min-w-[86px] flex-1 rounded-md border p-2.5 text-center",
                      d.rainfallMm >= 15
                        ? "border-info/40 bg-[#eef4f8]"
                        : d.rainfallMm > 0
                          ? "border-line bg-white"
                          : "border-line bg-cream/60"
                    )}
                  >
                    <p className="font-mono text-[10px] tracking-wide text-muted uppercase">
                      {formatWeekday(d.date)}
                    </p>
                    <DayIcon className="mx-auto mt-1.5 h-4 w-4 text-forest" aria-hidden />
                    <p className="hw-num mt-1.5 text-[13px] font-bold text-forest-deep">
                      {d.maxTempC}°
                    </p>
                    <p className="font-mono text-[10px] text-muted">{d.rainfallMm} mm</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </Card>
      </section>

      <section aria-label="Harvest cautions" className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Harvest-related cautions"
            subtitle="Only the items that touch a harvest decision."
            icon={<TriangleAlert className="h-4 w-4" aria-hidden />}
          />
          <div className="flex flex-col gap-3 p-5">
            {summary.cautions.length > 0 ? (
              summary.cautions.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-md border p-4",
                    c.level === "caution"
                      ? "border-caution/40 bg-[#fdf6ec]"
                      : c.level === "watch"
                        ? "border-gold/50 bg-gold-soft/25"
                        : "border-line bg-cream/60"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      tone={c.level === "caution" ? "caution" : c.level === "watch" ? "gold" : "neutral"}
                    >
                      {c.level}
                    </Badge>
                    <p className="font-display text-[13.5px] font-bold text-forest-deep">
                      {c.title}
                    </p>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{c.detail}</p>
                  <p className="mt-2 font-mono text-[10.5px] tracking-wide text-muted uppercase">
                    {c.dates}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                icon={<Sun className="h-5 w-5" aria-hidden />}
                title="No caution in the next ten days"
                description="Nothing in this dataset would materially affect a harvest decision for this farm."
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Crop-specific impact"
            subtitle="Wet days that fall inside — or just after — an estimated window."
            icon={<Sprout className="h-4 w-4" aria-hidden />}
          />
          <div className="flex flex-col gap-3 p-5">
            {overlaps.length > 0 ? (
              overlaps.map(({ crop, forecast, inRange, nearRange }) => (
                <Link
                  key={crop.id}
                  to={`/app/crops/${crop.id}`}
                  className="group rounded-md border border-line bg-white p-4 transition-colors hover:border-living"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-display text-[13.5px] font-bold text-forest-deep">
                      {crop.name}
                      {crop.variety ? (
                        <span className="font-medium text-muted"> · {crop.variety}</span>
                      ) : null}
                    </p>
                    <Badge tone={inRange.length > 0 ? "caution" : "gold"}>
                      {inRange.length > 0
                        ? `${inRange.length} wet day${inRange.length === 1 ? "" : "s"} inside window`
                        : `${nearRange.length} wet day${nearRange.length === 1 ? "" : "s"} just after`}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[12.5px] text-muted">
                    Window {formatDate(forecast.estimatedWindowStart)} →{" "}
                    {formatDate(forecast.estimatedWindowEnd)} ·{" "}
                    {inRange.concat(nearRange).map((d) => formatDate(d)).slice(0, 3).join(", ")}
                  </p>
                </Link>
              ))
            ) : (
              <EmptyState
                icon={<CloudSun className="h-5 w-5" aria-hidden />}
                title="No wet days overlap these windows"
                description="For the crops on this farm, the indicated rainfall falls outside the estimated harvest ranges."
              />
            )}
          </div>
        </Card>
      </section>

      <Card>
        <CardHeader
          title="Data source and integration"
          subtitle="Where these numbers come from, and how a live provider would replace them."
          icon={<Plug className="h-4 w-4" aria-hidden />}
        />
        <div className="grid gap-5 p-5 lg:grid-cols-3">
          <div>
            <p className="hw-eyebrow font-semibold text-muted">Current source</p>
            <p className="mt-2 text-[13px] leading-relaxed text-forest-deep">
              {summary.sourceLabel}
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              Observed {relativeTime(summary.observedAt)} ({formatDate(summary.observedAt)}).
              The dataset is a stable regional pattern shipped with this frontend — it is not
              a live feed and does not claim to be one.
            </p>
          </div>
          <div>
            <p className="hw-eyebrow font-semibold text-muted">Interface</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Every screen reads weather through a single <code className="font-mono text-[12px] text-forest">WeatherProvider</code>{" "}
              contract: give it a farm (with optional coordinates), get back an observed
              snapshot, a daily forecast, cautions, a source label and a timestamp.
            </p>
          </div>
          <div>
            <p className="hw-eyebrow font-semibold text-muted">Going live</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Registering an API-backed provider replaces the demo values everywhere without
              touching UI code. Until then, forecasts that depend on weather say so
              explicitly in their contributing factors.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}


