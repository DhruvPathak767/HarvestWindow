import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/ui";
import {
  SegmentedControl,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/common/fields";
import { INDIAN_STATES } from "@/data/mock/cropCatalog";
import { useStore } from "@/store/AppStore";

export const SOIL_TYPE_OPTIONS = [
  { value: "Alluvial", label: "Alluvial Soil (River plains / high fertility)" },
  { value: "Black (Regur)", label: "Black Soil / Regur (Cotton & heavy soils)" },
  { value: "Red & Yellow", label: "Red & Yellow Soil (Deciduous & drylands)" },
  { value: "Laterite", label: "Laterite Soil (High rainfall / acidic)" },
  { value: "Sandy / Arid", label: "Sandy / Arid Soil (Dry zones)" },
  { value: "Clayey Loam", label: "Clay Loam (High water retention)" },
  { value: "Peaty / Organic", label: "Peaty / Organic Soil (Marshy/wetlands)" },
];

export const IRRIGATION_SOURCE_OPTIONS = [
  { value: "Canal", label: "Canal Irrigation (Public grid / river canal)" },
  { value: "Borewell / Tube-well", label: "Borewell / Tube-well (Groundwater)" },
  { value: "Drip Irrigation", label: "Drip Irrigation (Precision micro-irrigation)" },
  { value: "Sprinkler", label: "Sprinkler Irrigation (Overhead spray)" },
  { value: "Rainfed / Monsoon", label: "Rainfed (Monsoon dependent)" },
  { value: "Open Well / Farm Pond", label: "Open Well / Farm Pond" },
  { value: "Mixed", label: "Mixed / Multiple sources" },
];

const coord = (min: number, max: number, name: string) =>
  z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= min && Number(v) <= max), {
      message: `${name} must be a number between ${min} and ${max}`,
    });

const schema = z.object({
  name: z.string().trim().min(2, "Give the farm a recognisable name").max(100),
  state: z.string().min(2, "Select the state"),
  district: z.string().trim().min(2, "Enter the district or locality").max(100),
  village: z.string().trim().max(100).optional(),
  pincode: z.string().trim().max(10).optional(),
  soilType: z.string().optional(),
  irrigationSource: z.string().optional(),
  latitude: coord(-90, 90, "Latitude"),
  longitude: coord(-180, 180, "Longitude"),
  area: z
    .string()
    .trim()
    .min(1, "Enter the field size")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, {
      message: "Field size must be a number greater than zero",
    })
    .refine((v) => Number(v) <= 100000, {
      message: "That looks larger than a real holding",
    }),
  areaUnit: z.enum(["hectare", "acre"]),
  notes: z.string().trim().max(300, "Keep notes under 300 characters").optional(),
});

type FormValues = z.infer<typeof schema>;

export function AddFarmModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addFarm, settings } = useStore();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [unit, setUnit] = useState<FormValues["areaUnit"]>(settings.areaUnit);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      state: "",
      district: "",
      village: "",
      pincode: "",
      soilType: "",
      irrigationSource: "",
      latitude: "",
      longitude: "",
      area: "",
      areaUnit: settings.areaUnit,
      notes: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setServerError(null);
    try {
      await addFarm({
        name: values.name,
        state: values.state,
        district: values.district,
        village: values.village || undefined,
        pincode: values.pincode || undefined,
        soilType: values.soilType || undefined,
        irrigationSource: values.irrigationSource || undefined,
        latitude: values.latitude ? Number(values.latitude) : null,
        longitude: values.longitude ? Number(values.longitude) : null,
        area: Number(values.area),
        areaUnit: unit,
        notes: values.notes || undefined,
      });
      reset();
      onClose();
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Unable to save farm to server"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        setServerError(null);
        onClose();
      }}
      title="Add a farm"
      description="Farms hold the fields, soil context, and crop records HarvestWindow estimates against."
      size="md"
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-farm-form" loading={submitting}>
            Save farm
          </Button>
        </>
      }
    >
      <form
        id="add-farm-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        {serverError && (
          <div
            role="alert"
            className="rounded-md border border-danger/35 bg-[#fdf1ee] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[#8d3a26]"
          >
            {serverError}
          </div>
        )}
        <TextField
          label="Farm name"
          required
          placeholder="e.g. Greenridge Valley Holding"
          error={errors.name?.message}
          leadingIcon={<MapPin className="h-4 w-4" aria-hidden />}
          {...register("name")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="State"
            required
            placeholder="Select state"
            error={errors.state?.message}
            options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
            {...register("state")}
          />
          <TextField
            label="District or locality"
            required
            placeholder="e.g. Hassan"
            error={errors.district?.message}
            {...register("district")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Village / Taluka (optional)"
            placeholder="e.g. Holenarasipura Taluk"
            hint="Specific sub-district or panchayat locality."
            error={errors.village?.message}
            {...register("village")}
          />
          <TextField
            label="PIN / Postal Code (optional)"
            placeholder="e.g. 573211"
            maxLength={10}
            error={errors.pincode?.message}
            {...register("pincode")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Soil type (optional)"
            placeholder="Select soil classification"
            options={SOIL_TYPE_OPTIONS}
            error={errors.soilType?.message}
            hint="Influences soil moisture capacity and crop duration."
            {...register("soilType")}
          />
          <SelectField
            label="Primary irrigation source (optional)"
            placeholder="Select irrigation method"
            options={IRRIGATION_SOURCE_OPTIONS}
            error={errors.irrigationSource?.message}
            hint="Helps calculate drought and readiness factors."
            {...register("irrigationSource")}
          />
        </div>

        <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto]">
          <TextField
            label="Field size"
            required
            placeholder="e.g. 12.5"
            inputMode="decimal"
            error={errors.area?.message}
            {...register("area")}
          />
          <div className="flex flex-col gap-1.5">
            <span
              className="font-display text-[12.5px] font-semibold text-forest-deep"
              id="area-unit-label"
            >
              Unit
            </span>
            <SegmentedControl
              ariaLabel="Area unit"
              value={unit}
              onChange={(v) => {
                setUnit(v);
                setValue("areaUnit", v);
              }}
              options={[
                { value: "hectare", label: "Hectares" },
                { value: "acre", label: "Acres" },
              ]}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Latitude (optional)"
            placeholder="13.0068"
            inputMode="decimal"
            hint="Allows live weather grid lookup."
            error={errors.latitude?.message}
            {...register("latitude")}
          />
          <TextField
            label="Longitude (optional)"
            placeholder="76.1001"
            inputMode="decimal"
            error={errors.longitude?.message}
            {...register("longitude")}
          />
        </div>

        <TextAreaField
          label="Notes (optional)"
          placeholder="Access roads, water channel maintenance, boundary notes…"
          hint="Up to 300 characters."
          error={errors.notes?.message}
          {...register("notes")}
        />
      </form>
    </Modal>
  );
}
