import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Check,
  ChevronsLeftRight,
  CloudSun,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Map,
  RotateCcw,
  Settings as SettingsIcon,
  ShieldAlert,
  Tractor,
  Bot,
  Bell,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Tooltip } from "@/components/common/ui";
import { ALL_FARMS, useStore, type FarmSelection } from "@/store/AppStore";
import { cn } from "@/utils/cn";

const NAV = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/app/assistant", label: "AI Assistant", icon: Bot, isAi: true },
  { to: "/app/notifications", label: "Alerts Center", icon: Bell },
  { to: "/app/farms", label: "My Farms", icon: Map },
  { to: "/app/crop-health", label: "Crop Health", icon: ShieldAlert },
  { to: "/app/forecast", label: "Harvest Forecast", icon: BarChart3 },
  { to: "/app/monitoring", label: "Model Monitoring", icon: Activity },
  { to: "/app/weather", label: "Weather", icon: CloudSun },
  { to: "/app/recommendations", label: "Recommendations", icon: ListChecks },
  { to: "/app/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar({
  collapsed,
  onToggleCollapse,
  onNavigate,
  variant = "desktop",
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
  variant?: "desktop" | "drawer";
}) {
  const {
    farms,
    selectedFarmId,
    selectFarm,
    user,
    signOut,
    resetDemoData,
    recommendations,
    settings,
    unreadCount,
  } = useStore();
  const navigate = useNavigate();
  const [farmMenuOpen, setFarmMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const openRecommendations = recommendations.filter((r) => r.status === "open").length;
  const selectedFarm = farms.find((f) => f.id === selectedFarmId);
  const farmLabel =
    selectedFarmId === ALL_FARMS
      ? "All farms"
      : (selectedFarm?.name ?? (farms.length > 0 ? farms[0].name : "Select a farm"));

  const go = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const pickFarm = (id: FarmSelection) => {
    selectFarm(id);
    setFarmMenuOpen(false);
  };

  const initials = user.fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-forest-deep text-cream",
        collapsed && variant === "desktop" && "items-center"
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex items-center gap-2 px-4 pt-5 pb-4",
          collapsed && variant === "desktop" && "justify-center px-2"
        )}
      >
        <button
          type="button"
          onClick={() => go("/")}
          className="flex items-center gap-2.5 rounded-sm text-left transition-opacity hover:opacity-90"
          aria-label="HarvestWindow home"
        >
          <Logo onDark compact={collapsed && variant === "desktop"} />
        </button>
        {variant === "desktop" && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="ml-auto grid h-7 w-7 place-items-center rounded-sm text-sage transition-colors hover:bg-white/10 hover:text-cream"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            <ChevronsLeftRight className={cn("h-4 w-4", collapsed && "rotate-90")} aria-hidden />
          </button>
        )}
      </div>

      {/* Farm selector */}
      <div
        className={cn(
          "relative px-3 pb-3",
          collapsed && variant === "desktop" && "px-2"
        )}
      >
        <button
          type="button"
          onClick={() => {
            setProfileOpen(false);
            setFarmMenuOpen((v) => !v);
          }}
          aria-expanded={farmMenuOpen}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md border border-white/12 bg-white/6 px-3 py-2.5 text-left transition-colors hover:bg-white/12",
            collapsed && variant === "desktop" && "justify-center px-2"
          )}
        >
          <Tractor className="h-4 w-4 shrink-0 text-gold" aria-hidden />
          {!(collapsed && variant === "desktop") && (
            <span className="min-w-0 flex-1">
              <span className="hw-eyebrow block text-[9.5px] text-sage/80">
                Active farm
              </span>
              <span className="block truncate font-display text-[13px] font-semibold">
                {farmLabel}
              </span>
            </span>
          )}
        </button>

        <AnimatePresence>
          {farmMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-3 top-full z-40 mt-1 overflow-hidden rounded-md border border-white/12 bg-[#12331f] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.8)]"
            >
              <p className="hw-eyebrow border-b border-white/8 px-3 py-2 text-sage/70">
                Switch farm
              </p>
              <ul className="max-h-64 overflow-y-auto p-1">
                <li>
                  <FarmOption
                    label="All farms"
                    meta={`${farms.length} farms in the plan`}
                    active={selectedFarmId === ALL_FARMS}
                    onSelect={() => pickFarm(ALL_FARMS)}
                  />
                </li>
                {farms.map((farm) => (
                  <li key={farm.id}>
                    <FarmOption
                      label={farm.name}
                      meta={`${farm.district}, ${farm.state} · ${farm.area} ${
                        farm.areaUnit === "hectare" ? "ha" : "ac"
                      }`}
                      active={selectedFarmId === farm.id}
                      onSelect={() => pickFarm(farm.id)}
                    />
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => go("/app/farms")}
                className="w-full border-t border-white/8 px-3 py-2.5 text-left text-[12.5px] font-semibold text-sage transition-colors hover:bg-white/8 hover:text-cream"
              >
                Manage farms →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav
        aria-label="Application"
        className={cn("flex-1 px-3", collapsed && variant === "desktop" && "px-2")}
      >
        <ul className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const badge =
              item.to === "/app/recommendations"
                ? openRecommendations
                : item.to === "/app/notifications"
                ? unreadCount
                : 0;
            const link = (
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-[13.5px] font-medium transition-colors duration-150",
                    isActive
                      ? "bg-white/12 text-cream"
                      : "text-sage/85 hover:bg-white/7 hover:text-cream",
                    collapsed && variant === "desktop" && "justify-center px-2"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute top-1/2 left-0 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-gold"
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      />
                    )}
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0 transition-colors",
                        isActive ? "text-gold" : "text-sage group-hover:text-cream"
                      )}
                      aria-hidden
                    />
                    {!(collapsed && variant === "desktop") && (
                      <span className="truncate">{item.label}</span>
                    )}
                    {badge > 0 && !(collapsed && variant === "desktop") && (
                      <span className="ml-auto rounded-full bg-gold px-1.5 py-0.5 font-mono text-[10px] font-semibold text-forest-deep">
                        {badge}
                      </span>
                    )}
                    {badge > 0 && collapsed && variant === "desktop" && (
                      <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-gold" />
                    )}
                  </>
                )}
              </NavLink>
            );

            return (
              <li key={item.to}>
                {collapsed && variant === "desktop" ? (
                  <Tooltip label={item.label}>{link}</Tooltip>
                ) : (
                  link
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Profile */}
      <div
        className={cn(
          "relative border-t border-white/10 p-3",
          collapsed && variant === "desktop" && "px-2"
        )}
      >
        <button
          type="button"
          onClick={() => {
            setFarmMenuOpen(false);
            setProfileOpen((v) => !v);
          }}
          aria-expanded={profileOpen}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/8",
            collapsed && variant === "desktop" && "justify-center"
          )}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-living font-display text-[12px] font-bold text-forest-deep">
            {initials}
          </span>
          {!(collapsed && variant === "desktop") && (
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-[13px] font-semibold">
                {user.fullName}
              </span>
              <span className="block truncate text-[11.5px] text-sage/75">
                {settings.areaUnit === "acre" ? "Units: acres" : "Units: hectares"} ·{" "}
                {user.role}
              </span>
            </span>
          )}
        </button>

        <AnimatePresence>
          {profileOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-x-3 bottom-full z-40 mb-1 overflow-hidden rounded-md border border-white/12 bg-[#12331f] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.8)]"
            >
              <div className="border-b border-white/8 px-3 py-2.5">
                <p className="truncate font-display text-[13px] font-semibold">
                  {user.fullName}
                </p>
                <p className="truncate text-[11.5px] text-sage/75">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => go("/app/settings")}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] text-sage transition-colors hover:bg-white/8 hover:text-cream"
              >
                <SettingsIcon className="h-4 w-4" aria-hidden />
                Settings & preferences
              </button>
              <button
                type="button"
                onClick={() => {
                  void resetDemoData();
                  setProfileOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] text-sage transition-colors hover:bg-white/8 hover:text-cream"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                Reset demo data
              </button>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  setProfileOpen(false);
                  navigate("/");
                }}
                className="flex w-full items-center gap-2.5 border-t border-white/8 px-3 py-2.5 text-left text-[13px] text-sage transition-colors hover:bg-white/8 hover:text-cream"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Sign out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FarmOption({
  label,
  meta,
  active,
  onSelect,
}: {
  label: string;
  meta: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left transition-colors",
        active ? "bg-white/12" : "hover:bg-white/8"
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-cream">{label}</span>
        <span className="block truncate text-[11px] text-sage/70">{meta}</span>
      </span>
      {active && <Check className="h-4 w-4 shrink-0 text-gold" aria-hidden />}
    </button>
  );
}
