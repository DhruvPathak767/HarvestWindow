import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Logo } from "@/components/brand/Logo";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import LandingPage from "@/features/landing/LandingPage";
import SignIn from "@/features/auth/SignIn";
import SignUp from "@/features/auth/SignUp";

const HowItWorksPage = lazy(() => import("@/features/how-it-works/HowItWorksPage"));
const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage"));
const FarmsPage = lazy(() => import("@/features/farms/FarmsPage"));
const FarmDetailPage = lazy(() => import("@/features/farms/FarmDetailPage"));
const CropDetailPage = lazy(() => import("@/features/crops/CropDetailPage"));
const CropHealthPage = lazy(() => import("@/features/cropHealth/CropHealthPage"));
const ForecastPage = lazy(() => import("@/features/forecasts/ForecastPage"));
const WeatherPage = lazy(() => import("@/features/weather/WeatherPage"));
const RecommendationsPage = lazy(
  () => import("@/features/recommendations/RecommendationsPage")
);
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage"));
const AssistantPage = lazy(() => import("@/features/assistant/AssistantPage"));
const NotificationCenterPage = lazy(
  () => import("@/features/notifications/NotificationCenterPage")
);

function RouteFallback() {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
    >
      <Logo />
      <div className="h-1 w-40 overflow-hidden rounded-full bg-soft">
        <motion.span
          className="block h-full w-1/3 rounded-full bg-living"
          animate={{ x: ["-100%", "300%"] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <p className="sr-only">Loading…</p>
    </div>
  );
}

export function AppRoutes() {
  const location = useLocation();
  const reduced = useReducedMotion();

  return (
    <ErrorBoundary fallbackTitle="Application encountered an unexpected error">
      <Suspense fallback={<RouteFallback />}>
        <Routes location={location}>
          {/* Route-level transitions are handled inside <AppShell/> so the shell,
              sidebar and scroll position are preserved between /app routes. */}
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/how-it-works"
              element={
                <motion.div
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <HowItWorksPage />
                </motion.div>
              }
            />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />

            <Route path="/app" element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="farms" element={<FarmsPage />} />
              <Route path="farms/:farmId" element={<FarmDetailPage />} />
              <Route path="crops/:cropId" element={<CropDetailPage />} />
              <Route path="crop-health" element={<CropHealthPage />} />
              <Route path="forecast" element={<ForecastPage />} />
              <Route path="weather" element={<WeatherPage />} />
              <Route path="recommendations" element={<RecommendationsPage />} />
              <Route path="assistant" element={<AssistantPage />} />
              <Route path="notifications" element={<NotificationCenterPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
