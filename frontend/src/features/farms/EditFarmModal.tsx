import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/ui";
import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/common/fields";
import { INDIAN_STATES } from "@/data/mock/cropCatalog";
import { useStore } from "@/store/AppStore";
import type { Farm } from "@/types";

const coord = (min: number, max: number, name: string) =>
  z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= min && Number(v) <= max), {
      message: `${name} must be a number between ${min} and ${max}`,
    });

const schema = z.object({
  name: z.string().trim().min(2, "Give the farm a recognisable name").max(60),
  state: z.string().min(2, "Select the state"),
  district: z.string().trim().min(2, "Enter the district or locality").max(60),
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
  notes: z.string().trim().max(240, "Keep notes under 240 characters").optional(),
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: farm.name,
      state: farm.state,
      district: farm.district,
      latitude: farm.latitude ? String(farm.latitude) : "",
      longitude: farm.longitude ? String(farm.longitude) : "",
      area: String(farm.area),
      areaUnit: farm.areaUnit,
      notes: farm.notes || "",
    },
  });

  useEffect(() => {
    if (open && farm) {
      reset({
        name: farm.name,
        state: farm.state,
        district: farm.district,
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
        latitude: values.latitude ? Number(values.latitude) : null,
        longitude: values.longitude ? Number(values.longitude) : null,
        area: Number(values.area),
        areaUnit: values.areaUnit,
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
      description="Update location, holding area or notes for this farm."
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
          placeholder="e.g. Kaveri Belt Collective"
          error={errors.name?.message}
          {...register("name")}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="State"
            required
            options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
            error={errors.state?.message}
            {...register("state")}
          />
          <TextField
            label="District / locality"
            required
            placeholder="e.g. Thanjavur"
            error={errors.district?.message}
            {...register("district")}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Total holding area"
            required
            type="number"
            step="any"
            placeholder="e.g. 16"
            error={errors.area?.message}
            {...register("area")}
          />
          <SelectField
            label="Unit"
            required
            options={[
              { value: "hectare", label: "Hectares (ha)" },
              { value: "acre", label: "Acres (ac)" },
            ]}
            error={errors.areaUnit?.message}
            {...register("areaUnit")}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Latitude (optional)"
            type="number"
            step="any"
            placeholder="e.g. 10.787"
            error={errors.latitude?.message}
            {...register("latitude")}
          />
          <TextField
            label="Longitude (optional)"
            type="number"
            step="any"
            placeholder="e.g. 79.138"
            error={errors.longitude?.message}
            {...register("longitude")}
          />
        </div>

        <TextAreaField
          label="Notes (optional)"
          placeholder="Irrigation sources, soil notes, access details…"
          rows={3}
          error={errors.notes?.message}
          {...register("notes")}
        />
      </form>
    </Modal>
  );
}
