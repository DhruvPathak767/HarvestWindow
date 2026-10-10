import type { AreaUnit } from "@/types";

/**
 * Converts area between hectares and acres.
 */
export function convertArea(
  value: number,
  fromUnit: "hectare" | "acre" | "HECTARE" | "ACRE" | string,
  toUnit: AreaUnit
): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  const fromNormalized = fromUnit.toLowerCase().startsWith("hect") ? "hectare" : "acre";
  if (fromNormalized === toUnit) return value;
  if (fromNormalized === "hectare" && toUnit === "acre") {
    return Math.round(value * 2.47105 * 10) / 10;
  }
  if (fromNormalized === "acre" && toUnit === "hectare") {
    return Math.round((value / 2.47105) * 10) / 10;
  }
  return value;
}

/**
 * Formats an area with the appropriate localized unit label.
 */
export function formatArea(
  value: number,
  fromUnit: string = "hectare",
  displayUnit: AreaUnit = "hectare"
): string {
  const converted = convertArea(value, fromUnit, displayUnit);
  const unitLabel = displayUnit === "hectare" ? "ha" : "ac";
  return `${converted.toLocaleString("en-IN", { maximumFractionDigits: 1 })} ${unitLabel}`;
}

/**
 * Converts Celsius temperature to preferred unit (C or F).
 */
export function formatTemperature(
  tempC: number,
  preferredUnit: "c" | "f" | "celsius" | "fahrenheit" = "c"
): string {
  if (tempC === null || tempC === undefined || Number.isNaN(tempC)) return "—";
  const isF = preferredUnit.toLowerCase().startsWith("f");
  if (isF) {
    const tempF = Math.round((tempC * 9) / 5 + 32);
    return `${tempF}°F`;
  }
  return `${Math.round(tempC)}°C`;
}
