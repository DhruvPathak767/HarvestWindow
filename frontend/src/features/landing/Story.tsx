import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { CalendarRange, CloudRain, Sprout } from "lucide-react";
import { IMAGES_3D } from "@/data/mock/renders";
import { SplitText, VelocityMarquee } from "@/components/fx/text";
import { TiltCard } from "@/components/fx/motion";
import { Reveal } from "@/components/animation/Reveal";
import { SectionLabel } from "@/components/common/ui";
import { cn } from "@/utils/cn";

const EASE = [0.22, 1, 0.36, 1] as const;

const STAGES = [
  {
    id: "early",
    index: "01",
    title: "Too early.",
    kicker: "Grain still filling",
    body: "Cut before the grain hardens, the fruit colours or the bolls open, and the crop reaches the buyer in worse condition. Once it is harvested, the decision cannot be revisited.",
    image: IMAGES_3D.earEarly,
    alt: "3D render of a young, unripe green wheat ear",
    glow: "#6f9a3c",
    status: "Growing",
    icon: Sprout,
  },
  {
    id: "ready",
    index: "02",
    title: "The right moment.",
    kicker: "Inside the estimated window",
    body: "Inside the window the crop is at its best and the field is workable. HarvestWindow makes that range visible early enough to line up labour, machines and buyers.",
    image: IMAGES_3D.earReady,
    alt: "3D render of a ripe golden wheat ear glowing in warm light",
    glow: "#E8B64A",
    status: "Within estimated window",
    icon: CalendarRange,
  },
  {
    id: "late",
    index: "03",
    title: "Too late.",
    kicker: "Window closed · weather turning",
    body: "Every extra day standing is exposure — lodging, shattering, pests, and a rain spell that turns a workable block into an unusable one.",
    image: IMAGES_3D.earLate,
    alt: "3D render of an overripe wheat ear beneath a small storm cloud",
    glow: "#7d96a6",
    status: "Weather caution",
    icon: CloudRain,
  },
];

/* ------------------------------------------------------------------ */
/*  Pinned scroll story: the same ear, three moments                  */
/* ------------------------------------------------------------------ */

export function ProblemScroll() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [stage, setStage] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = v < 0.34 ? 0 : v < 0.67 ? 1 : 2;
    setStage((s) => (s === next ? s : next));
  });

  const marker = useTransform(scrollYProgress, [0.03, 0.97], ["3%", "97%"]);
  const dayValue = useTransform(scrollYProgress, [0, 1], [104, 162]);
  const day = useTransform(dayValue, (v) => `${Math.round(v)}`);
  const ringRotate = useTransform(scrollYProgress, [0, 1], [0, 240]);
  const ringRotateRev = useTransform(scrollYProgress, [0, 1], [0, -160]);
  const current = STAGES[stage];

  if (reduced) return <StaticProblem />;

  return (
    <section
      id="problem"
      ref={ref}
      className="relative h-[330vh] bg-night-2"
      aria-labelledby="problem-heading"
    >
      <div className="sticky top-0 flex h-[100svh] min-h-[640px] items-center overflow-hidden">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-[6%] h-[75vmin] w-[75vmin] -translate-y-1/2 rounded-full blur-[130px]"
          animate={{ backgroundColor: current.glow, opacity: 0.3 }}
          transition={{ duration: 1 }}
        />
        <div aria-hidden className="hw-grain-light pointer-events-none absolute inset-0 opacity-60" />
        <div aria-hidden className="hw-noise pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay" />

        <div className="relative mx-auto grid w-full max-w-[1320px] items-center gap-6 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          {/* -------------------------------------------------- 3D lens */}
          <div className="relative order-1 mx-auto aspect-square w-[min(74vw,38svh)] lg:order-2 lg:w-full lg:max-w-[580px]">
            <motion.div
              aria-hidden
              style={{ rotate: ringRotate }}
              className="absolute inset-0 rounded-full border border-dashed border-white/15"
            />
            <motion.div
              aria-hidden
              style={{ rotate: ringRotateRev }}
              className="absolute inset-[7%] rounded-full border border-white/10"
            >
              <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-gold shadow-[0_0_14px_rgba(232,182,74,0.9)]" />
            </motion.div>
            <motion.div
              aria-hidden
              className="absolute inset-[14%] rounded-full"
              animate={{ boxShadow: `0 0 120px -10px ${current.glow}` }}
              transition={{ duration: 1 }}
            />

            <div className="absolute inset-[10%]" style={{ perspective: 1200 }}>
              {STAGES.map((s, i) => (
                <motion.img
                  key={s.id}
                  src={s.image}
                  alt={i === stage ? s.alt : ""}
                  aria-hidden={i !== stage}
                  decoding="async"
                  initial={false}
                  animate={
                    i === stage
                      ? { opacity: 1, scale: 1, rotateY: 0, filter: "blur(0px)" }
                      : {
                          opacity: 0,
                          scale: 0.86,
                          rotateY: i < stage ? 50 : -50,
                          filter: "blur(10px)",
                        }
                  }
                  transition={{ duration: 0.9, ease: EASE }}
                  className="hw-mask-radial absolute inset-0 h-full w-full rounded-full object-cover"
                />
              ))}
            </div>

            {/* floating chips */}
            <motion.div
              key={`status-${current.id}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="hw-hud absolute bottom-[8%] left-0 flex items-center gap-2 rounded-full px-3.5 py-2 sm:left-[-4%]"
            >
              <current.icon className="h-3.5 w-3.5" style={{ color: current.glow }} aria-hidden />
              <span className="text-[12px] font-semibold text-cream">{current.status}</span>
            </motion.div>
            <div className="hw-hud absolute top-[8%] right-0 rounded-2xl px-4 py-3 text-right sm:right-[-3%]">
              <p className="hw-eyebrow text-[9.5px] text-sage/70">After sowing</p>
              <p className="hw-num text-[26px] leading-none font-extrabold text-cream">
                Day <motion.span>{day}</motion.span>
              </p>
            </div>
          </div>

          {/* -------------------------------------------------- copy */}
          <div className="order-2 lg:order-1">
            <SectionLabel tone="cream">The problem</SectionLabel>
            <h2
              id="problem-heading"
              className="mt-3 font-display text-[clamp(20px,2.4vw,32px)] font-bold tracking-[-0.03em] text-cream/90"
            >
              Every day can change the harvest.
            </h2>

            <div className="relative mt-5 min-h-[190px] sm:min-h-[220px] lg:mt-9 lg:min-h-[270px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
                  transition={{ duration: 0.4 }}
                >
                  <p className="hw-eyebrow font-semibold" style={{ color: current.glow }}>
                    {current.index} / 03 · {current.kicker}
                  </p>
                  <h3 className="mt-3 font-display text-[clamp(40px,6.2vw,96px)] leading-[0.94] font-extrabold tracking-[-0.05em] text-cream">
                    {current.id === "ready" ? (
                      <SplitText
                        text={current.title}
                        mode="words"
                        play
                        charClassName="hw-serif hw-gold-text pr-[0.06em] font-normal"
                      />
                    ) : (
                      <SplitText text={current.title} play />
                    )}
                  </h3>
                  <motion.p
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.25, ease: EASE }}
                    className="mt-4 max-w-md text-[14.5px] leading-[1.75] text-sage/80 sm:text-[15.5px]"
                  >
                    {current.body}
                  </motion.p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ripeness timeline */}
            <div className="mt-6 max-w-lg lg:mt-8">
              <div className="flex justify-between font-mono text-[10px] tracking-wide text-sage/55 uppercase">
                <span>Sown</span>
                <span className="text-gold/90">Estimated window</span>
                <span>Post-harvest</span>
              </div>
              <div className="relative mt-3 h-2 rounded-full bg-white/10">
                <div
                  className="absolute inset-y-[-3px] left-[37%] w-[28%] rounded-full ring-1 ring-gold/60"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(115deg, rgba(232,182,74,0.55) 0 6px, rgba(232,182,74,0.25) 6px 12px)",
                  }}
                />
                <motion.span
                  style={{ left: marker }}
                  className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cream"
                  animate={{ backgroundColor: current.glow, boxShadow: `0 0 22px ${current.glow}` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="mt-5 flex gap-2">
                {STAGES.map((s, i) => (
                  <span key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                    <motion.span
                      className="block h-full rounded-full"
                      animate={{
                        width: i <= stage ? "100%" : "0%",
                        backgroundColor: i === stage ? s.glow : "rgba(247,245,236,0.35)",
                      }}
                      transition={{ duration: 0.6, ease: EASE }}
                    />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StaticProblem() {
  return (
    <section id="problem" className="bg-night-2 py-20" aria-labelledby="problem-heading">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <SectionLabel tone="cream">The problem</SectionLabel>
        <h2 id="problem-heading" className="mt-3 text-[34px] font-extrabold text-cream">
          Every day can change the harvest.
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STAGES.map((s) => (
            <article key={s.id} className="rounded-[24px] border border-white/10 bg-night-3 p-5">
              <img src={s.image} alt={s.alt} className="hw-mask-radial aspect-square w-full rounded-full object-cover" />
              <h3 className="mt-4 text-[24px] font-extrabold text-cream">{s.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-sage/80">{s.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  How it works — marquee band + 3D tilt step cards                  */
/* ------------------------------------------------------------------ */

const CROPS = ["Wheat", "Paddy", "Cotton", "Maize", "Tomato", "Groundnut", "Mustard", "Sugarcane", "Chickpea", "Bajra"];

const STEPS = [
  {
    id: "01",
    title: "Add your crop",
    body: "Select the crop and variety, the farm location, and the planting or sowing date. Optional details — field area, irrigation, a stage you can see — tighten the estimate.",
    image: IMAGES_3D.stepSow,
    alt: "3D render of a seedling sprouting from a cube of soil",
    tag: "Crop · farm · sowing date",
  },
  {
    id: "02",
    title: "Understand the forecast",
    body: "See the estimated harvest window as a range, where today sits inside it, the readiness state, and the weather context attached to that farm.",
    image: IMAGES_3D.stepForecast,
    alt: "3D render of a glass calendar with a glowing golden date range",
    tag: "Range · readiness · weather",
  },
  {
    id: "03",
    title: "Take informed action",
    body: "Work through prioritised recommendations — check moisture, confirm a contractor slot, plan picking around dry days, or record the next observation.",
    image: IMAGES_3D.stepHarvest,
    alt: "3D render of a miniature combine harvester in golden wheat",
    tag: "Prioritised next steps",
  },
];

function Star() {
  return (
    <svg viewBox="0 0 24 24" className="mx-6 h-6 w-6 shrink-0 text-gold sm:mx-10 sm:h-9 sm:w-9" aria-hidden>
      <path
        d="M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12C6.4 11.4 11.4 6.4 12 0z"
        fill="currentColor"
      />
    </svg>
  );
}

export function HowItWorksSection() {
  const gridRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: gridRef, offset: ["start 85%", "end 55%"] });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-24 overflow-hidden bg-cream pt-16 pb-28 sm:pt-20 sm:pb-36"
      aria-labelledby="hiw-heading"
    >
      <div aria-hidden className="hw-grain pointer-events-none absolute inset-0 opacity-70" />

      {/* velocity marquee */}
      <div aria-hidden className="relative -mx-6 -rotate-[2deg] select-none border-y border-forest-deep/10 bg-cream/80 py-5">
        <VelocityMarquee baseVelocity={-1.1}>
          {CROPS.map((c) => (
            <span key={c} className="flex items-center">
              <span className="font-display text-[clamp(44px,7vw,104px)] leading-none font-extrabold tracking-[-0.05em] text-forest-deep">
                {c}
              </span>
              <Star />
            </span>
          ))}
        </VelocityMarquee>
        <VelocityMarquee baseVelocity={1.1} className="mt-2">
          {CROPS.slice().reverse().map((c) => (
            <span key={c} className="flex items-center">
              <span className="hw-serif text-[clamp(40px,6.4vw,96px)] leading-none text-forest/70">
                {c}
              </span>
              <span className="mx-6 h-2 w-2 shrink-0 rounded-full bg-living/60 sm:mx-10" />
            </span>
          ))}
        </VelocityMarquee>
      </div>

      <div className="relative mx-auto mt-24 w-full max-w-[1320px] px-5 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-end">
          <div>
            <SectionLabel>How it works</SectionLabel>
            <h2
              id="hiw-heading"
              className="mt-5 font-display text-[clamp(36px,5vw,72px)] leading-[0.98] font-extrabold tracking-[-0.045em] text-forest-deep"
            >
              <SplitText text="From a sowing date" inView />{" "}
              <SplitText
                text="to a plan."
                mode="words"
                inView
                delay={0.35}
                charClassName="hw-serif pr-[0.06em] font-normal text-living"
              />
            </h2>
          </div>
          <Reveal delay={0.1}>
            <p className="max-w-md text-[15.5px] leading-[1.75] text-muted">
              No hardware, no sensors to install, no subscription to unlock the first answer.
              Everything below works from information a farmer already has.
            </p>
          </Reveal>
        </div>

        <div ref={gridRef} className="relative mt-16 grid gap-8 lg:grid-cols-3 lg:gap-10">
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-[34%] hidden h-40 w-full lg:block"
            viewBox="0 0 1200 160"
            preserveAspectRatio="none"
          >
            <path
              d="M 30 120 C 250 10, 420 150, 600 70 S 960 0, 1170 110"
              fill="none"
              stroke="rgba(22,61,43,0.12)"
              strokeWidth="2"
              strokeDasharray="6 8"
            />
            <motion.path
              d="M 30 120 C 250 10, 420 150, 600 70 S 960 0, 1170 110"
              fill="none"
              stroke="#E8B64A"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ pathLength: reduced ? 1 : pathLength }}
            />
          </svg>

          {STEPS.map((step, i) => (
            <Reveal
              key={step.id}
              delay={i * 0.12}
              y={40}
              className={cn("relative", i === 1 && "lg:translate-y-20")}
            >
              <TiltCard
                max={8}
                className="rounded-[30px] border border-forest-deep/10 bg-white p-3 shadow-[0_40px_80px_-50px_rgba(22,61,43,0.6)]"
              >
                <div
                  className="relative overflow-hidden rounded-[24px] bg-[#F3EFE3]"
                  style={{ transform: "translateZ(28px)" }}
                >
                  <img
                    src={step.image}
                    alt={step.alt}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/3.3] w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.07]"
                  />
                  <span className="absolute top-4 left-4 rounded-full bg-white/85 px-3 py-1 font-mono text-[10px] tracking-wide text-forest uppercase backdrop-blur">
                    {step.tag}
                  </span>
                </div>
                <div className="relative px-4 pt-7 pb-5" style={{ transform: "translateZ(52px)" }}>
                  <span
                    aria-hidden
                    className="hw-outline-text absolute -top-16 right-3 font-display text-[110px] leading-none font-extrabold text-forest-deep/20"
                  >
                    {step.id}
                  </span>
                  <h3 className="font-display text-[22px] leading-tight font-bold text-forest-deep">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-[14px] leading-[1.7] text-muted">{step.body}</p>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
