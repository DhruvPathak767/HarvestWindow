import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  CloudRain,
  Loader2,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Sprout,
  Tractor,
  X,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Logo } from "@/components/brand/Logo";
import { Button, ErrorState, Skeleton } from "@/components/common/ui";
import { AddCropModal } from "@/features/crops/AddCropModal";
import { OnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { relativeTime } from "@/utils/date";
import { ALL_FARMS, useStore } from "@/store/AppStore";
import { API_CONFIG } from "@/services/api";
import { cn } from "@/utils/cn";

const COLLAPSE_KEY = "harvestwindow.sidebar.collapsed";

const BOTTOM_NAV = [
  { to: "/app", label: "Overview", icon: Sprout, end: true },
  { to: "/app/farms", label: "Farms", icon: Tractor },
  { to: "/app/forecast", label: "Forecast", icon: CloudRain },
  { to: "/app/recommendations", label: "Actions", icon: Bell },
];

export function AppShell() {
  const { ready, loadError, retryLoad, signedIn, showOnboarding, refreshForecasts } =
    useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addCropOpen, setAddCropOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    setDrawerOpen(false);
    setSearchOpen(false);
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }, [location.pathname, reduced]);

  if (!ready) return <ShellSkeleton />;

  if (loadError) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream p-6">
        <div className="w-full max-w-lg">
          <Logo className="mb-6" />
          <ErrorState
            title="Demo data could not be loaded"
            description={loadError}
            onRetry={retryLoad}
          />
        </div>
      </div>
    );
  }

  if (!signedIn) return <Navigate to="/sign-in" replace />;

  return (
    <div className="min-h-screen bg-cream">
      <div className="flex">
        {/* Desktop sidebar */}
        <motion.aside
          className="sticky top-0 hidden h-screen shrink-0 lg:block"
          animate={{ width: collapsed ? 78 : 268 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          aria-label="Sidebar"
        >
          <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
        </motion.aside>

        {/* Mobile drawer */}
        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-[90] bg-forest-deep/50 lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDrawerOpen(false)}
                aria-hidden
              />
              <motion.div
                className="fixed inset-y-0 left-0 z-[95] w-[280px] lg:hidden"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                role="dialog"
                aria-label="Navigation"
                aria-modal="true"
              >
                <Sidebar
                  collapsed={false}
                  onToggleCollapse={() => undefined}
                  onNavigate={() => setDrawerOpen(false)}
                  variant="drawer"
                />
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="absolute top-4 -right-11 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-forest-deep"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            onOpenDrawer={() => setDrawerOpen(true)}
            onAddCrop={() => setAddCropOpen(true)}
            searchOpen={searchOpen}
            setSearchOpen={setSearchOpen}
            onRefresh={() => refreshForecasts()}
          />

          <main
            id="main"
            className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-5 pb-28 sm:px-6 lg:pb-12"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet context={{ openAddCrop: () => setAddCropOpen(true) }} />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-[80] grid grid-cols-4 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Primary"
      >
        {BOTTOM_NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
          return (
            <button
              key={item.to}
              type="button"
              onClick={() => navigate(item.to)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold transition-colors",
                active ? "text-forest" : "text-muted"
              )}
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-pill"
                  className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-gold"
                  transition={{ duration: 0.25 }}
                />
              )}
              <Icon className="h-[18px] w-[18px]" aria-hidden />
              {item.label}
            </button>
          );
        })}
      </nav>

      <AddCropModal
        open={addCropOpen}
        onClose={() => setAddCropOpen(false)}
        onCreated={(cropId) => navigate(`/app/crops/${cropId}`)}
      />
      <OnboardingFlow open={showOnboarding} />
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-cream" aria-busy="true" aria-live="polite">
      <div className="hidden w-[268px] shrink-0 bg-forest-deep lg:block" />
      <div className="flex-1 p-6">
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="mt-6 h-64 w-full" />
        <p className="sr-only">Loading HarvestWindow demo data…</p>
      </div>
    </div>
  );
}

function Topbar({
  onOpenDrawer,
  onAddCrop,
  searchOpen,
  setSearchOpen,
  onRefresh,
}: {
  onOpenDrawer: () => void;
  onAddCrop: () => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  onRefresh: () => void;
}) {
  const { selectedFarmId, farms } = useStore();
  const farm = farms.find((f) => f.id === selectedFarmId) ?? farms[0];

  return (
    <div className="sticky top-0 z-[70] border-b border-line bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onOpenDrawer}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line bg-white text-forest-deep transition-colors hover:border-living lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" aria-hidden />
        </button>

        <div className="lg:hidden">
          <Logo compact />
        </div>

        <div className="hidden min-w-0 lg:block">
          <p className="hw-eyebrow text-muted">
            {selectedFarmId === ALL_FARMS ? "All farms" : farm?.district ?? "Farm"}
          </p>
          <p className="truncate font-display text-[14px] font-bold text-forest-deep">
            {selectedFarmId === ALL_FARMS ? "Portfolio overview" : (farm?.name ?? "—")}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <GlobalSearch open={searchOpen} setOpen={setSearchOpen} />

          <button
            type="button"
            onClick={onRefresh}
            className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white text-forest-deep transition-colors hover:border-living hover:text-forest"
            aria-label="Refresh estimates"
            title="Recompute estimates from the recorded data"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
          </button>

          <NotificationBell />

          <Button size="sm" className="hidden sm:inline-flex" onClick={onAddCrop}>
            <Plus className="h-4 w-4" aria-hidden />
            Add crop
          </Button>
          <Button
            size="sm"
            className="sm:hidden"
            onClick={onAddCrop}
            aria-label="Add crop"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}

function GlobalSearch({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const { crops, farms } = useStore();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, setOpen]);

  const results = useMemo<{ matchedCrops: typeof crops; matchedFarms: typeof farms }>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { matchedCrops: [], matchedFarms: [] };
    const matchedCrops = crops
      .filter((c) =>
        `${c.name} ${c.variety ?? ""} ${
          farms.find((f) => f.id === c.farmId)?.name ?? ""
        }`.toLowerCase().includes(q)
      )
      .slice(0, 5);
    const matchedFarms = farms.filter((f) =>
      `${f.name} ${f.district} ${f.state}`.toLowerCase().includes(q)
    ).slice(0, 3);
    return { matchedCrops, matchedFarms };
  }, [query, crops, farms]);

  const hasResults =
    results.matchedCrops.length > 0 || results.matchedFarms.length > 0;

  return (
    <div ref={wrapRef} className="relative">
      <div
        className={cn(
          "flex h-9 items-center gap-2 rounded-md border bg-white px-2.5 transition-all duration-200",
          open ? "w-56 border-forest sm:w-72" : "w-9 border-line"
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="grid h-5 w-5 shrink-0 place-items-center text-forest-deep"
          aria-label={open ? "Close search" : "Search crops and farms"}
          aria-expanded={open}
        >
          {open ? <X className="h-4 w-4" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
        </button>
        <AnimatePresence>
          {open && (
            <motion.input
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "100%" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false);
                  setQuery("");
                }
                if (e.key === "Enter" && hasResults) {
                  const crop = results.matchedCrops[0];
                  const farm = results.matchedFarms[0];
                  if (crop) navigate(`/app/crops/${crop.id}`);
                  else if (farm) navigate(`/app/farms/${farm.id}`);
                  setOpen(false);
                  setQuery("");
                }
              }}
              placeholder="Search crops, farms…"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-muted/80"
              aria-label="Search crops and farms"
            />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {open && query.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="absolute top-full right-0 z-50 mt-1.5 w-72 overflow-hidden rounded-md border border-line bg-white shadow-[0_24px_48px_-28px_rgba(22,61,43,0.6)]"
          >
            {results.matchedCrops.map((crop) => (
              <button
                key={crop.id}
                type="button"
                onClick={() => {
                  navigate(`/app/crops/${crop.id}`);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-soft"
              >
                <Sprout className="h-4 w-4 shrink-0 text-living" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-forest-deep">
                    {crop.name}
                    {crop.variety ? ` · ${crop.variety}` : ""}
                  </span>
                  <span className="block truncate text-[11.5px] text-muted">
                    {farms.find((f) => f.id === crop.farmId)?.name}
                  </span>
                </span>
              </button>
            ))}
            {results.matchedFarms.map((farm) => (
              <button
                key={farm.id}
                type="button"
                onClick={() => {
                  navigate(`/app/farms/${farm.id}`);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-soft"
              >
                <Tractor className="h-4 w-4 shrink-0 text-earth" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-forest-deep">
                    {farm.name}
                  </span>
                  <span className="block truncate text-[11.5px] text-muted">
                    {farm.district}, {farm.state}
                  </span>
                </span>
              </button>
            ))}
            {!hasResults && (
              <p className="px-3 py-3 text-[12.5px] text-muted">
                Nothing matches “{query}”.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationBell() {
  const { notifications, unreadCount, markNotificationsRead } = useStore();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) markNotificationsRead();
        }}
        aria-expanded={open}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        className="relative grid h-9 w-9 place-items-center rounded-md border border-line bg-white text-forest-deep transition-colors hover:border-living"
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 font-mono text-[9.5px] font-bold text-forest-deep"
          >
            {unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute top-full right-0 z-50 mt-1.5 w-[min(92vw,360px)] overflow-hidden rounded-md border border-line bg-white shadow-[0_28px_56px_-30px_rgba(22,61,43,0.65)]"
            role="dialog"
            aria-label="Notifications"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="font-display text-[13.5px] font-bold text-forest-deep">
                Notifications
              </p>
              <span className="font-mono text-[10.5px] text-muted">
                {API_CONFIG.mode === "live" ? "Live Feed" : "Demo dataset"}
              </span>
            </div>
            <ul className="hw-scroll-x max-h-80 overflow-y-auto">
              {notifications.length === 0 && (
                <li className="px-4 py-6 text-[12.5px] text-muted">
                  Nothing new. Weather cautions and forecast changes appear here.
                </li>
              )}
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      if (n.kind === "weather") navigate("/app/weather");
                      else if (n.cropId) navigate(`/app/crops/${n.cropId}`);
                      else if (n.farmId) navigate(`/app/farms/${n.farmId}`);
                      else navigate("/app");
                    }}
                    className="flex w-full items-start gap-3 border-b border-line/70 px-4 py-3 text-left transition-colors last:border-0 hover:bg-soft"
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full",
                        n.kind === "weather"
                          ? "bg-[#e6eef4] text-info"
                          : "bg-soft text-forest"
                      )}
                    >
                      {n.kind === "weather" ? (
                        <CloudRain className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Sprout className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] leading-snug font-semibold text-forest-deep">
                        {n.title}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted">
                        {n.body}
                      </span>
                      <span className="mt-1 block font-mono text-[10px] tracking-wide text-muted/80 uppercase">
                        {relativeTime(n.at)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-line p-2 bg-cream/30">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/app/notifications");
                }}
                className="w-full rounded-md py-1.5 text-center font-display text-xs font-semibold text-forest hover:bg-forest/10 transition-colors"
              >
                Open Notification Center →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LoadingIcon({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} aria-hidden />;
}
