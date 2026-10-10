import type { Farm, WeatherSummary } from "@/types";

export interface WeatherProvider {
  readonly id: string;
  readonly label: string;
  readonly sourceType: WeatherSummary["sourceType"];
  fetchForFarm(farm: Farm, forceRefresh?: boolean): Promise<WeatherSummary>;
}
