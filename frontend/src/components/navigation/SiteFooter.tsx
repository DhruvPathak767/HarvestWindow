import { Link } from "react-router-dom";
import { Globe, Mail, Phone } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Overview dashboard", to: "/app" },
      { label: "Harvest forecast", to: "/app/forecast" },
      { label: "Weather context", to: "/app/weather" },
      { label: "Recommendations", to: "/app/recommendations" },
    ],
  },
  {
    title: "Method",
    links: [
      { label: "How it works", to: "/how-it-works" },
      { label: "What we do not claim", to: "/how-it-works" },
      { label: "Farm management", to: "/app/farms" },
      { label: "Settings & units", to: "/app/settings" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", to: "/sign-in" },
      { label: "Create account", to: "/sign-up" },
      { label: "Demo workspace", to: "/app" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-night text-cream">
      <div aria-hidden className="hw-grain-light pointer-events-none absolute inset-0 opacity-50" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[70%] -translate-x-1/2 rounded-full bg-gold/10 blur-[100px]"
      />
      <div className="relative mx-auto w-full max-w-[1320px] px-5 pt-20 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo onDark />
            <p className="mt-5 max-w-xs text-[13.5px] leading-relaxed text-sage/70">
              Harvest-timing intelligence for farmers, consultants and cooperatives — built on
              ranges, context and honest labels rather than false precision.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <a
                href="mailto:hello@harvestwindow.ag"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/12 text-sage transition-colors hover:border-gold/60 hover:text-gold"
                aria-label="Email HarvestWindow (placeholder)"
              >
                <Mail className="h-4 w-4" aria-hidden />
              </a>
              <a
                href="tel:+918000000000"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/12 text-sage transition-colors hover:border-gold/60 hover:text-gold"
                aria-label="Call the field team (placeholder)"
              >
                <Phone className="h-4 w-4" aria-hidden />
              </a>
              <span
                className="grid h-10 w-10 place-items-center rounded-full border border-white/12 text-sage"
                title="Field network — placeholder"
              >
                <Globe className="h-4 w-4" aria-hidden />
              </span>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="hw-eyebrow font-semibold text-gold/90">{col.title}</p>
              <ul className="mt-5 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-[13.5px] text-sage/70 transition-colors hover:text-cream">
                      <span className="hw-link-underline">{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-white/10 py-6 text-[12px] text-sage/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} HarvestWindow · Frontend demo workspace</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Contact</span>
            <span className="font-mono tracking-wide">Estimates are demo data, not agronomic advice</span>
          </div>
        </div>
      </div>

      <div aria-hidden className="relative select-none overflow-hidden">
        <p
          className="translate-y-[16%] text-center font-display text-[clamp(64px,16.5vw,250px)] leading-[0.82] font-extrabold tracking-[-0.06em] whitespace-nowrap text-transparent"
          style={{
            WebkitTextStroke: "1px rgba(232,182,74,0.32)",
            backgroundImage: "linear-gradient(180deg, rgba(232,182,74,0.24), transparent 78%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
          }}
        >
          HarvestWindow
        </p>
      </div>
    </footer>
  );
}
