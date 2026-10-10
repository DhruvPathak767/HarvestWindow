import { useEffect, useState } from "react";
import { PublicNav } from "@/components/navigation/PublicNav";
import { SiteFooter } from "@/components/navigation/SiteFooter";
import { Hero } from "@/features/landing/Hero";
import { HowItWorksSection, ProblemScroll } from "@/features/landing/Story";
import { Showcase } from "@/features/landing/Showcase";
import { Benefits, Features } from "@/features/landing/Features";
import { FinalCTA } from "@/features/landing/FinalCTA";
import { Preloader } from "@/components/fx/Preloader";
import { CursorFollower } from "@/components/fx/Cursor";
import { IntroContext } from "@/features/landing/intro";
import { useSmoothScroll } from "@/lib/smoothScroll";

const INTRO_KEY = "harvestwindow.intro.seen";

function shouldSkipIntro(): boolean {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    return window.sessionStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return true;
  }
}

export default function LandingPage() {
  const [skip] = useState(shouldSkipIntro);
  const [introDone, setIntroDone] = useState(skip);
  const [preloaderGone, setPreloaderGone] = useState(skip);

  useSmoothScroll(introDone);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <IntroContext.Provider value={introDone}>
      <div className="min-h-screen bg-night">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[400] focus:rounded-full focus:bg-gold focus:px-4 focus:py-2 focus:text-night"
        >
          Skip to content
        </a>

        {!preloaderGone && (
          <Preloader
            onReveal={() => {
              try {
                window.sessionStorage.setItem(INTRO_KEY, "1");
              } catch {
                /* storage blocked — intro simply shows again */
              }
              setIntroDone(true);
            }}
            onDone={() => setPreloaderGone(true)}
          />
        )}

        <CursorFollower />
        <PublicNav />

        <main id="main-content">
          <Hero />
          <ProblemScroll />
          <HowItWorksSection />
          <Showcase />
          <Features />
          <Benefits />
          <FinalCTA />
        </main>

        <SiteFooter />
      </div>
    </IntroContext.Provider>
  );
}
