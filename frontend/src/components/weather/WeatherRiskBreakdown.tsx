import { CloudRain, Droplets, Wind, Thermometer, ShieldAlert } from "lucide-react";
import type { RiskItem } from "@/types";
import { cn } from "@/utils/cn";

interface Props {
  risks: RiskItem[];
  overallScore: number;
}

export function WeatherRiskBreakdown({ risks }: Props) {
  const getRiskItem = (cat: string) => risks.find((r) => r.category === cat);

  const rainfall = getRiskItem("RAINFALL");
  const humidity = getRiskItem("HUMIDITY_DRYING");
  const wind = getRiskItem("WIND");
  const temp = getRiskItem("TEMPERATURE");

  const cards = [
    {
      label: "Rainfall & Wet Fields",
      icon: CloudRain,
      risk: rainfall,
      score: rainfall?.score ?? 0,
      detail: rainfall?.observedOrForecastValues
        ? `${rainfall.observedOrForecastValues.maxDailyRainfallMm ?? 0} mm peak (${rainfall.observedOrForecastValues.precipitationProbabilityPercent ?? 0}% prob)`
        : "Low rain threat",
    },
    {
      label: "Humidity & Drying",
      icon: Droplets,
      risk: humidity,
      score: humidity?.score ?? 0,
      detail: humidity?.observedOrForecastValues
        ? `Up to ${humidity.observedOrForecastValues.maxHumidityPercent ?? 0}% relative humidity`
        : "Normal drying rates",
    },
    {
      label: "Wind & Lodging",
      icon: Wind,
      risk: wind,
      score: wind?.score ?? 0,
      detail: wind?.observedOrForecastValues
        ? `${wind.observedOrForecastValues.maxWindSpeedMps ?? 0} m/s (${Math.round((wind.observedOrForecastValues.maxWindSpeedMps ?? 0) * 3.6)} km/h)`
        : "Stable breezes",
    },
    {
      label: "Temperature Stress",
      icon: Thermometer,
      risk: temp,
      score: temp?.score ?? 0,
      detail: temp?.observedOrForecastValues
        ? `Peak ${temp.observedOrForecastValues.maxTemperatureC ?? "—"}°C`
        : "Mild temperatures",
    },
  ];

  function getSeverityColor(score: number) {
    if (score >= 65) return { bar: "bg-red-500", text: "text-red-700", bg: "bg-red-50/70", border: "border-red-200" };
    if (score >= 35) return { bar: "bg-amber-500", text: "text-amber-800", bg: "bg-amber-50/70", border: "border-amber-200" };
    return { bar: "bg-emerald-500", text: "text-emerald-800", bg: "bg-emerald-50/70", border: "border-emerald-200" };
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        const colors = getSeverityColor(c.score);
        return (
          <div
            key={c.label}
            className={cn(
              "flex flex-col justify-between p-3.5 rounded-lg border transition-all duration-200",
              colors.bg,
              colors.border
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-4 h-4", colors.text)} />
                  <span className="text-[13px] font-medium text-forest-deep">{c.label}</span>
                </div>
                <span className={cn("text-[13px] font-bold font-mono", colors.text)}>
                  {c.score}/100
                </span>
              </div>
              <p className="text-[11.5px] text-muted line-clamp-1">{c.detail}</p>
            </div>

            <div className="w-full bg-black/5 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", colors.bar)}
                style={{ width: `${Math.max(5, Math.min(100, c.score))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
