import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarRange,
  CheckCircle2,
  CloudRain,
  Gauge,
  ListChecks,
  MapPin,
  Sprout,
} from "lucide-react";
import { Render3D, Spotlight } from "@/components/fx/motion";
import { SplitText } from "@/components/fx/text";
import { Reveal } from "@/components/animation/Reveal";
import { SectionLabel, StatusBadge } from "@/components/common/ui";
import { MiniTimeline } from "@/components/charts/HarvestTimeline";
import { IMAGES_3D } from "@/data/mock/renders";
import { SEED_CROPS, SEED_FARMS } from "@/data/mock/seed";
import { computeForecast } from "@/services/forecast/forecastService";
import { weatherService } from "@/services/weather/weatherService";
import type { ReadinessStatus } from "@/types";
import { formatDate } from "@/utils/date";
import { cn } from "@/utils/cn";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Features() {
  const data = useMemo(() => {
    const farm = SEED_FARMS[0];
    const weather = weatherService.snapshotForFarm(farm);
    const paddy = SEED_CROPS.find((c) => c.id === "crop-paddy-jyothi")!;
    const groundnut = SEED_CROPS.find((c) => c.id === "crop-groundnut-tmv")!;
    return {
      weather,
      paddy,
      paddyForecast: computeForecast(paddy, weather),
      groundnut,
      groundnutForecast: computeForecast(groundnut, weather),
    };
  }, []);

  const statuses: ReadinessStatus[] = ["growing", "approaching", "in-window", "caution", "passed"];

  return (
    <section className="relative overflow-hidden bg-[#F2F0E6] py-24 sm:py-32" aria-labelledby="features-heading">
      <div aria-hidden className="hw-grain pointer-events-none absolute inset-0 opacity-70" />
      <div className="relative mx-auto w-full max-w-[1320px] px-5 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)] lg:items-end">
          <div>
            <SectionLabel>Capabilities</SectionLabel>
            <h2
              id="features-heading"
              className="mt-5 font-display text-[clamp(36px,5vw,72px)] leading-[0.98] font-extrabold tracking-[-0.045em] text-forest-deep"
            >
              <SplitText text="Six things it" inView />{" "}
              <SplitText
                text="actually does."
                mode="words"
                inView
                delay={0.3}
                charClassName="hw-serif pr-[0.06em] font-normal text-living"
              />
            </h2>
          </div>
          <Reveal delay={0.1}>
            <p className="max-w-md text-[15.5px] leading-[1.75] text-muted">
              Each one is live in the demo workspace, on the same sample farms, crops and weather
              dataset you can click through.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-6">
          {/* 1 — harvest window estimation */}
          <Reveal className="lg:col-span-4" y={30}>
            <Spotlight className="h-full p-7 sm:p-8">
              <div className="flex h-full flex-col gap-7">
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-night text-gold shadow-[0_14px_30px_-14px_rgba(6,20,13,0.9)]">
                    <CalendarRange className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-display text-[22px] leading-tight font-bold text-forest-deep">
                      Harvest-window estimation
                    </h3>
                    <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-muted">
                      A range with a start and an end, computed from the recorded planting date and
                      the crop's reference duration, then adjusted for the farm's weather dataset.
                    </p>
                  </div>
                </div>
                <div className="mt-auto rounded-2xl border border-line bg-cream/70 p-5">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="hw-eyebrow text-muted">
                        Live · {data.paddy.name} {data.paddy.variety}
                      </p>
                      <p className="hw-num mt-2 text-[clamp(22px,3vw,34px)] leading-none font-extrabold text-forest-deep">
                        {formatDate(data.paddyForecast.estimatedWindowStart)}
                        <span className="mx-2 text-muted">→</span>
                        {formatDate(data.paddyForecast.estimatedWindowEnd)}
                      </p>
                    </div>
                    <StatusBadge status={data.paddyForecast.readinessStatus} full />
                  </div>
                  <MiniTimeline forecast={data.paddyForecast} className="mt-5" />
                </div>
              </div>
            </Spotlight>
          </Reveal>

          {/* 2 — readiness monitoring (dark, tall, 3D render) */}
          <Reveal className="md:row-span-2 lg:col-span-2" delay={0.06} y={30}>
            <Spotlight tone="dark" className="h-full">
              <div className="flex h-full flex-col p-7">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-gold">
                  <Sprout className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-5 font-display text-[21px] leading-tight font-bold text-cream">
                  Crop readiness monitoring
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-sage/75">
                  Plain-language states for every block — the label and icon carry the meaning,
                  colour only reinforces it.
                </p>
                <ul className="mt-5 flex flex-col gap-2">
                  {statuses.map((s, i) => (
                    <motion.li
                      key={s}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.07, ease: EASE }}
                    >
                      <StatusBadge status={s} full />
                    </motion.li>
                  ))}
                </ul>
                <Render3D
                  src={IMAGES_3D.earReady}
                  alt="3D render of a ripe golden wheat ear"
                  mask
                  float="slow"
                  glow="radial-gradient(circle, rgba(232,182,74,0.35), transparent 70%)"
                  className="mx-auto mt-6 aspect-square w-[78%] max-w-[260px]"
                  imgClassName="rounded-full"
                />
                <p className="mt-auto pt-4 text-[11.5px] leading-relaxed text-sage/55">
                  A readiness state is an estimate from recorded inputs — not a measured maturity reading.
                </p>
              </div>
            </Spotlight>
          </Reveal>

          {/* 3 — weather-aware planning */}
          <Reveal className="lg:col-span-2" delay={0.04} y={30}>
            <Spotlight className="h-full p-7">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e6eef4] text-info">
                <CloudRain className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-5 font-display text-[19px] leading-tight font-bold text-forest-deep">
                Weather-aware planning
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                Rain and heat are read against the window, not shown as a generic forecast.
              </p>
              <WeatherBars daily={data.weather.daily.slice(0, 8)} />
              <p className="mt-3 font-mono text-[10px] tracking-wide text-muted uppercase">
                {data.weather.sourceLabel}
              </p>
            </Spotlight>
          </Reveal>

          {/* 4 — recommendations */}
          <Reveal className="lg:col-span-2" delay={0.1} y={30}>
            <Spotlight className="h-full p-7">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-soft text-[#8a6415]">
                <ListChecks className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-5 font-display text-[19px] leading-tight font-bold text-forest-deep">
                Crop-specific recommendations
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {[
                  "Check grain moisture on the Jyothi block",
                  "Confirm the combine slot before the warm days",
                  "Plan cotton picking around two dry days",
                ].map((text, i) => (
                  <motion.li
                    key={text}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="flex items-start gap-2.5 text-[13px] leading-snug text-ink"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-living" aria-hidden />
                    {text}
                  </motion.li>
                ))}
              </ul>
              <p className="mt-4 text-[11.5px] leading-relaxed text-muted">
                No chemical or pesticide prescriptions — those need a qualified agronomist.
              </p>
            </Spotlight>
          </Reveal>

          {/* 5 — farm & field overview with CSS 3D isometric plots */}
          <Reveal className="lg:col-span-3" delay={0.04} y={30}>
            <Spotlight tone="dark" className="h-full">
              <div className="grid h-full gap-4 p-7 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
                <div>
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-gold">
                    <MapPin className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 font-display text-[19px] leading-tight font-bold text-cream">
                    Farm and field overview
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-sage/75">
                    Group blocks by farm, switch context in one click, keep hectares or acres.
                  </p>
                  <ul className="mt-4 flex flex-col gap-1.5 text-[12.5px]">
                    {SEED_FARMS.map((f) => (
                      <li key={f.id} className="flex items-center justify-between gap-3 text-sage/80">
                        <span className="truncate">{f.name}</span>
                        <span className="hw-num shrink-0 font-semibold text-cream">
                          {f.area} {f.areaUnit === "hectare" ? "ha" : "ac"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <IsoFarm />
              </div>
            </Spotlight>
          </Reveal>

          {/* 6 — confidence & factors */}
          <Reveal className="lg:col-span-3" delay={0.1} y={30}>
            <Spotlight className="h-full p-7">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-night text-sage">
                  <Gauge className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-display text-[19px] leading-tight font-bold text-forest-deep">
                    Confidence and supporting factors
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                    Every estimate publishes its inputs. The percentage is input completeness — never
                    a claim of prediction accuracy.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-5">
                <ConfidenceRing value={data.groundnutForecast.confidence ?? 0} />
                <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
                  {data.groundnutForecast.contributingFactors.slice(0, 4).map((f) => (
                    <li key={f.label} className="flex items-center gap-2 text-[12.5px] text-ink">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          f.direction === "advances"
                            ? "bg-gold"
                            : f.direction === "delays"
                              ? "bg-info"
                              : f.direction === "supports"
                                ? "bg-living"
                                : "bg-line"
                        )}
                        aria-hidden
                      />
                      <span className="truncate">{f.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Spotlight>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function WeatherBars({ daily }: { daily: { date: string; rainfallMm: number }[] }) {
  const reduced = useReducedMotion();
  return (
    <div className="mt-5 flex h-16 items-end gap-1.5">
      {daily.map((d, i) => (
        <motion.span
          key={d.date}
          className={cn(
            "flex-1 rounded-t-[4px]",
            d.rainfallMm >= 15 ? "bg-info" : d.rainfallMm > 0 ? "bg-info/50" : "bg-line"
          )}
          initial={reduced ? false : { height: 4 }}
          whileInView={{ height: Math.max(6, Math.min(60, d.rainfallMm * 2 + 6)) }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: i * 0.05, ease: EASE }}
        />
      ))}
    </div>
  );
}

function ConfidenceRing({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const r = 32;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#E3E7DC" strokeWidth="7" />
        <motion.circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c - (c * value) / 100 }}
          viewport={{ once: true }}
          transition={{ duration: reduced ? 0 : 1.2, ease: EASE }}
        />
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5B8C45" />
            <stop offset="100%" stopColor="#E8B64A" />
          </linearGradient>
        </defs>
      </svg>
      <span className="hw-num absolute inset-0 grid place-items-center text-[20px] font-extrabold text-forest-deep">
        {value}%
      </span>
    </div>
  );
}

/** Isometric CSS-3D farm: plots rise into blocks as they enter view. */
function IsoFarm() {
  const reduced = useReducedMotion();
  const tiles = [
    { c: "#E8B64A", z: 26 }, { c: "#5B8C45", z: 14 }, { c: "#E8B64A", z: 30 }, { c: "#8B6548", z: 6 },
    { c: "#5B8C45", z: 18 }, { c: "#F2CF7A", z: 36 }, { c: "#5B8C45", z: 12 }, { c: "#E8B64A", z: 24 },
    { c: "#8B6548", z: 8 }, { c: "#E8B64A", z: 28 }, { c: "#B8CBA7", z: 16 }, { c: "#5B8C45", z: 20 },
    { c: "#5B8C45", z: 10 }, { c: "#E8B64A", z: 22 }, { c: "#8B6548", z: 6 }, { c: "#F2CF7A", z: 32 },
  ];
  return (
    <div className="relative mx-auto h-[230px] w-full max-w-[300px]" style={{ perspective: 1200 }} aria-hidden>
      <div
        className="absolute top-1/2 left-1/2 grid h-[190px] w-[190px] -translate-x-1/2 -translate-y-1/2 grid-cols-4 gap-2"
        style={{ transform: "rotateX(58deg) rotateZ(45deg)", transformStyle: "preserve-3d" }}
      >
        {tiles.map((t, i) => (
          <motion.div
            key={i}
            className="rounded-[5px]"
            style={{
              background: `linear-gradient(135deg, ${t.c}, ${t.c}cc)`,
              boxShadow: `4px 4px 0 0 rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08) inset`,
              transformStyle: "preserve-3d",
            }}
            initial={reduced ? false : { z: 0, opacity: 0 }}
            whileInView={{ z: t.z, opacity: 1 }}
            whileHover={{ z: t.z + 18 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.05 * i, ease: EASE }}
          />
        ))}
      </div>
      <div className="absolute inset-x-[18%] bottom-2 h-6 rounded-full bg-black/40 blur-xl" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Benefits — sticky 3D farm island                                  */
/* ------------------------------------------------------------------ */

const BENEFITS = [
  {
    title: "Plan harvesting instead of reacting to it",
    body: "See which blocks open first and arrange labour, machinery and buyers against a date range you can defend.",
  },
  {
    title: "Notice when timing shifts",
    body: "When weather context moves an estimate, the window moves visibly — and the reason is listed beside it.",
  },
  {
    title: "Spot weather risk before it lands",
    body: "Rain inside an open window, or a warm spell that pulls it forward, is flagged on the crop it affects.",
  },
  {
    title: "Decide with the inputs in front of you",
    body: "Planting date, reference duration, variety, irrigation and weather shown together — gaps marked as gaps.",
  },
];

export function Benefits() {
  return (
    <section
      id="benefits"
      className="relative scroll-mt-24 bg-cream py-24 sm:py-32"
      aria-labelledby="benefits-heading"
    >
      <div className="mx-auto grid w-full max-w-[1320px] gap-14 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Reveal y={30}>
            <div className="relative overflow-hidden rounded-[36px] bg-night-3 p-7 text-cream sm:p-9">
              <div aria-hidden className="hw-grain-light pointer-events-none absolute inset-0 opacity-60" />
              <div
                aria-hidden
                className="hw-drift pointer-events-none absolute -right-24 -bottom-24 h-[420px] w-[420px] rounded-full"
                style={{ background: "radial-gradient(circle, rgba(232,182,74,0.28), transparent 66%)" }}
              />
              <div className="relative">
                <SectionLabel tone="cream">Why it matters</SectionLabel>
                <h2
                  id="benefits-heading"
                  className="mt-4 font-display text-[clamp(30px,3.6vw,50px)] leading-[1.02] font-extrabold tracking-[-0.04em] text-cream"
                >
                  Better decisions,{" "}
                  <span className="hw-serif hw-gold-text pr-1 font-normal">not bolder promises.</span>
                </h2>
                <p className="mt-4 max-w-md text-[14.5px] leading-[1.75] text-sage/80">
                  No promised yields, guaranteed prices or perfect dates — just a shorter distance
                  between what a farmer knows and what a farmer must decide.
                </p>

                <div className="relative mx-auto mt-6 aspect-square w-full max-w-[460px]">
                  <div aria-hidden className="hw-spin-slow absolute inset-[4%] rounded-full border border-dashed border-white/15" />
                  <div aria-hidden className="hw-spin-rev absolute inset-[12%] rounded-full border border-white/10">
                    <span className="absolute top-1/2 -left-1 h-2 w-2 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_14px_rgba(232,182,74,0.9)]" />
                  </div>
                  <Render3D
                    src={IMAGES_3D.island}
                    alt="3D render of a floating farm island with wheat, paddy and a farmhouse"
                    mask="soft"
                    float="slow"
                    glow="radial-gradient(circle, rgba(232,182,74,0.3), transparent 70%)"
                    className="absolute inset-[6%]"
                    imgClassName="rounded-full"
                  />
                  <div className="hw-hud absolute top-[10%] -left-2 rounded-2xl px-3.5 py-2.5 sm:left-0">
                    <p className="hw-num text-[20px] leading-none font-extrabold text-cream">3 farms</p>
                    <p className="mt-1 text-[10.5px] text-sage/70">8 crop blocks tracked</p>
                  </div>
                  <div className="hw-hud absolute right-0 bottom-[12%] rounded-2xl px-3.5 py-2.5">
                    <p className="font-display text-[13px] font-bold text-cream">Ranges, not dates</p>
                    <p className="mt-1 text-[10.5px] text-sage/70">Inputs always listed</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        <ol className="flex flex-col">
          {BENEFITS.map((item, i) => (
            <Reveal key={item.title} delay={0.05} as="li">
              <div className="group grid grid-cols-[auto_1fr] gap-6 border-b border-forest-deep/10 py-9 first:pt-2 last:border-0 sm:gap-8">
                <span className="hw-num font-display text-[44px] leading-none font-extrabold text-forest-deep/15 transition-colors duration-500 group-hover:text-gold sm:text-[60px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-[clamp(21px,2.2vw,28px)] leading-snug font-bold tracking-[-0.03em] text-forest-deep">
                    <SplitText text={item.title} inView mode="words" stagger={0.05} />
                  </h3>
                  <p className="mt-3 max-w-xl text-[15px] leading-[1.75] text-muted">{item.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
