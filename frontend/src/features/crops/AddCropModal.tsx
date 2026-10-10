import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Info, Sprout } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/ui";
import {
  SearchableSelect,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/common/fields";
import { CROP_CATALOG, findCatalogEntry } from "@/data/mock/cropCatalog";
import { STAGE_TEMPLATES } from "@/types";
import { addDays, startOfToday, toISODate } from "@/utils/date";
import { ALL_FARMS, useStore } from "@/store/AppStore";

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

  const initialFarm =
    defaultFarmId ??
    (selectedFarmId !== ALL_FARMS ? selectedFarmId : (farms[0]?.id ?? ""));

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
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
  const entry = useMemo(() => findCatalogEntry(cropName), [cropName]);
  const stageOptions = useMemo(() => {
    if (!entry) return [];
    const stages = STAGE_TEMPLATES[entry.stageTemplateName] as readonly string[];
    return [
      { value: "Not recorded yet", label: "Not recorded yet" },
      ...stages.map((s) => ({ value: s, label: s })),
    ];
  }, [entry]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
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
                options={CROP_CATALOG.map((c) => ({
                  value: c.name,
                  label: c.name,
                  meta: `${c.seasons.join(" / ")} · ${c.durationRange[0]}–${c.durationRange[1]} days`,
                }))}
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

        {entry && (
          <div className="flex items-start gap-2.5 rounded-md border border-line bg-soft/70 px-3.5 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-forest" aria-hidden />
            <p className="text-[12.5px] leading-relaxed text-forest-deep">
              <span className="font-semibold">{entry.name}</span> reference duration:{" "}
              <span className="font-mono">
                {entry.durationRange[0]}–{entry.durationRange[1]} days
              </span>{" "}
              from sowing. {entry.note}
            </p>
          </div>
        )}

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
