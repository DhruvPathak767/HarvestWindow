import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Award, Compass, Sprout } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { Badge, Button } from "@/components/common/ui";
import {
  SearchableSelect,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/common/fields";
import { CROP_CATALOG, findCatalogEntry } from "@/data/mock/cropCatalog";
import { STAGE_TEMPLATES, type AgriCrop, type AgriCropCalendar } from "@/types";
import { addDays, startOfToday, toISODate } from "@/utils/date";
import { ALL_FARMS, useStore } from "@/store/AppStore";
import { api } from "@/services/api";

const schema = z.object({
    cropName: z.string().min(2, "Choose the crop for this block"),
    variety: z.string().trim().max(40).optional(),
    farmId: z.string().min(1, "Select the farm this block belongs to"),
    plantingDate: z
      .string()
      .min(1, "Enter the planting or sowing date")
      .refine((v) => new Date(v).getTime() <= Date.now() + 86_400_000, {
        message: "The planting date cannot be in the future",
      })
      .refine(
        (v) => new Date(v).getTime() >= addDays(startOfToday(), -1200).getTime(),
        { message: "That planting date is more than three seasons ago" }
      ),
    growthStage: z.string().optional(),
    fieldArea: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) > 0), {
        message: "Field area must be a number greater than zero",
      }),
    expectedYield: z.string().trim().max(40).optional(),
    irrigation: z.enum(["rainfed", "irrigated", "mixed"]).optional(),
    harvestType: z.enum(["single", "multiple"]).optional(),
    notes: z.string().trim().max(240).optional(),
  });

type FormValues = z.infer<typeof schema>;

export function AddCropModal({
  open,
  onClose,
  defaultFarmId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  defaultFarmId?: string;
  onCreated?: (cropId: string) => void;
}) {
  const { farms, addCrop, selectedFarmId } = useStore();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [dbCrops, setDbCrops] = useState<AgriCrop[]>([]);
  const [calendars, setCalendars] = useState<AgriCropCalendar[]>([]);

  const initialFarm =
    defaultFarmId ??
    (selectedFarmId !== ALL_FARMS ? selectedFarmId : (farms[0]?.id ?? ""));

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cropName: "",
      variety: "",
      farmId: initialFarm,
      plantingDate: toISODate(addDays(startOfToday(), -45)),
      growthStage: "",
      fieldArea: "",
      expectedYield: "",
      irrigation: "irrigated",
      harvestType: undefined,
      notes: "",
    },
  });

  const cropName = watch("cropName");
  const farmId = watch("farmId");
  const selectedFarm = useMemo(() => farms.find((f) => f.id === farmId), [farms, farmId]);

  // Load database crops when modal is opened
  useEffect(() => {
    let cancelled = false;
    if (open) {
      api.listAgriCrops({ limit: 100 })
        .then((res: { crops: AgriCrop[]; pagination: unknown }) => {
          if (!cancelled && res?.crops && res.crops.length > 0) {
            setDbCrops(res.crops);
          }
        })
        .catch((err: unknown) => console.warn("[AddCropModal] Could not fetch agri crops:", err));
    }
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Find matching crop in database knowledge base
  const matchedAgriCrop = useMemo(() => {
    if (!cropName) return null;
    return (
      dbCrops.find(
        (c) => c.canonicalName.toLowerCase() === cropName.toLowerCase().trim()
      ) || null
    );
  }, [dbCrops, cropName]);

  // Fetch regional calendars when crop or farm changes
  useEffect(() => {
    let cancelled = false;
    if (cropName) {
      api.getCropCalendars({
        crop: cropName,
        state: selectedFarm?.state || undefined,
      })
        .then((cals: AgriCropCalendar[]) => {
          const list = Array.isArray(cals) ? cals : (cals as any)?.items || [];
          if (!cancelled) setCalendars(list);
        })
        .catch(() => {
          if (!cancelled) setCalendars([]);
        });
    } else {
      setCalendars([]);
    }
    return () => {
      cancelled = true;
    };
  }, [cropName, selectedFarm?.state]);

  const entry = useMemo(() => findCatalogEntry(cropName), [cropName]);
  const stageOptions = useMemo(() => {
    if (!entry) return [];
    const stages = STAGE_TEMPLATES[entry.stageTemplateName] as readonly string[];
    return [
      { value: "Not recorded yet", label: "Not recorded yet" },
      ...stages.map((s) => ({ value: s, label: s })),
    ];
  }, [entry]);

  // Build options from database if available, otherwise fallback to catalog
  const cropOptions = useMemo(() => {
    if (dbCrops.length > 0) {
      return dbCrops.map((c) => {
        const dur = c.growthProfiles?.[0]
          ? `${c.growthProfiles[0].minDurationDays}–${c.growthProfiles[0].maxDurationDays} days`
          : null;
        const meta = [c.category, dur, c.scientificName ? `(${c.scientificName})` : null]
          .filter(Boolean)
          .join(" · ");
        return {
          value: c.canonicalName,
          label: c.canonicalName,
          meta,
        };
      });
    }
    return CROP_CATALOG.map((c) => ({
      value: c.name,
      label: c.name,
      meta: `${c.seasons.join(" / ")} · ${c.durationRange[0]}–${c.durationRange[1]} days`,
    }));
  }, [dbCrops]);

  const growthProfile = matchedAgriCrop?.growthProfiles?.[0] || null;
  const regionalCalendar =
    calendars.find(
      (c) =>
        selectedFarm?.state &&
        c.region?.state?.toLowerCase().trim() === selectedFarm.state.toLowerCase().trim()
    ) ||
    calendars[0] ||
    null;

  const hasGdd =
    growthProfile?.gddRequirementMin !== null &&
    growthProfile?.gddRequirementMin !== undefined;

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const extra =
        values.harvestType === "multiple"
          ? "Multiple pickings planned across the window."
          : values.harvestType === "single"
            ? "Single harvest planned."
            : undefined;
      const crop = await addCrop({
        name: values.cropName,
        variety: values.variety,
        farmId: values.farmId,
        plantingDate: values.plantingDate,
        growthStage: values.growthStage || undefined,
        fieldArea: values.fieldArea ? Number(values.fieldArea) : undefined,
        expectedYield: values.expectedYield || undefined,
        irrigation: (values.irrigation || undefined) as FormValues["irrigation"],
        notes: [values.notes, extra].filter(Boolean).join(" ") || undefined,
      });
      onCreated?.(crop.id);
      reset();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create crop";
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a crop"
      description="The planting date and crop type drive the estimated harvest window. Everything else tightens it."
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-crop-form" loading={submitting} iconRight={<Sprout className="h-4 w-4" aria-hidden />}>
            Generate harvest estimate
          </Button>
        </>
      }
    >
      <form
        id="add-crop-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        {serverError && (
          <div className="rounded-md border border-caution/40 bg-caution/10 px-3.5 py-2.5 text-[12.5px] font-medium text-caution">
            {serverError}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="cropName"
            render={({ field }) => (
              <SearchableSelect
                label="Crop"
                required
                value={field.value}
                onChange={field.onChange}
                error={errors.cropName?.message}
                hint="Searchable list of common Indian crops."
                options={cropOptions}
              />
            )}
          />
          <TextField
            label="Variety (if known)"
            placeholder="e.g. HD-3086"
            hint="A known variety narrows the reference duration."
            error={errors.variety?.message}
            {...register("variety")}
          />
        </div>

        {/* Variety recommendation chips if available from knowledge base */}
        {matchedAgriCrop?.varieties && matchedAgriCrop.varieties.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted -mt-2">
            <span className="font-medium text-forest-deep">Verified varieties:</span>
            {matchedAgriCrop.varieties.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setValue("variety", v.varietyName)}
                className="cursor-pointer rounded bg-soft hover:bg-forest/10 px-2 py-0.5 text-forest-deep transition-colors font-mono border border-line/60"
              >
                + {v.varietyName}
              </button>
            ))}
          </div>
        )}

        {/* Verified Agronomic Knowledge Banner */}
        {matchedAgriCrop || entry ? (
          <div className="flex flex-col gap-2 rounded-md border border-forest/20 bg-soft/70 px-3.5 py-3 text-[12px] text-forest-deep">
            <div className="flex items-center justify-between gap-2 border-b border-line/50 pb-2">
              <span className="flex items-center gap-1.5 font-bold">
                <Compass className="h-3.5 w-3.5 text-forest" />
                <span>
                  {matchedAgriCrop?.canonicalName || entry?.name} · Agronomic Knowledge Profile
                </span>
              </span>
              <Badge
                tone={growthProfile?.verificationStatus === "VERIFIED" ? "living" : "neutral"}
                icon={<Award className="h-3 w-3" />}
              >
                {growthProfile?.verificationStatus === "VERIFIED" ? "ICAR Verified" : "Reference Baseline"}
              </Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 pt-1 text-[11.5px]">
              <div>
                <span className="font-medium">Growth duration:</span>{" "}
                {growthProfile ? (
                  <span className="font-mono">
                    {growthProfile.minDurationDays}–{growthProfile.maxDurationDays} days (Typ:{" "}
                    {growthProfile.typicalDurationDays}d)
                  </span>
                ) : entry ? (
                  <span className="font-mono">
                    {entry.durationRange[0]}–{entry.durationRange[1]} days
                  </span>
                ) : (
                  "Not specified"
                )}
              </div>

              <div>
                <span className="font-medium">Regional Calendar:</span>{" "}
                {regionalCalendar ? (
                  <span>
                    {regionalCalendar.region?.state || "National"} ({regionalCalendar.season?.canonicalName})
                  </span>
                ) : (
                  <span className="text-muted">National generalized cycle</span>
                )}
              </div>

              <div className="sm:col-span-2">
                <span className="font-medium">Growing Degree Days (GDD):</span>{" "}
                {hasGdd && growthProfile ? (
                  <span className="font-mono text-forest-deep">
                    {growthProfile.gddRequirementMin?.toLocaleString()}–
                    {growthProfile.gddRequirementMax?.toLocaleString()} °C-days (Base:{" "}
                    {growthProfile.gddBaseTempC ?? 10}°C)
                  </span>
                ) : (
                  <span className="text-muted italic">
                    Not verified for this region/variety yet · Standard calendar duration used
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Farm"
            required
            error={errors.farmId?.message}
            options={farms.map((f) => ({
              value: f.id,
              label: `${f.name} · ${f.district}`,
            }))}
            {...register("farmId")}
          />
          <TextField
            label="Planting / sowing date"
            required
            type="date"
            max={toISODate(startOfToday())}
            error={errors.plantingDate?.message}
            hint="The single most important input for the estimate."
            {...register("plantingDate")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {entry ? (
            <SelectField
              label="Current growth stage (if known)"
              placeholder="Select a stage"
              options={stageOptions}
              hint="Crop-specific stages for this variety family."
              {...register("growthStage")}
            />
          ) : (
            <TextField
              label="Current growth stage (optional)"
              placeholder="e.g. Flowering"
              hint="Select a crop to see its stage list."
              {...register("growthStage")}
            />
          )}
          <SelectField
            label="Irrigation"
            options={[
              { value: "irrigated", label: "Irrigated" },
              { value: "rainfed", label: "Rainfed" },
              { value: "mixed", label: "Mixed" },
            ]}
            hint="Rainfed blocks track rainfall more closely."
            {...register("irrigation")}
          />
        </div>

        {entry?.family === "vegetable" && (
          <SelectField
            label="Harvest type"
            options={[
              { value: "single", label: "Single harvest (lift the whole block)" },
              { value: "multiple", label: "Multiple pickings over several weeks" },
            ]}
            hint="Shown because this crop can be picked repeatedly — it widens the planning window."
            {...register("harvestType")}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Field area (optional)"
            placeholder="e.g. 4.2"
            inputMode="decimal"
            error={errors.fieldArea?.message}
            {...register("fieldArea")}
          />
          <TextField
            label="Expected yield (optional)"
            placeholder="e.g. 6.2 t/ha"
            error={errors.expectedYield?.message}
            {...register("expectedYield")}
          />
        </div>

        <TextAreaField
          label="Field notes (optional)"
          placeholder="Drainage, patchy emergence, previous crop…"
          error={errors.notes?.message}
          {...register("notes")}
        />
      </form>
    </Modal>
  );
}
