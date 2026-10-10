import { useCallback, useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowRight, CloudRain, Droplets, MousePointer2, ShieldCheck, Sparkles } from "lucide-react";
import { WheatField } from "@/components/three/WheatField";
import { ScrambleText, SplitText } from "@/components/fx/text";
import { Magnetic } from "@/components/fx/motion";
import { useIntro } from "@/features/landing/intro";
import { scrollToId } from "@/lib/smoothScroll";
import { SEED_CROPS, SEED_FARMS } from "@/data/mock/seed";
import { computeForecast } from "@/services/forecast/forecastService";
import { weatherService } from "@/services/weather/weatherService";
import { READINESS_META } from "@/types";
import { addDays, daysBetween, formatDate, formatShortDate, startOfToday } from "@/utils/date";
import { useStore } from "@/store/AppStore";
import { cn } from "@/utils/cn";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const introDone = useIntro();
  const { startDemoSession, signedIn } = useStore();
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    progressRef.current = v;
  });
  const getProgress = useCallback(() => progressRef.current, []);

  const contentOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.3], [0, -120]);
  const contentScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.94]);
  const hudOpacity = useTransform(scrollYProgress, [0, 0.16], [1, 0]);
  const hudY = useTransform(scrollYProgress, [0, 0.3], [0, 90]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.05], [1, 0]);
  const chapterOpacity = useTransform(scrollYProgress, [0.28, 0.4, 0.58, 0.68], [0, 1, 1, 0]);
  const chapterY = useTransform(scrollYProgress, [0.28, 0.68], [50, -50]);
  const chapterScale = useTransform(scrollYProgress, [0.28, 0.68], [0.92, 1.06]);
  const flareOpacity = useTransform(scrollYProgress, [0.66, 0.88, 1], [0, 0.95, 0]);
  const flareScale = useTransform(scrollYProgress, [0.66, 1], [0.5, 1.8]);
  const fadeOpacity = useTransform(scrollYProgress, [0.86, 1], [0, 1]);

  // pointer parallax for the floating HUD panels
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spx = useSpring(px, { stiffness: 70, damping: 16 });
  const spy = useSpring(py, { stiffness: 70, damping: 16 });
  const aRotY = useTransform(spx, [-0.5, 0.5], [-20, -4]);
  const aRotX = useTransform(spy, [-0.5, 0.5], [9, -7]);
  const aX = useTransform(spx, [-0.5, 0.5], [-18, 18]);
  const bRotY = useTransform(spx, [-0.5, 0.5], [6, 22]);
  const bRotX = useTransform(spy, [-0.5, 0.5], [7, -9]);
  const bX = useTransform(spx, [-0.5, 0.5], [14, -14]);

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };

  const hero = useMemo(() => {
    const farm = SEED_FARMS[0];
    const crop = SEED_CROPS[0];
    const weather = weatherService.snapshotForFarm(farm);
    return { farm, crop, weather, forecast: computeForecast(crop, weather) };
  }, []);

  const openDashboard = () => {
    if (!signedIn) startDemoSession();
    navigate("/app");
  };

  const reveal = (delay: number) => ({
    initial: reduced ? false : { opacity: 0, y: 24 },
    animate: introDone ? { opacity: 1, y: 0 } : undefined,
    transition: { duration: 0.9, ease: EASE, delay },
  });

  return (
    <section
      ref={sectionRef}
      className={cn("relative", reduced ? "h-[100svh] min-h-[680px]" : "h-[230vh]")}
      aria-labelledby="hero-headline"
    >
      <div
        className="sticky top-0 h-[100svh] min-h-[680px] overflow-hidden bg-night"
        onPointerMove={onPointerMove}
      >
        {/* sky fallback beneath the canvas */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg,#020B06 0%,#0B2416 46%,#5A3F19 60%,#0A1208 100%)",
          }}
        />
        <WheatField getProgress={getProgress} play={introDone} />

        {/* cinematic grade */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(130% 95% at 50% 42%, transparent 52%, rgba(1,8,4,0.82) 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-night/85 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-[55%] bg-gradient-to-r from-night/55 to-transparent max-lg:hidden"
        />
        <div aria-hidden className="hw-noise pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay" />

        {/* ---------------------------------------------------------- copy */}
        <motion.div
          style={reduced ? undefined : { opacity: contentOpacity, y: contentY, scale: contentScale }}
          className="relative z-10 mx-auto flex h-full w-full max-w-[1320px] flex-col px-5 pt-[17svh] sm:px-8 lg:pt-[18svh]"
        >
          <motion.div {...reveal(0.05)} className="flex">
            <span className="hw-hud inline-flex items-center gap-2.5 rounded-full py-1.5 pr-4 pl-2">
              <span className="relative grid h-5 w-5 place-items-center rounded-full bg-gold/15">
                <span className="hw-pulse-ring absolute inset-0 rounded-full border border-gold/60" />
                <Sparkles className="h-3 w-3 text-gold" aria-hidden />
              </span>
              <ScrambleText
                text="AI-POWERED HARVEST INTELLIGENCE"
                play={introDone}
                className="hw-eyebrow font-semibold text-cream/90"
              />
            </span>
          </motion.div>

          <h1
            id="hero-headline"
            className="mt-7 max-w-[13ch] font-display text-[clamp(46px,7vw,112px)] leading-[0.92] font-extrabold tracking-[-0.045em] text-cream"
          >
            <SplitText text="Harvest at the" play={introDone} delay={0.15} className="block" />
            <SplitText
              text="right moment."
              mode="words"
              play={introDone}
              delay={0.5}
              className="block pt-1"
              charClassName="hw-serif hw-gold-text pr-[0.08em] text-[1.08em] leading-[0.95]"
            />
          </h1>

          <motion.p
            {...reveal(0.75)}
            className="mt-7 max-w-[30rem] text-[15px] leading-[1.75] text-sage/85 sm:text-[16.5px]"
          >
            HarvestWindow turns the planting date you already know, the crop you chose and the
            weather around your farm into an{" "}
            <span className="font-semibold text-cream">estimated harvest window</span> — a range
            with its reasons — so labour, machines and buyers are planned before the field
            decides for you.
          </motion.p>

          <motion.div {...reveal(0.9)} className="mt-9 flex flex-wrap items-center gap-3">
            <Magnetic>
              <button
                type="button"
                onClick={openDashboard}
                className="hw-shine inline-flex h-[52px] items-center gap-2.5 rounded-full bg-gold px-7 font-display text-[15px] font-bold text-night shadow-[0_18px_44px_-14px_rgba(232,182,74,0.75)] transition-transform active:scale-[0.97]"
              >
                Explore your harvest
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </Magnetic>
            <Magnetic>
              <button
                type="button"
                onClick={() => scrollToId("how-it-works")}
                className="hw-glass-btn inline-flex h-[52px] items-center gap-2.5 rounded-full px-6 font-display text-[15px] font-semibold"
              >
                See how it works
              </button>
            </Magnetic>
          </motion.div>

          <motion.ul
            {...reveal(1.05)}
            className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] text-sage/75"
          >
            {["Ranges, not false precision", "Every estimate lists its inputs", "Demo data labelled as demo"].map(
              (t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-gold/90" aria-hidden />
                  {t}
                </li>
              )
            )}
          </motion.ul>
        </motion.div>

        {/* ------------------------------------------------------ HUD cards */}
        <motion.div
          style={reduced ? undefined : { opacity: hudOpacity, y: hudY }}
          className="pointer-events-none absolute inset-0 z-10 hidden lg:block"
          aria-hidden={false}
        >
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 40, filter: "blur(10px)" }}
            animate={introDone ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined}
            transition={{ duration: 1.1, ease: EASE, delay: 1.1 }}
            className="absolute right-[4%] bottom-[10%] w-[340px]"
            style={{ perspective: 1100 }}
          >
            <motion.div
              style={{ rotateY: aRotY, rotateX: aRotX, x: aX, transformStyle: "preserve-3d" }}
              className="pointer-events-auto"
            >
              <div className="hw-hud hw-float rounded-[22px] p-5">
                <div className="flex items-start justify-between gap-3" style={{ transform: "translateZ(30px)" }}>
                  <div className="min-w-0">
                    <p className="hw-eyebrow text-sage/70">Estimated harvest window</p>
                    <p className="mt-1.5 truncate font-display text-[15px] font-bold text-cream">
                      {hero.crop.name}
                      <span className="font-medium text-sage/80"> · {hero.crop.variety}</span>
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-gold/40 bg-gold/15 px-2.5 py-1 text-[11px] font-semibold text-gold">
                    {READINESS_META[hero.forecast.readinessStatus].short}
                  </span>
                </div>
                <p
                  className="hw-num mt-4 text-[26px] leading-none font-extrabold text-cream"
                  style={{ transform: "translateZ(45px)" }}
                >
                  {formatShortDate(hero.forecast.estimatedWindowStart)}
                  <span className="mx-2 text-[17px] font-semibold text-sage/70">→</span>
                  {formatDate(hero.forecast.estimatedWindowEnd)}
                </p>
                <div className="mt-5" style={{ transform: "translateZ(20px)" }}>
                  <HudTimeline
                    start={hero.forecast.estimatedWindowStart}
                    end={hero.forecast.estimatedWindowEnd}
                    play={introDone}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11.5px] text-sage/70">
                  <span>
                    {hero.forecast.daysToWindowStart > 0
                      ? `Opens in ${hero.forecast.daysToWindowStart} days`
                      : hero.forecast.daysToWindowEnd >= 0
                        ? `Open now · ${hero.forecast.daysToWindowEnd} days left`
                        : "Window closed"}
                  </span>
                  <span className="font-mono text-[10px] tracking-wide uppercase">Demo engine</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 40, filter: "blur(10px)" }}
            animate={introDone ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined}
            transition={{ duration: 1.1, ease: EASE, delay: 1.3 }}
            className="absolute right-[30%] bottom-[7%] w-[230px]"
            style={{ perspective: 1100 }}
          >
            <motion.div
              style={{ rotateY: bRotY, rotateX: bRotX, x: bX, transformStyle: "preserve-3d" }}
              className="pointer-events-auto"
            >
              <div className="hw-hud hw-float-slow rounded-[20px] p-4">
                <div className="flex items-center gap-3" style={{ transform: "translateZ(30px)" }}>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#3E6E8E]/30 text-[#9cc3dc]">
                    <CloudRain className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <div>
                    <p className="hw-num text-[22px] leading-none font-extrabold text-cream">
                      {hero.weather.temperatureC}°
                    </p>
                    <p className="mt-1 text-[11px] text-sage/70">{hero.farm.district} · demo data</p>
                  </div>
                </div>
                <div className="mt-3 flex items-end gap-1" style={{ transform: "translateZ(18px)" }}>
                  {hero.weather.daily.slice(0, 8).map((d, i) => (
                    <motion.span
                      key={d.date}
                      initial={{ height: 3 }}
                      animate={introDone ? { height: Math.max(4, Math.min(30, d.rainfallMm * 1.1 + 4)) } : undefined}
                      transition={{ delay: 1.6 + i * 0.05, duration: 0.6, ease: EASE }}
                      className={cn(
                        "flex-1 rounded-t-[2px]",
                        d.rainfallMm >= 15 ? "bg-[#7fb0cf]" : d.rainfallMm > 0 ? "bg-[#7fb0cf]/50" : "bg-white/15"
                      )}
                    />
                  ))}
                </div>
                <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-sage/80">
                  <Droplets className="h-3 w-3" aria-hidden />
                  Rain spell in 3 days · {hero.weather.humidity}% RH
                </p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* interaction hint + scroll cue */}
        <motion.div
          style={reduced ? undefined : { opacity: cueOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex items-end justify-between px-5 sm:px-8"
        >
          <span className="hidden items-center gap-2 text-[11.5px] text-sage/60 lg:inline-flex">
            <MousePointer2 className="h-3.5 w-3.5 text-gold/80" aria-hidden />
            Move your cursor through the wheat
          </span>
          <span className="mx-auto flex flex-col items-center gap-2 lg:mx-0">
            <span className="hw-eyebrow text-[10px] text-sage/60">Scroll · step through the window</span>
            <span className="relative h-10 w-px overflow-hidden bg-white/10">
              <span className="hw-scroll-line absolute inset-0 bg-gold" />
            </span>
          </span>
          <span className="hidden w-[220px] lg:block" />
        </motion.div>

        {/* mid-flight chapter line */}
        {!reduced && (
          <motion.div
            style={{ opacity: chapterOpacity, y: chapterY, scale: chapterScale }}
            className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center"
          >
            <p className="hw-eyebrow text-gold/90">Chapter one</p>
            <p className="mt-4 font-display text-[clamp(34px,5.6vw,84px)] leading-[0.98] font-extrabold tracking-[-0.045em] text-cream">
              Every crop has a{" "}
              <span className="hw-serif hw-gold-text pr-2 font-normal">window.</span>
            </p>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-sage/85">
              HarvestWindow helps you see it coming — and what might move it.
            </p>
          </motion.div>
        )}

        {/* golden flare as the camera passes the arch, then hand-off to the next section */}
        {!reduced && (
          <>
            <motion.div
              aria-hidden
              style={{ opacity: flareOpacity, scale: flareScale }}
              className="pointer-events-none absolute top-1/2 left-1/2 z-20 h-[120vmax] w-[120vmax] -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-screen"
            >
              <div
                className="h-full w-full rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,236,190,0.95) 0%, rgba(232,182,74,0.55) 18%, rgba(232,182,74,0.12) 40%, transparent 62%)",
                }}
              />
            </motion.div>
            <motion.div
              aria-hidden
              style={{ opacity: fadeOpacity }}
              className="pointer-events-none absolute inset-0 z-30 bg-night-2"
            />
          </>
        )}
      </div>
    </section>
  );
}

function HudTimeline({ start, end, play }: { start: string; end: string; play: boolean }) {
  const spanStart = addDays(start, -50);
  const spanEnd = addDays(end, 18);
  const total = Math.max(daysBetween(spanStart, spanEnd), 1);
  const pos = (d: string | Date) =>
    Math.max(0, Math.min(100, (daysBetween(spanStart, d) / total) * 100));
  const s = pos(start);
  const e = pos(end);
  const t = pos(startOfToday());

  return (
    <div className="relative h-6">
      <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-white/10" />
      <motion.div
        className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full"
        style={{
          left: `${s}%`,
          background: "linear-gradient(90deg, #E8B64A, #f8dc96)",
          boxShadow: "0 0 18px rgba(232,182,74,0.65)",
        }}
        initial={{ width: 0 }}
        animate={play ? { width: `${Math.max(e - s, 2)}%` } : undefined}
        transition={{ delay: 1.5, duration: 1, ease: EASE }}
      />
      <span
        className="absolute top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-cream shadow-[0_0_10px_rgba(255,255,255,0.8)]"
        style={{ left: `${t}%` }}
      />
      <span
        className="absolute -bottom-3 -translate-x-1/2 font-mono text-[9px] tracking-wide text-cream/70 uppercase"
        style={{ left: `${t}%` }}
      >
        Today
      </span>
    </div>
  );
}
