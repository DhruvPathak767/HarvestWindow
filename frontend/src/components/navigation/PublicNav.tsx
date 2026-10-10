import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useStore } from "@/store/AppStore";
import { useIntro } from "@/features/landing/intro";
import { scrollToId } from "@/lib/smoothScroll";
import { cn } from "@/utils/cn";

const SECTION_LINKS = [
  { id: "problem", label: "Why" },
  { id: "how-it-works", label: "How it works" },
  { id: "product", label: "Product" },
  { id: "benefits", label: "Benefits" },
];

/** Floating glass-pill navigation shared by the marketing pages. */
export function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const { scrollY } = useScroll();
  const navigate = useNavigate();
  const location = useLocation();
  const introDone = useIntro();
  const { startDemoSession, signedIn } = useStore();

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 40));

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const goToSection = (id: string) => {
    setMenuOpen(false);
    if (location.pathname !== "/") {
      navigate("/");
      window.setTimeout(() => scrollToId(id), 450);
    } else {
      scrollToId(id);
    }
  };

  const explore = () => {
    if (!signedIn) startDemoSession();
    navigate("/app");
  };

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={introDone ? { y: 0, opacity: 1 } : { y: -40, opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      className="fixed inset-x-0 top-3 z-[80] px-3 sm:top-4 sm:px-6"
    >
      <div
        className={cn(
          "mx-auto flex h-14 max-w-[1180px] items-center gap-3 rounded-full border pr-2 pl-4 transition-all duration-500 sm:h-[60px] sm:pl-5",
          scrolled
            ? "border-white/12 bg-[#071a10]/75 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.85)] backdrop-blur-xl"
            : "border-white/10 bg-white/[0.04] backdrop-blur-md"
        )}
      >
        <Link to="/" className="shrink-0 transition-opacity hover:opacity-90" aria-label="HarvestWindow home">
          <Logo onDark />
        </Link>

        <nav
          aria-label="Product"
          className="ml-4 hidden items-center lg:flex"
          onMouseLeave={() => setHovered(null)}
        >
          {SECTION_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => goToSection(link.id)}
              onMouseEnter={() => setHovered(link.id)}
              className="relative rounded-full px-4 py-2 text-[13.5px] font-medium text-cream/75 transition-colors hover:text-cream"
            >
              {hovered === link.id && (
                <motion.span
                  layoutId="nav-hover"
                  className="absolute inset-0 rounded-full bg-white/10"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">{link.label}</span>
            </button>
          ))}
          <Link
            to="/how-it-works"
            onMouseEnter={() => setHovered("method")}
            className="relative rounded-full px-4 py-2 text-[13.5px] font-medium text-cream/75 transition-colors hover:text-cream"
          >
            {hovered === "method" && (
              <motion.span
                layoutId="nav-hover"
                className="absolute inset-0 rounded-full bg-white/10"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative">Method</span>
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            to="/sign-in"
            className="hidden rounded-full px-4 py-2 text-[13.5px] font-medium text-cream/80 transition-colors hover:text-cream sm:inline-flex"
          >
            Sign in
          </Link>
          <button
            type="button"
            onClick={explore}
            className="hw-shine inline-flex h-10 items-center gap-2 rounded-full bg-gold px-4 font-display text-[13px] font-bold text-night transition-transform active:scale-[0.97] sm:h-11 sm:px-5"
          >
            {signedIn ? "Open dashboard" : "Explore dashboard"}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-cream lg:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-2 max-w-[1180px] overflow-hidden rounded-[28px] border border-white/12 bg-[#071a10]/92 p-3 backdrop-blur-xl lg:hidden"
          >
            <nav aria-label="Mobile" className="flex flex-col">
              {SECTION_LINKS.map((link, i) => (
                <motion.button
                  key={link.id}
                  type="button"
                  onClick={() => goToSection(link.id)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.25 }}
                  className="rounded-2xl px-4 py-3 text-left font-display text-[17px] font-semibold text-cream transition-colors hover:bg-white/8"
                >
                  {link.label}
                </motion.button>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                <Link
                  to="/how-it-works"
                  className="hw-glass-btn inline-flex h-11 items-center justify-center rounded-full text-[13.5px] font-semibold"
                >
                  The method
                </Link>
                <Link
                  to="/sign-in"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-cream text-[13.5px] font-semibold text-night"
                >
                  Sign in
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
