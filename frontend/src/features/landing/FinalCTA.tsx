import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import { IMAGES_3D } from "@/data/mock/renders";
import { SplitText } from "@/components/fx/text";
import { Magnetic } from "@/components/fx/motion";
import { Reveal } from "@/components/animation/Reveal";
import { useStore } from "@/store/AppStore";

export function FinalCTA() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { startDemoSession, signedIn } = useStore();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.22, 1]);
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "6%"]);

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden bg-night py-32 text-cream sm:py-44"
      aria-labelledby="cta-heading"
    >
      <motion.img
        src={IMAGES_3D.portal}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        style={reduced ? undefined : { scale, y }}
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, #06140d 0%, rgba(6,20,13,0.62) 26%, rgba(6,20,13,0.38) 55%, rgba(6,20,13,0.9) 88%, #06140d 100%)",
        }}
      />
      <div
        aria-hidden
        className="hw-spin-slow pointer-events-none absolute top-[46%] left-1/2 -z-10 h-[170vmax] w-[170vmax] -translate-x-1/2 -translate-y-1/2 opacity-45 mix-blend-screen"
        style={{
          background:
            "repeating-conic-gradient(from 0deg, rgba(232,182,74,0.16) 0deg 3deg, transparent 3deg 13deg)",
          maskImage: "radial-gradient(circle, #000 0%, transparent 42%)",
          WebkitMaskImage: "radial-gradient(circle, #000 0%, transparent 42%)",
        }}
      />
      <div aria-hidden className="hw-noise pointer-events-none absolute inset-0 -z-10 opacity-[0.07] mix-blend-overlay" />

      {!reduced &&
        Array.from({ length: 26 }, (_, i) => {
          const size = 2 + (i % 4);
          return (
            <span
              key={i}
              aria-hidden
              className="hw-rise pointer-events-none absolute bottom-[-12px] -z-10 rounded-full bg-gold"
              style={{
                left: `${(i * 37) % 100}%`,
                width: size,
                height: size,
                animationDelay: `-${(i * 0.73) % 9}s`,
                animationDuration: `${9 + (i % 7) * 1.6}s`,
                boxShadow: "0 0 12px 2px rgba(232,182,74,0.6)",
              }}
            />
          );
        })}

      <div className="relative mx-auto w-full max-w-[1040px] px-5 text-center sm:px-8">
        <Reveal>
          <p className="hw-eyebrow inline-flex items-center gap-3 font-semibold text-gold">
            <span className="h-px w-8 bg-gold/60" aria-hidden />
            Step through the window
            <span className="h-px w-8 bg-gold/60" aria-hidden />
          </p>
        </Reveal>

        <h2
          id="cta-heading"
          className="mt-7 font-display text-[clamp(38px,6.4vw,96px)] leading-[0.96] font-extrabold tracking-[-0.05em] text-cream"
        >
          <SplitText text="Make your next harvest" inView className="block" />
          <SplitText
            text="a more informed decision."
            mode="words"
            inView
            delay={0.35}
            className="block"
            charClassName="hw-serif hw-gold-text pr-[0.06em] font-normal"
          />
        </h2>

        <Reveal delay={0.2}>
          <p className="mx-auto mt-7 max-w-xl text-[15.5px] leading-[1.75] text-sage/85">
            Open the demo workspace — three sample farms, eight crop records and a full
            harvest-window view. Add your own block in about thirty seconds and watch the estimate
            build in front of you.
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Magnetic>
              <button
                type="button"
                onClick={() => {
                  if (!signedIn) startDemoSession();
                  navigate("/app");
                }}
                className="hw-shine inline-flex h-14 items-center gap-2.5 rounded-full bg-gold px-8 font-display text-[16px] font-bold text-night shadow-[0_20px_50px_-14px_rgba(232,182,74,0.8)] transition-transform active:scale-[0.97]"
              >
                Explore HarvestWindow
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </Magnetic>
            <Magnetic>
              <button
                type="button"
                onClick={() => navigate("/how-it-works")}
                className="hw-glass-btn inline-flex h-14 items-center gap-2.5 rounded-full px-7 font-display text-[15px] font-semibold"
              >
                <BookOpen className="h-4 w-4" aria-hidden />
                Read the method
              </button>
            </Magnetic>
          </div>
        </Reveal>

        <Reveal delay={0.4}>
          <p className="mt-10 font-mono text-[11px] tracking-wide text-sage/60 uppercase">
            No card · no backend · estimates labelled as demo data
          </p>
        </Reveal>
      </div>
    </section>
  );
}
