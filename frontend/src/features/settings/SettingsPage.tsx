import { useState } from "react";
import { motion } from "framer-motion";
import {
  Database,
  Download,
  Globe2,
  RotateCcw,
  Save,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card, CardHeader } from "@/components/common/ui";
import { Modal as Dialog } from "@/components/common/Modal";
import { SegmentedControl, SelectField, TextField, ToggleRow } from "@/components/common/fields";
import { useToast } from "@/components/feedback/ToastProvider";
import { ALL_FARMS, useStore } from "@/store/AppStore";
import type { AppSettings, AreaUnit } from "@/types";
import { formatDate } from "@/utils/date";

const LANGUAGES = [
  { value: "en", label: "English (India)" },
  { value: "hi", label: "हिन्दी — Hindi" },
  { value: "kn", label: "ಕನ್ನಡ — Kannada" },
  { value: "ta", label: "தமிழ் — Tamil" },
];

export default function SettingsPage() {
  const {
    user,
    settings,
    farms,
    crops,
    recommendations,
    activity,
    updateSettings,
    updateProfile,
    resetDemoData,
    selectFarm,
  } = useStore();
  const { toast } = useToast();

  const [name, setName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [savingProfile, setSavingProfile] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const patchSettings = (patch: Partial<AppSettings>) => void updateSettings(patch);

  const saveProfile = async () => {
    if (name.trim().length < 2) {
      toast({ tone: "error", title: "Enter a name", description: "At least two characters." });
      return;
    }
    setSavingProfile(true);
    await updateProfile({ fullName: name.trim() });
    setSavingProfile(false);
  };

  const exportSnapshot = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      user,
      settings,
      farms,
      crops,
      recommendations,
      activity,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "harvestwindow-demo-snapshot.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({
      tone: "success",
      title: "Snapshot exported",
      description: "A JSON copy of this browser's demo data was downloaded.",
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Settings"
        title="Preferences & demo data"
        subtitle="Everything here changes real behaviour in this workspace and is stored locally in your browser."
        meta={[
          { label: "Farms", value: farms.length },
          { label: "Crop records", value: crops.length },
          { label: "Local storage", value: "harvestwindow.demo.v1" },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Profile"
            subtitle="Used for greetings and the workspace header."
            icon={<UserRound className="h-4 w-4" aria-hidden />}
          />
          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-4 rounded-md border border-line bg-cream/60 p-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-forest-deep font-display text-[18px] font-bold text-cream">
                {user.fullName
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-[15px] font-bold text-forest-deep">
                  {user.fullName}
                </p>
                <p className="truncate text-[12.5px] text-muted">{user.email}</p>
                <p className="mt-1 font-mono text-[10.5px] tracking-wide text-muted uppercase">
                  {user.role} · {user.organisation}
                </p>
              </div>
            </div>

            <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            <TextField
              label="Email address"
              type="email"
              value={email}
              disabled
              hint="Your verified HarvestWindow account email."
            />
            <TextField
              label="Assigned Role"
              value={user.role}
              disabled
              hint="Role permissions are managed administratively."
            />

            <div className="flex justify-end">
              <Button size="sm" onClick={saveProfile} loading={savingProfile}>
                {!savingProfile && <Save className="h-4 w-4" aria-hidden />}
                Save profile
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader
              title="Units & defaults"
              subtitle="Applied to new records and to the workspace focus."
              icon={<SlidersHorizontal className="h-4 w-4" aria-hidden />}
            />
            <div className="flex flex-col gap-4 p-5">
              <div className="flex flex-col gap-1.5">
                <span className="font-display text-[12.5px] font-semibold text-forest-deep">
                  Default unit for new farms
                </span>
                <SegmentedControl<AreaUnit>
                  ariaLabel="Default area unit"
                  value={settings.areaUnit}
                  onChange={(v) => patchSettings({ areaUnit: v })}
                  options={[
                    { value: "hectare", label: "Hectares" },
                    { value: "acre", label: "Acres" },
                  ]}
                />
                <p className="text-[12px] text-muted">
                  Existing farms keep the unit they were created with.
                </p>
              </div>

              <SelectField
                label="Default farm on load"
                value={settings.defaultFarmId ?? ALL_FARMS}
                onChange={(e) => {
                  const value = e.target.value;
                  patchSettings({ defaultFarmId: value === ALL_FARMS ? null : value });
                  selectFarm(value);
                }}
                options={[
                  { value: ALL_FARMS, label: "All farms (portfolio view)" },
                  ...farms.map((f) => ({
                    value: f.id,
                    label: `${f.name} · ${f.district}, ${f.state}`,
                  })),
                ]}
                hint="The workspace opens focused on this farm."
              />

              <SelectField
                label="Interface language & date format"
                value={settings.language}
                onChange={(e) =>
                  patchSettings({ language: e.target.value as AppSettings["language"] })
                }
                options={LANGUAGES}
                hint="Dates across the workspace re-format immediately. Interface copy stays in English in this demo build."
              />

            </div>
          </Card>

          <Card>
            <CardHeader
              title="Notifications"
              subtitle="Controls what appears in the bell menu."
              icon={<Globe2 className="h-4 w-4" aria-hidden />}
            />
            <div className="divide-y divide-line px-5">
              <ToggleRow
                label="Harvest window alerts"
                description="Forecast refreshes, window changes and new crop records."
                checked={settings.notifications.harvestWindowAlerts}
                onChange={(v) =>
                  patchSettings({
                    notifications: { ...settings.notifications, harvestWindowAlerts: v },
                  })
                }
              />
              <ToggleRow
                label="Weather cautions"
                description="Rain or heat indicated inside or near an estimated window."
                checked={settings.notifications.weatherCautions}
                onChange={(v) =>
                  patchSettings({
                    notifications: { ...settings.notifications, weatherCautions: v },
                  })
                }
              />
              <ToggleRow
                label="Weekly summary"
                description="A single digest instead of individual events (demo preference)."
                checked={settings.notifications.weeklySummary}
                onChange={(v) =>
                  patchSettings({
                    notifications: { ...settings.notifications, weeklySummary: v },
                  })
                }
              />
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Demo data"
          subtitle="This frontend persists to localStorage only — there is no cloud sync."
          icon={<Database className="h-4 w-4" aria-hidden />}
        />
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Farms", value: farms.length },
              { label: "Crops", value: crops.length },
              { label: "Recommendations", value: recommendations.length },
              { label: "Activity events", value: activity.length },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-[11.5px] tracking-wide text-muted uppercase">{item.label}</dt>
                <dd className="hw-num mt-1 text-[22px] font-extrabold text-forest-deep">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={exportSnapshot}>
              <Download className="h-4 w-4" aria-hidden />
              Export JSON
            </Button>
            <Button size="sm" variant="danger" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Reset demo data
            </Button>
          </div>
        </div>
        <p className="border-t border-line px-5 py-3 font-mono text-[10.5px] tracking-wide text-muted uppercase">
          Last estimate refresh {formatDate(new Date())} · languages available:{" "}
          {LANGUAGES.map((l) => l.value).join(", ")}
        </p>
      </Card>

      <motion.div aria-live="polite" className="sr-only">
        {settings.language}
      </motion.div>

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset the demo dataset?"
        description="Farms, crops, recommendations and preferences return to the shipped sample data. This cannot be undone."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                await resetDemoData();
                setConfirmReset(false);
              }}
            >
              Reset everything
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-muted">
          Your exported JSON snapshot (if you downloaded one) is unaffected.
        </p>
      </Dialog>

    </div>
  );
}
