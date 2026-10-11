import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  CircleSlash,
  Database,
  Gauge,
  Leaf,
  ShieldAlert,
  Sun,
} from "lucide-react";
import { PublicNav } from "@/components/navigation/PublicNav";
import { SiteFooter } from "@/components/navigation/SiteFooter";
import { Reveal } from "@/components/animation/Reveal";
import { SectionLabel } from "@/components/common/ui";
import { buttonStyles } from "@/components/common/buttonStyles";
import { CROP_CATALOG } from "@/data/mock/cropCatalog";
import { MODEL_NOTE } from "@/services/forecast/forecastService";

const PIPELINE = [
  {
    step: "Input",
    title: "What you record",
    icon: Leaf,
    points: [
      "Crop and variety",
      "Farm location (state, district)",
      "Planting or sowing date",
      "Optional: growth stage, field area, irrigation, notes",
    ],
  },
  {
    step: "Reference",
    title: "What the catalogue adds",
    icon: Database,
    points: [
      "Typical sowing → window duration range for that crop",
      "Crop-specific stage sequence (grain, fruiting, fibre, pod, cane)",
      "Season context (Kharif, Rabi, annual)",
    ],
  },
  {
    step: "Context",
    title: "What the weather layer does",
    icon: Sun,
    points: [
      "Heavy-rain days near the window push the end date back",
      "Sustained heat above 35 °C pulls the window forward",
      "Cautions are attached to the crops they affect",
    ],
  },
  {
    step: "Output",
    title: "What you see",
    icon: Gauge,
    points: [
      "A start and end date — a range, never a single promised day",
      "A readiness state in plain language",
      "Every contributing factor, listed",
      "Input completeness, labelled as such",
    ],
  },
];

const LIMITS = [
  "No trained machine-learning model is running in this frontend.",
  "No satellite imagery, drone survey or IoT soil sensor is connected.",
  "No live weather feed — the dataset is a labelled demo pattern per farm.",
  "Nothing here predicts yield quantity, price or market demand.",
  "The readiness state is an estimate from recorded inputs, not a measured maturity value.",
];

const FAQ = [
  {
    q: "How wide is a typical harvest window?",
    a: "It follows the crop. Cereals like wheat or paddy usually span two to four weeks in this dataset, cotton is wider because boll burst is staggered, and short-duration vegetables are narrower but often involve repeated pickings rather than one harvest.",
  },
  {
    q: "What changes the window after I add a crop?",
    a: "A corrected planting date, a more specific variety, and the weather context attached to that farm. Each change is reflected in the contributing factors list under the forecast so you can see why a date moved.",
  },
  {
    q: "What does the confidence percentage mean?",
    a: "It is input completeness: how much of the picture the record contains (variety, area, stage, irrigation, weather availability). It is deliberately not presented as prediction accuracy, because this demo engine cannot measure that.",
  },
  {
    q: "Can this work offline in the field?",
    a: "The frontend stores farms, crops and preferences in the browser, so records you have already loaded remain available. Refreshing an estimate only needs the data on the device — no network call is made in demo mode.",
  },
  {
    q: "How would a real weather provider connect?",
    a: "Through the WeatherProvider interface in the services layer. It expects a farm (including optional coordinates) and returns an observed snapshot plus a daily forecast with a source label and timestamp. Swapping the demo provider for an API-backed one requires no UI changes.",
  },
];

export default function HowItWorksPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-cream">
      <PublicNav />
      <main id="main-content">
        <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32">
          <div className="hw-grain pointer-events-none absolute inset-0 opacity-60" aria-hidden />
          <div
            className="hw-drift pointer-events-none absolute -top-40 -left-24 h-[440px] w-[440px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(91,140,69,0.22) 0%, rgba(91,140,69,0) 68%)",
            }}
            aria-hidden
          />
          <div className="relative mx-auto w-full max-w-[900px] px-5 sm:px-8">
            <Reveal>
              <SectionLabel>The method</SectionLabel>
              <h1 className="mt-5 font-display text-[38px] leading-[1.02] font-extrabold tracking-[-0.04em] text-forest-deep sm:text-[54px]">
                How an estimate is built —
                <br className="hidden sm:block" /> and what it is not.
              </h1>
              <p className="mt-6 max-w-2xl text-[15.5px] leading-[1.75] text-muted">
                HarvestWindow is transparent by design. Below is the exact path from a
                recorded planting date to the range you see on screen, including the limits
                of the demo build.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 inline-flex max-w-2xl items-start gap-2.5 rounded-md border border-line bg-white px-4 py-3 text-[12.5px] leading-relaxed text-muted">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-caution" aria-hidden />
                {MODEL_NOTE}
              </p>
            </Reveal>
          </div>
        </section>

        {/* pipeline */}
        <section className="bg-white py-16 sm:py-20" aria-labelledby="pipeline-heading">
          <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-8">
            <h2
              id="pipeline-heading"
              className="font-display text-[28px] leading-tight font-extrabold tracking-[-0.03em] text-forest-deep sm:text-[34px]"
            >
              Four layers, in order.
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {PIPELINE.map((layer, i) => (
                <Reveal key={layer.step} delay={i * 0.07} as="article">
                  <div className="hw-card hw-card-hover flex h-full flex-col p-6">
                    <div className="flex items-center justify-between">
                      <span className="grid h-9 w-9 place-items-center rounded-md bg-soft text-forest">
                        <layer.icon className="h-4.5 w-4.5" aria-hidden />
                      </span>
                      <span className="hw-eyebrow font-semibold text-muted">
                        {String(i + 1).padStart(2, "0")} · {layer.step}
                      </span>
                    </div>
                    <h3 className="mt-5 font-display text-[17px] leading-tight font-bold text-forest-deep">
                      {layer.title}
                    </h3>
                    <ul className="mt-4 flex flex-col gap-2">
                      {layer.points.map((p) => (
                        <li key={p} className="flex gap-2 text-[13px] leading-relaxed text-muted">
                          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-living" aria-hidden />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* reference table + limits */}
        <section className="py-16 sm:py-20" aria-labelledby="limits-heading">
          <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-5 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div>
              <Reveal>
                <SectionLabel>Reference durations</SectionLabel>
                <h2 className="mt-4 font-display text-[26px] leading-tight font-extrabold tracking-[-0.03em] text-forest-deep sm:text-[30px]">
                  The catalogue behind the estimate.
                </h2>
                <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted">
                  Typical sowing-to-window ranges used by the demo engine, shown exactly as
                  stored. Crops outside this list fall back to a generic 110–140 day range
                  and say so.
                </p>
              </Reveal>
              <Reveal delay={0.08}>
                <div className="hw-scroll-x mt-6 overflow-x-auto rounded-md border border-line bg-white">
                  <table className="w-full min-w-[520px] border-collapse text-left">
                    <caption className="sr-only">
                      Reference duration ranges per crop used by the demo forecast engine
                    </caption>
                    <thead>
                      <tr className="border-b border-line bg-cream/70">
                        {["Crop", "Group", "Seasons", "Days to window"].map((h) => (
                          <th
                            key={h}
                            scope="col"
                            className="hw-eyebrow px-4 py-3 font-semibold text-muted"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {CROP_CATALOG.map((c) => (
                        <tr
                          key={c.name}
                          className="border-b border-line/70 transition-colors last:border-0 hover:bg-soft/60"
                        >
                          <td className="px-4 py-3 text-[13.5px] font-semibold text-forest-deep">
                            {c.name}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-muted capitalize">{c.family}</td>
                          <td className="px-4 py-3 text-[13px] text-muted">{c.seasons.join(", ")}</td>
                          <td className="hw-num px-4 py-3 text-[13px] font-semibold text-forest">
                            {c.durationRange[0]}–{c.durationRange[1]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Reveal>
            </div>

            <div>
              <Reveal delay={0.06}>
                <div className="rounded-lg border border-caution/35 bg-[#fdf6ec] p-6">
                  <h2
                    id="limits-heading"
                    className="flex items-center gap-2.5 font-display text-[19px] leading-tight font-bold text-forest-deep"
                  >
                    <CircleSlash className="h-5 w-5 text-caution" aria-hidden />
                    What HarvestWindow does not claim
                  </h2>
                  <ul className="mt-5 flex flex-col gap-3">
                    {LIMITS.map((limit) => (
                      <li key={limit} className="flex gap-2.5 text-[13.5px] leading-relaxed text-[#5d4a2a]">
                        <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-caution" aria-hidden />
                        {limit}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 border-t border-caution/25 pt-4 text-[12.5px] leading-relaxed text-[#6b5733]">
                    Where information is missing the interface says "unavailable" or "demo
                    dataset" instead of filling the gap with a plausible-looking number.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="mt-5 rounded-lg border border-line bg-white p-6">
                  <h2 className="font-display text-[17px] leading-tight font-bold text-forest-deep">
                    Questions
                  </h2>
                  <ul className="mt-4 flex flex-col divide-y divide-line">
                    {FAQ.map((item, i) => {
                      const isOpen = open === i;
                      return (
                        <li key={item.q}>
                          <button
                            type="button"
                            onClick={() => setOpen(isOpen ? null : i)}
                            aria-expanded={isOpen}
                            className="flex w-full items-start justify-between gap-4 py-3.5 text-left"
                          >
                            <span className="text-[13.5px] font-semibold text-forest-deep">
                              {item.q}
                            </span>
                            <motion.span
                              animate={{ rotate: isOpen ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                              className="mt-0.5 shrink-0 text-muted"
                            >
                              <ChevronDown className="h-4 w-4" aria-hidden />
                            </motion.span>
                          </button>
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                                className="overflow-hidden"
                              >
                                <p className="pb-4 text-[13px] leading-relaxed text-muted">
                                  {item.a}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="border-t border-line bg-white py-14">
          <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-6 px-5 sm:px-8">
            <div>
              <h2 className="font-display text-[24px] leading-tight font-extrabold tracking-[-0.03em] text-forest-deep">
                See the method running on sample data.
              </h2>
              <p className="mt-2 text-[14px] text-muted">
                The workspace opens with three farms and eight crop records already estimated.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/app" className={buttonStyles("primary", "lg")}>
                Open the workspace
              </Link>
              <Link to="/" className={buttonStyles("secondary", "lg")}>
                Back to overview
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
