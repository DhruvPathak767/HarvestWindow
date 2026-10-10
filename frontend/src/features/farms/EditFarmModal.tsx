import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import type { Farm } from "@/types";
import { SOIL_TYPE_OPTIONS, IRRIGATION_SOURCE_OPTIONS } from "./AddFarmModal";

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

export function EditFarmModal({
  open,
  onClose,
  farm,
}: {
  open: boolean;
  onClose: () => void;
  farm: Farm;
}) {
  const { updateFarm } = useStore();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [unit, setUnit] = useState<FormValues["areaUnit"]>(farm.areaUnit || "hectare");

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: farm.name,
      state: farm.state,
      district: farm.district,
      village: farm.village || "",
      pincode: farm.pincode || "",
      soilType: farm.soilType || "",
      irrigationSource: farm.irrigationSource || "",
      latitude: farm.latitude ? String(farm.latitude) : "",
      longitude: farm.longitude ? String(farm.longitude) : "",
      area: String(farm.area),
      areaUnit: farm.areaUnit,
      notes: farm.notes || "",
    },
  });

  useEffect(() => {
    if (open && farm) {
      setUnit(farm.areaUnit || "hectare");
      reset({
        name: farm.name,
        state: farm.state,
        district: farm.district,
        village: farm.village || "",
        pincode: farm.pincode || "",
        soilType: farm.soilType || "",
        irrigationSource: farm.irrigationSource || "",
        latitude: farm.latitude ? String(farm.latitude) : "",
        longitude: farm.longitude ? String(farm.longitude) : "",
        area: String(farm.area),
        areaUnit: farm.areaUnit,
        notes: farm.notes || "",
      });
      setServerError(null);
    }
  }, [open, farm, reset]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setServerError(null);
    try {
      await updateFarm(farm.id, {
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
      onClose();
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Unable to update farm on server"
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
      title={`Edit ${farm.name}`}
      description="Update boundaries, soil attributes, and irrigation context."
      size="md"
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-farm-form" loading={submitting}>
            Save changes
          </Button>
        </>
      }
    >
      <form
        id="edit-farm-form"
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
            hint="Specific sub-district or village locality."
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
            hint="Coordinates let a real weather provider be connected later."
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
