import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarRange, CloudSun, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { IMAGES } from "@/data/mock/cropCatalog";

const POINTS = [
  {
    icon: CalendarRange,
    title: "Ranges, not single dates",
    body: "Every estimate arrives as a window with its inputs listed.",
  },
  {
    icon: CloudSun,
    title: "Weather in context",
    body: "Rain and heat are read against your window, not shown as noise.",
  },
  {
    icon: ShieldCheck,
    title: "Honest labels",
    body: "Demo data is marked as demo data — no implied live models.",
  },
];

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  image = IMAGES.authSplit,
  imageAlt = "Green rice field with a farmer working between the rows",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  image?: string;
  imageAlt?: string;
}) {
  return (
    <div className="grid min-h-screen bg-cream lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Visual side */}
      <aside className="relative hidden overflow-hidden bg-forest-deep lg:block">
        <img
          src={image}
          alt={imageAlt}
          className="hw-float-slow absolute inset-0 h-full w-full scale-110 object-cover opacity-90"
          decoding="async"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(6,20,13,0.86) 0%, rgba(6,20,13,0.35) 38%, rgba(6,20,13,0.45) 62%, rgba(6,20,13,0.94) 100%)",
          }}
          aria-hidden
        />
        <div className="hw-noise pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay" aria-hidden />
        <div
          className="hw-drift pointer-events-none absolute -bottom-32 -left-20 h-[420px] w-[420px] rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(circle, rgba(232,182,74,0.4) 0%, rgba(232,182,74,0) 66%)",
          }}
          aria-hidden
        />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <Link to="/" className="w-fit">
            <Logo onDark />
          </Link>

          <div className="max-w-md">
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-[34px] leading-[1.06] font-extrabold tracking-[-0.035em] text-cream xl:text-[40px]"
            >
              Know when your field is ready — and what might move that date.
            </motion.h2>

            <ul className="mt-9 flex flex-col gap-5">
              {POINTS.map((point, i) => (
                <motion.li
                  key={point.title}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.25 + i * 0.09 }}
                  className="flex items-start gap-3.5"
                >
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md border border-white/15 bg-white/10 text-gold">
                    <point.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-display text-[14px] font-bold text-cream">
                      {point.title}
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-sage/80">
                      {point.body}
                    </span>
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>

          <p className="font-mono text-[11px] tracking-wide text-sage/60 uppercase">
            HarvestWindow · demo workspace · local persistence only
          </p>
        </div>
      </aside>

      {/* Form side */}
      <main className="flex flex-col px-5 py-8 sm:px-10 lg:py-12">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="lg:hidden">
              <Logo />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted transition-colors hover:text-forest-deep max-lg:ml-auto"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Back to site
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="mt-10 lg:mt-16"
          >
            <h1 className="font-display text-[30px] leading-tight font-extrabold tracking-[-0.035em] text-forest-deep sm:text-[34px]">
              {title}
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-muted">{subtitle}</p>

            <div className="mt-8">{children}</div>

            {footer && <div className="mt-8">{footer}</div>}
          </motion.div>
        </div>

        <p className="mx-auto mt-10 w-full max-w-md text-[11.5px] leading-relaxed text-muted">
          This is a frontend demo. Credentials are checked against a local demo account and
          nothing is transmitted to a server.
        </p>
      </main>
    </div>
  );
}
