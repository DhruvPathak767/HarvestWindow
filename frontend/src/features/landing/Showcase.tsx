import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  Activity,
  ArrowRight,
  CloudRain,
  Gauge,
  Layers,
  ListChecks,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { HarvestTimeline } from "@/components/charts/HarvestTimeline";
import { CountUp } from "@/components/common/CountUp";
import { SectionLabel } from "@/components/common/ui";
import { CropImage } from "@/components/common/CropImage";
import { SplitText } from "@/components/fx/text";
import { Magnetic } from "@/components/fx/motion";
import { Reveal } from "@/components/animation/Reveal";
import { CROP_IMAGES } from "@/data/mock/cropCatalog";
import { SEED_CROPS, SEED_FARMS, SEED_RECOMMENDATIONS } from "@/data/mock/seed";
import { computeForecast } from "@/services/forecast/forecastService";
import { weatherService } from "@/services/weather/weatherService";
import { formatDate } from "@/utils/date";
import { useStore } from "@/store/AppStore";
import { cn } from "@/utils/cn";

export function Showcase() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { startDemoSession, signedIn } = useStore();
  const [activeId, setActiveId] = useState("crop-paddy-jyothi");
  const stageRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: stageRef, offset: ["start end", "start 12%"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [42, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.78, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [70, 0]);
  const frameOpacity = useTransform(scrollYProgress, [0, 0.4], [0.25, 1]);
  const chipA = useTransform(scrollYProgress, [0, 1], [200, 0]);
  const chipB = useTransform(scrollYProgress, [0, 1], [300, 0]);
  const chipC = useTransform(scrollYProgress, [0, 1], [140, 0]);

  const data = useMemo(() => {
    const farm = SEED_FARMS[0];
    const weather = weatherService.snapshotForFarm(farm);
    const crops = SEED_CROPS.filter((c) => c.farmId === farm.id).map((crop) => ({
      crop,
      forecast: computeForecast(crop, weather),
    }));
    const approaching = crops.filter(
      (c) => c.forecast.readinessStatus === "approaching" || c.forecast.readinessStatus === "caution"
    ).length;
    const attention = crops.filter(
      (c) => c.forecast.readinessStatus === "caution" || c.forecast.readinessStatus === "passed"
    ).length;
    const next = crops
      .filter((c) => c.forecast.daysToWindowEnd >= 0)
      .sort(
        (a, b) =>
          Math.max(a.forecast.daysToWindowStart, 0) - Math.max(b.forecast.daysToWindowStart, 0)
      )[0];
    const rain = Math.round(weather.daily.slice(0, 6).reduce((s, d) => s + d.rainfallMm, 0));
    return { farm, weather, crops, approaching, attention, next, rain };
  }, []);

  const active = data.crops.find((c) => c.crop.id === activeId) ?? data.crops[0];
  const recommendation = SEED_RECOMMENDATIONS.find((r) => r.cropId === active.crop.id);

  return (
    <section
      id="product"
      className="relative scroll-mt-24 overflow-hidden bg-night py-24 text-cream sm:py-32"
      aria-labelledby="showcase-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(247,245,236,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(247,245,236,0.22) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse at 50% 30%, #000 20%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 30%, #000 20%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="hw-drift pointer-events-none absolute -top-40 left-1/3 h-[620px] w-[620px] rounded-full opacity-50 blur-[40px]"
        style={{ background: "radial-gradient(circle, rgba(91,140,69,0.45), transparent 66%)" }}
      />

      <div className="relative mx-auto w-full max-w-[1320px] px-5 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel tone="cream" className="justify-center">
            Inside the product
          </SectionLabel>
          <h2
            id="showcase-heading"
            className="mt-5 font-display text-[clamp(36px,5.4vw,80px)] leading-[0.98] font-extrabold tracking-[-0.045em] text-cream"
          >
            <SplitText text="The dashboard," inView />{" "}
            <SplitText
              text="rendered live."
              mode="words"
              inView
              delay={0.3}
              charClassName="hw-serif hw-gold-text pr-[0.06em] font-normal"
            />
          </h2>
          <Reveal delay={0.15}>
            <p className="mx-auto mt-6 max-w-xl text-[15px] leading-[1.75] text-sage/80">
              Not a screenshot. These are the workspace's own components on the demo dataset —
              pick a crop and the harvest window, readiness state and recommendation move together.
            </p>
          </Reveal>
        </div>

        <div ref={stageRef} className="relative mt-16" style={{ perspective: 2200 }}>
          <motion.div
            style={reduced ? undefined : { rotateX, scale, y, opacity: frameOpacity, transformOrigin: "50% 0%" }}
            className="relative"
          >
            <div className="overflow-hidden rounded-[26px] border border-white/12 bg-[#0f2a1c] shadow-[0_60px_120px_-50px_rgba(0,0,0,0.95)]">
              <div className="flex items-center gap-3 border-b border-white/10 bg-[#0b2116] px-4 py-3">
                <span className="flex gap-1.5" aria-hidden>
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e2735d]/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-gold/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-living/80" />
                </span>
                <span className="hidden rounded-full bg-white/8 px-4 py-1 font-mono text-[10.5px] text-sage/75 sm:block">
                  harvestwindow.app / overview
                </span>
                <span className="ml-auto rounded-full border border-gold/40 bg-gold/12 px-2.5 py-1 font-mono text-[10px] tracking-wide text-gold uppercase">
                  Demo dataset
                </span>
              </div>

              <div className="grid lg:grid-cols-[68px_minmax(0,1fr)]">
                <div className="hidden flex-col items-center gap-3 border-r border-white/10 py-5 lg:flex">
                  {[Layers, Activity, CloudRain, ListChecks].map((Icon, i) => (
                    <span
                      key={i}
                      className={cn(
                        "grid h-10 w-10 place-items-center rounded-xl transition-colors",
                        i === 0 ? "bg-white/12 text-gold" : "text-sage/60"
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                  ))}
                </div>

                <div className="bg-cream p-4 sm:p-6">
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Metric label="Active blocks" value={data.crops.length} icon={<Layers className="h-3.5 w-3.5" aria-hidden />} />
                    <Metric label="Approaching" value={data.approaching} tone="gold" icon={<Activity className="h-3.5 w-3.5" aria-hidden />} />
                    <Metric label="Needs attention" value={data.attention} tone="caution" icon={<TriangleAlert className="h-3.5 w-3.5" aria-hidden />} />
                    <div className="rounded-xl border border-line bg-white p-3">
                      <p className="hw-eyebrow text-muted">Next harvest</p>
                      <p className="mt-1.5 truncate font-display text-[14px] font-bold text-forest-deep">
                        {data.next ? data.next.crop.name : "—"}
                      </p>
                      <p className="font-mono text-[11px] text-muted">
                        {data.next ? formatDate(data.next.forecast.estimatedWindowStart) : ""}
                      </p>
                    </div>
                  </div>

                  <div className="hw-scroll-x mt-5 flex gap-2 overflow-x-auto pb-1">
                    {data.crops.map(({ crop }) => (
                      <button
                        key={crop.id}
                        type="button"
                        onClick={() => setActiveId(crop.id)}
                        aria-pressed={crop.id === active.crop.id}
                        className={cn(
                          "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-all duration-200",
                          crop.id === active.crop.id
                            ? "border-forest-deep bg-forest-deep text-cream"
                            : "border-line bg-white text-forest-deep hover:border-living"
                        )}
                      >
                        <CropImage src={CROP_IMAGES[crop.name]} alt="" cropName={crop.name} className="h-5 w-5 rounded-full" />
                        {crop.name}
                      </button>
                    ))}
                  </div>

                  <motion.div
                    key={active.crop.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-4 rounded-2xl border border-line bg-white p-5"
                  >
                    <HarvestTimeline forecast={active.forecast} crop={active.crop} farmName={data.farm.name} />
                    <div className="mt-5 grid gap-3 border-t border-line pt-4 md:grid-cols-2">
                      <div className="rounded-xl border border-line bg-cream/70 p-3.5">
                        <p className="hw-eyebrow flex items-center gap-2 text-muted">
                          <ListChecks className="h-3.5 w-3.5 text-living" aria-hidden />
                          Recommended next action
                        </p>
                        <p className="mt-2 text-[13px] leading-relaxed font-medium text-forest-deep">
                          {recommendation?.title ?? active.forecast.nextAction}
                        </p>
                        <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
                          {recommendation?.reason ?? "Generated from the crop's position relative to its estimated window."}
                        </p>
                      </div>
                      <div className="rounded-xl border border-line bg-cream/70 p-3.5">
                        <p className="hw-eyebrow flex items-center gap-2 text-muted">
                          <CloudRain className="h-3.5 w-3.5 text-info" aria-hidden />
                          Weather · {data.weather.locationLabel}
                        </p>
                        <div className="mt-2.5 flex items-end gap-1.5">
                          {data.weather.daily.map((d) => (
                            <span key={d.date} className="flex flex-1 flex-col items-center gap-1">
                              <motion.span
                                className={cn(
                                  "w-full rounded-t-[2px]",
                                  d.rainfallMm >= 15 ? "bg-info" : d.rainfallMm > 0 ? "bg-info/55" : "bg-line"
                                )}
                                initial={{ height: 2 }}
                                whileInView={{ height: Math.max(4, Math.min(34, d.rainfallMm * 1.4 + 4)) }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                              />
                              <span className="font-mono text-[8.5px] text-muted">{d.maxTempC}°</span>
                            </span>
                          ))}
                        </div>
                        <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
                          Indicated rainfall and daily max. Demo dataset, updated {formatDate(data.weather.observedAt)}.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* parallax glass chips */}
          <motion.div
            style={reduced ? undefined : { y: chipA }}
            className="hw-hud absolute top-[14%] -left-8 hidden items-center gap-3 rounded-2xl px-4 py-3 xl:flex"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gold/15 text-gold">
              <Timer className="h-4 w-4" aria-hidden />
            </span>
            <span>
              <span className="block font-display text-[13.5px] font-bold text-cream">
                {data.next
                  ? data.next.forecast.daysToWindowStart > 0
                    ? `Opens in ${data.next.forecast.daysToWindowStart} days`
                    : "Window open now"
                  : "No open window"}
              </span>
              <span className="block text-[11px] text-sage/70">{data.next?.crop.name ?? "—"}</span>
            </span>
          </motion.div>
          <motion.div
            style={reduced ? undefined : { y: chipB }}
            className="hw-hud absolute top-[42%] -right-8 hidden items-center gap-3 rounded-2xl px-4 py-3 xl:flex"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#3E6E8E]/30 text-[#9cc3dc]">
              <CloudRain className="h-4 w-4" aria-hidden />
            </span>
            <span>
              <span className="block font-display text-[13.5px] font-bold text-cream">
                Rain spell · {data.rain} mm
              </span>
              <span className="block text-[11px] text-sage/70">Next 6 days · demo data</span>
            </span>
          </motion.div>
          <motion.div
            style={reduced ? undefined : { y: chipC }}
            className="hw-hud absolute bottom-[8%] -left-6 hidden items-center gap-3 rounded-2xl px-4 py-3 xl:flex"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-living/25 text-sage">
              <Gauge className="h-4 w-4" aria-hidden />
            </span>
            <span>
              <span className="block font-display text-[13.5px] font-bold text-cream">
                Inputs {active.forecast.confidence ?? "—"}% complete
              </span>
              <span className="block text-[11px] text-sage/70">Not a claim of accuracy</span>
            </span>
          </motion.div>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-[12%] -bottom-20 h-40 rounded-full bg-gold/20 blur-[80px]"
          />
        </div>

        <Reveal delay={0.1} className="mt-14 flex flex-wrap items-center justify-center gap-5">
          <Magnetic>
            <button
              type="button"
              onClick={() => {
                if (!signedIn) startDemoSession();
                navigate("/app");
              }}
              className="hw-shine inline-flex h-[52px] items-center gap-2.5 rounded-full bg-cream px-7 font-display text-[15px] font-bold text-night transition-transform active:scale-[0.97]"
            >
              Open the full workspace
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </Magnetic>
          <p className="text-[13px] text-sage/70">Estimates are ranges from recorded inputs · labelled as demo data</p>
        </Reveal>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  icon,
  tone = "forest",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "forest" | "gold" | "caution";
}) {
  const tones = { forest: "text-forest", gold: "text-[#8a6415]", caution: "text-caution" } as const;
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <p className="hw-eyebrow flex items-center gap-1.5 text-muted">
        <span className={tones[tone]}>{icon}</span>
        {label}
      </p>
      <p className={cn("hw-num mt-1.5 text-[28px] leading-none font-extrabold", tones[tone])}>
        <CountUp value={value} duration={900} />
      </p>
    </div>
  );
}
