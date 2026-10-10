import { useCallback, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  Compass,
  Leaf,
  LocateFixed,
  MapPin,
  Sparkles,
  Sprout,
  TriangleAlert,
} from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { Button, StatusBadge } from "@/components/common/ui";
import {
  SearchableSelect,
  SelectField,
  TextField,
} from "@/components/common/fields";
import { MiniTimeline } from "@/components/charts/HarvestTimeline";
import { CROP_CATALOG, findCatalogEntry } from "@/data/mock/cropCatalog";
import { INDIAN_STATES } from "@/data/mock/cropCatalog";
import { STAGE_TEMPLATES, type Crop, type Farm } from "@/types";
import { computeForecast } from "@/services/forecast/forecastService";
import { weatherService } from "@/services/weather/weatherService";
import { detectBrowserLocation } from "@/services/location/geolocationService";
import { SOIL_TYPE_OPTIONS, IRRIGATION_SOURCE_OPTIONS } from "@/features/farms/AddFarmModal";
import {
  addDays,
  daysLabel,
  formatDate,
  startOfToday,
  toISODate,
} from "@/utils/date";
import { useStore, type OnboardingDraft } from "@/store/AppStore";
import { cn } from "@/utils/cn";

const STEPS = [
  { id: 1, label: "Welcome" },
  { id: 2, label: "Farm" },
  { id: 3, label: "Crop" },
  { id: 4, label: "Planting" },
  { id: 5, label: "Forecast" },
];

const EMPTY_DRAFT: OnboardingDraft = {
  farmName: "",
  state: "Karnataka",
  district: "",
  village: "",
  pincode: "",
  soilType: "",
  irrigationSource: "",
  latitude: null,
  longitude: null,
  area: 0,
  areaUnit: "hectare",
  notes: "",
  cropName: "",
  variety: "",
  plantingDate: toISODate(addDays(startOfToday(), -60)),
  growthStage: "",
};

export function OnboardingFlow({ open }: { open: boolean }) {
  const { setShowOnboarding, completeOnboarding } = useStore();
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const set = <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const handleDetectLocation = async () => {
    setLocating(true);
    setLocationError(null);
    setLocationSuccess(null);
    try {
      const res = await detectBrowserLocation();
      set("latitude", res.latitude);
      set("longitude", res.longitude);
      if (res.state) {
        const match = INDIAN_STATES.find(
          (s) => s.toLowerCase() === res.state?.toLowerCase()
        );
        if (match) set("state", match);
        else set("state", res.state);
      }
      if (res.district) set("district", res.district);
      if (res.village) set("village", res.village);
      if (res.pincode) set("pincode", res.pincode);

      setLocationSuccess(
        `Live GPS coordinates captured: ${res.latitude}°, ${res.longitude}° (Accuracy ±${res.accuracy}m)`
      );
    } catch (err: unknown) {
      setLocationError(
        err instanceof Error
          ? err.message
          : "Unable to detect browser live location. Please allow location permissions."
      );
    } finally {
      setLocating(false);
    }
  };

  const entry = useMemo(() => findCatalogEntry(draft.cropName), [draft.cropName]);

  const preview = useMemo(() => {
    if (!draft.cropName || !draft.plantingDate) return null;
    const tempFarm: Farm = {
      id: "onboarding-preview",
      name: draft.farmName || "Your farm",
      state: draft.state,
      district: draft.district || "—",
      village: draft.village || null,
      villageOrTaluka: draft.village || null,
      pincode: draft.pincode || null,
      postalCode: draft.pincode || null,
      soilType: draft.soilType || null,
      irrigationSource: draft.irrigationSource || null,
      latitude: draft.latitude ?? null,
      longitude: draft.longitude ?? null,
      area: draft.area || 1,
      areaUnit: draft.areaUnit,
      notes: draft.notes || null,
      createdAt: new Date().toISOString(),
    };
    const isRainfed = draft.irrigationSource?.toLowerCase().includes("rainfed");
    const isIrrigated = Boolean(draft.irrigationSource && !isRainfed);
    const tempCrop: Crop = {
      id: "onboarding-preview-crop",
      farmId: tempFarm.id,
      name: draft.cropName,
      variety: draft.variety || undefined,
      plantingDate: draft.plantingDate,
      growthStage: draft.growthStage || undefined,
      fieldArea: draft.area || undefined,
      irrigation: isRainfed ? "rainfed" : isIrrigated ? "irrigated" : "mixed",
      createdAt: new Date().toISOString(),
    };
    return {
      forecast: computeForecast(tempCrop, weatherService.snapshotForFarm(tempFarm)),
      crop: tempCrop,
    };
  }, [draft]);

  const validateStep = (index: number): boolean => {
    const next: Record<string, string> = {};
    if (index === 1) {
      if (draft.farmName.trim().length < 2) next.farmName = "Enter a farm name";
      if (draft.district.trim().length < 2) next.district = "Enter a district or locality";
      if (!draft.state) next.state = "Select a state";
      if (!(draft.area > 0)) next.area = "Enter a field size greater than zero";
    }
    if (index === 2 && !draft.cropName) next.cropName = "Choose the crop you planted";
    if (index === 3) {
      if (!draft.plantingDate) next.plantingDate = "Enter the planting date";
      else if (new Date(draft.plantingDate).getTime() > Date.now())
        next.plantingDate = "The planting date cannot be in the future";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const close = useCallback(() => {
    setShowOnboarding(false);
    setStep(0);
    setLocationSuccess(null);
    setLocationError(null);
  }, [setShowOnboarding]);

  const next = () => {
    if (step >= 1 && step <= 3 && !validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const finish = async () => {
    setSubmitting(true);
    try {
      await completeOnboarding(draft);
      setStep(0);
      setDraft(EMPTY_DRAFT);
      setLocationSuccess(null);
      setLocationError(null);
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <Modal
      open={open}
      onClose={close}
      size="md"
      stepLabel={`Step ${step + 1} of ${STEPS.length} · ${STEPS[step].label}`}
      title={
        step === 0
          ? "Welcome to HarvestWindow"
          : step === 1
            ? "Add your farm"
            : step === 2
              ? "Select your crop"
              : step === 3
                ? "When was it planted?"
                : "Your first harvest estimate"
      }
      description={
        step === 0
          ? "Three short steps set up a real record in this demo workspace. You can skip and explore the sample farms instead."
          : step === 4
            ? "Calculated in your browser from the planting date, crop reference durations and the demo weather dataset."
            : "Everything is stored locally in this browser — nothing is sent anywhere."
      }
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => (step === 0 ? close() : setStep((s) => s - 1))}
            iconRight={step > 0 ? undefined : undefined}
          >
            {step === 0 ? (
              "Skip — explore demo farms"
            ) : (
              <>
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Back
              </>
            )}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" size="sm" onClick={next}>
              {step === 0 ? "Start setup" : "Continue"}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={finish} loading={submitting}>
              Create farm & forecast
            </Button>
          )}
        </>
      }
    >
      {/* Progress */}
      <div className="mb-5">
        <div className="flex items-center justify-between gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex flex-1 flex-col gap-1.5">
              <span
                className={cn(
                  "h-1 rounded-full transition-colors duration-300",
                  i <= step ? "bg-living" : "bg-line"
                )}
              />
              <span
                className={cn(
                  "hidden text-[10.5px] font-semibold sm:block",
                  i === step ? "text-forest-deep" : "text-muted"
                )}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
        <motion.div
          className="mt-1 h-px bg-transparent"
          aria-hidden
        >
          <motion.span
            className="block h-px bg-gold"
            animate={{ width: `${progress}%` }}
            transition={{ duration: reduced ? 0 : 0.4 }}
          />
        </motion.div>
      </div>

      <motion.div
        key={step}
        initial={reduced ? { opacity: 0 } : { opacity: 0, x: 14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-4"
      >
        {step === 0 && (
          <div className="flex flex-col gap-3">
            {[
              {
                icon: <MapPin className="h-4 w-4" aria-hidden />,
                title: "Your farm and location",
                body: "Name, district and size — the context every estimate hangs off.",
              },
              {
                icon: <Sprout className="h-4 w-4" aria-hidden />,
                title: "The crop you planted",
                body: "Chosen from reference durations for common Indian crops.",
              },
              {
                icon: <CalendarRange className="h-4 w-4" aria-hidden />,
                title: "An estimated harvest window",
                body: "A date range with the factors behind it — never a single promised day.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduced ? 0 : 0.06 * i, duration: 0.3 }}
                className="flex items-start gap-3 rounded-md border border-line bg-soft/60 p-3.5"
              >
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-forest">
                  {item.icon}
                </span>
                <div>
                  <p className="font-display text-[13.5px] font-bold text-forest-deep">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
                    {item.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {step === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
            className="flex flex-col gap-4"
          >
            {/* Live Location Action Banner */}
            <div className="rounded-lg border border-forest/20 bg-gradient-to-r from-forest/5 via-cream/60 to-gold/10 p-3.5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest text-cream shadow-xs">
                    <LocateFixed className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="font-display text-[13px] font-bold text-forest-deep">
                      Live Location · Browser GPS
                    </p>
                    <p className="text-[11.5px] leading-tight text-muted">
                      Use Browser Geolocation API to auto-fill GPS coordinates and regional context
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleDetectLocation}
                  loading={locating}
                  className="shrink-0 font-semibold"
                >
                  <Compass className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  {locating ? "Acquiring GPS..." : "Detect Live Location"}
                </Button>
              </div>

              {locationSuccess && (
                <div className="mt-2.5 flex items-center gap-2 rounded border border-forest/30 bg-[#edf5ea] px-3 py-1.5 text-[11.5px] font-medium text-forest-deep">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-forest" aria-hidden />
                  <span>{locationSuccess}</span>
                </div>
              )}

              {locationError && (
                <div className="mt-2.5 flex items-center gap-2 rounded border border-danger/30 bg-[#fdf1ee] px-3 py-1.5 text-[11.5px] text-[#8d3a26]">
                  <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-danger" aria-hidden />
                  <span>{locationError}</span>
                </div>
              )}
            </div>

            <TextField
              label="Farm name"
              required
              placeholder="e.g. Shanti Grove"
              value={draft.farmName}
              error={errors.farmName}
              leadingIcon={<MapPin className="h-4 w-4" aria-hidden />}
              onChange={(e) => set("farmName", e.target.value)}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="State"
                required
                value={draft.state}
                error={errors.state}
                options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
                onChange={(e) => set("state", e.target.value)}
              />
              <TextField
                label="District or locality"
                required
                placeholder="e.g. Belagavi"
                value={draft.district}
                error={errors.district}
                onChange={(e) => set("district", e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Village / Taluka (optional)"
                placeholder="e.g. Gokak Taluk"
                value={draft.village || ""}
                onChange={(e) => set("village", e.target.value)}
              />
              <TextField
                label="PIN / Postal code (optional)"
                placeholder="e.g. 591307"
                maxLength={10}
                value={draft.pincode || ""}
                onChange={(e) => set("pincode", e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Soil type (optional)"
                placeholder="Select soil classification"
                value={draft.soilType || ""}
                options={SOIL_TYPE_OPTIONS}
                onChange={(e) => set("soilType", e.target.value)}
              />
              <SelectField
                label="Primary irrigation source (optional)"
                placeholder="Select irrigation method"
                value={draft.irrigationSource || ""}
                options={IRRIGATION_SOURCE_OPTIONS}
                onChange={(e) => set("irrigationSource", e.target.value)}
              />
            </div>

            <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto]">
              <TextField
                label="Field size"
                required
                placeholder="e.g. 6"
                inputMode="decimal"
                value={draft.area ? String(draft.area) : ""}
                error={errors.area}
                onChange={(e) => set("area", Number(e.target.value) || 0)}
              />
              <div className="flex flex-col gap-1.5">
                <span className="font-display text-[12.5px] font-semibold text-forest-deep">
                  Unit
                </span>
                <div className="inline-flex gap-1 rounded-sm border border-line bg-soft/70 p-0.5">
                  {(["hectare", "acre"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => set("areaUnit", u)}
                      className={cn(
                        "rounded-[3px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                        draft.areaUnit === u
                          ? "bg-forest-deep text-cream"
                          : "text-muted hover:text-forest-deep"
                      )}
                    >
                      {u === "hectare" ? "Hectares" : "Acres"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Latitude (optional)"
                placeholder="e.g. 15.8497"
                inputMode="decimal"
                value={
                  draft.latitude !== undefined && draft.latitude !== null
                    ? String(draft.latitude)
                    : ""
                }
                onChange={(e) =>
                  set("latitude", e.target.value ? Number(e.target.value) : null)
                }
                hint="Auto-filled by live location or manual GPS."
              />
              <TextField
                label="Longitude (optional)"
                placeholder="e.g. 74.4977"
                inputMode="decimal"
                value={
                  draft.longitude !== undefined && draft.longitude !== null
                    ? String(draft.longitude)
                    : ""
                }
                onChange={(e) =>
                  set("longitude", e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>

            <TextField
              label="Notes / Field notes (optional)"
              placeholder="Access roads, water channel maintenance, boundary notes…"
              value={draft.notes || ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </form>
        )}

        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
            className="flex flex-col gap-4"
          >
            <SearchableSelect
              label="Crop"
              required
              value={draft.cropName}
              onChange={(v) => set("cropName", v)}
              error={errors.cropName}
              placeholder="Search wheat, rice, cotton, tomato…"
              options={CROP_CATALOG.map((c) => ({
                value: c.name,
                label: c.name,
                meta: `${c.seasons.join(" / ")} · ${c.durationRange[0]}–${c.durationRange[1]} days`,
              }))}
            />
            <TextField
              label="Variety (optional)"
              placeholder="e.g. Jyothi"
              value={draft.variety}
              onChange={(e) => set("variety", e.target.value)}
              hint="A known variety narrows the reference duration used."
            />
            {entry && (
              <p className="flex items-start gap-2 rounded-md border border-line bg-soft/70 px-3.5 py-3 text-[12.5px] leading-relaxed text-forest-deep">
                <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-living" aria-hidden />
                {entry.note}
              </p>
            )}
          </form>
        )}

        {step === 3 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
            className="flex flex-col gap-4"
          >
            <TextField
              label="Planting or sowing date"
              required
              type="date"
              max={toISODate(startOfToday())}
              value={draft.plantingDate}
              error={errors.plantingDate}
              onChange={(e) => set("plantingDate", e.target.value)}
              hint="This is the anchor for the whole estimate."
            />
            {entry && (
              <SelectField
                label="Current growth stage (optional)"
                placeholder="Select a stage"
                value={draft.growthStage}
                onChange={(e) => set("growthStage", e.target.value)}
                options={[
                  { value: "Not recorded yet", label: "Not recorded yet" },
                  ...(STAGE_TEMPLATES[entry.stageTemplateName] as readonly string[]).map(
                    (s) => ({ value: s, label: s })
                  ),
                ]}
              />
            )}
          </form>
        )}

        {step === 4 && preview && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-gold/50 bg-gold-soft/25 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-display text-[13px] font-bold text-forest-deep">
                  <Sparkles className="h-4 w-4 text-[#8a6415]" aria-hidden />
                  Estimated harvest window
                </p>
                <StatusBadge status={preview.forecast.readinessStatus} />
              </div>
              <p className="hw-num mt-2 text-[28px] leading-none font-extrabold text-forest-deep">
                {formatDate(preview.forecast.estimatedWindowStart)}
                <span className="mx-2 text-[18px] font-semibold text-muted">→</span>
                {formatDate(preview.forecast.estimatedWindowEnd)}
              </p>
              <MiniTimeline forecast={preview.forecast} className="mt-4" />
              <p className="mt-3 text-[12.5px] leading-relaxed text-[#5d5330]">
                {preview.forecast.daysToWindowStart > 0
                  ? `Opens in ${daysLabel(preview.forecast.daysToWindowStart)} — ${preview.forecast.nextAction}`
                  : preview.forecast.daysToWindowEnd >= 0
                    ? `Open now — ${preview.forecast.nextAction}`
                    : `This window has already closed — ${preview.forecast.nextAction}`}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-line bg-white p-3">
                <dt className="text-[11px] tracking-wide text-muted uppercase">
                  Reference duration
                </dt>
                <dd className="hw-num mt-1 text-[17px] font-bold text-forest-deep">
                  {entry?.durationRange[0] ?? "—"}–{entry?.durationRange[1] ?? "—"} days
                </dd>
              </div>
              <div className="rounded-md border border-line bg-white p-3">
                <dt className="text-[11px] tracking-wide text-muted uppercase">
                  Input completeness
                </dt>
                <dd className="hw-num mt-1 text-[17px] font-bold text-forest-deep">
                  {preview.forecast.confidence ?? "—"}%
                </dd>
              </div>
            </dl>

            <p className="rounded-md border border-line bg-cream/70 px-3.5 py-3 text-[12px] leading-relaxed text-muted">
              {preview.forecast.modelNote}
            </p>
          </div>
        )}
      </motion.div>
    </Modal>
  );
}
